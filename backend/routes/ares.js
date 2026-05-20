'use strict';

const { sendJson, sendCors, parseBody } = require('../lib/utils');
const { searchAres, lookupAresByIco } = require('../lib/ares');

function attach(router) {
    router.add('OPTIONS', '/api/ares/search', ({ res }) => sendCors(res));
    router.add('POST', '/api/ares/search', async ({ req, res }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        try {
            const data = await searchAres(body);
            return sendJson(res, 200, data);
        } catch (err) {
            return sendJson(res, err.statusCode || 502, { error: err.message });
        }
    });

    router.add('OPTIONS', '/api/ares/ico', ({ res }) => sendCors(res));
    router.add('GET', '/api/ares/ico', async ({ res, url }) => {
        const ico = (url.searchParams.get('ico') || '').trim();
        if (!ico) return sendJson(res, 400, { error: 'Missing ico' });

        try {
            const data = await lookupAresByIco(ico);
            return sendJson(res, 200, data);
        } catch (err) {
            return sendJson(res, err.statusCode || 502, { error: err.message });
        }
    });
}

module.exports = { attach };
