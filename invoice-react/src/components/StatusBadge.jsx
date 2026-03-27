import { useState, useRef, useEffect } from 'react'

const STATUSES = ['draft', 'sent', 'paid', 'overdue']

const STATUS_LABELS = {
    cs: { draft: 'Rozepsaná', sent: 'Odeslaná', paid: 'Zaplacená', overdue: 'Po splatnosti' },
    en: { draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue' }
}

export function getStatusClass(status) {
    return `pill ${status || 'draft'}`
}

export default function StatusBadge({ status, invoiceId, onStatusChange, lang = 'cs' }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const current = status || 'draft'
    const labels = STATUS_LABELS[lang] || STATUS_LABELS.cs

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleSelect = (e, newStatus) => {
        e.stopPropagation()
        setOpen(false)
        if (newStatus !== current && onStatusChange) {
            onStatusChange(invoiceId, newStatus)
        }
    }

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                type="button"
                className={getStatusClass(current)}
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
                style={{
                    cursor: 'pointer',
                    border: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    paddingRight: '0.5rem'
                }}
            >
                {labels[current]}
                <span style={{ opacity: 0.6, fontSize: '0.6rem' }}>▼</span>
            </button>
            {open && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    zIndex: 200,
                    background: 'rgba(20, 25, 45, 0.75)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    minWidth: '150px',
                    overflow: 'hidden',
                    padding: '6px'
                }}>
                    {STATUSES.map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={(e) => handleSelect(e, s)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                width: '100%',
                                padding: '0.55rem 0.85rem',
                                background: s === current ? 'rgba(255,255,255,0.08)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                color: 'var(--text)',
                                fontFamily: 'inherit',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = s === current ? 'rgba(255,255,255,0.08)' : 'transparent'}
                        >
                            <span className={`pill ${s}`} style={{ fontSize: '0.65rem', pointerEvents: 'none', flexShrink: 0 }}>
                                {labels[s]}
                            </span>
                            {s === current && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: '0.75rem' }}>✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
