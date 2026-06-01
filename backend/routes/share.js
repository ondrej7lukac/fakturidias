'use strict';

const crypto = require('crypto');
const { sendJson } = require('../lib/utils');
const {
    getUserInvoices,
    saveInvoice,
    findInvoiceByPublicToken,
    recordInvoiceView,
} = require('../lib/storage');

function getAppUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    return `${protocol}://${req.headers.host}`;
}

// Strip internal/operational fields; keep what a client needs to see and pay.
function publicView(inv) {
    const payment = inv.payment || {};
    return {
        invoiceNumber: inv.invoiceNumber,
        documentType: inv.documentType || 'invoice',
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        taxableSupplyDate: inv.taxableSupplyDate,
        currency: inv.currency,
        amount: inv.amount,
        taxBase: inv.taxBase,
        taxRate: inv.taxRate,
        taxAmount: inv.taxAmount,
        isVatPayer: inv.isVatPayer,
        client: inv.client,
        supplier: inv.supplier,
        items: inv.items,
        payment: {
            iban: payment.iban,
            bic: payment.bic,
            accountNumber: payment.accountNumber,
            bankCode: payment.bankCode,
            variableSymbol: payment.variableSymbol,
            note: payment.note,
        },
    };
}

function attachProtected(router) {
    // Generate (or reuse) a share token for one of the user's invoices.
    router.add('POST', '/api/share-link/:id', async ({ req, res, userEmail, params }) => {
        const invoices = await getUserInvoices(userEmail);
        const invoice = invoices.find((inv) => inv.id === params.id);
        if (!invoice) return sendJson(res, 404, { error: 'Invoice not found' });

        let token = invoice.publicToken;
        if (!token) {
            token = crypto.randomBytes(18).toString('base64url');
            const ok = await saveInvoice(userEmail, { ...invoice, publicToken: token });
            if (!ok) return sendJson(res, 500, { error: 'Failed to create share link' });
        }
        return sendJson(res, 200, {
            token,
            url: `${getAppUrl(req)}/i/${token}`,
            viewCount: invoice.viewCount || 0,
            viewedAt: invoice.viewedAt || null,
        });
    });
}

function attachPublic(router) {
    router.add('GET', '/api/public/invoice/:token', async ({ res, params }) => {
        const found = await findInvoiceByPublicToken(params.token);
        if (!found) return sendJson(res, 404, { error: 'Invoice not found' });
        // Record the view but never block the response on it.
        recordInvoiceView(found.userEmail, found.invoice.id).catch(() => {});
        return sendJson(res, 200, { invoice: publicView(found.invoice) });
    });
}

module.exports = { attachProtected, attachPublic };
