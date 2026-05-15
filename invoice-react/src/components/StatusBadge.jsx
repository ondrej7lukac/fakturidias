import { useState, useRef, useEffect } from 'react';
import './StatusBadge.css';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const STATUSES = ['draft', 'sent', 'paid', 'overdue'];

const STATUS_LABELS = {
  cs: {
    draft: 'Rozepsaná',
    sent: 'Odeslaná',
    paid: 'Zaplacená',
    overdue: 'Po splatnosti',
  },
  en: { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' },
};

export function getStatusClass(status) {
  return `pill ${status || 'draft'}`;
}

function statusVariant(status) {
  if (status === 'paid') return 'success';
  if (status === 'overdue') return 'warning';
  if (status === 'sent') return 'info';
  return 'muted';
}

export default function StatusBadge({
  status,
  invoiceId,
  onStatusChange,
  lang = 'cs',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = status || 'draft';
  const labels = STATUS_LABELS[lang] || STATUS_LABELS.cs;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (e, newStatus) => {
    e.stopPropagation();
    setOpen(false);
    if (newStatus !== current && onStatusChange) {
      onStatusChange(invoiceId, newStatus);
    }
  };

  return (
    <div ref={ref} className='status-badge'>
      <Button
        type='button'
        variant='soft'
        size='sm'
        className='status-badge-trigger gap-2'
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <Badge variant={statusVariant(current)}>{labels[current]}</Badge>
        <span className='status-badge-caret'>▼</span>
      </Button>
      {open && (
        <div className='status-badge-menu'>
          {STATUSES.map((s) => (
            <button
              key={s}
              type='button'
              onClick={(e) => handleSelect(e, s)}
              className={`status-badge-option ${s === current ? 'is-active' : ''}`}
            >
              <Badge
                variant={statusVariant(s)}
                className='status-badge-pill border-none'
              >
                {labels[s]}
              </Badge>
              {s === current && <span className='status-badge-check'>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
