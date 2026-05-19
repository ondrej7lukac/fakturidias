'use strict';

const { sendJson, sendCors } = require('../lib/utils');
const { getExchangeRate } = require('../lib/exchangeRate');

function attach(router) {
    router.add('OPTIONS', '/api/exchange-rate', ({ res }) => sendCors(res));
    router.add('GET', '/api/exchange-rate', async ({ res, url }) => {
        const source = url.searchParams.get('source') || 'CNB';
        const target = url.searchParams.get('target') || 'EUR';
        const date = url.searchParams.get('date');

        try {
            const result = await getExchangeRate(source, target, date);
            return sendJson(res, 200, result);
        } catch (err) {
            return sendJson(res, err.statusCode || 502, { error: err.message });
        }
    });
}

module.exports = { attach };
