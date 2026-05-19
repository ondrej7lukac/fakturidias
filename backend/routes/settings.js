'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const { getUserSettings, saveUserSettings } = require('../lib/storage');

function attach(router) {
    router.add('GET', '/api/settings', async ({ res, userEmail }) => {
        const doc = await getUserSettings(userEmail);
        return sendJson(res, 200, { settings: doc });
    });

    router.add('POST', '/api/settings', async ({ req, res, userEmail }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        if (!body.settings) return sendJson(res, 400, { error: 'settings is required' });

        const success = await saveUserSettings(userEmail, body.settings);
        return success
            ? sendJson(res, 200, { success: true, settings: body.settings })
            : sendJson(res, 500, { error: 'Failed to save' });
    });
}

module.exports = { attach };
