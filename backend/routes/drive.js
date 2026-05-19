'use strict';

const { sendJson, readJsonBody } = require('../lib/utils');
const { getAuthClient } = require('../lib/auth');
const { uploadInvoiceToDrive } = require('../lib/drive');

function attach(router) {
    router.add('POST', '/api/drive/backup', ({ req, res, userEmail }) => {
        readJsonBody(req, async (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
            try {
                await getAuthClient(userEmail);
                const fileId = await uploadInvoiceToDrive(userEmail, body.invoice, body.pdfBase64);
                return sendJson(res, 200, { success: true, fileId });
            } catch {
                return sendJson(res, 500, { error: 'Failed to backup to Drive' });
            }
        });
    });
}

module.exports = { attach };
