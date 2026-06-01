'use strict';

// ISDOC 6.0.1 — the Czech national e-invoice XML standard (isdoc.cz).
// Structurally mirrors backend/lib/peppol.js (UBL). The output covers the
// mandatory ISDOC elements; validate against the official ISDOC 6.0.1 XSD
// before relying on it for legal e-invoice exchange.

const crypto = require('crypto');

const ISDOC_NS = 'http://isdoc.cz/namespace/2013';
const ISDOC_VERSION = '6.0.1';

function esc(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Our dates are stored ISO ('YYYY-MM-DD'); tolerate legacy 'DD.MM.YYYY' too.
function isoDate(date) {
    if (!date) return '';
    const parts = String(date).split('.');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return String(date);
}

function n2(value) {
    return (Number(value) || 0).toFixed(2);
}

function countryOf(party) {
    const ico = String(party?.ico || '');
    const country = String(party?.country || '').toUpperCase();
    if (country === 'CZ' || country === 'SK') return country;
    return ico.startsWith('SK') ? 'SK' : 'CZ';
}

function partyXml(tag, party, isVatPayer) {
    return `    <${tag}>
        <Party>
            <PartyIdentification>
                <ID>${esc(party?.ico)}</ID>
            </PartyIdentification>
            <PartyName>
                <Name>${esc(party?.name)}</Name>
            </PartyName>
            <PostalAddress>
                <StreetName>${esc(party?.address)}</StreetName>
                <City>${esc(party?.area)}</City>
                <Country>
                    <IdentificationCode>${countryOf(party)}</IdentificationCode>
                    <Name>${countryOf(party) === 'SK' ? 'Slovensko' : 'Česká republika'}</Name>
                </Country>
            </PostalAddress>
            ${party?.vat ? `<PartyTaxScheme>
                <CompanyID>${esc(party.vat)}</CompanyID>
                <TaxScheme>${isVatPayer ? 'VAT' : 'None'}</TaxScheme>
            </PartyTaxScheme>` : ''}
        </Party>
    </${tag}>`;
}

function generateIsdocXml(invoice) {
    const {
        invoiceNumber,
        issueDate,
        taxableSupplyDate,
        currency = 'CZK',
        client = {},
        supplier = {},
        items = [],
        amount,
        taxBase,
        taxAmount,
        taxRate,
        isVatPayer,
    } = invoice;

    const vatApplicable = isVatPayer ? 'true' : 'false';
    const lines = items
        .map((item, index) => {
            const qty = Number(item.qty) || 0;
            const price = Number(item.price) || 0;
            const rate = Number(item.taxRate) || 0;
            const lineBase = qty * price;
            const lineTax = isVatPayer ? lineBase * (rate / 100) : 0;
            return `        <InvoiceLine>
            <ID>${index + 1}</ID>
            <InvoicedQuantity unitCode="${esc(item.unit || 'ks')}">${qty}</InvoicedQuantity>
            <LineExtensionAmount>${n2(lineBase)}</LineExtensionAmount>
            <LineExtensionAmountTaxInclusive>${n2(lineBase + lineTax)}</LineExtensionAmountTaxInclusive>
            <LineExtensionAmountCurr>${n2(lineBase)}</LineExtensionAmountCurr>
            <UnitPrice>${n2(price)}</UnitPrice>
            <UnitPriceTaxInclusive>${n2(price * (1 + (isVatPayer ? rate / 100 : 0)))}</UnitPriceTaxInclusive>
            <ClassifiedTaxCategory>
                <Percent>${isVatPayer ? rate : 0}</Percent>
                <VATCalculationMethod>0</VATCalculationMethod>
                <VATApplicable>${vatApplicable}</VATApplicable>
            </ClassifiedTaxCategory>
            <Item>
                <Description>${esc(item.name)}</Description>
            </Item>
        </InvoiceLine>`;
        })
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="${ISDOC_NS}" version="${ISDOC_VERSION}">
    <DocumentType>1</DocumentType>
    <ID>${esc(invoiceNumber)}</ID>
    <UUID>${crypto.randomUUID()}</UUID>
    <IssueDate>${isoDate(issueDate)}</IssueDate>
    <TaxPointDate>${isoDate(taxableSupplyDate || issueDate)}</TaxPointDate>
    <VATApplicable>${vatApplicable}</VATApplicable>
    <LocalCurrencyCode>${esc(currency)}</LocalCurrencyCode>
    <CurrRate>1</CurrRate>
    <RefCurrRate>1</RefCurrRate>
${partyXml('AccountingSupplierParty', supplier, isVatPayer)}
${partyXml('AccountingCustomerParty', client, isVatPayer)}
    <InvoiceLines>
${lines}
    </InvoiceLines>
    <TaxTotal>
        <TaxSubTotal>
            <TaxableAmount>${n2(taxBase)}</TaxableAmount>
            <TaxAmount>${n2(taxAmount)}</TaxAmount>
            <TaxInclusiveAmount>${n2(amount)}</TaxInclusiveAmount>
            <TaxableAmountCurr>${n2(taxBase)}</TaxableAmountCurr>
            <TaxAmountCurr>${n2(taxAmount)}</TaxAmountCurr>
            <TaxInclusiveAmountCurr>${n2(amount)}</TaxInclusiveAmountCurr>
            <TaxCategory>
                <Percent>${isVatPayer ? (taxRate || 0) : 0}</Percent>
                <VATApplicable>${vatApplicable}</VATApplicable>
            </TaxCategory>
        </TaxSubTotal>
        <TaxAmount>${n2(taxAmount)}</TaxAmount>
    </TaxTotal>
    <LegalMonetaryTotal>
        <TaxExclusiveAmount>${n2(taxBase)}</TaxExclusiveAmount>
        <TaxInclusiveAmount>${n2(amount)}</TaxInclusiveAmount>
        <AlreadyClaimedTaxExclusiveAmount>0.00</AlreadyClaimedTaxExclusiveAmount>
        <AlreadyClaimedTaxInclusiveAmount>0.00</AlreadyClaimedTaxInclusiveAmount>
        <DifferenceTaxExclusiveAmount>${n2(taxBase)}</DifferenceTaxExclusiveAmount>
        <DifferenceTaxInclusiveAmount>${n2(amount)}</DifferenceTaxInclusiveAmount>
        <PayableRoundingAmount>0.00</PayableRoundingAmount>
        <PaidDepositsAmount>0.00</PaidDepositsAmount>
        <PayableAmount>${n2(amount)}</PayableAmount>
    </LegalMonetaryTotal>
</Invoice>`;
}

module.exports = { generateIsdocXml };
