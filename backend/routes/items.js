'use strict';

const { sendJson, readJsonBody } = require('../lib/utils');
const { getUserItems, saveUserItem } = require('../lib/storage');

function attach(router) {
    router.add('GET', '/api/items', async ({ res, userEmail }) => {
        const items = await getUserItems(userEmail);
        return sendJson(res, 200, { items });
    });

    router.add('POST', '/api/items', ({ req, res, userEmail }) => {
        readJsonBody(req, async (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            const success = await saveUserItem(userEmail, body.item);
            return success
                ? sendJson(res, 200, { success: true, item: body.item })
                : sendJson(res, 500, { error: 'Failed to save' });
        });
    });
}

module.exports = { attach };
