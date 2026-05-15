import { QRCodeCanvas } from 'qrcode.react';
import { getCzechQrPayload } from '../utils/bank';
import './InvoicePreview.css';

export default function InvoicePreview({ invoice, t, lang }) {
  const isDueDateOverdue =
    invoice.dueDate && new Date(invoice.dueDate) < new Date();

  return (
    <div className='invoice-preview'>
      {/* Header */}
      <div className='preview-header'>
        <div>
          <h1 className='preview-title'>{t.invoice}</h1>
          <p className='preview-number'># {invoice.invoiceNumber}</p>
        </div>
        <div className='preview-meta'>
          <p className='preview-meta-row'>
            {t.issueDate}:{' '}
            <span className='preview-meta-value'>{invoice.issueDate}</span>
          </p>
          <p className='preview-meta-row'>
            {t.dueDate}:{' '}
            <span
              className={`preview-meta-value ${isDueDateOverdue ? 'preview-meta-value-overdue' : ''}`}
            >
              {invoice.dueDate || 'N/A'}
            </span>
          </p>
          {invoice.taxableSupplyDate &&
            invoice.taxableSupplyDate !== invoice.issueDate && (
              <p className='preview-meta-row preview-meta-row-small'>
                DUZP:{' '}
                <span className='preview-meta-value'>
                  {invoice.taxableSupplyDate}
                </span>
              </p>
            )}
        </div>
      </div>

      {/* Supplier and Client Info */}
      <div className='preview-grid-2'>
        {/* Supplier */}
        <div>
          <h3 className='preview-section-title'>{t.issuer}</h3>
          <p className='preview-entity-name'>
            {invoice.supplier?.name || '---'}
          </p>
          <p className='preview-entity-address'>
            {invoice.supplier?.address || ''}
          </p>
          <div className='preview-entity-details'>
            {invoice.supplier?.ico && (
              <p className='preview-entity-detail'>
                <strong>{t.ico}:</strong> {invoice.supplier.ico}
              </p>
            )}
            {invoice.supplier?.vat && (
              <p className='preview-entity-detail'>
                <strong>{t.vat}:</strong> {invoice.supplier.vat}
              </p>
            )}
            {invoice.supplier?.registry && (
              <p className='preview-entity-detail preview-entity-detail-registry'>
                {invoice.supplier.registry}
              </p>
            )}
            {invoice.supplier?.phone && (
              <p className='preview-entity-detail'>
                Tel: {invoice.supplier.phone}
              </p>
            )}
            {invoice.supplier?.email && (
              <p className='preview-entity-detail'>
                Email: {invoice.supplier.email}
              </p>
            )}
          </div>
          {!invoice.isVatPayer && (
            <p className='preview-note'>Nejsem plátce DPH</p>
          )}
        </div>

        {/* Client */}
        <div>
          <h3 className='preview-section-title'>{t.billTo}</h3>
          <p className='preview-entity-name'>{invoice.client.name}</p>
          <p className='preview-entity-address'>
            {invoice.client.address || ''}
          </p>
          <div className='preview-entity-details'>
            {invoice.client.ico && (
              <p className='preview-entity-detail'>
                <strong>{t.ico}:</strong> {invoice.client.ico}
              </p>
            )}
            {invoice.client.vat && (
              <p className='preview-entity-detail'>
                <strong>{t.vat}:</strong> {invoice.client.vat}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className='table-container'>
        <table className='preview-table'>
          <thead>
            <tr className='preview-table-head-row'>
              <th className='preview-table-head-cell preview-cell-left'>
                {t.itemDescription}
              </th>
              <th className='preview-table-head-cell preview-cell-center'>
                {t.qty}
              </th>
              <th className='preview-table-head-cell preview-cell-right'>
                {lang === 'cs' ? 'CENA/JEDN.' : 'PRICE/UNIT'}
              </th>
              <th className='preview-table-head-cell preview-cell-center'>
                {lang === 'cs' ? 'DPH %' : 'TAX %'}
              </th>
              <th className='preview-table-head-cell preview-cell-right'>
                {lang === 'cs' ? 'SLEVA' : 'DISC.'}
              </th>
              <th className='preview-table-head-cell preview-cell-right'>
                {t.total}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx}>
                <td className='preview-table-cell'>{item.name}</td>
                <td className='preview-table-cell preview-cell-center'>
                  {item.qty}
                </td>
                <td className='preview-table-cell preview-cell-right'>
                  {invoice.currency} {item.price.toFixed(2)}
                </td>
                <td className='preview-table-cell preview-cell-center'>
                  {item.taxRate || 0}%
                </td>
                <td className='preview-table-cell preview-cell-right'>
                  {item.discount > 0
                    ? `${invoice.currency} ${item.discount.toFixed(2)}`
                    : '-'}
                </td>
                <td className='preview-table-cell preview-cell-right'>
                  {invoice.currency} {item.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VAT Section */}
      {invoice.isVatPayer && (
        <div className='preview-vat-box'>
          <h3 className='preview-vat-title'>Daňový doklad - Rozpis DPH</h3>
          <div className='preview-vat-grid'>
            <div>
              <p className='preview-vat-label'>Základ daně</p>
              <p className='preview-vat-value'>
                {invoice.currency} {parseFloat(invoice.taxBase || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className='preview-vat-label'>Sazba DPH</p>
              <p className='preview-vat-value'>{invoice.taxRate || '21'}%</p>
            </div>
            <div>
              <p className='preview-vat-label'>Výše daně</p>
              <p className='preview-vat-value'>
                {invoice.currency}{' '}
                {parseFloat(invoice.taxAmount || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Total & QR */}
      <div className='preview-footer preview-footer-spaced'>
        <div className='preview-qr-panel'>
          <h3 className='preview-qr-title'>{t.qrPreview}</h3>
          <div className='preview-qr-box'>
            <QRCodeCanvas
              value={getCzechQrPayload(invoice)}
              size={120}
              level='M'
              includeMargin={false}
            />
          </div>
        </div>
        <div className='preview-totals-panel'>
          <div className='preview-total-row'>
            <span className='preview-total-label'>{t.subtotal}:</span>
            <span className='preview-total-value'>
              {invoice.currency}{' '}
              {parseFloat(
                invoice.isVatPayer
                  ? invoice.taxBase || invoice.amount
                  : invoice.amount,
              ).toFixed(2)}
            </span>
          </div>

          <div className='preview-total-row preview-total-row-muted'>
            <span>
              {lang === 'cs' ? 'DPH' : 'VAT'} (
              {invoice.isVatPayer ? invoice.taxRate : '0'}%)
            </span>
            <span>
              {invoice.currency}{' '}
              {parseFloat(
                invoice.isVatPayer ? invoice.taxAmount || 0 : 0,
              ).toFixed(2)}
            </span>
          </div>

          <div className='preview-total-row preview-total-row-final'>
            <span className='preview-total-final-label'>{t.total}:</span>
            <span className='preview-total-final-value'>
              {invoice.currency} {invoice.amount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Minimalistic Payment Details (Bottom) */}
      <div className='preview-payment-bar'>
        <div className='preview-payment-item'>
          <span className='preview-payment-label'>{t.bankAccount}:</span>
          <span className='preview-payment-value'>
            {invoice.payment.accountNumber}/{invoice.payment.bankCode}
          </span>
        </div>
        <div className='preview-payment-item'>
          <span className='preview-payment-label'>{t.iban}:</span>
          <span className='preview-payment-value preview-payment-value-iban'>
            {invoice.payment.iban}
          </span>
        </div>
        <div className='preview-payment-item'>
          <span className='preview-payment-label'>{t.bic}:</span>
          <span className='preview-payment-value'>{invoice.payment.bic}</span>
        </div>
        <div className='preview-payment-item'>
          <span className='preview-payment-label'>{t.variableSymbol}:</span>
          <span className='preview-payment-value'>
            {invoice.payment.variableSymbol}
          </span>
        </div>
      </div>

      {/* Thank you note */}
      <div className='preview-thanks'>
        <p>{t.thankYou}</p>
      </div>
    </div>
  );
}
