'use strict';

const { sendJson, sendCors, parseBody } = require('../lib/utils');
const { parseInvoiceWithAI, parseInvoiceImageWithAI } = require('../lib/gemini');

const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function attach(router) {
    router.add('OPTIONS', '/api/ai/invoice', ({ res }) => sendCors(res));

    router.add('POST', '/api/ai/invoice', async ({ req, res }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        if (!body.prompt?.trim()) return sendJson(res, 400, { error: 'prompt is required' });

        try {
            const data = await parseInvoiceWithAI(body.prompt.trim(), body.lang || 'en');
            return sendJson(res, 200, { success: true, data });
        } catch (err) {
            return sendJson(res, err.statusCode || 500, { error: err.message || 'AI processing failed' });
        }
    });

    router.add('OPTIONS', '/api/ai/invoice-image', ({ res }) => sendCors(res));

    router.add('POST', '/api/ai/invoice-image', async ({ req, res }) => {
        let body;
        try { body = await parseBody(req, { maxBytes: IMAGE_MAX_BYTES }); }
        catch (err) {
            const status = /too large/i.test(err.message) ? 413 : 400;
            return sendJson(res, status, { error: err.message || 'Invalid request body' });
        }

        const image = typeof body.image === 'string' ? body.image.trim() : '';
        const mime = typeof body.mimeType === 'string' ? body.mimeType.toLowerCase() : '';
        if (!image) return sendJson(res, 400, { error: 'image is required (base64)' });
        if (!ALLOWED_IMAGE_MIME.has(mime)) {
            return sendJson(res, 400, { error: 'Unsupported image type. Use JPEG, PNG, WEBP or HEIC.' });
        }

        try {
            const data = await parseInvoiceImageWithAI(image, mime, body.lang || 'en');
            return sendJson(res, 200, { success: true, data });
        } catch (err) {
            return sendJson(res, err.statusCode || 500, { error: err.message || 'AI processing failed' });
        }
    });
}

module.exports = { attach };
