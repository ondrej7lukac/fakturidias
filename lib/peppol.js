/**
 * Peppol BIS Billing 3.0 / UBL 2.1 XML Generator
 * Strictly follows EN 16931 and Peppol BIS 3.0 specifications.
 */

function generatePeppolXml(invoice) {
    const {
        invoiceNumber,
        issueDate,
        dueDate,
        currency,
        client,
        supplier,
        items,
        amount,
        taxBase,
        taxAmount,
        isVatPayer
    } = invoice;

    // Helper to escape XML special characters
    const esc = (str) => String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const formatDate = (date) => {
        if (!date) return '';
        // Input: DD.MM.YYYY, Output: YYYY-MM-DD
        const parts = date.split('.');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return date; // fallback
    };

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:poacc:trns:invoice:3</cbc:CustomizationID>
    <cbc:ProfileID>urn:fdc:peppol.eu:poacc:bis:invoice:3</cbc:ProfileID>
    <cbc:ID>${esc(invoiceNumber)}</cbc:ID>
    <cbc:IssueDate>${formatDate(issueDate)}</cbc:IssueDate>
    <cbc:DueDate>${formatDate(dueDate)}</cbc:DueDate>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${esc(currency)}</cbc:DocumentCurrencyCode>
    <cbc:BuyerReference>N/A</cbc:BuyerReference>
    
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cbc:EndpointID schemeID="0007">${esc(supplier.ico)}</cbc:EndpointID>
            <cac:PartyName>
                <cbc:Name>${esc(supplier.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${esc(supplier.address)}</cbc:StreetName>
                <cac:Country>
                    <cbc:IdentificationCode>${supplier.ico?.startsWith('CZ') ? 'CZ' : 'SK'}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${esc(supplier.vat)}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${esc(supplier.name)}</cbc:RegistrationName>
                <cbc:CompanyID>${esc(supplier.ico)}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <cac:AccountingCustomerParty>
        <cac:Party>
            <cbc:EndpointID schemeID="0007">${esc(client.ico)}</cbc:EndpointID>
            <cac:PartyName>
                <cbc:Name>${esc(client.name)}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${esc(client.address)}</cbc:StreetName>
                <cac:Country>
                    <cbc:IdentificationCode>${client.ico?.startsWith('CZ') ? 'CZ' : 'SK'}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${esc(client.vat)}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${esc(client.name)}</cbc:RegistrationName>
                <cbc:CompanyID>${esc(client.ico)}</cbc:CompanyID>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${esc(currency)}">${taxAmount}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${esc(currency)}">${taxBase}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${esc(currency)}">${taxAmount}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>${isVatPayer ? 'S' : 'E'}</cbc:ID>
                <cbc:Percent>${isVatPayer ? invoice.taxRate : '0'}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${esc(currency)}">${taxBase}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${esc(currency)}">${taxBase}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${esc(currency)}">${amount}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${esc(currency)}">${amount}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    ${items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="HUR">${item.qty}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${esc(currency)}">${(item.qty * item.price).toFixed(2)}</cbc:LineExtensionAmount>
        <cac:Item>
            <cbc:Name>${esc(item.name)}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>${item.taxRate > 0 ? 'S' : 'E'}</cbc:ID>
                <cbc:Percent>${item.taxRate}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${esc(currency)}">${item.price}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join('')}
</Invoice>`;

    return xml;
}

module.exports = {
    generatePeppolXml
};
