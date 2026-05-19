'use strict';
const https = require('https');
const { sendJson } = require('./utils');

async function fetchCnbRate(dateStr, currency = 'EUR') {
    return new Promise((resolve, reject) => {
        const url = `https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt?date=${dateStr}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return resolve(null);
                const lines = data.split('\n');
                const line = lines.find(l => l.includes(`|${currency}|`));
                if (line) {
                    const parts = line.split('|');
                    const amount = parseFloat(parts[2].replace(',', '.'));
                    const rate = parseFloat(parts[4].replace(',', '.'));
                    resolve(rate / amount);
                } else {
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function fetchEcbRate(currency = 'CZK') {
    return new Promise((resolve, reject) => {
        https.get('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return resolve(null);
                const regex = new RegExp(`currency='${currency}'\\s+rate='([\\d.]+)'`);
                const match = data.match(regex);
                resolve(match?.[1] ? parseFloat(match[1]) : null);
            });
        }).on('error', reject);
    });
}

async function handleExchangeRate(req, res, url) {
    const source = url.searchParams.get('source') || 'CNB';
    const target = url.searchParams.get('target') || 'EUR';
    const date = url.searchParams.get('date');

    try {
        const rate = source.toUpperCase() === 'CNB'
            ? await fetchCnbRate(date || '', target)
            : await fetchEcbRate(target);

        if (rate) {
            sendJson(res, 200, { source, target, date, rate });
        } else {
            sendJson(res, 404, { error: 'Rate not found for given parameters' });
        }
    } catch {
        sendJson(res, 502, { error: 'Failed to fetch exchange rate' });
    }
}

module.exports = { handleExchangeRate, fetchCnbRate, fetchEcbRate };
