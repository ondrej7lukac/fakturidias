'use strict';

// Thin payment-gateway layer. Today it wraps Stripe Checkout for one-off invoice
// payments; the exported interface (createInvoiceCheckout / processInvoicePaymentEvent)
// is deliberately gateway-agnostic so GoPay/Comgate can be slotted in later.

const { stripe } = require('./stripe');
const { getUserInvoices, saveInvoice } = require('./storage');
const { fireWebhooks } = require('./webhooks');

const PAYMENT_KIND = 'invoice_payment';

function isConfigured() {
    return !!stripe;
}

// Stripe currencies are lowercase ISO codes; amounts are in the minor unit.
function toMinorUnit(amount) {
    return Math.round(Number(amount || 0) * 100);
}

async function createInvoiceCheckout(invoice, userEmail, appUrl) {
    if (!stripe) {
        const err = new Error('Payments are not configured');
        err.statusCode = 503;
        throw err;
    }
    const amount = toMinorUnit(invoice.amount);
    if (!amount || amount < 1) {
        const err = new Error('Invoice amount is not payable');
        err.statusCode = 400;
        throw err;
    }

    const currency = String(invoice.currency || 'CZK').toLowerCase();
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency,
                    unit_amount: amount,
                    product_data: {
                        name: `${invoice.documentType === 'proforma' ? 'Proforma ' : ''}Invoice ${invoice.invoiceNumber}`,
                    },
                },
            },
        ],
        metadata: {
            kind: PAYMENT_KIND,
            userEmail,
            invoiceId: invoice.id,
        },
        success_url: `${appUrl}/?pay=success&invoice=${encodeURIComponent(invoice.invoiceNumber)}`,
        cancel_url: `${appUrl}/?pay=cancel&invoice=${encodeURIComponent(invoice.invoiceNumber)}`,
    });

    return { url: session.url, id: session.id };
}

// Flip the matching invoice to paid. Mirrors the bank-matching payment shape
// (status:'paid' + payment.paidAt + gateway-specific fields) so the rest of the
// app treats Stripe-paid and bank-matched invoices identically.
async function processInvoicePaymentEvent(event) {
    if (event.type !== 'checkout.session.completed') return false;
    const session = event.data.object;
    if (session.metadata?.kind !== PAYMENT_KIND) return false;
    if (session.payment_status && session.payment_status !== 'paid') return false;

    const userEmail = session.metadata.userEmail;
    const invoiceId = session.metadata.invoiceId;
    if (!userEmail || !invoiceId) return false;

    const invoices = await getUserInvoices(userEmail);
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return false;

    const paidInvoice = {
        ...invoice,
        status: 'paid',
        payment: {
            ...invoice.payment,
            paidAt: new Date().toISOString().split('T')[0],
            paidVia: 'stripe',
            stripeSessionId: session.id,
            matchedAmount: session.amount_total != null ? session.amount_total / 100 : invoice.amount,
        },
    };
    await saveInvoice(userEmail, paidInvoice);
    fireWebhooks(userEmail, 'invoice.paid', paidInvoice).catch(() => {});
    return true;
}

module.exports = { isConfigured, createInvoiceCheckout, processInvoicePaymentEvent, PAYMENT_KIND };
