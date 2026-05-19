'use strict';

const { sendJson, readJsonBody } = require('../lib/utils');
const { handleEmailSend } = require('../lib/email');

function attach(router) {
    router.add('POST', '/api/email/send', ({ req, res }) => {
        readJsonBody(req, (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            return handleEmailSend(req, res, body);
        });
    });
}

module.exports = { attach };
