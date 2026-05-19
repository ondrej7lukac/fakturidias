'use strict';

const { sendJson, readJsonBody } = require('../lib/utils');
const { getUserSettings, saveUserSettings } = require('../lib/storage');

function attach(router) {
    router.add('GET', '/api/settings', async ({ res, userEmail }) => {
        const doc = await getUserSettings(userEmail);
        return sendJson(res, 200, { settings: doc });
    });

    router.add('POST', '/api/settings', ({ req, res, userEmail }) => {
        readJsonBody(req, async (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            const success = await saveUserSettings(userEmail, body.settings);
            return success
                ? sendJson(res, 200, { success: true, settings: body.settings })
                : sendJson(res, 500, { error: 'Failed to save' });
        });
    });
}

module.exports = { attach };
