/**
 * Utility for generating PDF invoices using jspdf and html2canvas
 * These are expected to be available via window.jspdf and window.html2canvas (CDN)
 */

export const generateInvoicePDF = async (invoice, t, qrDataUrl = null) => {
    const { jsPDF } = window.jspdf;
    const canvas = await createInvoiceCanvas(invoice, t, qrDataUrl);

    // Higher quality output
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate the height of the image on the PDF page
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Add more pages if content overflows (with 5mm tolerance for rounding errors)
    while (heightLeft > 5) {
        position = heightLeft - imgHeight; // Negative position to shift image up
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
    }

    return pdf;
};

const createInvoiceCanvas = async (invoice, t, qrDataUrl) => {
    // Create a temporary container off-screen (but visible to DOM)
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px'; // Off-screen
    container.style.top = '0';
    container.style.zIndex = '9999999';
    // container.style.visibility = 'hidden'; // DO NOT USE: breaks html2canvas
    container.style.width = '210mm'; // A4 width
    container.style.minHeight = '297mm'; // A4 height
    container.style.padding = '20mm';
    container.style.background = '#ffffff';
    container.style.color = '#111827';
    container.style.fontFamily = 'Inter, sans-serif';
    container.style.boxSizing = 'border-box'; // Ensure padding is included in width

    // Inject font style explicitly to ensure capture
    const style = document.createElement('style');
    style.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { -webkit-font-smoothing: antialiased; }
    `;
    container.appendChild(style);

    const itemsHtml = invoice.items.map(item => `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${item.price.toFixed(2)}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.taxRate || 0}%</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.discount > 0 ? `${invoice.currency} ${item.discount.toFixed(2)}` : '-'}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${item.total.toFixed(2)}</td>
        </tr>
    `).join('');

    container.innerHTML += `
        <div style="font-family: 'Inter', sans-serif;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 50px; border-bottom: 2px solid #6366f1; padding-bottom: 20px;">
                <div>
                    <h1 style="margin: 0; color: #6366f1; font-size: 32px; font-weight: 800; text-transform: uppercase;">${t.invoice}</h1>
                    <p style="margin: 5px 0; color: #64748b; font-size: 16px; font-weight: 500;"># ${invoice.invoiceNumber}</p>
                </div>
                <div style="text-align: right; color: #1f2937;">
                    <p style="margin: 0; font-weight: 600;">${t.issueDate}: <span style="font-weight: 400;">${invoice.issueDate}</span></p>
                    <p style="margin: 5px 0; font-weight: 600;">${t.dueDate}: <span style="font-weight: 400;">${invoice.dueDate || 'N/A'}</span></p>
                    ${invoice.taxableSupplyDate && invoice.taxableSupplyDate !== invoice.issueDate ? `
                        <p style="margin: 5px 0; font-weight: 600; font-size: 12px;">DUZP: <span style="font-weight: 400;">${invoice.taxableSupplyDate}</span></p>
                    ` : ''}
                </div>
            </div>

            <!-- Supplier & Client -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
                <div>
                    <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">${t.issuer}</h3>
                    <p style="margin: 0; font-weight: 700; font-size: 18px; color: #111827;">${invoice.supplier?.name || '---'}</p>
                    <p style="margin: 6px 0; line-height: 1.5; color: #374151;">${invoice.supplier?.address || ''}</p>
                    <div style="font-size: 14px; color: #4b5563;">
                        ${invoice.supplier?.ico ? `<p style="margin: 2px 0;"><strong>${t.ico}:</strong> ${invoice.supplier.ico}</p>` : ''}
                        ${invoice.supplier?.vat ? `<p style="margin: 2px 0;"><strong>${t.vat}:</strong> ${invoice.supplier.vat}</p>` : ''}
                        ${invoice.supplier?.registry ? `<p style="margin: 2px 0; font-size: 12px;">${invoice.supplier.registry}</p>` : ''}
                        ${invoice.supplier?.phone ? `<p style="margin: 2px 0;">Tel: ${invoice.supplier.phone}</p>` : ''}
                        ${invoice.supplier?.email ? `<p style="margin: 2px 0;">Email: ${invoice.supplier.email}</p>` : ''}
                    </div>
                    ${!invoice.isVatPayer ? `
                        <p style="
                            margin-top: 10px;
                            color: #64748b;
                            font-size: 11px;
                            font-style: italic;
                        ">Nejsem plátce DPH</p>
                    ` : ''}
                </div>
                <div>
                    <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">${t.billTo}</h3>
                    <p style="margin: 0; font-weight: 700; font-size: 18px; color: #111827;">${invoice.client.name}</p>
                    <p style="margin: 6px 0; line-height: 1.5; color: #374151;">${invoice.client.address || ''}</p>
                    <div style="font-size: 14px; color: #4b5563;">
                        ${invoice.client.ico ? `<p style="margin: 2px 0;"><strong>${t.ico}:</strong> ${invoice.client.ico}</p>` : ''}
                        ${invoice.client.vat ? `<p style="margin: 2px 0;"><strong>${t.vat}:</strong> ${invoice.client.vat}</p>` : ''}
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                <thead>
                    <tr style="border-bottom: 2px solid #e5e7eb;">
                        <th style="text-align: left; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.itemDescription}</th>
                        <th style="text-align: center; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.qty}</th>
                        <th style="text-align: right; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.lang === 'cs' || !t.lang ? 'CENA/JEDN.' : 'PRICE/UNIT'}</th>
                        <th style="text-align: center; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.lang === 'cs' || !t.lang ? 'DPH %' : 'TAX %'}</th>
                        <th style="text-align: right; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.lang === 'cs' || !t.lang ? 'SLEVA' : 'DISC.'}</th>
                        <th style="text-align: right; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.total}</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <!-- VAT Section -->
            ${invoice.isVatPayer ? `
                <div style="margin-bottom: 30px; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
                    <h3 style="margin: 0 0 10px; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 0.05em;">Daňový doklad - Rozpis DPH</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; font-size: 14px;">
                        <div>
                            <p style="margin: 0; font-size: 11px; color: #166534; text-transform: uppercase;">Základ daně</p>
                            <p style="margin: 4px 0; font-weight: 600; color: #15803d;">${invoice.currency} ${parseFloat(invoice.taxBase || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: 11px; color: #166534; text-transform: uppercase;">Sazba DPH</p>
                            <p style="margin: 4px 0; font-weight: 600; color: #15803d;">${invoice.taxRate || '21'}%</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: 11px; color: #166534; text-transform: uppercase;">Výše daně</p>
                            <p style="margin: 4px 0; font-weight: 600; color: #15803d;">${invoice.currency} ${parseFloat(invoice.taxAmount || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Footer (QR & Total) -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                <div style="width: 180px;">
                    ${qrDataUrl ? `
                        <div style="margin-bottom: 10px;">
                            <h3 style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #64748b;">${t.qrPreview}</h3>
                            <img src="${qrDataUrl}" style="width: 120px; height: 120px; border: 1px solid #e5e7eb;" />
                        </div>
                    ` : ''}
                </div>
                <div style="width: 250px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #64748b;">${t.subtotal}:</span>
                        <span style="font-weight: 600;">${invoice.currency} ${parseFloat(invoice.isVatPayer ? (invoice.taxBase || invoice.amount) : invoice.amount).toFixed(2)}</span>
                    </div>

                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        color: #64748b;
                        font-size: 13px;
                    ">
                        <span>${t.lang === 'cs' || !t.lang ? 'DPH' : 'VAT'} (${invoice.isVatPayer ? invoice.taxRate : '0'}%)</span>
                        <span>${invoice.currency} ${parseFloat(invoice.isVatPayer ? (invoice.taxAmount || 0) : 0).toFixed(2)}</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #6366f1;">
                        <span style="font-weight: 700; font-size: 18px;">${t.total}:</span>
                        <span style="font-weight: 700; font-size: 18px; color: #6366f1;">${invoice.currency} ${invoice.amount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Minimalistic Payment Footer -->
            <div style="
                padding: 15px 20px; 
                background: #f8fafc; 
                border-top: 1px solid #e2e8f0; 
                display: flex; 
                justify-content: space-between; 
                flex-wrap: wrap; 
                gap: 20px; 
                font-size: 13px;
                color: #0f172a;
            ">
                <div>
                    <span style="color: #64748b; margin-right: 6px;">${t.bankAccount}:</span>
                    <span style="font-weight: 600;">${invoice.payment.accountNumber || ''}/${invoice.payment.bankCode || ''}</span>
                </div>
                <div>
                    <span style="color: #64748b; margin-right: 6px;">${t.iban}:</span>
                    <span style="font-weight: 600; font-family: monospace;">${invoice.payment.iban}</span>
                </div>
                <div>
                    <span style="color: #64748b; margin-right: 6px;">${t.bic}:</span>
                    <span style="font-weight: 600;">${invoice.payment.bic}</span>
                </div>
                <div>
                    <span style="color: #64748b; margin-right: 6px;">${t.variableSymbol}:</span>
                    <span style="font-weight: 600;">${invoice.payment.variableSymbol || ''}</span>
                </div>
            </div>

            <!-- Thank you note -->
            <div style="margin-top: 20px; color: #94a3b8; font-size: 11px; text-align: center;">
                <p>${t.thankYou}</p>
            </div>
        </div>
    `;

    document.body.appendChild(container);
    // Ensure fonts and images are loaded
    await new Promise(resolve => setTimeout(resolve, 800));

    const canvas = await window.html2canvas(container, {
        scale: 3, // High quality, reasonable size
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });
    document.body.removeChild(container);
    return canvas;
};

