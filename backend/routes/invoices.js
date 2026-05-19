'use strict';

const { sendJson, readJsonBody } = require('../lib/utils');
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

    router.add('POST', '/api/invoices', ({ req, res, userEmail }) => {
        readJsonBody(req, async (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            const { invoice } = body;
            if (!invoice || !invoice.id) return sendJson(res, 400, { error: 'Invalid data' });

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
    });

    router.add('DELETE', '/api/invoices/:id', async ({ res, userEmail, params }) => {
        const { id } = params;
        if (isConnected()) {
            await InvoiceModel.deleteOne({ userEmail, id });
            return sendJson(res, 200, { success: true });
        } else {
            const invoices = await getUserInvoices(userEmail);
            const filtered = invoices.filter(inv => inv.id !== id);
            const success = saveUserInvoices_FS(userEmail, filtered);
            return success
                ? sendJson(res, 200, { success: true })
                : sendJson(res, 500, { error: 'Failed to delete' });
        }
    });
}

module.exports = { attach };
