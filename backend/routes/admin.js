'use strict';

const { sendJson, parseBody } = require('../lib/utils');
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
    InvoiceModel,
    SubscriptionModel,
    isConnected,
} = require('../lib/storage');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

function isAdmin(email) {
    return ADMIN_EMAILS.includes((email || '').toLowerCase());
}

function guardAdmin(ctx) {
    if (!isAdmin(ctx.userEmail)) {
        sendJson(ctx.res, 403, { error: 'Admin access required' });
        return false;
    }
    return true;
}

function attach(router) {
    // Check if current user is admin
    router.add('GET', '/api/admin/check', ({ res, userEmail }) => {
        return sendJson(res, 200, { isAdmin: isAdmin(userEmail) });
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
        let body;
        try { body = await parseBody(ctx.req); } catch { return sendJson(ctx.res, 400, { error: 'Invalid body' }); }

        const { email, plan, durationDays } = body;
        if (!email || !['free', 'standard', 'max'].includes(plan)) {
            return sendJson(ctx.res, 400, { error: 'email and valid plan required' });
        }
        const ok = await setUserPlanOverride(email, plan, durationDays || 30);
        return sendJson(ctx.res, ok ? 200 : 500, { success: ok });
    });

    // Delete all data for a user
    router.add('DELETE', '/api/admin/users/data', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        let body;
        try { body = await parseBody(ctx.req); } catch { return sendJson(ctx.res, 400, { error: 'Invalid body' }); }

        const { email } = body;
        if (!email) return sendJson(ctx.res, 400, { error: 'email required' });
        if (isAdmin(email)) return sendJson(ctx.res, 400, { error: 'Cannot delete admin account' });
        const ok = await deleteUserAllData(email);
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

    // List promo codes
    router.add('GET', '/api/admin/promos', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        const promos = await getPromos();
        return sendJson(ctx.res, 200, { promos });
    });

    // Create promo code
    router.add('POST', '/api/admin/promos', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        let body;
        try { body = await parseBody(ctx.req); } catch { return sendJson(ctx.res, 400, { error: 'Invalid body' }); }

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
        return sendJson(ctx.res, promo ? 201 : 500, promo ? { promo } : { error: 'Failed to create promo' });
    });

    // Update promo code
    router.add('PUT', '/api/admin/promos', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        let body;
        try { body = await parseBody(ctx.req); } catch { return sendJson(ctx.res, 400, { error: 'Invalid body' }); }

        const { code, ...updates } = body;
        if (!code) return sendJson(ctx.res, 400, { error: 'code required' });

        const allowed = ['description', 'planGrant', 'discountPercent', 'durationDays', 'maxUses', 'expiresAt', 'active'];
        const sanitized = {};
        allowed.forEach(k => { if (updates[k] !== undefined) sanitized[k] = updates[k]; });

        const promo = await updatePromo(code, sanitized);
        return sendJson(ctx.res, promo ? 200 : 404, promo ? { promo } : { error: 'Promo not found' });
    });

    // Delete promo code
    router.add('DELETE', '/api/admin/promos', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        let body;
        try { body = await parseBody(ctx.req); } catch { return sendJson(ctx.res, 400, { error: 'Invalid body' }); }

        const { code } = body;
        if (!code) return sendJson(ctx.res, 400, { error: 'code required' });
        const ok = await deletePromo(code);
        return sendJson(ctx.res, ok ? 200 : 404, { success: ok });
    });

    // Apply promo to a user (admin-initiated)
    router.add('POST', '/api/admin/promos/apply', async (ctx) => {
        if (!guardAdmin(ctx)) return true;
        let body;
        try { body = await parseBody(ctx.req); } catch { return sendJson(ctx.res, 400, { error: 'Invalid body' }); }

        const { code, userEmail } = body;
        if (!code || !userEmail) return sendJson(ctx.res, 400, { error: 'code and userEmail required' });
        const result = await applyPromoToUser(code, userEmail);
        if (result.error) return sendJson(ctx.res, 400, { error: result.error });
        return sendJson(ctx.res, 200, result);
    });
}

module.exports = { attach, isAdmin };
