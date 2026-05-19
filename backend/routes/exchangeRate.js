'use strict';

const { sendCors } = require('../lib/utils');
const { handleExchangeRate } = require('../lib/exchangeRate');

function attach(router) {
    router.add('OPTIONS', '/api/exchange-rate', ({ res }) => sendCors(res));
    router.add('GET', '/api/exchange-rate', ({ req, res, url }) => handleExchangeRate(req, res, url));
}

module.exports = { attach };
