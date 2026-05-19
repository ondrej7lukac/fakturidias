'use strict';

const { sendJson, sendCors, readJsonBody } = require('../lib/utils');
const { handleGeminiInvoice } = require('../lib/gemini');

function attach(router) {
    router.add('OPTIONS', '/api/ai/invoice', ({ res }) => sendCors(res));
    router.add('POST', '/api/ai/invoice', ({ req, res }) => {
        readJsonBody(req, (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            return handleGeminiInvoice(req, res, body);
        });
    });
}

module.exports = { attach };
