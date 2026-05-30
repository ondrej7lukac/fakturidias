'use strict';

const crypto = require('crypto');
const { sendJson, readRawBody } = require('../lib/utils');
const { getMailboxByAddress, saveReceivedInvoice } = require('../lib/storage');
const {
  verifySvixSignature,
  normalizeInboundEvent,
  fetchReceivedEmail,
  fetchReceivedAttachmentBytes,
} = require('../lib/inbound');
const { parseInvoiceImageWithAI } = require('../lib/gemini');

const INBOUND_SECRET = process.env.INBOUND_WEBHOOK_SECRET;
// The webhook itself is metadata-only and tiny; 256 KB is plenty.
const INBOUND_MAX_BYTES = 256 * 1024;

// File types Gemini can read directly for invoice extraction.
const PARSEABLE = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function attach(router) {
  // Public webhook hit by Resend Inbound on every received email.
  // Resend sends `email.received` with METADATA ONLY — we fetch body and
  // attachment bytes from the Receiving API using the email_id.
  router.add('POST', '/api/inbound/resend', async ({ req, res }) => {
    let raw;
    try {
      raw = await readRawBody(req, INBOUND_MAX_BYTES);
    } catch {
      return sendJson(res, 400, { error: 'Failed to read body' });
    }

    // Inbound receiving must be explicitly configured.
    if (!INBOUND_SECRET) {
      return sendJson(res, 503, { error: 'Inbound webhook not configured' });
    }

    if (!verifySvixSignature(raw, req.headers, INBOUND_SECRET)) {
      return sendJson(res, 401, { error: 'Invalid signature' });
    }

    let event;
    try {
      event = JSON.parse(raw.toString('utf8') || '{}');
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    const evt = normalizeInboundEvent(event);
    // Only act on inbound-received events; ack anything else.
    if (evt.type && evt.type !== 'email.received') {
      return sendJson(res, 200, { received: true, ignored: evt.type });
    }

    // Resolve which user's mailbox this was addressed to.
    let mailbox = null;
    for (const addr of evt.to) {
      mailbox = await getMailboxByAddress(addr);
      if (mailbox) break;
    }
    // Unknown recipient — ack with 200 so the provider doesn't keep retrying.
    if (!mailbox) return sendJson(res, 200, { received: true, matched: false });

    // Fetch the full email (body + authoritative attachment list) from the API.
    let full = null;
    try {
      if (evt.emailId) full = await fetchReceivedEmail(evt.emailId);
    } catch (err) {
      console.error('[inbound] fetchReceivedEmail failed:', err.message);
    }

    const subject = (full && full.subject) || evt.subject || '';
    const plain =
      (full &&
        (full.text || String(full.html || '').replace(/<[^>]+>/g, ' '))) ||
      '';
    const attachmentList = (full && full.attachments) || evt.attachments || [];

    // Download attachment bytes so the in-app preview and re-parsing work even
    // after Resend's signed URLs expire.
    const storedAttachments = [];
    let parseTarget = null; // { contentType, data } for the first parseable file
    for (const a of attachmentList) {
      const contentType = (a.content_type || a.contentType || '').toLowerCase();
      let data = '';
      if (evt.emailId && a.id) {
        try {
          const fetched = await fetchReceivedAttachmentBytes(evt.emailId, a.id);
          data = fetched.buffer.toString('base64');
        } catch (err) {
          console.error('[inbound] attachment download failed:', err.message);
        }
      }
      const record = {
        filename: a.filename || 'attachment',
        contentType,
        size: data ? Buffer.byteLength(data, 'base64') : 0,
        data,
      };
      storedAttachments.push(record);
      if (!parseTarget && data && PARSEABLE.has(contentType)) {
        parseTarget = { contentType, data };
      }
    }

    const received = {
      id: crypto.randomUUID(),
      status: 'pending',
      receivedAt: new Date(),
      from: evt.from,
      fromName: evt.fromName,
      to: mailbox.address,
      subject,
      textPreview: plain.replace(/\s+/g, ' ').trim().slice(0, 1000),
      attachments: storedAttachments,
      parsed: null,
      parseStatus: 'none',
      parseError: null,
      approvedInvoiceId: null,
    };

    // Auto-extract invoice fields from the first parseable attachment.
    if (parseTarget) {
      received.parseStatus = 'pending';
      try {
        received.parsed = await parseInvoiceImageWithAI(
          parseTarget.data,
          parseTarget.contentType,
          'cs',
        );
        received.parseStatus = 'done';
      } catch (err) {
        received.parseStatus = 'failed';
        received.parseError = err.message || 'AI parsing failed';
      }
    }

    await saveReceivedInvoice(mailbox.userEmail, received);
    return sendJson(res, 200, {
      received: true,
      matched: true,
      id: received.id,
    });
  });
}

module.exports = { attach };
