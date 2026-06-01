'use strict';

const https = require('https');
const crypto = require('crypto');
const dns = require('dns').promises;
const { URL } = require('url');
const { getWebhookEndpoints } = require('./storage');

// Reject anything that could be used for SSRF against internal infrastructure.
function isPrivateIp(ip) {
    if (!ip) return true;
    const v = String(ip);
    if (v === '::1' || v.startsWith('fe80:') || v.startsWith('fc') || v.startsWith('fd')) {
        return true; // loopback / link-local / unique-local IPv6
    }
    // IPv4-mapped IPv6 (::ffff:10.0.0.1) — strip to the v4 tail.
    const mapped = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
    const ipv4 = mapped ? mapped[1] : v;
    const parts = ipv4.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
        return !mapped; // not an IPv4 literal; treat unknown as unsafe only if not mapped
    }
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
}

// Structural check used when a user registers an endpoint. Throws on rejection.
function assertSafeWebhookUrl(urlString) {
    let parsed;
    try {
        parsed = new URL(String(urlString));
    } catch {
        throw new Error('Invalid webhook URL');
    }
    if (parsed.protocol !== 'https:') {
        throw new Error('Webhook URL must use https://');
    }
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
        throw new Error('Webhook URL must not point to a private host');
    }
    // If the host is an IP literal, reject private ranges immediately.
    if (/^[\d.]+$/.test(host) || host.includes(':')) {
        if (isPrivateIp(host)) {
            throw new Error('Webhook URL must not point to a private address');
        }
    }
    return parsed;
}

// Resolve the host at delivery time and re-check the IP — defends against
// DNS rebinding (a public hostname that later resolves to a private address).
async function resolvesToPublicIp(hostname) {
    try {
        const records = await dns.lookup(hostname, { all: true });
        return records.length > 0 && records.every((r) => !isPrivateIp(r.address));
    } catch {
        return false;
    }
}

function signPayload(secret, body) {
    return crypto.createHmac('sha256', String(secret || '')).update(body).digest('hex');
}

function postJson(parsedUrl, body, signature) {
    return new Promise((resolve) => {
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'X-Fakturidias-Signature': signature,
            },
        };
        const req = https.request(options, (res) => {
            res.on('data', () => {});
            res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', () => resolve(0));
        req.on('timeout', () => {
            req.destroy();
            resolve(0);
        });
        req.write(body);
        req.end();
    });
}

// Fire-and-forget delivery to all of a user's endpoints subscribed to `event`.
async function fireWebhooks(userEmail, event, payload) {
    let endpoints;
    try {
        endpoints = await getWebhookEndpoints(userEmail);
    } catch {
        return;
    }
    const targets = (endpoints || []).filter(
        (e) => e.active !== false && Array.isArray(e.events) && e.events.includes(event),
    );
    if (targets.length === 0) return;

    const body = JSON.stringify({
        event,
        createdAt: new Date().toISOString(),
        data: payload,
    });

    await Promise.all(
        targets.map(async (endpoint) => {
            let parsed;
            try {
                parsed = assertSafeWebhookUrl(endpoint.url);
            } catch {
                return; // stored URL no longer passes validation
            }
            if (!(await resolvesToPublicIp(parsed.hostname))) return;
            const signature = signPayload(endpoint.secret, body);
            await postJson(parsed, body, signature);
        }),
    );
}

module.exports = { assertSafeWebhookUrl, isPrivateIp, fireWebhooks };
