'use strict';

const { sendJson, sendCors, parseBody } = require('../lib/utils');
const { parseInvoiceWithAI } = require('../lib/gemini');

function attach(router) {
    router.add('OPTIONS', '/api/ai/invoice', ({ res }) => sendCors(res));

    router.add('POST', '/api/ai/invoice', async ({ req, res }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        if (!body.prompt?.trim()) return sendJson(res, 400, { error: 'prompt is required' });

        try {
            const data = await parseInvoiceWithAI(body.prompt.trim(), body.lang || 'en');
            return sendJson(res, 200, { success: true, data });
        } catch (err) {
            return sendJson(res, err.statusCode || 500, { error: err.message || 'AI processing failed' });
        }
    });
}

module.exports = { attach };
