'use strict';

// Invoice count limits per tier
const GUEST_INVOICE_LIMIT = 1;
const FREE_INVOICE_LIMIT = 5;
const STANDARD_INVOICE_LIMIT = 100; // normal invoices per year
const STANDARD_AI_LIMIT = 5;        // AI invoices per month

// Pricing — amounts in smallest currency unit (haléř; 1 CZK = 100)
const PRICING = {
    standard_monthly: { amount: 6500,   currency: 'czk', interval: 'month' },
    standard_annual:  { amount: 65000,  currency: 'czk', interval: 'year'  },
    max_monthly:      { amount: 12000,  currency: 'czk', interval: 'month' },
    max_annual:       { amount: 120000, currency: 'czk', interval: 'year'  },
};

// Accounts that always get full Max access without a Stripe subscription —
// the product owner, plus anyone listed in COMPLIMENTARY_EMAILS (comma-separated).
const OWNER_EMAIL = 'ondrej7lukac@gmail.com';
const COMPLIMENTARY_EMAILS = new Set(
    [OWNER_EMAIL, ...(process.env.COMPLIMENTARY_EMAILS || '').split(',')]
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
);

function isComplimentary(email) {
    return COMPLIMENTARY_EMAILS.has(String(email || '').trim().toLowerCase());
}

// The subscription that plan checks should use for this user. Complimentary
// accounts get a synthetic, never-expiring Max subscription; everyone else gets
// their stored one unchanged. Never persist the returned object.
function effectiveSubscription(email, subscription) {
    if (!isComplimentary(email)) return subscription;
    return {
        ...(subscription || {}),
        plan: 'max',
        status: 'active',
        currentPeriodEnd: null,
        complimentary: true,
    };
}

function _isActive(subscription) {
    if (!subscription) return false;
    if (subscription.status !== 'active' && subscription.status !== 'trialing') return false;
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd * 1000 < Date.now()) return false;
    return true;
}

// Any paid plan (standard, max, or legacy 'pro')
function isPro(subscription) {
    if (!_isActive(subscription)) return false;
    return ['standard', 'max', 'pro'].includes(subscription.plan);
}

function isStandard(subscription) {
    if (!_isActive(subscription)) return false;
    return ['standard', 'pro'].includes(subscription.plan);
}

function isMax(subscription) {
    if (!_isActive(subscription)) return false;
    return subscription.plan === 'max';
}

module.exports = {
    GUEST_INVOICE_LIMIT, FREE_INVOICE_LIMIT,
    STANDARD_INVOICE_LIMIT, STANDARD_AI_LIMIT,
    PRICING, isPro, isStandard, isMax,
    isComplimentary, effectiveSubscription,
};
