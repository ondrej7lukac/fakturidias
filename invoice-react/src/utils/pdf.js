/**
 * Utility for generating PDF invoices using jspdf and html2canvas
 * These are expected to be available via window.jspdf and window.html2canvas (CDN)
 */

export const generateInvoicePDF = async (invoice, t, qrDataUrl = null) => {
    const { jsPDF } = window.jspdf;
    const canvas = await createInvoiceCanvas(invoice, t, qrDataUrl);

    const imgData = canvas.toDataURL('image/jpeg', 0.75); // Use JPEG/0.75 for much smaller size
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true // Enable internal PDF compression
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
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
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.taxRate || 0}%</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.discount > 0 ? `${invoice.currency} ${item.discount.toFixed(2)}` : '-'}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${item.total.toFixed(2)}</td>
        </tr>
    `).join('');

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

        ${
        invoice.isVatPayer ? `
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
        ` : ''
    }

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

