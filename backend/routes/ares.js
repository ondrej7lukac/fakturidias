'use strict';

const { sendJson, sendCors, readJsonBody } = require('../lib/utils');
const { handleAresSearch, handleAresIco } = require('../lib/ares');

function attach(router) {
    router.add('OPTIONS', '/api/ares/search', ({ res }) => sendCors(res));
    router.add('POST', '/api/ares/search', ({ req, res }) => {
        readJsonBody(req, (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            return handleAresSearch(req, res, body);
        });
    });

    router.add('OPTIONS', '/api/ares/ico', ({ res }) => sendCors(res));
    router.add('GET', '/api/ares/ico', ({ req, res, url }) => handleAresIco(req, res, url));
}

module.exports = { attach };
