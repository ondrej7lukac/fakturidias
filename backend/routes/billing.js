'use strict';

const { sendJson, readRawBody, parseBody } = require('../lib/utils');
const { getSubscription, saveSubscription, getSubscriptionByCustomerId } = require('../lib/storage');
const { isPro } = require('../lib/plan');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;
const STRIPE_PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL;

let stripe = null;
if (STRIPE_SECRET_KEY) {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
}

function getAppUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}`;
}

async function handleWebhook(req, res) {
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
        return sendJson(res, 503, { error: 'Stripe not configured' });
    }

    let rawBody;
    try { rawBody = await readRawBody(req); }
    catch { return sendJson(res, 400, { error: 'Failed to read body' }); }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return sendJson(res, 400, { error: `Webhook signature error: ${err.message}` });
    }

    const obj = event.data.object;

    try {
        if (event.type === 'checkout.session.completed') {
            const userEmail = obj.metadata?.userEmail;
            const subscriptionId = obj.subscription;
            if (userEmail && subscriptionId) {
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                await saveSubscription(userEmail, {
                    stripeCustomerId: obj.customer,
                    stripeSubscriptionId: subscriptionId,
                    plan: 'pro',
                    status: sub.status,
                    interval: sub.items.data[0]?.price?.recurring?.interval || 'month',
                    currentPeriodEnd: sub.current_period_end,
                });
            }
        } else if (event.type === 'customer.subscription.updated') {
            const sub = obj;
            const existing = await getSubscriptionByCustomerId(sub.customer);
            const userEmail = existing?.userEmail;
            if (userEmail) {
                const isActive = sub.status === 'active' || sub.status === 'trialing';
                await saveSubscription(userEmail, {
                    stripeCustomerId: sub.customer,
                    stripeSubscriptionId: sub.id,
                    plan: isActive ? 'pro' : 'free',
                    status: sub.status,
                    interval: sub.items.data[0]?.price?.recurring?.interval || 'month',
                    currentPeriodEnd: sub.current_period_end,
                });
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const sub = obj;
            const existing = await getSubscriptionByCustomerId(sub.customer);
            const userEmail = existing?.userEmail;
            if (userEmail) {
                await saveSubscription(userEmail, {
                    stripeCustomerId: sub.customer,
                    stripeSubscriptionId: sub.id,
                    plan: 'free',
                    status: 'canceled',
                    interval: existing.interval,
                    currentPeriodEnd: sub.current_period_end,
                });
            }
        }
    } catch (err) {
        console.error('[billing] Webhook handler error:', err.message);
    }

    return sendJson(res, 200, { received: true });
}

function attachPublic(router) {
    router.add('POST', '/api/billing/webhook', ({ req, res }) => handleWebhook(req, res));
}

function attachProtected(router) {
    router.add('GET', '/api/billing/subscription', async ({ res, userEmail }) => {
        const sub = await getSubscription(userEmail);
        return sendJson(res, 200, {
            plan: isPro(sub) ? 'pro' : 'free',
            status: sub?.status || 'inactive',
            interval: sub?.interval || null,
            currentPeriodEnd: sub?.currentPeriodEnd || null,
        });
    });

    router.add('POST', '/api/billing/checkout', async ({ req, res, userEmail }) => {
        if (!stripe) return sendJson(res, 503, { error: 'Stripe not configured' });
        if (!STRIPE_PRICE_MONTHLY || !STRIPE_PRICE_ANNUAL) {
            return sendJson(res, 503, { error: 'Stripe prices not configured' });
        }

        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid body' }); }

        const interval = body.interval === 'year' ? 'year' : 'month';
        const priceId = interval === 'year' ? STRIPE_PRICE_ANNUAL : STRIPE_PRICE_MONTHLY;
        const appUrl = getAppUrl(req);

        let sub = await getSubscription(userEmail);
        let customerId = sub?.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userEmail,
                metadata: { userEmail }
            });
            customerId = customer.id;
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${appUrl}/?billing=success`,
            cancel_url: `${appUrl}/?billing=cancel`,
            metadata: { userEmail },
        });

        return sendJson(res, 200, { url: session.url });
    });

    router.add('POST', '/api/billing/portal', async ({ req, res, userEmail }) => {
        if (!stripe) return sendJson(res, 503, { error: 'Stripe not configured' });

        const sub = await getSubscription(userEmail);
        if (!sub?.stripeCustomerId) {
            return sendJson(res, 400, { error: 'No Stripe customer found' });
        }

        const appUrl = getAppUrl(req);
        const session = await stripe.billingPortal.sessions.create({
            customer: sub.stripeCustomerId,
            return_url: `${appUrl}/`,
        });

        return sendJson(res, 200, { url: session.url });
    });
}

module.exports = { attachPublic, attachProtected };
