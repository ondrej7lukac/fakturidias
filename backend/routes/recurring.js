'use strict';

const crypto = require('crypto');
const { sendJson, parseBody } = require('../lib/utils');
const {
    getRecurringTemplates,
    saveRecurringTemplate,
    deleteRecurringTemplate,
    getSubscription,
} = require('../lib/storage');
const { isPro } = require('../lib/plan');

const CADENCES = ['weekly', 'monthly', 'quarterly', 'yearly'];

function attach(router) {
    router.add('GET', '/api/recurring', async ({ res, userEmail }) => {
        const templates = await getRecurringTemplates(userEmail);
        return sendJson(res, 200, { templates });
    });

    router.add('POST', '/api/recurring', async ({ req, res, userEmail }) => {
        const subscription = await getSubscription(userEmail);
        if (!isPro(subscription)) {
            return sendJson(res, 403, {
                error: 'Recurring invoices require a Pro plan',
                upgradeRequired: true,
            });
        }

        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        const tpl = body?.template;
        if (!tpl || typeof tpl !== 'object') {
            return sendJson(res, 400, { error: 'A source invoice template is required' });
        }
        const cadence = CADENCES.includes(body.cadence) ? body.cadence : 'monthly';
        const startAt = body.nextRunAt ? new Date(body.nextRunAt) : new Date();
        if (Number.isNaN(startAt.getTime())) {
            return sendJson(res, 400, { error: 'Invalid start date' });
        }

        // Whitelist fields — never write raw body straight to storage.
        const record = {
            id: typeof body.id === 'string' && body.id ? body.id : crypto.randomUUID(),
            name: String(body.name || tpl.client?.name || '').slice(0, 200),
            active: body.active !== false,
            cadence,
            intervalCount: Math.max(1, Number(body.intervalCount) || 1),
            dueDays: Math.max(0, Number(body.dueDays) || 14),
            autoSend: body.autoSend === true,
            nextRunAt: startAt,
            endDate: body.endDate ? new Date(body.endDate) : null,
            occurrencesLeft:
                body.occurrencesLeft == null ? null : Math.max(0, Number(body.occurrencesLeft) || 0),
            template: tpl,
        };

        const success = await saveRecurringTemplate(userEmail, record);
        return success
            ? sendJson(res, 200, { success: true, template: record })
            : sendJson(res, 500, { error: 'Failed to save recurring template' });
    });

    router.add('DELETE', '/api/recurring/:id', async ({ res, userEmail, params }) => {
        const success = await deleteRecurringTemplate(userEmail, params.id);
        return success
            ? sendJson(res, 200, { success: true })
            : sendJson(res, 500, { error: 'Failed to delete recurring template' });
    });
}

module.exports = { attach };
