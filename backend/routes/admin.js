'use strict';

const os = require('os');
const { sendJson, parseBody } = require('../lib/utils');
const { sendSegmentBroadcast } = require('../lib/email');
const { processStripeEvent } = require('./billing');
const {
    getAllUsersWithStats,
    setUserPlanOverride,
    deleteUserAllData,
    getPromos,
    getPromoByCode,
    createPromo,
    updatePromo,
    deletePromo,
    applyPromoToUser,
    getUserDetail,
    getSubscription,
    saveSubscription,
    logAdminAction,
    getAuditLog,
    getPromoStats,
    getRevenueMetrics,
    getDunningUsers,
    getUserMeta,
    setUserNotes,
    setUserSuspended,
    getGlobalSettings,
    updateGlobalSettings,
    getEmailTemplates,
    createEmailTemplate,
    deleteEmailTemplate,
    getScheduledEmails,
    createScheduledEmail,
    cancelScheduledEmail,
    getWebhookEvents,
    getWebhookEvent,
    markWebhookEvent,
    getBounces,
    recordBounce,
    InvoiceModel,
    SubscriptionModel,
    isConnected,
} = require('../lib/storage');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

// Optional second tier. When unset, every admin is a super-admin (backward compatible).
const ADMIN_SUPER_EMAILS = (process.env.ADMIN_SUPER_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
let stripe = null;
if (STRIPE_SECRET_KEY) {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
}

const STRIPE_MAX_PRICE_IDS = [
    process.env.STRIPE_PRICE_MAX_MONTHLY,
    process.env.STRIPE_PRICE_MAX_ANNUAL,
].filter(Boolean);

function planFromPriceId(priceId) {
    return STRIPE_MAX_PRICE_IDS.includes(priceId) ? 'max' : 'standard';
}

// An env var counts as "configured" only if it's present and looks like a
// real value — placeholders such as `sk_live_xxx` should not show as green.
function isPlaceholder(v) {
    return /^(your[_-]|placeholder|change[_-]?me|todo|example|dummy)/i.test(v)
        || /x{3,}$/i.test(v)
        || /\.{3,}$/.test(v)
        || /^<.+>$/.test(v);
}

function integrationStatus(value, { test, minLength = 12 } = {}) {
    const v = String(value || '').trim();
    if (!v) return { ok: false, note: 'Not set' };
    if (v.length < minLength || isPlaceholder(v) || (test && !test(v))) {
        return { ok: false, note: 'Placeholder / invalid' };
    }
    return { ok: true, note: 'Configured' };
}

function isAdmin(email) {
    return ADMIN_EMAILS.includes((email || '').toLowerCase());
}

function isSuperAdmin(email) {
    const e = (email || '').toLowerCase();
    if (!isAdmin(e)) return false;
    if (ADMIN_SUPER_EMAILS.length === 0) return true;
    return ADMIN_SUPER_EMAILS.includes(e);
}

// The acting admin — the real session user, never the impersonated one.
function adminEmail(ctx) {
    return ctx.realUserEmail || ctx.userEmail;
}

function guardAdmin(ctx) {
    if (!isAdmin(adminEmail(ctx))) {
        sendJson(ctx.res, 403, { error: 'Admin access required' });
        return false;
    }
    return true;
}

function guardSuper(ctx) {
    if (!guardAdmin(ctx)) return false;
    if (!isSuperAdmin(adminEmail(ctx))) {
        sendJson(ctx.res, 403, { error: 'Super-admin access required' });
        return false;
    }
    return true;
}

async function readBody(ctx) {
    try { return await parseBody(ctx.req); }
    catch { sendJson(ctx.res, 400, { error: 'Invalid body' }); return null; }
}

function attach(router) {
    // Current admin's role + impersonation state
    router.add('GET', '/api/admin/check', (ctx) => {
        const real = adminEmail(ctx);
        return sendJson(ctx.res, 200, {
            isAdmin: isAdmin(real),
            isSuper: isSuperAdmin(real),
            impersonating: (ctx.req.session && ctx.req.session.impersonate) || null,
        });
    });

    // List all users with stats
    router.add('GET', '/api/admin/users', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const users = await getAllUsersWithStats();
        return sendJson(ctx.res, 200, { users });
    });

    // Override user plan manually
    router.add('PUT', '/api/admin/users/plan', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { email, plan, durationDays } = body;
        if (!email || !['free', 'standard', 'max'].includes(plan)) {
            return sendJson(ctx.res, 400, { error: 'email and valid plan required' });
        }
        const ok = await setUserPlanOverride(email, plan, durationDays || 30);
        if (ok) {
            await logAdminAction(adminEmail(ctx), 'plan_override', email, { plan, durationDays: durationDays || 30 });
        }
        return sendJson(ctx.res, ok ? 200 : 500, { success: ok });
    });

    // Delete all data for a user (super-admin)
    router.add('DELETE', '/api/admin/users/data', async (ctx) => {
        if (!guardSuper(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { email } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });
        if (isAdmin(email)) return sendJson(ctx.res, 400, { error: 'Cannot delete admin account' });
        const ok = await deleteUserAllData(email);
        if (ok) await logAdminAction(adminEmail(ctx), 'delete_user_data', email, {});
        return sendJson(ctx.res, ok ? 200 : 500, { success: ok });
    });

    // Aggregate analytics
    router.add('GET', '/api/admin/analytics', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        if (!isConnected()) return sendJson(ctx.res, 503, { error: 'DB not connected' });

        try {
            const [planCounts, monthlyRevenue, recentSignups] = await Promise.all([
                SubscriptionModel.aggregate([
                    { $group: { _id: '$plan', count: { $sum: 1 } } }
                ]),
                InvoiceModel.aggregate([
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                            },
                            count: { $sum: 1 },
                            revenue: { $sum: '$amount' },
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                    { $limit: 12 },
                ]),
                SubscriptionModel.aggregate([
                    { $sort: { updatedAt: -1 } },
                    { $limit: 10 },
                    { $project: { userEmail: 1, plan: 1, status: 1, updatedAt: 1 } },
                ]),
            ]);

            const planMap = {};
            planCounts.forEach(p => { planMap[p._id || 'free'] = p.count; });

            return sendJson(ctx.res, 200, {
                plans: planMap,
                monthlyInvoices: monthlyRevenue,
                recentSignups,
            });
        } catch (err) {
            console.error('[admin] analytics error:', err.message);
            return sendJson(ctx.res, 500, { error: 'Analytics query failed' });
        }
    });

    // Recurring revenue metrics (MRR / ARR / churn)
    router.add('GET', '/api/admin/revenue', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const metrics = await getRevenueMetrics();
        if (!metrics) return sendJson(ctx.res, 503, { error: 'DB not connected' });
        return sendJson(ctx.res, 200, metrics);
    });

    // Dunning — subscriptions with failed payments
    router.add('GET', '/api/admin/dunning', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const users = await getDunningUsers();
        return sendJson(ctx.res, 200, { users });
    });

    // List promo codes
    router.add('GET', '/api/admin/promos', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const promos = await getPromos();
        return sendJson(ctx.res, 200, { promos });
    });

    // Create promo code
    router.add('POST', '/api/admin/promos', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { code, description, planGrant, discountPercent, durationDays, maxUses, expiresAt } = body;
        if (!code) return sendJson(ctx.res, 400, { error: 'code required' });

        const existing = await getPromoByCode(code);
        if (existing) return sendJson(ctx.res, 409, { error: 'Promo code already exists' });

        const promo = await createPromo({
            code,
            description: description || '',
            planGrant: planGrant || null,
            discountPercent: Number(discountPercent) || 0,
            durationDays: Number(durationDays) || 30,
            maxUses: maxUses != null ? Number(maxUses) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            active: true,
        });
        if (promo) await logAdminAction(adminEmail(ctx), 'promo_create', code, { planGrant: planGrant || null });
        return sendJson(ctx.res, promo ? 201 : 500, promo ? { promo } : { error: 'Failed to create promo' });
    });

    // Update promo code
    router.add('PUT', '/api/admin/promos', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { code, ...updates } = body;
        if (!code) return sendJson(ctx.res, 400, { error: 'code required' });

        const allowed = ['description', 'planGrant', 'discountPercent', 'durationDays', 'maxUses', 'expiresAt', 'active'];
        const sanitized = {};
        allowed.forEach(k => { if (updates[k] !== undefined) sanitized[k] = updates[k]; });

        const promo = await updatePromo(code, sanitized);
        if (promo) await logAdminAction(adminEmail(ctx), 'promo_update', code, sanitized);
        return sendJson(ctx.res, promo ? 200 : 404, promo ? { promo } : { error: 'Promo not found' });
    });

    // Delete promo code
    router.add('DELETE', '/api/admin/promos', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { code } = body;
        if (!code) return sendJson(ctx.res, 400, { error: 'code required' });
        const ok = await deletePromo(code);
        if (ok) await logAdminAction(adminEmail(ctx), 'promo_delete', code, {});
        return sendJson(ctx.res, ok ? 200 : 404, { success: ok });
    });

    // Apply promo to a user (admin-initiated)
    router.add('POST', '/api/admin/promos/apply', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { code, userEmail } = body;
        if (!code || !userEmail) return sendJson(ctx.res, 400, { error: 'code and userEmail required' });
        const result = await applyPromoToUser(code, userEmail);
        if (result.error) return sendJson(ctx.res, 400, { error: result.error });
        await logAdminAction(adminEmail(ctx), 'promo_apply', userEmail, { code, planGranted: result.planGranted });
        return sendJson(ctx.res, 200, result);
    });

    // Promo conversion stats
    router.add('GET', '/api/admin/promos/stats', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const stats = await getPromoStats();
        return sendJson(ctx.res, 200, { stats });
    });

    // User detail (+ admin notes / suspension state)
    router.add('GET', '/api/admin/user-detail', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const email = ctx.url.searchParams.get('email');
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });
        const detail = await getUserDetail(email);
        if (!detail) return sendJson(ctx.res, 503, { error: 'DB not connected or user not found' });
        const meta = await getUserMeta(email);
        return sendJson(ctx.res, 200, { ...detail, meta });
    });

    // Audit log
    router.add('GET', '/api/admin/audit', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const log = await getAuditLog(200);
        return sendJson(ctx.res, 200, { log });
    });

    // System health
    router.add('GET', '/api/admin/health', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const mem = process.memoryUsage();

        const googleId = integrationStatus(process.env.GOOGLE_CLIENT_ID, {
            minLength: 20, test: v => v.endsWith('.apps.googleusercontent.com'),
        });
        const googleSecret = integrationStatus(process.env.GOOGLE_CLIENT_SECRET, { minLength: 10 });

        return sendJson(ctx.res, 200, {
            db: {
                connected: isConnected(),
                mode: isConnected() ? 'mongodb' : 'json-files',
            },
            integrations: {
                stripe: integrationStatus(process.env.STRIPE_SECRET_KEY, {
                    minLength: 30, test: v => /^(sk|rk)_(live|test)_/.test(v),
                }),
                stripeWebhook: integrationStatus(process.env.STRIPE_WEBHOOK_SECRET, {
                    minLength: 20, test: v => v.startsWith('whsec_'),
                }),
                resend: integrationStatus(process.env.RESEND_API_KEY, {
                    minLength: 20, test: v => v.startsWith('re_'),
                }),
                googleOAuth: {
                    ok: googleId.ok && googleSecret.ok,
                    note: googleId.ok && googleSecret.ok ? 'Configured' : 'Missing ID or secret',
                },
                vertexAI: integrationStatus(process.env.VERTEX_PROJECT_ID, { minLength: 4 }),
            },
            runtime: {
                nodeVersion: process.version,
                platform: process.platform,
                uptimeSeconds: Math.floor(process.uptime()),
                memoryMB: Math.round(mem.rss / 1024 / 1024),
                loadAvg: os.loadavg().map(n => Number(n.toFixed(2))),
                env: process.env.NODE_ENV || 'development',
            },
        });
    });

    // Cancel a user's Stripe subscription (super-admin)
    router.add('POST', '/api/admin/users/cancel-subscription', async (ctx) => {
        if (!guardSuper(ctx)) return true;
        if (!stripe) return sendJson(ctx.res, 503, { error: 'Stripe not configured' });
        const body = await readBody(ctx);
        if (!body) return true;

        const { email } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });

        const sub = await getSubscription(email);
        if (!sub?.stripeSubscriptionId) {
            return sendJson(ctx.res, 400, { error: 'No Stripe subscription for this user' });
        }

        try {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
            await saveSubscription(email, {
                stripeCustomerId: sub.stripeCustomerId || null,
                stripeSubscriptionId: sub.stripeSubscriptionId,
                plan: 'free',
                status: 'canceled',
                interval: sub.interval || null,
                currentPeriodEnd: sub.currentPeriodEnd || null,
            });
            await logAdminAction(adminEmail(ctx), 'subscription_cancel', email, {
                subscriptionId: sub.stripeSubscriptionId,
            });
            return sendJson(ctx.res, 200, { success: true });
        } catch (err) {
            console.error('[admin] cancel-subscription error:', err.message);
            return sendJson(ctx.res, 502, { error: `Stripe error: ${err.message}` });
        }
    });

    // Refund a user's most recent charge (super-admin)
    router.add('POST', '/api/admin/users/refund', async (ctx) => {
        if (!guardSuper(ctx)) return true;
        if (!stripe) return sendJson(ctx.res, 503, { error: 'Stripe not configured' });
        const body = await readBody(ctx);
        if (!body) return true;

        const { email } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });

        const sub = await getSubscription(email);
        if (!sub?.stripeCustomerId) {
            return sendJson(ctx.res, 400, { error: 'No Stripe customer for this user' });
        }

        try {
            const charges = await stripe.charges.list({ customer: sub.stripeCustomerId, limit: 1 });
            const charge = charges.data[0];
            if (!charge) return sendJson(ctx.res, 400, { error: 'No charges found for this customer' });
            if (charge.refunded) return sendJson(ctx.res, 400, { error: 'Most recent charge already refunded' });

            const refund = await stripe.refunds.create({ charge: charge.id });
            await logAdminAction(adminEmail(ctx), 'refund', email, {
                chargeId: charge.id,
                amount: refund.amount,
                currency: refund.currency,
            });
            return sendJson(ctx.res, 200, {
                success: true,
                amount: refund.amount,
                currency: refund.currency,
            });
        } catch (err) {
            console.error('[admin] refund error:', err.message);
            return sendJson(ctx.res, 502, { error: `Stripe error: ${err.message}` });
        }
    });

    // Sync a user's subscription state from Stripe
    router.add('POST', '/api/admin/users/sync-stripe', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        if (!stripe) return sendJson(ctx.res, 503, { error: 'Stripe not configured' });
        const body = await readBody(ctx);
        if (!body) return true;

        const { email } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });

        const sub = await getSubscription(email);
        if (!sub?.stripeSubscriptionId) {
            return sendJson(ctx.res, 400, { error: 'No Stripe subscription for this user' });
        }

        try {
            const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
            const isActive = stripeSub.status === 'active' || stripeSub.status === 'trialing';
            const priceId = stripeSub.items.data[0]?.price?.id;
            const updated = {
                stripeCustomerId: stripeSub.customer,
                stripeSubscriptionId: stripeSub.id,
                plan: isActive ? planFromPriceId(priceId) : 'free',
                status: stripeSub.status,
                interval: stripeSub.items.data[0]?.price?.recurring?.interval || 'month',
                currentPeriodEnd: stripeSub.current_period_end,
            };
            await saveSubscription(email, updated);
            await logAdminAction(adminEmail(ctx), 'subscription_sync', email, { status: stripeSub.status });
            return sendJson(ctx.res, 200, { success: true, subscription: updated });
        } catch (err) {
            console.error('[admin] sync-stripe error:', err.message);
            return sendJson(ctx.res, 502, { error: `Stripe error: ${err.message}` });
        }
    });

    // Retry the latest open invoice for a user with a failed payment
    router.add('POST', '/api/admin/users/retry-payment', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        if (!stripe) return sendJson(ctx.res, 503, { error: 'Stripe not configured' });
        const body = await readBody(ctx);
        if (!body) return true;

        const { email } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });

        const sub = await getSubscription(email);
        if (!sub?.stripeCustomerId) {
            return sendJson(ctx.res, 400, { error: 'No Stripe customer for this user' });
        }

        try {
            const invoices = await stripe.invoices.list({
                customer: sub.stripeCustomerId, status: 'open', limit: 1,
            });
            const inv = invoices.data[0];
            if (!inv) return sendJson(ctx.res, 400, { error: 'No open invoice to retry' });
            const paid = await stripe.invoices.pay(inv.id);
            await logAdminAction(adminEmail(ctx), 'retry_payment', email, {
                invoiceId: inv.id, status: paid.status,
            });
            return sendJson(ctx.res, 200, { success: true, status: paid.status });
        } catch (err) {
            console.error('[admin] retry-payment error:', err.message);
            return sendJson(ctx.res, 502, { error: `Stripe error: ${err.message}` });
        }
    });

    // Start impersonating a user (super-admin)
    router.add('POST', '/api/admin/impersonate', async (ctx) => {
        if (!guardSuper(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { email } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });
        if (isAdmin(email)) return sendJson(ctx.res, 400, { error: 'Cannot impersonate an admin account' });
        if (ctx.req.session) ctx.req.session.impersonate = email;
        await logAdminAction(adminEmail(ctx), 'impersonate_start', email, {});
        return sendJson(ctx.res, 200, { success: true, impersonating: email });
    });

    // Stop impersonating
    router.add('POST', '/api/admin/impersonate/stop', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const was = ctx.req.session && ctx.req.session.impersonate;
        if (ctx.req.session) ctx.req.session.impersonate = null;
        if (was) await logAdminAction(adminEmail(ctx), 'impersonate_stop', was, {});
        return sendJson(ctx.res, 200, { success: true });
    });

    // Set admin notes on a user
    router.add('POST', '/api/admin/user-notes', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { email, notes } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });
        const ok = await setUserNotes(email, notes);
        if (ok) await logAdminAction(adminEmail(ctx), 'user_notes', email, {});
        return sendJson(ctx.res, ok ? 200 : 500, { success: ok });
    });

    // Suspend / unsuspend a user (super-admin)
    router.add('POST', '/api/admin/user-suspend', async (ctx) => {
        if (!guardSuper(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { email, suspended } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });
        if (isAdmin(email)) return sendJson(ctx.res, 400, { error: 'Cannot suspend an admin account' });
        const ok = await setUserSuspended(email, !!suspended, adminEmail(ctx));
        if (ok) {
            await logAdminAction(adminEmail(ctx), suspended ? 'user_suspend' : 'user_unsuspend', email, {});
        }
        return sendJson(ctx.res, ok ? 200 : 500, { success: ok });
    });

    // Global settings (configurable limits)
    router.add('GET', '/api/admin/settings', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const settings = await getGlobalSettings();
        return sendJson(ctx.res, 200, { settings });
    });

    router.add('PUT', '/api/admin/settings', async (ctx) => {
        if (!guardSuper(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;
        const updated = await updateGlobalSettings(body);
        if (!updated) return sendJson(ctx.res, 500, { error: 'Failed to update settings' });
        await logAdminAction(adminEmail(ctx), 'settings_update', null, body);
        return sendJson(ctx.res, 200, { settings: updated });
    });

    // Email templates
    router.add('GET', '/api/admin/email-templates', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        return sendJson(ctx.res, 200, { templates: await getEmailTemplates() });
    });

    router.add('POST', '/api/admin/email-templates', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;
        if (!body.name) return sendJson(ctx.res, 400, { error: 'name required' });
        const tpl = await createEmailTemplate({
            name: body.name,
            subject: body.subject || '',
            body: body.body || '',
        });
        return sendJson(ctx.res, tpl ? 201 : 500, tpl ? { template: tpl } : { error: 'Failed to save template' });
    });

    router.add('DELETE', '/api/admin/email-templates', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;
        if (!body.id) return sendJson(ctx.res, 400, { error: 'id required' });
        const ok = await deleteEmailTemplate(body.id);
        return sendJson(ctx.res, ok ? 200 : 500, { success: ok });
    });

    // Scheduled emails
    router.add('GET', '/api/admin/scheduled-emails', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        return sendJson(ctx.res, 200, { emails: await getScheduledEmails() });
    });

    router.add('POST', '/api/admin/scheduled-emails', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;
        const { subject, message, segment, sendAt } = body;
        if (!subject || !message || !sendAt) {
            return sendJson(ctx.res, 400, { error: 'subject, message and sendAt required' });
        }
        const when = new Date(sendAt);
        if (isNaN(when.getTime())) return sendJson(ctx.res, 400, { error: 'Invalid sendAt' });
        const seg = ['all', 'free', 'standard', 'max', 'paid'].includes(segment) ? segment : 'all';
        const scheduled = await createScheduledEmail({
            subject, message, segment: seg, sendAt: when, createdBy: adminEmail(ctx),
        });
        if (scheduled) {
            await logAdminAction(adminEmail(ctx), 'schedule_email', `segment:${seg}`, {
                subject, sendAt: when.toISOString(),
            });
        }
        return sendJson(ctx.res, scheduled ? 201 : 500, scheduled ? { scheduled } : { error: 'Failed to schedule' });
    });

    router.add('POST', '/api/admin/scheduled-emails/cancel', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;
        if (!body.id) return sendJson(ctx.res, 400, { error: 'id required' });
        const ok = await cancelScheduledEmail(body.id);
        return sendJson(ctx.res, ok ? 200 : 400, ok
            ? { success: true }
            : { error: 'Could not cancel (already sent or sending)' });
    });

    // Stripe webhook event log
    router.add('GET', '/api/admin/webhooks', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        return sendJson(ctx.res, 200, { events: await getWebhookEvents(100) });
    });

    router.add('POST', '/api/admin/webhooks/replay', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;
        if (!body.id) return sendJson(ctx.res, 400, { error: 'id required' });
        const evt = await getWebhookEvent(body.id);
        if (!evt) return sendJson(ctx.res, 404, { error: 'Event not found' });
        if (!evt.payload) return sendJson(ctx.res, 400, { error: 'Event has no stored payload' });
        try {
            await processStripeEvent(evt.payload);
            await markWebhookEvent(body.id, 'replayed', null);
            await logAdminAction(adminEmail(ctx), 'webhook_replay', evt.type, { eventId: evt.eventId });
            return sendJson(ctx.res, 200, { success: true });
        } catch (err) {
            await markWebhookEvent(body.id, 'failed', err.message);
            return sendJson(ctx.res, 502, { error: err.message });
        }
    });

    // Email bounces
    router.add('GET', '/api/admin/bounces', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        return sendJson(ctx.res, 200, { bounces: await getBounces(100) });
    });

    // Broadcast email to a user segment (immediate)
    router.add('POST', '/api/admin/broadcast', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const body = await readBody(ctx);
        if (!body) return true;

        const { subject, message, segment } = body;
        if (!subject || !message) {
            return sendJson(ctx.res, 400, { error: 'subject and message required' });
        }

        try {
            const result = await sendSegmentBroadcast(segment, subject, message);
            await logAdminAction(adminEmail(ctx), 'broadcast', `segment:${segment || 'all'}`, {
                subject, sent: result.sent, failed: result.failed.length,
            });
            return sendJson(ctx.res, 200, { success: true, ...result });
        } catch (err) {
            console.error('[admin] broadcast error:', err.message);
            return sendJson(ctx.res, err.statusCode || 500, { error: err.message });
        }
    });
}

// Public routes (no auth) — registered on the public router.
function attachPublic(router) {
    // Resend delivery webhook — records bounces/complaints.
    router.add('POST', '/api/webhooks/resend', async (ctx) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET;
        if (!secret) return sendJson(ctx.res, 503, { error: 'Resend webhook not configured' });
        if (ctx.url.searchParams.get('secret') !== secret) {
            return sendJson(ctx.res, 401, { error: 'Invalid secret' });
        }
        let body;
        try { body = await parseBody(ctx.req); }
        catch { return sendJson(ctx.res, 400, { error: 'Invalid body' }); }

        const typeMap = {
            'email.bounced': 'bounce',
            'email.complained': 'complaint',
            'email.delivery_delayed': 'delivery_delayed',
        };
        const bounceType = typeMap[body.type];
        if (bounceType) {
            const recipients = [].concat(body.data?.to || []);
            const reason = body.data?.bounce?.message || body.data?.reason || body.type;
            for (const email of recipients) {
                if (email) await recordBounce(email, bounceType, reason);
            }
        }
        return sendJson(ctx.res, 200, { received: true });
    });
}

module.exports = { attach, attachPublic, isAdmin, isSuperAdmin };
