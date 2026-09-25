'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const { sendEmail } = require('../lib/email');
const { getOrCreateShareUrl } = require('./share');

function attach(router) {
    router.add('POST', '/api/email/send', async ({ req, res, userEmail }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        try {
            // The share link is resolved here (not trusted from the client) so
            // it always points at an invoice this user actually owns.
            let shareUrl = null;
            if (body.includeShareLink && body.invoice?.id) {
                shareUrl = await getOrCreateShareUrl(req, userEmail, body.invoice.id);
            }
            const result = await sendEmail(body.invoice, body.pdfBase64, body.lang, {
                subject: body.subject,
                message: body.message,
                shareUrl,
            });
            return sendJson(res, 200, { success: true, id: result.id });
        } catch (err) {
            return sendJson(res, err.statusCode || 500, { error: err.message });
        }
    });
}

module.exports = { attach };
