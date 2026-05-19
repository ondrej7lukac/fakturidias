'use strict';
const isProd = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

function logDebug(location, message, data) {
    if (!isProd) {
        console.debug(`[${location}]`, message, data != null ? data : '');
    }
}

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Permitted-Cross-Domain-Policies': 'none'
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function sendJson(res, status, payload) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        ...CORS_HEADERS,
        ...SECURITY_HEADERS
    });
    res.end(JSON.stringify(payload));
}

function sendCors(res) {
    res.writeHead(204, CORS_HEADERS);
    res.end();
}

function sendNotFound(res) {
    res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...SECURITY_HEADERS
    });
    res.end('Not found');
}

function readJsonBody(req, callback) {
    let data = '';
    let byteCount = 0;
    let settled = false;

    const done = (err, result) => {
        if (settled) return;
        settled = true;
        callback(err, result);
    };

    req.on('data', (chunk) => {
        if (settled) return;
        byteCount += chunk.length;
        if (byteCount > MAX_BODY_BYTES) {
            done(new Error('Request body too large'));
            req.socket?.destroy();
            return;
        }
        data += chunk;
    });
    req.on('end', () => {
        if (settled) return;
        try {
            done(null, JSON.parse(data || '{}'));
        } catch {
            done(new Error('Invalid JSON body'));
        }
    });
    req.on('error', (err) => done(err));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        readJsonBody(req, (err, body) => (err ? reject(err) : resolve(body)));
    });
}

module.exports = {
    logDebug,
    sendJson,
    sendCors,
    sendNotFound,
    readJsonBody,
    parseBody,
    SECURITY_HEADERS
};
