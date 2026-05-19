'use strict';

const { sendJson, sendCors, readJsonBody } = require('../lib/utils');
const { handleVatValidate } = require('../lib/vies');

function attach(router) {
    router.add('OPTIONS', '/api/vat/validate', ({ res }) => sendCors(res));
    router.add('POST', '/api/vat/validate', ({ req, res }) => {
        readJsonBody(req, (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            return handleVatValidate(req, res, body);
        });
    });
}

module.exports = { attach };
