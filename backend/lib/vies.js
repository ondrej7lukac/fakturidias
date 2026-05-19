'use strict';
const https = require('https');
const { sendJson } = require('./utils');

async function validateVat(ms, vatNumber) {
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

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

async function handleVatValidate(req, res, body) {
    const fullVat = String(body.vat || '').trim().toUpperCase().replace(/\s/g, '');
    if (!fullVat) return sendJson(res, 400, { error: 'Missing VAT number' });

    const ms = fullVat.slice(0, 2);
    const vatNumber = fullVat.slice(2);

    if (!/^[A-Z]{2}$/.test(ms) || !vatNumber) {
        return sendJson(res, 400, { error: 'Invalid VAT format (expected CC12345678)' });
    }

    try {
        const result = await validateVat(ms, vatNumber);
        if (result.ok) {
            sendJson(res, 200, result);
        } else {
            sendJson(res, 502, { error: 'VIES validation failed', details: result.error });
        }
    } catch (error) {
        sendJson(res, 502, { error: 'VIES service unavailable' });
    }
}

module.exports = { handleVatValidate };
