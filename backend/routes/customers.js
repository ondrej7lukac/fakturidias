'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const { getUserCustomers, saveUserCustomer } = require('../lib/storage');

function attach(router) {
    router.add('GET', '/api/customers', async ({ res, userEmail }) => {
        const customers = await getUserCustomers(userEmail);
        return sendJson(res, 200, { customers });
    });

    router.add('POST', '/api/customers', async ({ req, res, userEmail }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        if (!body.customer) return sendJson(res, 400, { error: 'customer is required' });

        const success = await saveUserCustomer(userEmail, body.customer);
        return success
            ? sendJson(res, 200, { success: true, customer: body.customer })
            : sendJson(res, 500, { error: 'Failed to save' });
    });
}

module.exports = { attach };
