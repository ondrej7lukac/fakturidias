import { money } from '../utils/storage'

export default function ItemsTable({ items, lang, t }) {
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
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.qty}</td>
                        <td>{money(item.price)}</td>
                        <td>{item.discount ? `${money(item.discount)}` : '-'}</td>
                        <td>{item.taxRate || 0}%</td>
                        <td>{money(item.total)}</td>
                    </tr>
                ))}
                <tr style={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
                    <td colSpan="5" style={{ textAlign: 'right', paddingRight: '10px' }}>
                        {lang === 'cs' ? 'Celkem' : 'Total'}:
                    </td>
                    <td>{money(items.reduce((sum, item) => sum + item.total, 0))}</td>
                </tr>
            </tbody>
        </table>
    )
}
