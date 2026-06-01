'use strict';

const { sendJson } = require('../lib/utils');
const { getUserInvoices } = require('../lib/storage');
const { isConfigured, createInvoiceCheckout } = require('../lib/payments');

function getAppUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
}

function attach(router) {
    // Mint a Stripe Checkout link the client can use to pay a specific invoice.
    router.add('POST', '/api/pay-link/:id', async ({ req, res, userEmail, params }) => {
        if (!isConfigured()) {
            return sendJson(res, 503, { error: 'Payments are not configured' });
        }
        const invoices = await getUserInvoices(userEmail);
        const invoice = invoices.find((inv) => inv.id === params.id);
        if (!invoice) return sendJson(res, 404, { error: 'Invoice not found' });
        if (invoice.status === 'paid') {
            return sendJson(res, 409, { error: 'Invoice is already paid' });
        }

        try {
            const { url } = await createInvoiceCheckout(invoice, userEmail, getAppUrl(req));
            return sendJson(res, 200, { url });
        } catch (err) {
            return sendJson(res, err.statusCode || 500, {
                error: err.message || 'Failed to create payment link',
            });
        }
    });
}

module.exports = { attach };
