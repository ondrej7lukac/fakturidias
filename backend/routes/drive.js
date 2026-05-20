'use strict';

const { sendJson, parseBody } = require('../lib/utils');
const { getAuthClient } = require('../lib/auth');
const { uploadInvoiceToDrive } = require('../lib/drive');

function attach(router) {
    router.add('POST', '/api/drive/backup', async ({ req, res, userEmail }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        try {
            await getAuthClient(userEmail);
            const fileId = await uploadInvoiceToDrive(userEmail, body.invoice, body.pdfBase64);
            return sendJson(res, 200, { success: true, fileId });
        } catch {
            return sendJson(res, 500, { error: 'Failed to backup to Drive' });
        }
    });
}

module.exports = { attach };
