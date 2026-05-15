const https = require('https');
const { sendJson } = require('./utils');

/**
 * Exchange Rate Service (CNB & ECB)
 */

/**
 * Fetches CNB rates for a specific date
 * Format: DD.MM.YYYY
 */
async function fetchCnbRate(dateStr, currency = 'EUR') {
    return new Promise((resolve, reject) => {
        const url = `https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt?date=${dateStr}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return resolve(null);
                const lines = data.split('\n');
                // Format: země|měna|množství|kód|kurz
                // Luksembursko|euro|1|EUR|25,123
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

/**
 * Fetches ECB rates
 * Note: ECB mostly provides current rates in a simple XML. 
 * For historicals, specialized APIs or parsing hist.xml is needed.
 * Here we'll stick to current or recent for simplicity.
 */
async function fetchEcbRate(currency = 'CZK') {
    return new Promise((resolve, reject) => {
        const url = `https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) return resolve(null);
                // Simple regex for XML parsing to avoid large dependencies
                const regex = new RegExp(`currency='${currency}'\\s+rate='([\\d.]+)'`);
                const match = data.match(regex);
                if (match && match[1]) {
                    resolve(parseFloat(match[1]));
                } else {
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function handleExchangeRate(req, res, url) {
    const source = url.searchParams.get('source') || 'CNB'; // CNB or ECB
    const target = url.searchParams.get('target') || 'EUR';
    const date = url.searchParams.get('date'); // DD.MM.YYYY

    try {
        let rate = null;
        if (source.toUpperCase() === 'CNB') {
            // CNB gives rate for 1 target currency in CZK
            rate = await fetchCnbRate(date || '', target);
        } else {
            // ECB gives rate for 1 EUR in target currency
            rate = await fetchEcbRate(target);
        }

        if (rate) {
            sendJson(res, 200, { source, target, date, rate });
        } else {
            sendJson(res, 404, { error: 'Rate not found for given parameters' });
        }
    } catch (error) {
        sendJson(res, 502, { error: 'Failed to fetch exchange rate', message: error.message });
    }
}

module.exports = {
    handleExchangeRate,
    fetchCnbRate,
    fetchEcbRate
};
