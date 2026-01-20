/**
 * Utility for generating PDF invoices using jspdf and html2canvas
 * These are expected to be available via window.jspdf and window.html2canvas (CDN)
 */

export const generateInvoicePDF = async (invoice, t, qrDataUrl = null) => {
    const { jsPDF } = window.jspdf;
    const canvas = await createInvoiceCanvas(invoice, t, qrDataUrl);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf;
};

const createInvoiceCanvas = async (invoice, t, qrDataUrl) => {
    // Create a temporary container for the invoice (completely hidden to prevent glitches)
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '9999999'; // Very high to ensure it's on top but invisible
    container.style.visibility = 'hidden'; // Completely hide from view
    container.style.opacity = '0'; // Extra safety - fully transparent
    container.style.pointerEvents = 'none'; // Prevent any interaction
    container.style.width = '210mm'; // A4 width
    container.style.minHeight = '297mm'; // A4 height
    container.style.padding = '20mm';
    container.style.background = '#ffffff';
    container.style.color = '#111827';
    container.style.fontFamily = 'Inter, sans-serif';

    const itemsHtml = invoice.items.map(item => `
        <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${item.price.toFixed(2)}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${item.total.toFixed(2)}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; border-bottom: 2px solid #6366f1; padding-bottom: 20px;">
            <div>
                <h1 style="margin: 0; color: #6366f1; font-size: 32px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em;">${t.invoice}</h1>
                <p style="margin: 5px 0; color: #64748b; font-size: 16px; font-weight: 500;"># ${invoice.invoiceNumber}</p>
            </div>
            <div style="text-align: right; color: #1f2937;">
                <p style="margin: 0; font-weight: 600;">${t.issueDate}: <span style="font-weight: 400;">${invoice.issueDate}</span></p>
                <p style="margin: 5px 0; font-weight: 600;">${t.dueDate}: <span style="font-weight: 400; color: ${new Date(invoice.dueDate) < new Date() ? '#ef4444' : 'inherit'};">${invoice.dueDate || 'N/A'}</span></p>
                ${invoice.taxableSupplyDate && invoice.taxableSupplyDate !== invoice.issueDate ? `<p style="margin: 5px 0; font-weight: 600; font-size: 12px;">DUZP: <span style="font-weight: 400;">${invoice.taxableSupplyDate}</span></p>` : ''}
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 50px;">
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
                ${!invoice.isVatPayer ? `<p style="margin-top: 10px; padding: 8px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; font-size: 11px; font-weight: 600;">⚠️ Nejsem plátce DPH</p>` : ''}
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

        <div style="margin-bottom: 50px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">${t.paymentDetails}</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                <div>
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">${t.iban}</p>
                    <p style="margin: 4px 0; font-weight: 600; font-family: monospace; font-size: 14px;">${invoice.payment.iban || 'N/A'}</p>
                </div>
                <div>
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">${t.bic}</p>
                    <p style="margin: 4px 0; font-weight: 600;">${invoice.payment.bic || 'N/A'}</p>
                </div>
                <div>
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase;">${t.paymentNote}</p>
                    <p style="margin: 4px 0; font-weight: 600;">${invoice.payment.note || invoice.invoiceNumber}</p>
                </div>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
            <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                    <th style="text-align: left; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.itemDescription}</th>
                    <th style="text-align: center; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.qty}</th>
                    <th style="text-align: right; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.price}</th>
                    <th style="text-align: right; padding: 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">${t.total}</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

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

        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
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
                    <span style="font-weight: 600;">${invoice.currency} ${invoice.amount.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #6366f1;">
                    <span style="font-weight: 700; font-size: 18px;">${t.total}:</span>
                    <span style="font-weight: 700; font-size: 18px; color: #6366f1;">${invoice.currency} ${invoice.amount.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 12px; text-align: center;">
            <p>${t.thankYou}</p>
        </div>
    `;

    document.body.appendChild(container);
    // Ensure fonts and images are loaded
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await window.html2canvas(container, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });
    document.body.removeChild(container);
    return canvas;
};

