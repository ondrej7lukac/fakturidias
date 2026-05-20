'use strict';

const { sendJson, parseBody, SECURITY_HEADERS } = require('../lib/utils');
const { generatePeppolXml } = require('../lib/peppol');

function attach(router) {
    router.add('POST', '/api/export/peppol', async ({ req, res }) => {
        let body;
        try { body = await parseBody(req); }
        catch { return sendJson(res, 400, { error: 'Invalid request body' }); }

        if (!body.invoice) return sendJson(res, 400, { error: 'invoice is required' });

        try {
            const xml = generatePeppolXml(body.invoice);
            res.writeHead(200, {
                'Content-Type': 'application/xml',
                'Content-Disposition': `attachment; filename=invoice-${body.invoice.invoiceNumber}.xml`,
                ...SECURITY_HEADERS
            });
            res.end(xml);
        } catch {
            sendJson(res, 500, { error: 'Failed to generate Peppol XML' });
        }
    });
}

module.exports = { attach };
