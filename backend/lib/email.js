'use strict';
const https = require('https');

function slugifyCompanyName(name = '') {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 30) || 'invoices';
}

function callResend(apiKey, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = https.request(options, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(raw);
                    if (res.statusCode >= 400) {
                        const err = new Error('Email delivery failed');
                        err.statusCode = 502;
                        return reject(err);
                    }
                    resolve(parsed);
                } catch {
                    const err = new Error('Failed to parse email service response');
                    err.statusCode = 500;
                    reject(err);
                }
            });
        });
        req.on('error', () => {
            const err = new Error('Email delivery unavailable');
            err.statusCode = 500;
            reject(err);
        });
        req.write(body);
        req.end();
    });
}

async function sendEmail(invoice, pdfBase64, lang) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        const err = new Error('Email service not configured');
        err.statusCode = 503;
        throw err;
    }

    const toEmail = invoice?.client?.email;
    if (!toEmail) {
        const err = new Error('Client email is missing');
        err.statusCode = 400;
        throw err;
    }

    const senderSlug = slugifyCompanyName(invoice?.supplier?.name);
    const senderName = invoice?.supplier?.name || 'Fakturidias';
    const from = `${senderName} <${senderSlug}@fakturidias.app>`;
    const to = [toEmail];
    if (invoice?.client?.emailCopy) to.push(invoice.client.emailCopy);

    const subject = lang === 'cs'
        ? `Faktura ${invoice.invoiceNumber}`
        : `Invoice ${invoice.invoiceNumber}`;

    const html = lang === 'cs'
        ? `<p>Vážený zákazníku,</p><p>V příloze naleznete fakturu č. <strong>${invoice.invoiceNumber}</strong>.</p><p>Děkujeme za váš obchod!</p><p>${senderName}</p>`
        : `<p>Dear customer,</p><p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong>.</p><p>Thank you for your business!</p><p>${senderName}</p>`;

    const base64Data = (pdfBase64 || '').replace(/^data:application\/pdf;base64,/, '');

    const result = await callResend(apiKey, {
        from, to, subject, html,
        attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: base64Data }]
    });

    return { id: result.id };
}

async function sendBroadcastEmail(recipients, subject, html) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        const err = new Error('Email service not configured');
        err.statusCode = 503;
        throw err;
    }

    const list = (Array.isArray(recipients) ? recipients : [recipients])
        .map(e => String(e || '').trim())
        .filter(Boolean);
    if (list.length === 0) {
        const err = new Error('No recipients');
        err.statusCode = 400;
        throw err;
    }
    if (!subject || !html) {
        const err = new Error('Subject and message are required');
        err.statusCode = 400;
        throw err;
    }

    const from = 'Fakturidias <noreply@fakturidias.app>';
    let sent = 0;
    const failed = [];

    // One email per recipient so no user sees another's address.
    for (const to of list) {
        try {
            await callResend(apiKey, { from, to: [to], subject, html });
            sent++;
        } catch {
            failed.push(to);
        }
    }

    return { sent, failed };
}

// Escape a plain-text broadcast message into safe HTML (preserves line breaks).
function broadcastHtml(message) {
    const safe = String(message || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    return `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1a1a2e;font-size:15px">${safe}</div>`;
}

const BROADCAST_SEGMENTS = ['all', 'free', 'standard', 'max', 'paid'];

async function resolveSegmentRecipients(segment) {
    const { getAllUsersWithStats } = require('./storage');
    const seg = BROADCAST_SEGMENTS.includes(segment) ? segment : 'all';
    const users = await getAllUsersWithStats();
    return users.filter(u => {
        if (seg === 'all') return true;
        const paid = ['standard', 'max', 'pro'].includes(u.plan) && u.status === 'active';
        if (seg === 'paid') return paid;
        if (seg === 'free') return !paid;
        return u.plan === seg && u.status === 'active';
    }).map(u => u.email).filter(Boolean);
}

// Resolve a segment to recipients and send the broadcast. Used by both the
// immediate admin broadcast endpoint and the scheduled-email poller.
async function sendSegmentBroadcast(segment, subject, message) {
    const recipients = await resolveSegmentRecipients(segment);
    if (recipients.length === 0) {
        const err = new Error('No recipients match this segment');
        err.statusCode = 400;
        throw err;
    }
    const result = await sendBroadcastEmail(recipients, subject, broadcastHtml(message));
    return { ...result, total: recipients.length };
}

module.exports = { sendEmail, sendBroadcastEmail, sendSegmentBroadcast, broadcastHtml };
