'use strict';

const { sendJson, sendCors, parseBody } = require('../lib/utils');
const { searchRpo, lookupRpoByIco } = require('../lib/slovakRpo');

function attach(router) {
    router.add('OPTIONS', '/api/rpo/search', ({ res }) => sendCors(res));
    router.add('POST', '/api/rpo/search', async ({ req, res }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        try {
            const data = await searchRpo(body.name, body.limit);
            return sendJson(res, 200, data);
        } catch (err) {
            return sendJson(res, err.statusCode || 502, { error: err.message });
        }
    });

    router.add('OPTIONS', '/api/rpo/ico', ({ res }) => sendCors(res));
    router.add('GET', '/api/rpo/ico', async ({ res, url }) => {
        const ico = (url.searchParams.get('ico') || '').trim();
        if (!ico) return sendJson(res, 400, { error: 'Missing ico' });

        try {
            const data = await lookupRpoByIco(ico);
            return sendJson(res, 200, data);
        } catch (err) {
            return sendJson(res, err.statusCode || 502, { error: err.message });
        }
    });
}

module.exports = { attach };
