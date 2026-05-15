import { useState } from 'react';
import './InvoiceList.css';
import { money } from '../utils/storage';
import InvoiceDashboard from './InvoiceDashboard';
import StatusBadge from './StatusBadge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Card } from './ui/card';

export default function InvoiceList({
  invoices,
  categories,
  onLoadDemoInvoices,
  onClearDemoInvoices,
  onSelect,
  onDelete,
  onSendReminder,
  onStatusChange,
  selectedId,
  lang,
  t,
  isAuthenticated,
  dashboardOpen,
  setDashboardOpen,
  // Props for inline editing:
  onSave,
  onAddCategory,
  invoiceCounter,
  invoicesLoaded,
  draftNumber,
  setDraftNumber,
  defaultSupplier,
  setDefaultSupplier,
}) {
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Newest invoices first
  const sortedInvoices = [...invoices].reverse();

  const filteredInvoices = sortedInvoices.filter((inv) => {
    const query = searchText.trim().toLowerCase();
    const matchQuery =
      !query ||
      inv.invoiceNumber.toLowerCase().includes(query) ||
      inv.client.name.toLowerCase().includes(query) ||
      (inv.client.area || '').toLowerCase().includes(query);

    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchCategory =
      filterCategory === 'all' || (inv.category || '') === filterCategory;

    return matchQuery && matchStatus && matchCategory;
  });

  if (dashboardOpen) {
    return (
      <InvoiceDashboard
        invoices={invoices}
        categories={categories}
        onSelect={onSelect}
        onDelete={onDelete}
        onSendReminder={onSendReminder}
        onStatusChange={onStatusChange}
        onClose={() => setDashboardOpen(false)}
        lang={lang}
        t={t}
        isAuthenticated={isAuthenticated}
        // Props for inline editing:
        onSave={onSave}
        onAddCategory={onAddCategory}
        invoiceCounter={invoiceCounter}
        invoicesLoaded={invoicesLoaded}
        draftNumber={draftNumber}
        setDraftNumber={setDraftNumber}
        defaultSupplier={defaultSupplier}
        setDefaultSupplier={setDefaultSupplier}
      />
    );
  }

  return (
    <Card className='invoice-list-card'>
      <div className='invoice-list-header'>
        <div className='invoice-list-title-wrap'>
          <h2 className='invoice-list-title'>{t.invoices}</h2>
          <p className='invoice-list-caption'>
            {filteredInvoices.length} {lang === 'cs' ? 'zobrazeno' : 'shown'}
          </p>
        </div>
        <div className='invoice-list-toolbar'>
          {!isAuthenticated ? (
            <Button
              type='button'
              variant='soft'
              size='sm'
              className='compact-btn'
              onClick={
                invoices.length ? onClearDemoInvoices : onLoadDemoInvoices
              }
            >
              {invoices.length ? t.clearDemoInvoices : t.loadDemoInvoices}
            </Button>
          ) : null}
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='compact-btn'
            onClick={() => setDashboardOpen(true)}
          >
            {lang === 'cs' ? 'Přehled' : 'Dashboard'}
          </Button>
        </div>
      </div>
      {!isAuthenticated ? (
        <div className='demo-seed-panel'>
          <div>
            <p className='demo-seed-eyebrow'>{t.demoTitle}</p>
            <p className='demo-seed-copy'>{t.demoDescription}</p>
          </div>
          <div className='demo-seed-actions'>
            <Button
              type='button'
              onClick={onLoadDemoInvoices}
              variant='default'
              size='sm'
            >
              {t.loadDemoInvoices}
            </Button>
            <Button
              type='button'
              onClick={onClearDemoInvoices}
              variant='secondary'
              size='sm'
            >
              {t.clearDemoInvoices}
            </Button>
          </div>
        </div>
      ) : null}
      <div className='grid two'>
        <div>
          <label htmlFor='searchText'>{t.search}</label>
          <Input
            id='searchText'
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder='Invoice #, client, area'
          />
        </div>
        <div>
          <label htmlFor='filterStatus'>{t.status}</label>
          <Select
            id='filterStatus'
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value='all'>{t.all}</option>
            <option value='draft'>{t.draft}</option>
            <option value='sent'>{t.sent}</option>
            <option value='paid'>{t.paid}</option>
            <option value='overdue'>{t.overdue}</option>
          </Select>
        </div>
      </div>
      <div className='grid'>
        <div>
          <label htmlFor='filterCategory'>{t.category}</label>
          <Select
            id='filterCategory'
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value='all'>
              {lang === 'cs' ? 'Všechny kategorie' : 'All categories'}
            </option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className='list'>
        {filteredInvoices.length === 0 ? (
          <div className='empty'>
            <p>
              {lang === 'cs'
                ? 'Nenalezeny žádné faktury.'
                : 'No invoices found.'}
            </p>
            {!isAuthenticated ? (
              <div className='demo-empty-actions'>
                <Button
                  type='button'
                  variant='default'
                  size='sm'
                  onClick={onLoadDemoInvoices}
                >
                  {t.loadDemoInvoices}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className={`invoice-item ${selectedId === inv.id ? 'active' : ''}`}
              onClick={() => onSelect(inv.id)}
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(inv.id);
                }
              }}
            >
              <div className='invoice-item-header'>
                <strong className='invoice-item-number'>
                  {inv.invoiceNumber}
                </strong>
                <StatusBadge
                  status={inv.status}
                  invoiceId={inv.id}
                  onStatusChange={onStatusChange}
                  lang={lang}
                />
              </div>
              {inv.client.name ? (
                <div className='invoice-item-client'>{inv.client.name}</div>
              ) : null}
              <div className='invoice-meta'>
                {inv.currency} {money(inv.amount)} •{' '}
                {inv.client.area || (lang === 'cs' ? 'Bez oblasti' : 'No area')}
                {inv.issueDate && (
                  <span className='invoice-item-issued'>
                    • {lang === 'cs' ? 'Vystaveno' : 'Issued'}: {inv.issueDate}
                  </span>
                )}
              </div>
              <div className='actions invoice-item-actions'>
                <Button
                  type='button'
                  variant='secondary'
                  size='sm'
                  className='invoice-item-btn'
                  onClick={(e) => {
                    e.stopPropagation();
                    setDashboardOpen(true);
                  }}
                >
                  {lang === 'cs' ? 'Otevřít' : 'Open'}
                </Button>
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  className='invoice-item-btn invoice-item-btn-danger'
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(inv.id);
                  }}
                >
                  {lang === 'cs' ? 'Smazat' : 'Delete'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
