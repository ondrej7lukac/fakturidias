'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const { sendEmail } = require('../lib/email');

function attach(router) {
    router.add('POST', '/api/email/send', async ({ req, res }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        try {
            const result = await sendEmail(body.invoice, body.pdfBase64, body.lang);
            return sendJson(res, 200, { success: true, id: result.id });
        } catch (err) {
            return sendJson(res, err.statusCode || 500, { error: err.message });
        }
    });
}

module.exports = { attach };
