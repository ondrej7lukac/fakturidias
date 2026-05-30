"use strict";
const crypto = require("crypto");
const https = require("https");

// Resend delivers inbound-email webhooks signed via Svix. We verify the
// signature manually (no svix dependency) using the endpoint secret (whsec_…).
// https://resend.com/docs/dashboard/webhooks/verify-webhooks
function verifySvixSignature(rawBody, headers, secret) {
  if (!secret) return false;
  const id = headers["svix-id"] || headers["webhook-id"];
  const timestamp = headers["svix-timestamp"] || headers["webhook-timestamp"];
  const signature = headers["svix-signature"] || headers["webhook-signature"];
  if (!id || !timestamp || !signature) return false;

  // Reject stale timestamps (>5 min) to limit replay attacks.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300)
    return false;

  const secretBytes = Buffer.from(
    String(secret).replace(/^whsec_/, ""),
    "base64",
  );
  const signedContent = `${id}.${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  // The header is a space-separated list of "v1,<base64sig>" entries.
  return String(signature)
    .split(" ")
    .some((part) => {
      const sig = part.includes(",") ? part.split(",")[1] : part;
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
}

// Pull a bare email address out of "Name <addr@x>" or a plain address.
function extractAddress(value) {
  if (value && typeof value === "object") value = value.email || "";
  const m = String(value || "").match(/<([^>]+)>/);
  return (m ? m[1] : value).toLowerCase().trim();
}

// Pull a display name out of "Name <addr@x>" (empty if none).
function extractName(value) {
  if (value && typeof value === "object") return value.name || "";
  const m = String(value || "").match(/^\s*"?([^"<]+?)"?\s*</);
  return m ? m[1].trim() : "";
}

// The `email.received` webhook carries METADATA ONLY — no body, no attachment
// bytes. We extract the recipients (to route to a mailbox) and the email_id /
// attachment ids, then fetch the real content from the Receiving API.
// https://resend.com/docs/dashboard/receiving/introduction
function normalizeInboundEvent(event) {
  const d = (event && event.data) || event || {};
  const recipients = []
    .concat(d.to || [])
    .concat(d.cc || [])
    .map(extractAddress)
    .filter(Boolean);

  return {
    type: event && event.type,
    emailId: d.email_id || d.id || null,
    to: recipients,
    from: extractAddress(d.from),
    fromName: extractName(d.from),
    subject: d.subject || "",
    attachments: (d.attachments || []).map((a) => ({
      id: a.id,
      filename: a.filename || "attachment",
      contentType: (a.content_type || "application/octet-stream").toLowerCase(),
    })),
  };
}

// ── Resend Receiving API ─────────────────────────────────────────────────────

function resendApiGet(path) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey)
    return Promise.reject(new Error("RESEND_API_KEY not configured"));
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.resend.com",
        path,
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`Resend API ${res.statusCode}: ${raw}`));
          }
          try {
            resolve(JSON.parse(raw || "{}"));
          } catch {
            reject(new Error("Failed to parse Resend API response"));
          }
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

// Download bytes from an arbitrary https URL (Resend's signed CDN download_url),
// following up to 3 redirects. Caps the size to avoid runaway memory use.
function fetchUrlBytes(url, maxBytes = 25 * 1024 * 1024, redirects = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        res.resume();
        if (redirects <= 0) return reject(new Error("Too many redirects"));
        return resolve(
          fetchUrlBytes(res.headers.location, maxBytes, redirects - 1),
        );
      }
      if (res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`Download failed: ${res.statusCode}`));
      }
      const chunks = [];
      let size = 0;
      res.on("data", (c) => {
        size += c.length;
        if (size > maxBytes) {
          req.destroy();
          return reject(new Error("Attachment too large"));
        }
        chunks.push(c);
      });
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
  });
}

// Retrieve the full received email (includes text/html body + attachment list).
function fetchReceivedEmail(emailId) {
  return resendApiGet(`/emails/receiving/${encodeURIComponent(emailId)}`);
}

// Retrieve one attachment's bytes: get its signed download_url, then fetch it.
async function fetchReceivedAttachmentBytes(emailId, attachmentId) {
  const meta = await resendApiGet(
    `/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
  if (!meta.download_url) throw new Error("No download_url for attachment");
  const buffer = await fetchUrlBytes(meta.download_url);
  return {
    buffer,
    filename: meta.filename || "attachment",
    contentType: (
      meta.content_type || "application/octet-stream"
    ).toLowerCase(),
  };
}

module.exports = {
  verifySvixSignature,
  normalizeInboundEvent,
  extractAddress,
  extractName,
  fetchReceivedEmail,
  fetchReceivedAttachmentBytes,
};
