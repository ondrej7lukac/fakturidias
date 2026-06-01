'use strict';

// Kontrolní hlášení DPH (KH1) — the Czech VAT control statement filed with the
// Finanční správa via the EPO portal.
//
// ⚠️  This produces a DRAFT for issued invoices only (sections A.4 / A.5, the
// supplier side). It MUST be validated and completed in the official EPO
// application before submission — VetaP identification, B-sections (received
// supplies) and the exact XSD (mfcr.cz) are the authoritative source. Treat this
// as a data-entry aid, not a ready-to-file document.

// A.4 lists each taxable supply to a VAT-registered customer where the total
// incl. VAT exceeds this threshold; smaller / B2C supplies are aggregated in A.5.
const A4_THRESHOLD = 10000;

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

function digits(value) {
    return String(value || '').replace(/\D/g, '');
}

function isoDate(date) {
    if (!date) return '';
    const parts = String(date).split('.');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return String(date).split('T')[0];
}

// Map our numeric VAT rate to KH's three rate columns: 1 = basic (21 %),
// 2 = first reduced (15 / 12 %), 3 = second reduced (10 %).
function rateColumn(rate) {
    const r = Number(rate) || 0;
    if (r >= 20) return 1;
    if (r >= 11) return 2;
    if (r > 0) return 3;
    return 0;
}

function taxableDate(invoice) {
    return isoDate(invoice.taxableSupplyDate || invoice.issueDate);
}

function inPeriod(invoice, year, month) {
    const d = new Date(taxableDate(invoice));
    if (Number.isNaN(d.getTime())) return false;
    if (d.getFullYear() !== Number(year)) return false;
    if (month && d.getMonth() + 1 !== Number(month)) return false;
    return true;
}

// The control statement is due on the 25th of the month after the period.
function submissionDate(year, month) {
    let y = Number(year);
    let m = Number(month || 12) + 1;
    if (m > 12) {
        m = 1;
        y += 1;
    }
    return `${y}-${String(m).padStart(2, '0')}-25`;
}

function emptyBuckets() {
    return { base1: 0, vat1: 0, base2: 0, vat2: 0, base3: 0, vat3: 0 };
}

function addToBuckets(buckets, invoice) {
    const col = rateColumn(invoice.taxRate);
    const base = Number(invoice.taxBase) || 0;
    const vat = Number(invoice.taxAmount) || 0;
    if (col === 1) {
        buckets.base1 += base;
        buckets.vat1 += vat;
    } else if (col === 2) {
        buckets.base2 += base;
        buckets.vat2 += vat;
    } else if (col === 3) {
        buckets.base3 += base;
        buckets.vat3 += vat;
    }
}

function vetaA4(invoice, lineNumber) {
    const col = rateColumn(invoice.taxRate);
    const base = Number(invoice.taxBase) || 0;
    const vat = Number(invoice.taxAmount) || 0;
    const attrs = {
        c_radku: lineNumber,
        dic_odb: digits(invoice.client?.vat),
        c_evid_dd: esc(invoice.invoiceNumber),
        dppd: taxableDate(invoice),
        zakl_dane1: col === 1 ? n2(base) : '0.00',
        dan1: col === 1 ? n2(vat) : '0.00',
        zakl_dane2: col === 2 ? n2(base) : '0.00',
        dan2: col === 2 ? n2(vat) : '0.00',
        zakl_dane3: col === 3 ? n2(base) : '0.00',
        dan3: col === 3 ? n2(vat) : '0.00',
        kod_rezim_pl: 0,
        zdph_44: 'N',
    };
    const serialized = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
    return `    <VetaA4 ${serialized}/>`;
}

function generateControlStatementXml(invoices, options = {}) {
    const { year, month, supplier = {} } = options;

    const domestic = (invoices || []).filter((inv) => {
        if ((inv.status || 'draft') === 'draft') return false;
        if (!inv.isVatPayer) return false; // only VAT-payer supplies belong in KH
        const country = String(inv.client?.country || inv.clientCountry || 'CZ').toUpperCase();
        if (country !== 'CZ') return false; // KH covers domestic supplies
        return inPeriod(inv, year, month);
    });

    const a4 = [];
    const a5 = emptyBuckets();
    let lineNumber = 0;

    for (const inv of domestic) {
        const total = Number(inv.amount) || 0;
        const customerDic = digits(inv.client?.vat);
        if (customerDic && total > A4_THRESHOLD) {
            a4.push(vetaA4(inv, ++lineNumber));
        } else {
            addToBuckets(a5, inv);
        }
    }

    // Control totals = A.4 + A.5 per rate column.
    const totals = emptyBuckets();
    Object.assign(totals, a5);
    for (const inv of domestic) {
        const total = Number(inv.amount) || 0;
        if (digits(inv.client?.vat) && total > A4_THRESHOLD) addToBuckets(totals, inv);
    }

    const a4Xml = a4.join('\n');
    const a5HasData =
        a5.base1 || a5.vat1 || a5.base2 || a5.vat2 || a5.base3 || a5.vat3;
    const a5Xml = a5HasData
        ? `    <VetaA5 zakl_dane1="${n2(a5.base1)}" dan1="${n2(a5.vat1)}" zakl_dane2="${n2(a5.base2)}" dan2="${n2(a5.vat2)}" zakl_dane3="${n2(a5.base3)}" dan3="${n2(a5.vat3)}"/>`
        : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<Pisemnost nazevSW="Fakturidias" verzeSW="1.0">
  <DPHKH1 verzePis="03.01">
    <VetaD k_uladis="DPH" dokument="KH1" mesic="${esc(month || '')}" rok="${esc(year || '')}" d_poddp="${submissionDate(year, month)}" khdph_forma="B"/>
    <VetaP dic="${digits(supplier.vat)}" typ_ds="P" jmeno="${esc(supplier.name)}" naz_obce="${esc(supplier.area)}" ulice="${esc(supplier.address)}"/>
${a4Xml}
${a5Xml}
    <VetaC obrat23="${n2(totals.base1)}" pln23="${n2(totals.vat1)}" obrat5="${n2(totals.base2)}" pln5="${n2(totals.vat2)}"/>
  </DPHKH1>
</Pisemnost>`;
}

module.exports = { generateControlStatementXml, A4_THRESHOLD };
