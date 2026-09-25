'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const {
    getUserInvoices,
    saveInvoice,
    deleteInvoice,
    getSubscription,
    getGlobalSettings,
    peekInvoiceCounter,
    reserveInvoiceCounter
} = require('../lib/storage');
const { isPro } = require('../lib/plan');
const { fireWebhooks } = require('../lib/webhooks');

function attach(router) {
    router.add('GET', '/api/invoices', async ({ res, userEmail }) => {
        const invoices = await getUserInvoices(userEmail);
        return sendJson(res, 200, { invoices });
    });

    router.add('POST', '/api/invoices', async ({ req, res, userEmail }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        const { invoice } = body;
        if (!invoice?.id) return sendJson(res, 400, { error: 'Invoice id is required' });

        // Enforce plan limits for new invoices only
        const existingInvoices = await getUserInvoices(userEmail);
        const isNew = !existingInvoices.find(inv => inv.id === invoice.id);
        if (isNew) {
            const subscription = await getSubscription(userEmail);
            const { freeInvoiceLimit } = await getGlobalSettings();
            if (!isPro(subscription) && existingInvoices.length >= freeInvoiceLimit) {
                return sendJson(res, 403, {
                    error: 'Invoice limit reached',
                    limitReached: true,
                    limit: freeInvoiceLimit,
                    plan: 'free'
                });
            }
        }

        const success = await saveInvoice(userEmail, invoice);
        if (success) {
            fireWebhooks(
                userEmail,
                isNew ? 'invoice.created' : 'invoice.updated',
                invoice,
            ).catch(() => {});
        }
        return success
            ? sendJson(res, 200, { success: true, invoice })
            : sendJson(res, 500, { error: 'Failed to save' });
    });

    // Per-document-type sequence numbering. Peeking never mutates the counter
    // (safe to call on every keystroke/render); reserving atomically consumes
    // the next number and must only be called once, when an invoice is first
    // persisted, so numbers are never skipped or duplicated across devices.
    router.add('GET', '/api/invoices/counter', async ({ res, userEmail, url }) => {
        const documentType = url.searchParams.get('documentType') || 'invoice';
        const counter = await peekInvoiceCounter(userEmail, documentType);
        return sendJson(res, 200, { counter });
    });

    router.add('POST', '/api/invoices/counter', async ({ req, res, userEmail }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        const documentType = body.documentType || 'invoice';
        const counter = await reserveInvoiceCounter(userEmail, documentType);
        return sendJson(res, 200, { counter });
    });

    router.add('DELETE', '/api/invoices/:id', async ({ res, userEmail, params }) => {
        const success = await deleteInvoice(userEmail, params.id);
        return success
            ? sendJson(res, 200, { success: true })
            : sendJson(res, 500, { error: 'Failed to delete' });
    });
}

module.exports = { attach };
