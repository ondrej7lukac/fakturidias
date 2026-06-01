'use strict';

// Public REST API (v1), authenticated by Bearer API key rather than a session.
// Registered on the PUBLIC router so it runs before the session-auth gate.

const crypto = require('crypto');
const { sendJson, parseBody } = require('../lib/utils');
const {
    findUserByApiKey,
    getUserInvoices,
    saveInvoice,
    getSubscription,
    getGlobalSettings,
} = require('../lib/storage');
const { isPro } = require('../lib/plan');
const { fireWebhooks } = require('../lib/webhooks');

async function authenticate(req) {
    const header = req.headers['authorization'] || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    return findUserByApiKey(match[1].trim());
}

function publicInvoice(inv) {
    // Shape the stored document into a stable public representation.
    return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        documentType: inv.documentType || 'invoice',
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        amount: inv.amount,
        client: inv.client,
        items: inv.items,
    };
}

function attach(router) {
    router.add('GET', '/api/v1/invoices', async ({ req, res }) => {
        const userEmail = await authenticate(req);
        if (!userEmail) return sendJson(res, 401, { error: 'Invalid API key' });
        const invoices = await getUserInvoices(userEmail);
        return sendJson(res, 200, { invoices: invoices.map(publicInvoice) });
    });

    router.add('GET', '/api/v1/invoices/:id', async ({ req, res, params }) => {
        const userEmail = await authenticate(req);
        if (!userEmail) return sendJson(res, 401, { error: 'Invalid API key' });
        const invoices = await getUserInvoices(userEmail);
        const invoice = invoices.find((inv) => inv.id === params.id);
        if (!invoice) return sendJson(res, 404, { error: 'Invoice not found' });
        return sendJson(res, 200, { invoice: publicInvoice(invoice) });
    });

    router.add('POST', '/api/v1/invoices', async ({ req, res }) => {
        const userEmail = await authenticate(req);
        if (!userEmail) return sendJson(res, 401, { error: 'Invalid API key' });

        let body;
        try {
            body = await parseBody(req);
        } catch {
            return sendJson(res, 400, { error: 'Invalid request body' });
        }
        const input = body?.invoice;
        if (!input || typeof input !== 'object') {
            return sendJson(res, 400, { error: 'invoice object is required' });
        }
        if (!Array.isArray(input.items) || input.items.length === 0) {
            return sendJson(res, 400, { error: 'invoice.items must be a non-empty array' });
        }

        const existing = await getUserInvoices(userEmail);
        const subscription = await getSubscription(userEmail);
        const { freeInvoiceLimit } = await getGlobalSettings();
        if (!isPro(subscription) && existing.length >= freeInvoiceLimit) {
            return sendJson(res, 403, {
                error: 'Invoice limit reached',
                limitReached: true,
                limit: freeInvoiceLimit,
            });
        }

        // Whitelist fields — never persist the raw request body verbatim.
        const amount = (input.items || []).reduce(
            (sum, it) => sum + (Number(it.total) || Number(it.qty) * Number(it.price) || 0),
            0,
        );
        const today = new Date().toISOString().split('T')[0];
        const invoice = {
            id: typeof input.id === 'string' && input.id ? input.id : crypto.randomUUID(),
            invoiceNumber: String(input.invoiceNumber || '').slice(0, 64),
            documentType: input.documentType || 'invoice',
            status: input.status || 'draft',
            issueDate: input.issueDate || today,
            dueDate: input.dueDate || today,
            currency: String(input.currency || 'CZK').slice(0, 8),
            amount,
            client: input.client && typeof input.client === 'object' ? input.client : {},
            items: input.items,
            payment: input.payment && typeof input.payment === 'object' ? input.payment : {},
            supplier: input.supplier && typeof input.supplier === 'object' ? input.supplier : {},
            isVatPayer: !!input.isVatPayer,
        };
        if (!invoice.invoiceNumber) {
            return sendJson(res, 400, { error: 'invoice.invoiceNumber is required' });
        }

        const ok = await saveInvoice(userEmail, invoice);
        if (!ok) return sendJson(res, 500, { error: 'Failed to save invoice' });

        fireWebhooks(userEmail, 'invoice.created', publicInvoice(invoice)).catch(() => {});
        return sendJson(res, 201, { invoice: publicInvoice(invoice) });
    });
}

module.exports = { attach };
