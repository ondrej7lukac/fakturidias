'use strict';
const https = require('https');

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

function mapOrg(org) {
    return {
        name: org.fullName || org.name,
        ico: org.cin || org.ico,
        address: formatRpoAddress(org.address),
        city: org.address?.municipality?.name || '',
        dic: org.tin || '',
        icDph: org.vatin || ''
    };
}

async function searchRpo(name, limit = 8) {
    if (!name) {
        const err = new Error('Missing search name');
        err.statusCode = 400;
        throw err;
    }
    const url = `https://rpo.statistics.sk/rpo/api/organizations?name=${encodeURIComponent(name)}&limit=${limit}`;
    const result = await requestJson(url);
    if (!result.ok) {
        const err = new Error('RPO search failed');
        err.statusCode = result.status || 502;
        throw err;
    }
    return (result.parsed || []).map(mapOrg);
}

async function lookupRpoByIco(ico) {
    if (!ico) {
        const err = new Error('Missing ico');
        err.statusCode = 400;
        throw err;
    }
    const url = `https://rpo.statistics.sk/rpo/api/organizations?cin=${encodeURIComponent(ico)}`;
    const result = await requestJson(url);
    if (!result.ok || !result.parsed?.length) {
        const err = new Error('Organization not found in RPO');
        err.statusCode = 404;
        throw err;
    }
    return mapOrg(result.parsed[0]);
}

module.exports = { searchRpo, lookupRpoByIco };
