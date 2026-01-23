import { money } from '../utils/storage'

export default function ItemsTable({ items, lang, t, onDelete }) {
    if (!items || items.length === 0) {
        return (
            <table>
                <thead>
                    <tr>
                        <th>{t.item}</th>
                        <th>{t.qty}</th>
                        <th>{t.price}</th>
                        <th>{lang === 'cs' ? 'Sleva' : 'Discount'}</th>
                        <th>{lang === 'cs' ? 'DPH %' : 'Tax %'}</th>
                        <th>{t.total}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colSpan="6" className="empty">No items yet.</td>
                    </tr>
                </tbody>
            </table>
        )
    }

    return (
        <table>
            <thead>
                <tr>
                    <th>{t.item}</th>
                    <th>{t.qty}</th>
                    <th>{t.price}</th>
                    <th>{lang === 'cs' ? 'Sleva' : 'Discount'}</th>
                    <th>{lang === 'cs' ? 'DPH %' : 'Tax %'}</th>
                    <th>{t.total}</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={item.id || index}>
                        <td>{item.name}</td>
                        <td>{item.qty}</td>
                        <td>{money(item.price)}</td>
                        <td>{item.discount ? `${money(item.discount)}` : '-'}</td>
                        <td>{item.taxRate || 0}%</td>
                        <td>{money(item.total)}</td>
                        <td style={{ width: '40px', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={() => onDelete(index)}
                                className="icon-button delete-item-btn"
                                style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                title={lang === 'cs' ? 'Odstranit' : 'Delete'}
                            >
                                &times;
                            </button>
                        </td>
                    </tr>
                ))}
                <tr style={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
                    <td colSpan="5" style={{ textAlign: 'right', paddingRight: '10px' }}>
                        {lang === 'cs' ? 'Celkem' : 'Total'}:
                    </td>
                    <td colSpan="2">{money(items.reduce((sum, item) => sum + item.total, 0))}</td>
                </tr>
            </tbody>
        </table>
    )
}
