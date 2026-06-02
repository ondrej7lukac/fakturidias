import './CompanyInfoModal.css';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import AresSearch from './AresSearch';
import { Contact, Save, ICON_MD, STROKE } from '@/lib/icons';

type SupplierRecord = Record<string, unknown>;

interface CompanyInfoModalProps {
  lang: string;
  t: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When editing an existing company, prefill from this supplier. */
  initialSupplier?: SupplierRecord | null;
  onSave: (supplier: SupplierRecord) => void;
}

const EMPTY: SupplierRecord = {
  name: '',
  ico: '',
  vat: '',
  address: '',
  email: '',
  phone: '',
  web: '',
  iban: '',
  region: 'CZ',
};

export default function CompanyInfoModal({
  lang,
  t,
  open,
  onOpenChange,
  initialSupplier,
  onSave,
}: CompanyInfoModalProps) {
  const isCz = lang === 'cs';
  const [supplier, setSupplier] = useState<SupplierRecord>(EMPTY);

  useEffect(() => {
    if (open) {
      setSupplier({ ...EMPTY, ...(initialSupplier || {}) });
    }
  }, [open, initialSupplier]);

  const str = (key: string): string =>
    typeof supplier[key] === 'string' ? (supplier[key] as string) : '';

  const setField = (key: string, value: unknown) =>
    setSupplier((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!str('name').trim()) return;
    onSave(supplier);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="company-modal">
        <DialogHeader>
          <DialogTitle className="company-modal__title">
            <Contact size={ICON_MD} strokeWidth={STROKE} />
            {isCz ? 'Údaje o firmě' : 'Company information'}
          </DialogTitle>
          <DialogDescription className="company-modal__desc">
            {isCz
              ? 'Vyhledejte firmu v registru nebo vyplňte údaje ručně. Uloží se jako aktivní dodavatel.'
              : 'Look the company up in the registry or fill it in manually. It is saved as the active supplier.'}
          </DialogDescription>
        </DialogHeader>

        <form className="company-modal__form" onSubmit={handleSubmit}>
          <AresSearch
            clientName={str('name')}
            clientIco={str('ico')}
            onClientNameChange={(v) => setField('name', v)}
            onClientIcoChange={(v) => setField('ico', v)}
            onAresData={(data) =>
              setSupplier((prev) => ({
                ...prev,
                name: (data.name as string) || prev.name,
                ico: (data.ico as string) || prev.ico,
                vat: (data.vat as string) || (data.dic as string) || prev.vat,
                address: (data.address as string) || prev.address,
              }))
            }
            t={t}
            region={str('region') || 'CZ'}
          />

          <div className="company-modal__grid">
            <div className="ap-field">
              <label>{isCz ? 'Název' : 'Name'}</label>
              <input
                className="ap-input"
                value={str('name')}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>
            <div className="ap-field">
              <label>{isCz ? 'IČO' : 'Company ID'}</label>
              <input
                className="ap-input"
                value={str('ico')}
                onChange={(e) => setField('ico', e.target.value)}
              />
            </div>
            <div className="ap-field">
              <label>{isCz ? 'DIČ' : 'VAT ID'}</label>
              <input
                className="ap-input"
                value={str('vat')}
                onChange={(e) => setField('vat', e.target.value)}
              />
            </div>
            <div className="ap-field">
              <label>{isCz ? 'E-mail' : 'Email'}</label>
              <input
                className="ap-input"
                type="email"
                value={str('email')}
                onChange={(e) => setField('email', e.target.value)}
              />
            </div>
            <div className="ap-field">
              <label>{isCz ? 'Telefon' : 'Phone'}</label>
              <input
                className="ap-input"
                type="tel"
                value={str('phone')}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </div>
            <div className="ap-field">
              <label>{isCz ? 'Web' : 'Website'}</label>
              <input
                className="ap-input"
                value={str('web')}
                onChange={(e) => setField('web', e.target.value)}
                placeholder="fakturidias.cz"
              />
            </div>
            <div className="ap-field company-modal__full">
              <label>{isCz ? 'Adresa' : 'Address'}</label>
              <input
                className="ap-input"
                value={str('address')}
                onChange={(e) => setField('address', e.target.value)}
              />
            </div>
            <div className="ap-field company-modal__full">
              <label>IBAN</label>
              <input
                className="ap-input"
                value={str('iban')}
                onChange={(e) => setField('iban', e.target.value)}
                placeholder="CZ..."
              />
            </div>
          </div>

          <div className="company-modal__actions">
            <button
              type="button"
              className="ap-btn ap-btn--ghost"
              onClick={() => onOpenChange(false)}
            >
              {isCz ? 'Zrušit' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="ap-btn ap-btn--primary"
              disabled={!str('name').trim()}
            >
              <Save size={ICON_MD} strokeWidth={STROKE} />
              {isCz ? 'Uložit firmu' : 'Save company'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
