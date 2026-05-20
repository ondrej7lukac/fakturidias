'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const { getUserItems, saveUserItem } = require('../lib/storage');

function attach(router) {
    router.add('GET', '/api/items', async ({ res, userEmail }) => {
        const items = await getUserItems(userEmail);
        return sendJson(res, 200, { items });
    });

    router.add('POST', '/api/items', async ({ req, res, userEmail }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        if (!body.item) return sendJson(res, 400, { error: 'item is required' });

        const success = await saveUserItem(userEmail, body.item);
        return success
            ? sendJson(res, 200, { success: true, item: body.item })
            : sendJson(res, 500, { error: 'Failed to save' });
    });
}

module.exports = { attach };
