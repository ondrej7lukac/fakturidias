"use strict";

const { sendJson, parseBody, SECURITY_HEADERS } = require("../lib/utils");
const {
  getMailboxByUser,
  claimMailbox,
  getReceivedInvoices,
  getReceivedInvoice,
  saveReceivedInvoice,
  deleteReceivedInvoice,
} = require("../lib/storage");

const INBOUND_DOMAIN = process.env.INBOUND_DOMAIN || "fakturidias.app";

function publicMailbox(m) {
  if (!m) return null;
  return { address: m.address, slug: m.slug, createdAt: m.createdAt };
}

// Strip the heavy base64 attachment payload — clients fetch bytes separately.
function stripAttachments(r) {
  if (!r) return r;
  return {
    id: r.id,
    status: r.status,
    receivedAt: r.receivedAt,
    from: r.from,
    fromName: r.fromName,
    to: r.to,
    subject: r.subject,
    textPreview: r.textPreview,
    parsed: r.parsed || null,
    parseStatus: r.parseStatus || "none",
    parseError: r.parseError || null,
    approvedInvoiceId: r.approvedInvoiceId || null,
    attachments: (r.attachments || []).map((a, index) => ({
      index,
      filename: a.filename,
      contentType: a.contentType,
      size: a.size || 0,
    })),
  };
}

function attach(router) {
  // Current user's mailbox address (or null if not set up yet).
  router.add("GET", "/api/mailbox", async ({ res, userEmail }) => {
    const m = await getMailboxByUser(userEmail);
    return sendJson(res, 200, {
      mailbox: publicMailbox(m),
      domain: INBOUND_DOMAIN,
    });
  });

  // Claim / change the mailbox slug (companyname → companyname@domain).
  router.add("POST", "/api/mailbox", async ({ req, res, userEmail }) => {
    let body;
    try {
      body = await parseBody(req);
    } catch {
      return sendJson(res, 400, { error: "Invalid request body" });
    }

    const result = await claimMailbox(userEmail, body.slug, INBOUND_DOMAIN);
    if (!result.ok) return sendJson(res, 409, { error: result.error });
    return sendJson(res, 200, {
      mailbox: publicMailbox(result.mailbox),
      domain: INBOUND_DOMAIN,
    });
  });

  // List received bills awaiting review.
  router.add("GET", "/api/mailbox/received", async ({ res, userEmail }) => {
    const list = await getReceivedInvoices(userEmail);
    return sendJson(res, 200, { received: list.map(stripAttachments) });
  });

  router.add(
    "GET",
    "/api/mailbox/received/:id",
    async ({ res, userEmail, params }) => {
      const r = await getReceivedInvoice(userEmail, params.id);
      if (!r) return sendJson(res, 404, { error: "Not found" });
      return sendJson(res, 200, { received: stripAttachments(r) });
    },
  );

  router.add(
    "DELETE",
    "/api/mailbox/received/:id",
    async ({ res, userEmail, params }) => {
      await deleteReceivedInvoice(userEmail, params.id);
      return sendJson(res, 200, { success: true });
    },
  );

  // Serve a single attachment's raw bytes (for inline preview/download).
  router.add(
    "GET",
    "/api/mailbox/attachment/:id",
    async ({ res, userEmail, params, url }) => {
      const r = await getReceivedInvoice(userEmail, params.id);
      if (!r) return sendJson(res, 404, { error: "Not found" });

      const index = Number(url.searchParams.get("index") || 0);
      const att = (r.attachments || [])[index];
      if (!att || !att.data)
        return sendJson(res, 404, { error: "Attachment not found" });

      const buf = Buffer.from(att.data, "base64");
      const safeName = String(att.filename || "attachment").replace(
        /["\r\n]/g,
        "",
      );
      res.writeHead(200, {
        "Content-Type": att.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Content-Length": buf.length,
        ...SECURITY_HEADERS,
      });
      return res.end(buf);
    },
  );

  // Approve a parsed bill — persist the (possibly edited) fields.
  router.add(
    "POST",
    "/api/mailbox/approve",
    async ({ req, res, userEmail }) => {
      let body;
      try {
        body = await parseBody(req);
      } catch {
        return sendJson(res, 400, { error: "Invalid request body" });
      }
      if (!body.id) return sendJson(res, 400, { error: "id is required" });

      const r = await getReceivedInvoice(userEmail, body.id);
      if (!r) return sendJson(res, 404, { error: "Not found" });

      const updated = {
        ...r,
        status: "approved",
        parsed: body.parsed || r.parsed,
        parseStatus: r.parseStatus === "none" ? "done" : r.parseStatus,
      };
      const saved = await saveReceivedInvoice(userEmail, updated);
      return sendJson(res, 200, {
        received: stripAttachments(saved || updated),
      });
    },
  );

  // Reject a bill (keeps it in the list, marked rejected).
  router.add("POST", "/api/mailbox/reject", async ({ req, res, userEmail }) => {
    let body;
    try {
      body = await parseBody(req);
    } catch {
      return sendJson(res, 400, { error: "Invalid request body" });
    }
    if (!body.id) return sendJson(res, 400, { error: "id is required" });

    const r = await getReceivedInvoice(userEmail, body.id);
    if (!r) return sendJson(res, 404, { error: "Not found" });

    const saved = await saveReceivedInvoice(userEmail, {
      ...r,
      status: "rejected",
    });
    return sendJson(res, 200, { received: stripAttachments(saved || r) });
  });
}

module.exports = { attach };
