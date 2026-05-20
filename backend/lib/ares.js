'use strict';
const https = require('https');
const zlib = require('zlib');

function requestJson(options, body, maxRedirects = 2) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (proxyRes) => {
            const status = proxyRes.statusCode || 500;
            const location = proxyRes.headers.location;
            if (maxRedirects > 0 && location && status >= 300 && status < 400) {
                try {
                    const redirectUrl = new URL(location, `https://${options.hostname}`);
                    resolve(requestJson({
                        ...options,
                        hostname: redirectUrl.hostname,
                        path: `${redirectUrl.pathname}${redirectUrl.search}`
                    }, body, maxRedirects - 1));
                    return;
                } catch (error) { reject(error); return; }
            }
            const encoding = String(proxyRes.headers['content-encoding'] || '').toLowerCase();
            const stream = (encoding === 'gzip' || encoding === 'deflate')
                ? proxyRes.pipe(zlib.createUnzip())
                : proxyRes;
            let data = '';
            stream.on('data', (chunk) => { data += chunk; });
            stream.on('end', () => {
                try {
                    resolve({ ok: status >= 200 && status < 300, status, parsed: JSON.parse(data) });
                } catch {
                    resolve({ ok: false, status, error: 'Invalid JSON from ARES', snippet: data.slice(0, 200) });
                }
            });
        });
        req.on('error', (err) => { reject(err); });
        if (body) req.write(body);
        req.end();
    });
}

async function proxyJsonWithFallback(optionsList, body) {
    let lastError = null;
    for (const options of optionsList) {
        try {
            const result = await requestJson(options, body);
            if (result.ok) return result.parsed;
            lastError = result;
            if (result.status === 404 || result.status === 410) continue;
            const err = new Error(result.parsed?.error || result.error || 'ARES request failed');
            err.statusCode = result.status || 502;
            throw err;
        } catch (err) {
            if (err.statusCode) throw err;
            lastError = { error: err.message };
        }
    }
    const err = new Error('ARES request failed');
    err.statusCode = lastError?.status || 502;
    throw err;
}

const ARES_HEADERS = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': 'InvoiceMaker/1.0'
};

async function searchAres(body) {
    const payload = JSON.stringify({
        obchodniJmeno: String(body.obchodniJmeno || '').trim(),
        ico: body.ico ? String(body.ico).trim() : undefined,
        pocet: body.pocet || 8,
        strana: body.strana || 1
    });
    return proxyJsonWithFallback([
        {
            hostname: 'ares.gov.cz',
            path: '/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat',
            method: 'POST',
            headers: { ...ARES_HEADERS, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        },
        {
            hostname: 'ares.gov.cz',
            path: '/ekonomicke-subjekty/rest/ekonomicke-subjekty/vyhledat',
            method: 'POST',
            headers: { ...ARES_HEADERS, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }
    ], payload);
}

async function lookupAresByIco(ico) {
    if (!ico) {
        const err = new Error('Missing ico');
        err.statusCode = 400;
        throw err;
    }
    const encoded = encodeURIComponent(ico);
    return proxyJsonWithFallback([
        {
            hostname: 'ares.gov.cz',
            path: `/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encoded}`,
            method: 'GET',
            headers: ARES_HEADERS
        },
        {
            hostname: 'ares.gov.cz',
            path: `/ekonomicke-subjekty/rest/ekonomicke-subjekty/${encoded}`,
            method: 'GET',
            headers: ARES_HEADERS
        }
    ], null);
}

async function fetchAresByIco(ico) {
    try {
        const result = await requestJson({
            hostname: 'ares.gov.cz',
            path: `/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${encodeURIComponent(ico)}`,
            method: 'GET',
            headers: ARES_HEADERS
        }, null);
        return result.ok ? result.parsed : null;
    } catch { return null; }
}

async function fetchAresByName(name) {
    try {
        const payload = JSON.stringify({ obchodniJmeno: name, pocet: 1, strana: 1 });
        const result = await requestJson({
            hostname: 'ares.gov.cz',
            path: '/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/vyhledat',
            method: 'POST',
            headers: { ...ARES_HEADERS, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }, payload);
        if (!result.ok) return null;
        const entities = result.parsed?.ekonomickeSubjekty;
        if (!Array.isArray(entities) || entities.length === 0) return null;
        const first = entities[0];
        if (first.ico) {
            const full = await fetchAresByIco(first.ico);
            return full || first;
        }
        return first;
    } catch { return null; }
}

module.exports = { searchAres, lookupAresByIco, fetchAresByIco, fetchAresByName };
