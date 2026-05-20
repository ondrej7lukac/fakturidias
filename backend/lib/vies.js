'use strict';
const https = require('https');

function validateVatWithVies(ms, vatNumber) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ countryCode: ms, vatNumber });
        const options = {
            hostname: 'ec.europa.eu',
            path: '/taxation_customs/vies/rest-api/check-vat-number',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({
                        ok: res.statusCode === 200,
                        isValid: parsed.isValid,
                        name: parsed.name,
                        address: parsed.address,
                        requestDate: parsed.requestDate,
                        error: parsed.userError || null
                    });
                } catch {
                    resolve({ ok: false, error: 'Invalid response from VIES' });
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function checkVatNumber(vat) {
    const fullVat = String(vat || '').trim().toUpperCase().replace(/\s/g, '');
    if (!fullVat) {
        const err = new Error('Missing VAT number');
        err.statusCode = 400;
        throw err;
    }

    const ms = fullVat.slice(0, 2);
    const vatNumber = fullVat.slice(2);

    if (!/^[A-Z]{2}$/.test(ms) || !vatNumber) {
        const err = new Error('Invalid VAT format (expected CC12345678)');
        err.statusCode = 400;
        throw err;
    }

    const result = await validateVatWithVies(ms, vatNumber);
    if (!result.ok) {
        const err = new Error('VIES validation failed');
        err.statusCode = 502;
        err.details = result.error;
        throw err;
    }
    return result;
}

module.exports = { checkVatNumber };
