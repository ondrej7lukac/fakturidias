'use strict';
const https = require('https');
const { sendJson } = require('./utils');

function requestJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'InvoiceMaker/1.0' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, parsed: JSON.parse(data) });
                } catch {
                    resolve({ ok: false, status: res.statusCode, error: 'Invalid JSON from RPO', snippet: data.slice(0, 200) });
                }
            });
        }).on('error', reject);
    });
}

function formatRpoAddress(addr) {
    if (!addr) return '';
    const parts = [];
    if (addr.street) parts.push(addr.street);
    if (addr.regNumber || addr.buildingNumber) {
        parts.push(`${addr.regNumber || ''}${addr.regNumber && addr.buildingNumber ? '/' : ''}${addr.buildingNumber || ''}`);
    }
    const streetPart = parts.join(' ').trim();
    const cityPart = `${addr.municipality?.name || ''} ${addr.postalCode || ''}`.trim();
    return [streetPart, cityPart].filter(Boolean).join(', ');
}

async function handleRpoSearch(req, res, body) {
    const name = String(body.name || '').trim();
    const limit = body.limit || 8;
    if (!name) return sendJson(res, 400, { error: 'Missing search name' });

    const url = `https://rpo.statistics.sk/rpo/api/organizations?name=${encodeURIComponent(name)}&limit=${limit}`;

    try {
        const result = await requestJson(url);
        if (result.ok) {
            const mapped = (result.parsed || []).map(org => ({
                name: org.fullName || org.name,
                ico: org.cin || org.ico,
                address: formatRpoAddress(org.address),
                city: org.address?.municipality?.name || '',
                dic: org.tin || '',
                icDph: org.vatin || ''
            }));
            sendJson(res, 200, mapped);
        } else {
            sendJson(res, result.status || 502, { error: 'RPO search failed' });
        }
    } catch {
        sendJson(res, 502, { error: 'RPO search unavailable' });
    }
}

async function handleRpoIco(req, res, url) {
    const ico = (url.searchParams.get('ico') || '').trim();
    if (!ico) return sendJson(res, 400, { error: 'Missing ico' });

    const apiUrl = `https://rpo.statistics.sk/rpo/api/organizations?cin=${encodeURIComponent(ico)}`;

    try {
        const result = await requestJson(apiUrl);
        if (result.ok && result.parsed?.length > 0) {
            const org = result.parsed[0];
            sendJson(res, 200, {
                name: org.fullName || org.name,
                ico: org.cin || org.ico,
                address: formatRpoAddress(org.address),
                city: org.address?.municipality?.name || '',
                dic: org.tin || '',
                icDph: org.vatin || ''
            });
        } else {
            sendJson(res, 404, { error: 'Organization not found in RPO' });
        }
    } catch {
        sendJson(res, 502, { error: 'RPO lookup unavailable' });
    }
}

module.exports = { handleRpoSearch, handleRpoIco };
