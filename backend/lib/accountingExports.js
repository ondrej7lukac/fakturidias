'use strict';

// Pohoda (Stormware) XML import format — dataPack/invoice. Validate against the
// official Pohoda XML schema (www.stormware.cz/schema) before production import.
// One <dat:dataPackItem> per issued invoice; amounts are grouped into Pohoda's
// fixed VAT rate buckets (none / low / high).

const DAT_NS = 'http://www.stormware.cz/schema/version_2/data.xsd';
const INV_NS = 'http://www.stormware.cz/schema/version_2/invoice.xsd';
const TYP_NS = 'http://www.stormware.cz/schema/version_2/type.xsd';

function esc(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function n2(value) {
    return (Number(value) || 0).toFixed(2);
}

function isoDate(date) {
    if (!date) return '';
    const parts = String(date).split('.');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return String(date).split('T')[0];
}

function invoiceYear(invoice, dateBasis) {
    const raw =
        dateBasis === 'taxableSupplyDate'
            ? invoice.taxableSupplyDate || invoice.issueDate
            : invoice.issueDate;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getFullYear();
}

// Pohoda groups VAT into fixed bands; map our numeric rate to its enum.
function pohodaVatRate(rate) {
    const r = Number(rate) || 0;
    if (r === 0) return 'none';
    if (r >= 20) return 'high'; // 21 %
    return 'low'; // reduced (12 / 15 %)
}

function itemXml(item, isVatPayer) {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const rate = isVatPayer ? Number(item.taxRate) || 0 : 0;
    return `        <inv:invoiceItem>
          <inv:text>${esc(item.name)}</inv:text>
          <inv:quantity>${qty}</inv:quantity>
          <inv:unit>${esc(item.unit || 'ks')}</inv:unit>
          <inv:rateVAT>${pohodaVatRate(rate)}</inv:rateVAT>
          <inv:homeCurrency>
            <typ:unitPrice>${n2(price)}</typ:unitPrice>
          </inv:homeCurrency>
        </inv:invoiceItem>`;
}

// Bucket the invoice's base/VAT into Pohoda's none/low/high summary slots.
function summaryBuckets(invoice) {
    const buckets = {
        none: 0,
        low: 0,
        lowVAT: 0,
        high: 0,
        highVAT: 0,
    };
    const base = Number(invoice.taxBase) || 0;
    const vat = Number(invoice.taxAmount) || 0;
    if (!invoice.isVatPayer) {
        buckets.none = base + vat; // no VAT applies; whole amount is "none"
        return buckets;
    }
    const band = pohodaVatRate(invoice.taxRate);
    if (band === 'none') {
        buckets.none = base;
    } else if (band === 'low') {
        buckets.low = base;
        buckets.lowVAT = vat;
    } else {
        buckets.high = base;
        buckets.highVAT = vat;
    }
    return buckets;
}

function invoiceXml(invoice) {
    const b = summaryBuckets(invoice);
    const number = esc(invoice.invoiceNumber);
    const variableSymbol = String(invoice.invoiceNumber || '').replace(/\D/g, '');
    const client = invoice.client || {};
    const items = (invoice.items || [])
        .map((item) => itemXml(item, invoice.isVatPayer))
        .join('\n');

    return `    <dat:dataPackItem version="2.0" id="${number}">
      <inv:invoice version="2.0">
        <inv:invoiceHeader>
          <inv:invoiceType>issuedInvoice</inv:invoiceType>
          <inv:number>
            <typ:numberRequested>${number}</typ:numberRequested>
          </inv:number>
          <inv:symVar>${esc(variableSymbol)}</inv:symVar>
          <inv:date>${isoDate(invoice.issueDate)}</inv:date>
          <inv:dateTax>${isoDate(invoice.taxableSupplyDate || invoice.issueDate)}</inv:dateTax>
          <inv:dateDue>${isoDate(invoice.dueDate)}</inv:dateDue>
          <inv:partnerIdentity>
            <typ:address>
              <typ:company>${esc(client.name)}</typ:company>
              <typ:ico>${esc(client.ico)}</typ:ico>
              <typ:dic>${esc(client.vat)}</typ:dic>
              <typ:street>${esc(client.address)}</typ:street>
              <typ:city>${esc(client.area)}</typ:city>
            </typ:address>
          </inv:partnerIdentity>
          <inv:symConst>0308</inv:symConst>
          <inv:paymentType>
            <typ:paymentType>draft</typ:paymentType>
          </inv:paymentType>
        </inv:invoiceHeader>
        <inv:invoiceDetail>
${items}
        </inv:invoiceDetail>
        <inv:invoiceSummary>
          <inv:roundingDocument>none</inv:roundingDocument>
          <inv:homeCurrency>
            <typ:priceNone>${n2(b.none)}</typ:priceNone>
            <typ:priceLow>${n2(b.low)}</typ:priceLow>
            <typ:priceLowVAT>${n2(b.lowVAT)}</typ:priceLowVAT>
            <typ:priceHigh>${n2(b.high)}</typ:priceHigh>
            <typ:priceHighVAT>${n2(b.highVAT)}</typ:priceHighVAT>
            <typ:round>
              <typ:priceRound>0.00</typ:priceRound>
            </typ:round>
          </inv:homeCurrency>
        </inv:invoiceSummary>
      </inv:invoice>
    </dat:dataPackItem>`;
}

function generatePohodaXml(invoices, options = {}) {
    const { year, dateBasis = 'issueDate', ico } = options;
    const selected = (invoices || []).filter((inv) => {
        if ((inv.status || 'draft') === 'draft') return false; // issued only
        if (year && invoiceYear(inv, dateBasis) !== Number(year)) return false;
        return true;
    });

    const supplierIco = esc(ico || selected[0]?.supplier?.ico || '');
    const body = selected.map((inv) => invoiceXml(inv)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<dat:dataPack version="2.0" id="Fakturidias" ico="${supplierIco}" application="Fakturidias" note="Invoice export"
  xmlns:dat="${DAT_NS}"
  xmlns:inv="${INV_NS}"
  xmlns:typ="${TYP_NS}">
${body}
</dat:dataPack>`;
}

// ── Money S3 (Solitea) ──────────────────────────────────────────────────────
// MoneyData / SeznamFaktVydane / FaktVydana import format. Validate against the
// official Money S3 XML schema before production import.

function moneyVatBuckets(invoice) {
    // Money S3 splits by VAT band: SazbaZakl (basic 21 %), SazbaSniz (reduced).
    const base = Number(invoice.taxBase) || 0;
    const vat = Number(invoice.taxAmount) || 0;
    const out = { osv: 0, snizZaklad: 0, snizDPH: 0, zaklZaklad: 0, zaklDPH: 0 };
    if (!invoice.isVatPayer) {
        out.osv = base + vat;
        return out;
    }
    if (pohodaVatRate(invoice.taxRate) === 'high') {
        out.zaklZaklad = base;
        out.zaklDPH = vat;
    } else if (pohodaVatRate(invoice.taxRate) === 'low') {
        out.snizZaklad = base;
        out.snizDPH = vat;
    } else {
        out.osv = base;
    }
    return out;
}

function moneyInvoiceXml(invoice) {
    const b = moneyVatBuckets(invoice);
    const client = invoice.client || {};
    const variableSymbol = String(invoice.invoiceNumber || '').replace(/\D/g, '');
    return `    <FaktVydana>
      <Doklad>${esc(invoice.invoiceNumber)}</Doklad>
      <Druh>N</Druh>
      <VarSymbol>${esc(variableSymbol)}</VarSymbol>
      <Vystaveno>${isoDate(invoice.issueDate)}</Vystaveno>
      <PlnenoDPH>${isoDate(invoice.taxableSupplyDate || invoice.issueDate)}</PlnenoDPH>
      <Splatno>${isoDate(invoice.dueDate)}</Splatno>
      <KonstSym>0308</KonstSym>
      <CelkemOsv>${n2(b.osv)}</CelkemOsv>
      <CelkemSnizDUchol>${n2(b.snizZaklad)}</CelkemSnizDUchol>
      <CelkemSnizDPH>${n2(b.snizDPH)}</CelkemSnizDPH>
      <CelkemZaklDUchol>${n2(b.zaklZaklad)}</CelkemZaklDUchol>
      <CelkemZaklDPH>${n2(b.zaklDPH)}</CelkemZaklDPH>
      <Celkem>${n2(invoice.amount)}</Celkem>
      <ObchodniPartner>
        <Nazev>${esc(client.name)}</Nazev>
        <ICO>${esc(client.ico)}</ICO>
        <DIC>${esc(client.vat)}</DIC>
        <Ulice>${esc(client.address)}</Ulice>
        <Misto>${esc(client.area)}</Misto>
      </ObchodniPartner>
    </FaktVydana>`;
}

function generateMoneyS3Xml(invoices, options = {}) {
    const { year, dateBasis = 'issueDate', ico } = options;
    const selected = (invoices || []).filter((inv) => {
        if ((inv.status || 'draft') === 'draft') return false;
        if (year && invoiceYear(inv, dateBasis) !== Number(year)) return false;
        return true;
    });
    const supplierIco = esc(ico || selected[0]?.supplier?.ico || '');
    const body = selected.map((inv) => moneyInvoiceXml(inv)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<MoneyData ICAgendy="${supplierIco}" GUID="" Aplikace="Fakturidias">
  <SeznamFaktVydane>
${body}
  </SeznamFaktVydane>
</MoneyData>`;
}

module.exports = { generatePohodaXml, generateMoneyS3Xml };
