'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const {
    getUserInvoices,
    saveInvoice,
    deleteInvoice,
    getSubscription,
    getGlobalSettings
} = require('../lib/storage');
const { isPro } = require('../lib/plan');

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
        return success
            ? sendJson(res, 200, { success: true, invoice })
            : sendJson(res, 500, { error: 'Failed to save' });
    });

    router.add('DELETE', '/api/invoices/:id', async ({ res, userEmail, params }) => {
        const success = await deleteInvoice(userEmail, params.id);
        return success
            ? sendJson(res, 200, { success: true })
            : sendJson(res, 500, { error: 'Failed to delete' });
    });
}

module.exports = { attach };
