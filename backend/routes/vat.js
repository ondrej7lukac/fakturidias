'use strict';

const { sendJson, sendCors, parseBody } = require('../lib/utils');
const { checkVatNumber } = require('../lib/vies');

function attach(router) {
    router.add('OPTIONS', '/api/vat/validate', ({ res }) => sendCors(res));
    router.add('POST', '/api/vat/validate', async ({ req, res }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        try {
            const result = await checkVatNumber(body.vat);
            return sendJson(res, 200, result);
        } catch (err) {
            return sendJson(res, err.statusCode || 502, { error: err.message });
        }
    });
}

module.exports = { attach };
