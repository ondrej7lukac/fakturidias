'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const {
    getUserInvoices,
    saveSingleInvoice,
    saveUserInvoices_FS,
    isConnected,
    InvoiceModel
} = require('../lib/storage');

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

        let success = false;
        if (isConnected()) {
            success = await saveSingleInvoice(userEmail, invoice);
        } else {
            const invoices = await getUserInvoices(userEmail);
            const idx = invoices.findIndex(inv => inv.id === invoice.id);
            if (idx >= 0) invoices[idx] = invoice; else invoices.push(invoice);
            success = saveUserInvoices_FS(userEmail, invoices);
        }
        return success
            ? sendJson(res, 200, { success: true, invoice })
            : sendJson(res, 500, { error: 'Failed to save' });
    });

    router.add('DELETE', '/api/invoices/:id', async ({ res, userEmail, params }) => {
        const { id } = params;
        if (isConnected()) {
            await InvoiceModel.deleteOne({ userEmail, id });
            return sendJson(res, 200, { success: true });
        }
        const invoices = await getUserInvoices(userEmail);
        const filtered = invoices.filter(inv => inv.id !== id);
        const success = saveUserInvoices_FS(userEmail, filtered);
        return success
            ? sendJson(res, 200, { success: true })
            : sendJson(res, 500, { error: 'Failed to delete' });
    });
}

module.exports = { attach };
