'use strict';

const { saveSubscription, getSubscriptionByCustomerId } = require('./storage');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_MAX_MONTHLY = process.env.STRIPE_PRICE_MAX_MONTHLY;
const STRIPE_PRICE_MAX_ANNUAL = process.env.STRIPE_PRICE_MAX_ANNUAL;

let stripe = null;
if (STRIPE_SECRET_KEY) {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
}

function getPlanFromPriceId(priceId) {
    if (priceId && (priceId === STRIPE_PRICE_MAX_MONTHLY || priceId === STRIPE_PRICE_MAX_ANNUAL)) {
        return 'max';
    }
    return 'standard';
}

async function processStripeEvent(event) {
    if (!stripe) throw new Error('Stripe not configured');
    const obj = event.data.object;

    if (event.type === 'checkout.session.completed') {
        const userEmail = obj.metadata?.userEmail;
        const subscriptionId = obj.subscription;
        if (userEmail && subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = sub.items.data[0]?.price?.id;
            await saveSubscription(userEmail, {
                stripeCustomerId: obj.customer,
                stripeSubscriptionId: subscriptionId,
                plan: getPlanFromPriceId(priceId),
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
            const priceId = sub.items.data[0]?.price?.id;
            await saveSubscription(userEmail, {
                stripeCustomerId: sub.customer,
                stripeSubscriptionId: sub.id,
                plan: isActive ? getPlanFromPriceId(priceId) : 'free',
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
}

module.exports = { stripe, getPlanFromPriceId, processStripeEvent };
