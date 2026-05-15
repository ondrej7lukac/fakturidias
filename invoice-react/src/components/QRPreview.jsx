import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { getCzechQrPayload } from '../utils/bank';
import './QRPreview.css';
import { Textarea } from './ui/textarea';

export default function QRPreview({ invoice, lang, t }) {
  const qrContainerRef = useRef(null);
  const qrPayload = getCzechQrPayload(invoice);

  return (
    <section className='card qr-preview-section'>
      <h2>{t.qrPreview}</h2>
      <p className='invoice-meta'>{t.qrInstruction}</p>
      <div id='qr' ref={qrContainerRef} className='qr-preview-box'>
        {invoice ? (
          <QRCodeCanvas value={qrPayload} size={180} level='M' />
        ) : (
          <span className='empty'>{t.qrEmpty}</span>
        )}
      </div>
      <div className='grid'>
        <div>
          <label htmlFor='qrText'>{t.qrPayload}</label>
          <Textarea
            id='qrText'
            value={qrPayload}
            readOnly
            className='qr-preview-payload'
          />
        </div>
      </div>
    </section>
  );
}
