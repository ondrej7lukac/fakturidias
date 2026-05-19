'use strict';

const { sendJson, sendCors, readJsonBody } = require('../lib/utils');
const { handleRpoSearch, handleRpoIco } = require('../lib/slovakRpo');

function attach(router) {
    router.add('OPTIONS', '/api/rpo/search', ({ res }) => sendCors(res));
    router.add('POST', '/api/rpo/search', ({ req, res }) => {
        readJsonBody(req, (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            return handleRpoSearch(req, res, body);
        });
    });

    router.add('OPTIONS', '/api/rpo/ico', ({ res }) => sendCors(res));
    router.add('GET', '/api/rpo/ico', ({ req, res, url }) => handleRpoIco(req, res, url));
}

module.exports = { attach };
