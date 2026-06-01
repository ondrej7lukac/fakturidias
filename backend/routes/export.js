'use strict';

const { sendJson, parseBody, SECURITY_HEADERS } = require('../lib/utils');
const { generatePeppolXml } = require('../lib/peppol');
const { generateIsdocXml } = require('../lib/isdoc');
const {
  generatePohodaXml,
  generateMoneyS3Xml,
} = require('../lib/accountingExports');
const { generateControlStatementXml } = require('../lib/czVatReports');
const { getUserInvoices, getUserSettings } = require('../lib/storage');
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

  router.add('GET', '/api/export/pohoda', async ({ res, userEmail, url }) => {
    const year = Number(url.searchParams.get('year'));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return sendJson(res, 400, { error: 'Valid year is required' });
    }
    const dateBasis =
      url.searchParams.get('dateBasis') === 'taxableSupplyDate'
        ? 'taxableSupplyDate'
        : 'issueDate';

    try {
      const invoices = await getUserInvoices(userEmail);
      const settings = await getUserSettings(userEmail);
      const xml = generatePohodaXml(invoices, {
        year,
        dateBasis,
        ico: settings?.defaultSupplier?.ico,
      });
      res.writeHead(200, {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename=pohoda-${year}.xml`,
        ...SECURITY_HEADERS,
      });
      res.end(xml);
    } catch {
      sendJson(res, 500, { error: 'Failed to generate Pohoda XML' });
    }
  });

  router.add('GET', '/api/export/money-s3', async ({ res, userEmail, url }) => {
    const year = Number(url.searchParams.get('year'));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return sendJson(res, 400, { error: 'Valid year is required' });
    }
    const dateBasis =
      url.searchParams.get('dateBasis') === 'taxableSupplyDate'
        ? 'taxableSupplyDate'
        : 'issueDate';

    try {
      const invoices = await getUserInvoices(userEmail);
      const settings = await getUserSettings(userEmail);
      const xml = generateMoneyS3Xml(invoices, {
        year,
        dateBasis,
        ico: settings?.defaultSupplier?.ico,
      });
      res.writeHead(200, {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename=money-s3-${year}.xml`,
        ...SECURITY_HEADERS,
      });
      res.end(xml);
    } catch {
      sendJson(res, 500, { error: 'Failed to generate Money S3 XML' });
    }
  });

  router.add('GET', '/api/export/control-statement', async ({ res, userEmail, url }) => {
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return sendJson(res, 400, { error: 'Valid year is required' });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return sendJson(res, 400, { error: 'Valid month (1-12) is required' });
    }

    try {
      const invoices = await getUserInvoices(userEmail);
      const settings = await getUserSettings(userEmail);
      const xml = generateControlStatementXml(invoices, {
        year,
        month,
        supplier: settings?.defaultSupplier || {},
      });
      res.writeHead(200, {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename=kontrolni-hlaseni-${year}-${String(month).padStart(2, '0')}.xml`,
        ...SECURITY_HEADERS,
      });
      res.end(xml);
    } catch {
      sendJson(res, 500, { error: 'Failed to generate control statement' });
    }
  });

  router.add('POST', '/api/export/isdoc', async ({ req, res }) => {
    let body;
    try {
      body = await parseBody(req);
    } catch {
      return sendJson(res, 400, { error: 'Invalid request body' });
    }

    if (!body.invoice)
      return sendJson(res, 400, { error: 'invoice is required' });

    try {
      const xml = generateIsdocXml(body.invoice);
      res.writeHead(200, {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename=${body.invoice.invoiceNumber}.isdoc`,
        ...SECURITY_HEADERS,
      });
      res.end(xml);
    } catch {
      sendJson(res, 500, { error: 'Failed to generate ISDOC XML' });
    }
  });
}

module.exports = { attach };
