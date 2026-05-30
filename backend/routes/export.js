'use strict';

const { sendJson, parseBody, SECURITY_HEADERS } = require('../lib/utils');
const { generatePeppolXml } = require('../lib/peppol');
const { getUserInvoices } = require('../lib/storage');
const {
  generateAnnualAccountantExportZip,
  normalizeExportOptions,
} = require('../lib/accountantExport');

function attach(router) {
  router.add(
    'GET',
    '/api/export/accountant',
    async ({ res, userEmail, url }) => {
      const year = Number(url.searchParams.get('year'));
      const exportOptions = normalizeExportOptions({
        variant: url.searchParams.get('variant'),
        paymentFilter: url.searchParams.get('paymentFilter'),
        territoryFilter: url.searchParams.get('territoryFilter'),
        dateBasis: url.searchParams.get('dateBasis'),
        documentScope: url.searchParams.get('documentScope'),
        languages: url.searchParams.get('languages'),
      });

      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return sendJson(res, 400, { error: 'Valid year is required' });
      }

      try {
        const invoices = await getUserInvoices(userEmail);
        const { buffer, filename } = await generateAnnualAccountantExportZip(
          invoices,
          year,
          exportOptions,
        );

        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          ...SECURITY_HEADERS,
        });
        res.end(buffer);
      } catch {
        sendJson(res, 500, { error: 'Failed to generate accountant export' });
      }
    },
  );

  router.add('POST', '/api/export/peppol', async ({ req, res }) => {
    let body;
    try {
      body = await parseBody(req);
    } catch {
      return sendJson(res, 400, { error: 'Invalid request body' });
    }

    if (!body.invoice)
      return sendJson(res, 400, { error: 'invoice is required' });

    try {
      const xml = generatePeppolXml(body.invoice);
      res.writeHead(200, {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename=invoice-${body.invoice.invoiceNumber}.xml`,
        ...SECURITY_HEADERS,
      });
      res.end(xml);
    } catch {
      sendJson(res, 500, { error: 'Failed to generate Peppol XML' });
    }
  });
}

module.exports = { attach };
