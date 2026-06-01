'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const {
    grantAccess,
    revokeAccess,
    getGrantsByOwner,
    getGrantsByGrantee,
    hasAccessGrant,
} = require('../lib/storage');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always act as the real logged-in user, never the view-as identity.
function realUser(ctx) {
    return ctx.realUserEmail || ctx.userEmail;
}

function attach(router) {
    // People I (the owner) have granted access to.
    router.add('GET', '/api/access/granted', async (ctx) => {
        const grants = await getGrantsByOwner(realUser(ctx));
        return sendJson(ctx.res, 200, {
            grants: grants.map((g) => ({ email: g.granteeEmail, role: g.role })),
        });
    });

    router.add('POST', '/api/access/grant', async (ctx) => {
        let body;
        try {
            body = await parseBody(ctx.req);
        } catch {
            return sendJson(ctx.res, 400, { error: 'Invalid request body' });
        }
        const email = String(body.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) {
            return sendJson(ctx.res, 400, { error: 'Valid email is required' });
        }
        if (email === realUser(ctx).toLowerCase()) {
            return sendJson(ctx.res, 400, { error: 'You cannot grant access to yourself' });
        }
        const ok = await grantAccess(realUser(ctx), email, 'accountant');
        return ok
            ? sendJson(ctx.res, 200, { success: true })
            : sendJson(ctx.res, 500, { error: 'Failed to grant access' });
    });

    router.add('DELETE', '/api/access/grant/:email', async (ctx) => {
        const ok = await revokeAccess(realUser(ctx), ctx.params.email);
        return ok
            ? sendJson(ctx.res, 200, { success: true })
            : sendJson(ctx.res, 500, { error: 'Failed to revoke access' });
    });

    // Accounts I (the grantee) can view, plus which one I'm currently viewing.
    router.add('GET', '/api/access/accessible', async (ctx) => {
        const grants = await getGrantsByGrantee(realUser(ctx));
        return sendJson(ctx.res, 200, {
            accounts: grants.map((g) => ({ ownerEmail: g.ownerEmail, role: g.role })),
            viewingAs: (ctx.req.session && ctx.req.session.viewAs) || null,
        });
    });

    router.add('POST', '/api/access/view', async (ctx) => {
        let body;
        try {
            body = await parseBody(ctx.req);
        } catch {
            return sendJson(ctx.res, 400, { error: 'Invalid request body' });
        }
        const ownerEmail = String(body.ownerEmail || '').trim().toLowerCase();
        const allowed = await hasAccessGrant(ownerEmail, realUser(ctx));
        if (!allowed) {
            return sendJson(ctx.res, 403, { error: 'No access to that account' });
        }
        if (ctx.req.session) ctx.req.session.viewAs = ownerEmail;
        return sendJson(ctx.res, 200, { success: true, viewingAs: ownerEmail });
    });

    router.add('POST', '/api/access/view/stop', async (ctx) => {
        if (ctx.req.session) ctx.req.session.viewAs = null;
        return sendJson(ctx.res, 200, { success: true });
    });
}

module.exports = { attach };
