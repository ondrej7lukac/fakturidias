'use strict';

const { sendJson, readJsonBody, SECURITY_HEADERS } = require('../lib/utils');
const { generatePeppolXml } = require('../lib/peppol');

function attach(router) {
    router.add('POST', '/api/export/peppol', ({ req, res }) => {
        readJsonBody(req, async (err, body) => {
            if (err) return sendJson(res, 400, { error: 'Invalid JSON body' });
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
    });
}

module.exports = { attach };
