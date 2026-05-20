'use strict';

// Invoice count limits per tier
const GUEST_INVOICE_LIMIT = 1;
const FREE_INVOICE_LIMIT = 5;

// Pro plan pricing — amounts in the smallest currency unit (haléř; 1 CZK = 100)
const PRICING = {
    monthly: { amount: 30000, currency: 'czk', interval: 'month' },
    annual: { amount: 300000, currency: 'czk', interval: 'year' }
};

// A subscription record grants Pro access only while it is active.
function isPro(subscription) {
    if (!subscription || subscription.plan !== 'pro') return false;
    if (subscription.status !== 'active' && subscription.status !== 'trialing') return false;
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd * 1000 < Date.now()) {
        return false;
    }
    return true;
}

module.exports = { GUEST_INVOICE_LIMIT, FREE_INVOICE_LIMIT, PRICING, isPro };
