import { money } from '../utils/storage';
import './ItemsTable.css';

export default function ItemsTable({ items, lang, t, onDelete }) {
  if (!items || items.length === 0) {
    return (
      <table>
        <thead>
          <tr>
            <th>{t.item}</th>
            <th>{t.qty}</th>
            <th>{t.price}</th>
            <th>{lang === 'cs' ? 'DPH %' : 'Tax %'}</th>
            <th>{lang === 'cs' ? 'Sleva' : 'Discount'}</th>
            <th>{t.total}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan='6' className='empty'>
              No items yet.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div className='table-container'>
      <table>
        <thead>
          <tr>
            <th>{t.item}</th>
            <th>{t.qty}</th>
            <th>{lang === 'cs' ? 'CENA/JEDN.' : 'PRICE/UNIT'}</th>
            <th>{lang === 'cs' ? 'DPH %' : 'Tax %'}</th>
            <th>{lang === 'cs' ? 'Sleva' : 'Discount'}</th>
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
              <td>{item.taxRate || 0}%</td>
              <td>{item.discount ? `${item.discount}%` : '0%'}</td>
              <td>{money(item.total)}</td>
              <td className='items-table-action-cell'>
                <button
                  type='button'
                  onClick={() => onDelete(index)}
                  className='delete-item-btn items-table-delete-btn'
                  title={lang === 'cs' ? 'Odstranit' : 'Delete'}
                >
                  &times;
                </button>
              </td>
            </tr>
          ))}
          <tr className='items-table-tax-row'>
            <td colSpan='5' className='items-table-tax-label'>
              {lang === 'cs' ? 'DPH' : 'Tax'}:
            </td>
            <td colSpan='2' className='items-table-tax-value'>
              {money(
                items.reduce((sum, item) => sum + (item.taxAmount || 0), 0),
              )}
            </td>
          </tr>
          <tr className='items-table-total-row'>
            <td colSpan='5' className='items-table-total-label'>
              {lang === 'cs' ? 'Celkem' : 'Total'}:
            </td>
            <td colSpan='2'>
              {money(items.reduce((sum, item) => sum + item.total, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
