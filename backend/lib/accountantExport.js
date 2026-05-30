'use strict';

const JSZip = require('jszip');

const EXPORT_LANGS = ['cs', 'en'];
const EXPORT_DATE_BASIS = ['issueDate', 'taxableSupplyDate'];
const EXPORT_DOCUMENT_SCOPES = ['issued', 'all'];
const EXPORT_TERRITORY_FILTERS = ['all', 'domestic', 'eu', 'foreign'];
const DOMESTIC_COUNTRY = 'CZ';
const EU_COUNTRY_CODES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

const STATUS_LABELS = {
  cs: {
    draft: 'Rozpracovana',
    sent: 'Odeslana',
    paid: 'Zaplacena',
    overdue: 'Po splatnosti',
  },
  en: {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    overdue: 'Overdue',
  },
};

const VALID_PAYMENT_FILTERS = new Set(['all', 'paid', 'unpaid']);
const VALID_VARIANTS = new Set(['detail', 'monthly', 'vat', 'smallBusiness']);
const VALID_LANGUAGES = new Set(EXPORT_LANGS);
const VALID_DATE_BASIS = new Set(EXPORT_DATE_BASIS);
const VALID_DOCUMENT_SCOPES = new Set(EXPORT_DOCUMENT_SCOPES);
const VALID_TERRITORY_FILTERS = new Set(EXPORT_TERRITORY_FILTERS);

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
}

function getInvoiceIssueYear(issueDate) {
  if (!issueDate) return null;
  const parsed = new Date(issueDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear();
}

function getInvoiceDateByBasis(invoice, dateBasis) {
  if (dateBasis === 'taxableSupplyDate') {
    return invoice.taxableSupplyDate || invoice.issueDate || '';
  }

  return invoice.issueDate || '';
}

function getInvoiceYearByBasis(invoice, dateBasis) {
  return getInvoiceIssueYear(getInvoiceDateByBasis(invoice, dateBasis));
}

function isPaidStatus(status) {
  return (status || 'draft') === 'paid';
}

function isIssuedInvoice(status) {
  return (status || 'draft') !== 'draft';
}

function normalizeCountryCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function getClientCountryCode(invoice) {
  return normalizeCountryCode(invoice.client?.country || invoice.clientCountry);
}

function getTerritoryType(countryCode) {
  if (!countryCode) return 'unknown';
  if (countryCode === DOMESTIC_COUNTRY) return 'domestic';
  if (EU_COUNTRY_CODES.has(countryCode)) return 'eu';
  return 'foreign';
}

function formatAmount(value) {
  return (Number(value) || 0).toFixed(2);
}

function formatRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(0) : '0';
}

function getStatusLabel(lang, status) {
  return STATUS_LABELS[lang][status || 'draft'] || status || '';
}

function getPaymentLabel(lang, status) {
  if (lang === 'cs') return isPaidStatus(status) ? 'Zaplaceno' : 'K uhrade';
  return isPaidStatus(status) ? 'Paid' : 'Outstanding';
}

function getVatPayerLabel(lang, isVatPayer) {
  if (lang === 'cs') return isVatPayer ? 'Ano' : 'Ne';
  return isVatPayer ? 'Yes' : 'No';
}

function getAccountantFileName(year, lang, options) {
  const variantSuffix =
    options.variant === 'detail'
      ? 'detail'
      : options.variant === 'monthly'
        ? 'monthly'
        : options.variant === 'vat'
          ? 'vat'
          : 'small-business';
  const filterSuffix =
    options.paymentFilter === 'all' ? 'all' : options.paymentFilter;

  return lang === 'cs'
    ? `fakturidias-danovy-export-${year}-${variantSuffix}-${filterSuffix}.csv`
    : `fakturidias-accountant-export-${year}-${variantSuffix}-${filterSuffix}.csv`;
}

function getSummaryFileName(year, lang, options) {
  return lang === 'cs'
    ? `fakturidias-danovy-souhrn-${year}-${options.dateBasis}-${options.documentScope}.csv`
    : `fakturidias-accountant-summary-${year}-${options.dateBasis}-${options.documentScope}.csv`;
}

function getZipFileName(year, options) {
  const languageSuffix =
    options.languages.length > 0 ? options.languages.join('-') : 'none';
  return `fakturidias-accountant-export-${year}-${options.variant}-${options.paymentFilter}-${options.territoryFilter}-${options.dateBasis}-${options.documentScope}-${languageSuffix}.zip`;
}

function getPaymentFilterLabel(lang, paymentFilter) {
  if (lang === 'cs') {
    if (paymentFilter === 'paid') return 'Pouze zaplacene';
    if (paymentFilter === 'unpaid') return 'Pouze nezaplacene';
    return 'Vsechny';
  }

  if (paymentFilter === 'paid') return 'Paid only';
  if (paymentFilter === 'unpaid') return 'Unpaid only';
  return 'All';
}

function getTerritoryFilterLabel(lang, territoryFilter) {
  if (lang === 'cs') {
    if (territoryFilter === 'domestic') return 'Tuzemsko (CZ)';
    if (territoryFilter === 'eu') return 'EU mimo CZ';
    if (territoryFilter === 'foreign') return 'Mimo EU';
    return 'Vsechna uzemi';
  }

  if (territoryFilter === 'domestic') return 'Domestic (CZ)';
  if (territoryFilter === 'eu') return 'EU outside CZ';
  if (territoryFilter === 'foreign') return 'Non-EU';
  return 'All territories';
}

function getTerritoryLabel(lang, territory) {
  if (lang === 'cs') {
    if (territory === 'domestic') return 'Tuzemsko';
    if (territory === 'eu') return 'EU';
    if (territory === 'foreign') return 'Mimo EU';
    return 'Neurceno';
  }

  if (territory === 'domestic') return 'Domestic';
  if (territory === 'eu') return 'EU';
  if (territory === 'foreign') return 'Non-EU';
  return 'Unknown';
}

function getVariantLabel(lang, variant) {
  if (lang === 'cs') {
    if (variant === 'monthly') return 'Souhrn po mesicich';
    if (variant === 'vat') return 'Souhrn podle DPH';
    if (variant === 'smallBusiness') return 'Kompaktni rocni kniha';
    return 'Detail faktur';
  }

  if (variant === 'monthly') return 'Monthly summary';
  if (variant === 'vat') return 'VAT summary';
  if (variant === 'smallBusiness') return 'Compact annual ledger';
  return 'Invoice detail';
}

function getDateBasisLabel(lang, dateBasis) {
  if (lang === 'cs') {
    return dateBasis === 'taxableSupplyDate'
      ? 'DUZP / datum zdanitelneho plneni'
      : 'Datum vystaveni';
  }

  return dateBasis === 'taxableSupplyDate'
    ? 'Taxable supply date'
    : 'Issue date';
}

function getDocumentScopeLabel(lang, documentScope) {
  if (lang === 'cs') {
    return documentScope === 'issued'
      ? 'Jen vystavene doklady'
      : 'Vcetne rozepsanych';
  }

  return documentScope === 'issued'
    ? 'Issued invoices only'
    : 'Including drafts';
}

function filterAnnualInvoices(invoices, year, options) {
  return invoices.filter((invoice) => {
    if (getInvoiceYearByBasis(invoice, options.dateBasis) !== year)
      return false;
    if (
      options.documentScope === 'issued' &&
      !isIssuedInvoice(invoice.status)
    ) {
      return false;
    }
    if (options.territoryFilter !== 'all') {
      const territory = getTerritoryType(getClientCountryCode(invoice));
      if (territory !== options.territoryFilter) return false;
    }
    if (options.paymentFilter === 'paid') return isPaidStatus(invoice.status);
    if (options.paymentFilter === 'unpaid')
      return !isPaidStatus(invoice.status);
    return true;
  });
}

function getMonthKey(invoice, dateBasis) {
  const dateValue = getInvoiceDateByBasis(invoice, dateBasis);
  if (!dateValue) return '';
  return String(dateValue).slice(0, 7);
}

function buildMonthlySummaryRows(invoices, lang, options) {
  const isCz = lang === 'cs';
  const groups = new Map();

  invoices.forEach((invoice) => {
    const month = getMonthKey(invoice, options.dateBasis);
    const key = `${month}|${invoice.currency || 'CZK'}`;
    const current = groups.get(key) || {
      month,
      invoiceCount: 0,
      paidCount: 0,
      unpaidCount: 0,
      taxBase: 0,
      taxAmount: 0,
      grossTotal: 0,
      outstandingAmount: 0,
      currency: invoice.currency || 'CZK',
    };
    const amount = Number(invoice.amount) || 0;

    current.invoiceCount += 1;
    current.taxBase += Number(invoice.taxBase) || 0;
    current.taxAmount += Number(invoice.taxAmount) || 0;
    current.grossTotal += amount;

    if (isPaidStatus(invoice.status)) current.paidCount += 1;
    else {
      current.unpaidCount += 1;
      current.outstandingAmount += amount;
    }

    groups.set(key, current);
  });

  return [
    [
      isCz ? 'Obdobi' : 'Period',
      isCz ? 'Filtr plateb' : 'Payment filter',
      isCz ? 'Pocet faktur' : 'Invoice count',
      isCz ? 'Zaplacene faktury' : 'Paid invoices',
      isCz ? 'Nezaplacene faktury' : 'Unpaid invoices',
      isCz ? 'Zaklad dane' : 'Tax base',
      'DPH',
      isCz ? 'Celkem' : 'Gross total',
      isCz ? 'Neuhrazeno' : 'Outstanding amount',
      isCz ? 'Mena' : 'Currency',
    ],
    ...Array.from(groups.values())
      .sort((left, right) => left.month.localeCompare(right.month))
      .map((group) => [
        group.month,
        getPaymentFilterLabel(lang, options.paymentFilter),
        String(group.invoiceCount),
        String(group.paidCount),
        String(group.unpaidCount),
        formatAmount(group.taxBase),
        formatAmount(group.taxAmount),
        formatAmount(group.grossTotal),
        formatAmount(group.outstandingAmount),
        group.currency,
      ]),
  ];
}

function buildVatSummaryRows(invoices, lang, paymentFilter) {
  const isCz = lang === 'cs';
  const groups = new Map();

  invoices.forEach((invoice) => {
    const vatRate = formatRate(invoice.taxRate);
    const currency = invoice.currency || 'CZK';
    const key = `${vatRate}|${currency}|${invoice.isVatPayer ? '1' : '0'}`;
    const current = groups.get(key) || {
      vatRate,
      invoiceCount: 0,
      taxBase: 0,
      taxAmount: 0,
      grossTotal: 0,
      outstandingAmount: 0,
      currency,
      vatPayer: !!invoice.isVatPayer,
    };
    const amount = Number(invoice.amount) || 0;

    current.invoiceCount += 1;
    current.taxBase += Number(invoice.taxBase) || 0;
    current.taxAmount += Number(invoice.taxAmount) || 0;
    current.grossTotal += amount;
    if (!isPaidStatus(invoice.status)) current.outstandingAmount += amount;

    groups.set(key, current);
  });

  return [
    [
      isCz ? 'Sazba DPH (%)' : 'VAT rate (%)',
      isCz ? 'Platce DPH' : 'VAT payer',
      isCz ? 'Filtr plateb' : 'Payment filter',
      isCz ? 'Pocet faktur' : 'Invoice count',
      isCz ? 'Zaklad dane' : 'Tax base',
      'DPH',
      isCz ? 'Celkem' : 'Gross total',
      isCz ? 'Neuhrazeno' : 'Outstanding amount',
      isCz ? 'Mena' : 'Currency',
    ],
    ...Array.from(groups.values())
      .sort((left, right) => Number(left.vatRate) - Number(right.vatRate))
      .map((group) => [
        group.vatRate,
        getVatPayerLabel(lang, group.vatPayer),
        getPaymentFilterLabel(lang, paymentFilter),
        String(group.invoiceCount),
        formatAmount(group.taxBase),
        formatAmount(group.taxAmount),
        formatAmount(group.grossTotal),
        formatAmount(group.outstandingAmount),
        group.currency,
      ]),
  ];
}

function buildFilingSummaryRows(invoices, year, lang, options) {
  const isCz = lang === 'cs';
  const territoryCounts = invoices.reduce(
    (counts, invoice) => {
      const territory = getTerritoryType(getClientCountryCode(invoice));
      counts[territory] += 1;
      return counts;
    },
    { domestic: 0, eu: 0, foreign: 0, unknown: 0 },
  );
  const totalTaxBase = invoices.reduce(
    (sum, invoice) => sum + (Number(invoice.taxBase) || 0),
    0,
  );
  const totalTaxAmount = invoices.reduce(
    (sum, invoice) => sum + (Number(invoice.taxAmount) || 0),
    0,
  );
  const totalGross = invoices.reduce(
    (sum, invoice) => sum + (Number(invoice.amount) || 0),
    0,
  );
  const outstandingAmount = invoices.reduce(
    (sum, invoice) =>
      sum + (isPaidStatus(invoice.status) ? 0 : Number(invoice.amount) || 0),
    0,
  );
  const paidCount = invoices.filter((invoice) =>
    isPaidStatus(invoice.status),
  ).length;
  const unpaidCount = invoices.length - paidCount;
  const currencies = Array.from(
    new Set(invoices.map((invoice) => invoice.currency || 'CZK')),
  ).sort();

  return [
    [isCz ? 'Polozka' : 'Metric', isCz ? 'Hodnota' : 'Value'],
    [isCz ? 'Rok exportu' : 'Export year', String(year)],
    [
      isCz ? 'Typ exportu' : 'Export type',
      getVariantLabel(lang, options.variant),
    ],
    [
      isCz ? 'Filtr plateb' : 'Payment filter',
      getPaymentFilterLabel(lang, options.paymentFilter),
    ],
    [
      isCz ? 'Uzemi klienta' : 'Client territory',
      getTerritoryFilterLabel(lang, options.territoryFilter),
    ],
    [
      isCz ? 'Rozhodne datum' : 'Filing date basis',
      getDateBasisLabel(lang, options.dateBasis),
    ],
    [
      isCz ? 'Rozsah dokladu' : 'Document scope',
      getDocumentScopeLabel(lang, options.documentScope),
    ],
    [isCz ? 'Pocet faktur' : 'Invoice count', String(invoices.length)],
    [isCz ? 'Zaplacene faktury' : 'Paid invoices', String(paidCount)],
    [isCz ? 'Nezaplacene faktury' : 'Unpaid invoices', String(unpaidCount)],
    [
      isCz ? 'Tuzemske faktury' : 'Domestic invoices',
      String(territoryCounts.domestic),
    ],
    [isCz ? 'EU faktury' : 'EU invoices', String(territoryCounts.eu)],
    [isCz ? 'Mimo EU' : 'Non-EU invoices', String(territoryCounts.foreign)],
    [
      isCz ? 'Bez zeme klienta' : 'Missing client country',
      String(territoryCounts.unknown),
    ],
    [
      isCz ? 'Zaklad dane celkem' : 'Total tax base',
      formatAmount(totalTaxBase),
    ],
    [isCz ? 'DPH celkem' : 'Total VAT', formatAmount(totalTaxAmount)],
    [isCz ? 'Celkem brutto' : 'Gross total', formatAmount(totalGross)],
    [
      isCz ? 'Celkem neuhrazeno' : 'Total outstanding',
      formatAmount(outstandingAmount),
    ],
    [isCz ? 'Pouzite meny' : 'Currencies used', currencies.join(', ') || 'CZK'],
  ];
}

function buildAnnualAccountantRows(invoices, lang) {
  const isCz = lang === 'cs';

  return [
    [
      isCz ? 'Klient' : 'Client',
      'ICO',
      isCz ? 'DIC' : 'VAT ID',
      isCz ? 'Cislo faktury' : 'Invoice number',
      isCz ? 'Datum vystaveni' : 'Issue date',
      'DUZP',
      isCz ? 'Datum splatnosti' : 'Due date',
      isCz ? 'Stav faktury' : 'Invoice status',
      isCz ? 'Platba' : 'Payment state',
      isCz ? 'E-mail' : 'Email',
      isCz ? 'Telefon' : 'Phone',
      isCz ? 'Adresa' : 'Address',
      isCz ? 'Zeme klienta' : 'Client country',
      isCz ? 'Uzemi' : 'Territory',
      isCz ? 'Mena' : 'Currency',
      isCz ? 'Platce DPH' : 'VAT payer',
      isCz ? 'Sazba DPH (%)' : 'VAT rate (%)',
      isCz ? 'Zaklad dane' : 'Tax base',
      'DPH',
      isCz ? 'Celkem' : 'Gross total',
      isCz ? 'Neuhrazeno' : 'Outstanding amount',
      isCz ? 'Variabilni symbol' : 'Variable symbol',
    ],
    ...invoices
      .slice()
      .sort((left, right) => {
        const issueCompare = String(left.issueDate || '').localeCompare(
          String(right.issueDate || ''),
        );
        if (issueCompare !== 0) return issueCompare;
        return String(left.invoiceNumber || '').localeCompare(
          String(right.invoiceNumber || ''),
        );
      })
      .map((invoice) => {
        const amount = Number(invoice.amount) || 0;
        const outstandingAmount = isPaidStatus(invoice.status) ? 0 : amount;
        const clientCountry = getClientCountryCode(invoice);
        const territory = getTerritoryType(clientCountry);

        return [
          invoice.client?.name || (isCz ? 'Neznamy klient' : 'Unknown client'),
          invoice.client?.ico || '',
          invoice.client?.vat || '',
          invoice.invoiceNumber || '',
          invoice.issueDate || '',
          invoice.taxableSupplyDate || '',
          invoice.dueDate || '',
          getStatusLabel(lang, invoice.status),
          getPaymentLabel(lang, invoice.status),
          invoice.client?.email || '',
          invoice.client?.phone || '',
          invoice.client?.address || '',
          clientCountry,
          getTerritoryLabel(lang, territory),
          invoice.currency || 'CZK',
          getVatPayerLabel(lang, invoice.isVatPayer),
          formatRate(invoice.taxRate),
          formatAmount(invoice.taxBase),
          formatAmount(invoice.taxAmount),
          formatAmount(invoice.amount),
          formatAmount(outstandingAmount),
          invoice.payment?.variableSymbol || '',
        ];
      }),
  ];
}

function buildSmallBusinessLedgerRows(invoices, lang, options) {
  const isCz = lang === 'cs';

  return [
    [
      isCz ? 'Datum pro priznani' : 'Filing date',
      isCz ? 'Cislo faktury' : 'Invoice number',
      isCz ? 'Klient' : 'Client',
      isCz ? 'Zeme klienta' : 'Client country',
      isCz ? 'Uzemi' : 'Territory',
      isCz ? 'Kategorie' : 'Category',
      isCz ? 'Datum vystaveni' : 'Issue date',
      'DUZP',
      isCz ? 'Datum splatnosti' : 'Due date',
      isCz ? 'Stav' : 'Status',
      isCz ? 'Platba' : 'Payment state',
      isCz ? 'Zaklad dane' : 'Tax base',
      'DPH',
      isCz ? 'Celkem' : 'Gross total',
      isCz ? 'Neuhrazeno' : 'Outstanding amount',
      isCz ? 'Mena' : 'Currency',
      isCz ? 'Variabilni symbol' : 'Variable symbol',
    ],
    ...invoices
      .slice()
      .sort((left, right) => {
        const dateCompare = String(
          getInvoiceDateByBasis(left, options.dateBasis),
        ).localeCompare(
          String(getInvoiceDateByBasis(right, options.dateBasis)),
        );
        if (dateCompare !== 0) return dateCompare;
        return String(left.invoiceNumber || '').localeCompare(
          String(right.invoiceNumber || ''),
        );
      })
      .map((invoice) => {
        const amount = Number(invoice.amount) || 0;
        const outstandingAmount = isPaidStatus(invoice.status) ? 0 : amount;
        const clientCountry = getClientCountryCode(invoice);
        const territory = getTerritoryType(clientCountry);

        return [
          getInvoiceDateByBasis(invoice, options.dateBasis),
          invoice.invoiceNumber || '',
          invoice.client?.name || (isCz ? 'Neznamy klient' : 'Unknown client'),
          clientCountry,
          getTerritoryLabel(lang, territory),
          invoice.category || '',
          invoice.issueDate || '',
          invoice.taxableSupplyDate || '',
          invoice.dueDate || '',
          getStatusLabel(lang, invoice.status),
          getPaymentLabel(lang, invoice.status),
          formatAmount(invoice.taxBase),
          formatAmount(invoice.taxAmount),
          formatAmount(invoice.amount),
          formatAmount(outstandingAmount),
          invoice.currency || 'CZK',
          invoice.payment?.variableSymbol || '',
        ];
      }),
  ];
}

function buildExportRows(invoices, year, lang, options) {
  const filteredInvoices = filterAnnualInvoices(invoices, year, options);

  if (options.variant === 'smallBusiness') {
    return buildSmallBusinessLedgerRows(filteredInvoices, lang, options);
  }

  if (options.variant === 'monthly') {
    return buildMonthlySummaryRows(filteredInvoices, lang, options);
  }

  if (options.variant === 'vat') {
    return buildVatSummaryRows(filteredInvoices, lang, options.paymentFilter);
  }

  return buildAnnualAccountantRows(filteredInvoices, lang);
}

function buildSummaryRows(invoices, year, lang, options) {
  return buildFilingSummaryRows(
    filterAnnualInvoices(invoices, year, options),
    year,
    lang,
    options,
  );
}

function normalizeExportOptions(options = {}) {
  const paymentFilter = VALID_PAYMENT_FILTERS.has(options.paymentFilter)
    ? options.paymentFilter
    : 'all';
  const variant = VALID_VARIANTS.has(options.variant)
    ? options.variant
    : 'detail';
  const dateBasis = VALID_DATE_BASIS.has(options.dateBasis)
    ? options.dateBasis
    : 'taxableSupplyDate';
  const documentScope = VALID_DOCUMENT_SCOPES.has(options.documentScope)
    ? options.documentScope
    : 'issued';
  const territoryFilter = VALID_TERRITORY_FILTERS.has(options.territoryFilter)
    ? options.territoryFilter
    : 'all';
  const requestedLanguages = Array.isArray(options.languages)
    ? options.languages
    : String(options.languages || '')
        .split(',')
        .map((language) => language.trim())
        .filter(Boolean);
  const languages = requestedLanguages.filter((language) =>
    VALID_LANGUAGES.has(language),
  );

  return {
    paymentFilter,
    variant,
    dateBasis,
    documentScope,
    territoryFilter,
    languages: languages.length > 0 ? languages : [...EXPORT_LANGS],
  };
}

async function generateAnnualAccountantExportZip(invoices, year, options = {}) {
  const normalizedOptions = normalizeExportOptions(options);
  const zip = new JSZip();

  normalizedOptions.languages.forEach((lang) => {
    zip.file(
      getAccountantFileName(year, lang, normalizedOptions),
      rowsToCsv(buildExportRows(invoices, year, lang, normalizedOptions)),
    );
    zip.file(
      getSummaryFileName(year, lang, normalizedOptions),
      rowsToCsv(buildSummaryRows(invoices, year, lang, normalizedOptions)),
    );
  });

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return {
    buffer,
    filename: getZipFileName(year, normalizedOptions),
  };
}

module.exports = {
  generateAnnualAccountantExportZip,
  normalizeExportOptions,
};
