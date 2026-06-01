'use strict';

const crypto = require('crypto');
const { sendJson, parseBody } = require('../lib/utils');
const {
    getApiKeys,
    saveApiKey,
    revokeApiKey,
    hashApiKey,
    getWebhookEndpoints,
    saveWebhookEndpoint,
    deleteWebhookEndpoint,
} = require('../lib/storage');
const { assertSafeWebhookUrl } = require('../lib/webhooks');

const WEBHOOK_EVENTS = ['invoice.created', 'invoice.updated', 'invoice.paid'];

// Never leak the hash; expose only display-safe metadata.
function publicKey(k) {
    return {
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        revoked: !!k.revoked,
        lastUsedAt: k.lastUsedAt || null,
        createdAt: k.createdAt,
    };
}

function publicEndpoint(e) {
    return { id: e.id, url: e.url, events: e.events, active: e.active !== false };
}

function attach(router) {
    router.add('GET', '/api/dev/keys', async ({ res, userEmail }) => {
        const keys = await getApiKeys(userEmail);
        return sendJson(res, 200, { keys: keys.map(publicKey) });
    });

    router.add('POST', '/api/dev/keys', async ({ req, res, userEmail }) => {
        let body = {};
        try {
            body = await parseBody(req);
        } catch {
            /* name is optional */
        }
        const raw = `fk_${crypto.randomBytes(24).toString('hex')}`;
        const record = {
            id: crypto.randomUUID(),
            name: String(body.name || 'API key').slice(0, 100),
            prefix: raw.slice(0, 11),
            keyHash: hashApiKey(raw),
            revoked: false,
            createdAt: new Date(),
        };
        const ok = await saveApiKey(userEmail, record);
        if (!ok) return sendJson(res, 500, { error: 'Failed to create API key' });
        // The raw key is returned exactly once and never stored in clear text.
        return sendJson(res, 201, { key: publicKey(record), secret: raw });
    });

    router.add('DELETE', '/api/dev/keys/:id', async ({ res, userEmail, params }) => {
        const ok = await revokeApiKey(userEmail, params.id);
        return ok
            ? sendJson(res, 200, { success: true })
            : sendJson(res, 404, { error: 'Key not found' });
    });

    router.add('GET', '/api/dev/webhooks', async ({ res, userEmail }) => {
        const hooks = await getWebhookEndpoints(userEmail);
        return sendJson(res, 200, { webhooks: hooks.map(publicEndpoint) });
    });

    router.add('POST', '/api/dev/webhooks', async ({ req, res, userEmail }) => {
        let body;
        try {
            body = await parseBody(req);
        } catch {
            return sendJson(res, 400, { error: 'Invalid request body' });
        }
        try {
            assertSafeWebhookUrl(body.url);
        } catch (err) {
            return sendJson(res, 400, { error: err.message });
        }
        const events = Array.isArray(body.events)
            ? body.events.filter((e) => WEBHOOK_EVENTS.includes(e))
            : [];
        if (events.length === 0) {
            return sendJson(res, 400, { error: 'At least one valid event is required' });
        }
        const record = {
            id: crypto.randomUUID(),
            url: String(body.url),
            events,
            secret: crypto.randomBytes(16).toString('hex'),
            active: true,
            createdAt: new Date(),
        };
        const ok = await saveWebhookEndpoint(userEmail, record);
        if (!ok) return sendJson(res, 500, { error: 'Failed to create webhook' });
        return sendJson(res, 201, {
            webhook: publicEndpoint(record),
            secret: record.secret,
        });
    });

    router.add('DELETE', '/api/dev/webhooks/:id', async ({ res, userEmail, params }) => {
        const ok = await deleteWebhookEndpoint(userEmail, params.id);
        return ok
            ? sendJson(res, 200, { success: true })
            : sendJson(res, 404, { error: 'Webhook not found' });
    });
}

module.exports = { attach, WEBHOOK_EVENTS };
