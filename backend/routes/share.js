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

// Generate (or reuse) a share token for one of the user's invoices. Shared
// by the share-link endpoint and the email route (for the optional "include
// link" attachment), so both trust the same ownership check instead of the
// client handing over a raw URL. `error` is 'not_found' or 'save_failed'
// when `token` comes back empty, so callers can tell the two apart.
async function ensureShareToken(userEmail, invoiceId) {
    const invoices = await getUserInvoices(userEmail);
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return { error: 'not_found' };

    let token = invoice.publicToken;
    if (!token) {
        token = crypto.randomBytes(18).toString('base64url');
        const ok = await saveInvoice(userEmail, { ...invoice, publicToken: token });
        if (!ok) return { error: 'save_failed' };
    }
    return { token, invoice };
}

async function getOrCreateShareUrl(req, userEmail, invoiceId) {
    const result = await ensureShareToken(userEmail, invoiceId);
    return result.token ? `${getAppUrl(req)}/i/${result.token}` : null;
}

function attachProtected(router) {
    // Generate (or reuse) a share token for one of the user's invoices.
    router.add('POST', '/api/share-link/:id', async ({ req, res, userEmail, params }) => {
        const result = await ensureShareToken(userEmail, params.id);
        if (result.error === 'not_found') {
            return sendJson(res, 404, { error: 'Invoice not found' });
        }
        if (result.error) {
            return sendJson(res, 500, { error: 'Failed to create share link' });
        }

        return sendJson(res, 200, {
            token: result.token,
            url: `${getAppUrl(req)}/i/${result.token}`,
            viewCount: result.invoice.viewCount || 0,
            viewedAt: result.invoice.viewedAt || null,
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

module.exports = { attachProtected, attachPublic, getOrCreateShareUrl };
