'use strict';
const https = require('https');

function fetchCnbRate(dateStr, currency = 'EUR') {
    return new Promise((resolve, reject) => {
        const url = `https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt?date=${dateStr}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return resolve(null);
                const line = data.split('\n').find(l => l.includes(`|${currency}|`));
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

function fetchEcbRate(currency = 'CZK') {
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

async function getExchangeRate(source, target, date) {
    const rate = source.toUpperCase() === 'CNB'
        ? await fetchCnbRate(date || '', target)
        : await fetchEcbRate(target);

    if (!rate) {
        const err = new Error('Rate not found for given parameters');
        err.statusCode = 404;
        throw err;
    }
    return { source, target, date, rate };
}

module.exports = { getExchangeRate, fetchCnbRate, fetchEcbRate };
