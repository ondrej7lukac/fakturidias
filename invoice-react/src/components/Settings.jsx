import { useState, useEffect } from 'react';
import { parseIban, calculateIban } from '../utils/bank';
import AresSearch from './AresSearch';
import './Settings.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';

export default function Settings({
  defaultSupplier,
  setDefaultSupplier,
  lang,
  categories,
  onLogout,
  user,
  t,
}) {
  const [smtpConfig, setSmtpConfig] = useState({
    useGoogle: false,
    fromName: '',
    fromEmail: '',
  });

  // Initialize bank details if missing and iban exists
  useEffect(() => {
    if (defaultSupplier?.iban && !defaultSupplier.accountNumber) {
      const parsed = parseIban(defaultSupplier.iban);
      if (parsed) {
        setDefaultSupplier((prev) => ({
          ...prev,
          accountNumber: parsed.accountNumber || '',
          bankCode: parsed.bankCode || '',
          prefix: parsed.prefix || '',
        }));
      }
    }
  }, [defaultSupplier?.iban]);

  // Load SMTP settings and sync auth status
  useEffect(() => {
    const savedSmtp = localStorage.getItem('smtpConfig');
    if (savedSmtp) {
      setSmtpConfig(JSON.parse(savedSmtp));
    }

    fetch('/auth/google/status')
      .then((res) => res.json())
      .then((data) => {
        setSmtpConfig((prev) => {
          const shouldBeConnected = data.connected;
          if (prev.useGoogle !== shouldBeConnected) {
            const newConfig = { ...prev, useGoogle: shouldBeConnected };
            localStorage.setItem('smtpConfig', JSON.stringify(newConfig));
            if (shouldBeConnected) {
              localStorage.setItem(
                'google_tokens',
                JSON.stringify({ connected: true, source: 'server' }),
              );
            } else {
              localStorage.removeItem('google_tokens');
            }
            window.dispatchEvent(new Event('google_login_update'));
            return newConfig;
          }
          return prev;
        });
      })
      .catch((e) => console.error('Failed to sync auth status in Settings', e));
  }, []);

  // Smart Bank Logic - Auto Calculate IBAN
  useEffect(() => {
    if (defaultSupplier?.accountNumber && defaultSupplier?.bankCode) {
      const newIban = calculateIban(
        defaultSupplier.accountNumber,
        defaultSupplier.bankCode,
        defaultSupplier.prefix,
      );
      if (newIban && newIban !== defaultSupplier?.iban) {
        const currentClean = (defaultSupplier.iban || '').replace(/\s/g, '');
        const newClean = newIban.replace(/\s/g, '');
        if (currentClean !== newClean) {
          setDefaultSupplier((prev) => ({ ...prev, iban: newIban }));
        }
      }
    }
  }, [
    defaultSupplier?.accountNumber,
    defaultSupplier?.bankCode,
    defaultSupplier?.prefix,
  ]);

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDefaultSupplier((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePasteBank = (e) => {
    const text = e.clipboardData.getData('text').trim();
    if (!text) return;

    const cleanIban = text.replace(/\s/g, '').toUpperCase();
    if (/^[A-Z]{2}\d{10,}/.test(cleanIban)) {
      e.preventDefault();
      const parsed = parseIban(cleanIban);
      setDefaultSupplier((prev) => ({
        ...prev,
        iban: cleanIban,
        accountNumber: parsed.accountNumber || prev.accountNumber,
        bankCode: parsed.bankCode || prev.bankCode,
        prefix: parsed.prefix || prev.prefix,
      }));
      return;
    }

    const czechMatch = text.match(/^(\d{0,6}-)?(\d{1,10})\/(\d{4})$/);
    if (czechMatch) {
      e.preventDefault();
      const prefix = czechMatch[1] ? czechMatch[1].replace('-', '') : '';
      const accountNumber = czechMatch[2];
      const bankCode = czechMatch[3];
      setDefaultSupplier((prev) => ({
        ...prev,
        prefix,
        accountNumber,
        bankCode,
      }));
    }
  };

  const handleAresData = (data) => {
    let registryText = '';
    if (
      data.legalFormCode &&
      [101, 102, 105].includes(parseInt(data.legalFormCode))
    ) {
      registryText =
        lang === 'cs'
          ? 'Zapsán v živnostenském rejstříku.'
          : 'Registered in the Trade Register.';
    } else {
      const code = parseInt(data.legalFormCode);
      let registerInfo = null;
      if ([111, 112, 113, 121].includes(code)) {
        registerInfo = {
          cs: { subject: 'Společnost', register: 'obchodním rejstříku' },
          en: { subject: 'Company', register: 'Commercial Register' },
        };
      } else if ([706, 701].includes(code)) {
        registerInfo = {
          cs: { subject: 'Spolek', register: 'spolkovém rejstříku' },
          en: { subject: 'Association', register: 'Association Register' },
        };
      }
      if (registerInfo && data.fileNumber) {
        const parts = data.fileNumber.split('/');
        if (parts.length === 2) {
          const [mark, courtCode] = parts;
          const courtMap = {
            MSPH: 'Městským soudem v Praze',
            KSBR: 'Krajským soudem v Brně',
            KSOS: 'Krajským soudem v Ostravě',
            KSPL: 'Krajským soudem v Plzni',
            KSHK: 'Krajským soudem v Hradci Králové',
            KSUL: 'Krajským soudem v Ústí nad Labem',
            KSCB: 'Krajským soudem v Českých Budějovicích',
            KSLB: 'Krajským soudem v Ústí nad Labem - pobočka Liberec',
            KSOL: 'Krajským soudem v Ostravě - pobočka Olomouc',
            KSZL: 'Krajským soudem v Brně - pobočka Zlín',
            KSJI: 'Krajským soudem v Brně - pobočka Jihlava',
            KSPARD: 'Krajským soudem v Hradci Králové - pobočka Pardubice',
          };
          const courtName = courtMap[courtCode] || `soudem ${courtCode}`;
          registryText =
            lang === 'cs'
              ? `${registerInfo.cs.subject} je zapsána v ${registerInfo.cs.register} vedeném ${courtName}, spisová značka ${mark}.`
              : `${registerInfo.en.subject} registered in ${registerInfo.en.register} kept by ${courtName}, file no. ${mark}.`;
          if (registerInfo.cs.subject === 'Spolek')
            registryText = registryText.replace('zapsána', 'zapsán');
        } else {
          registryText =
            lang === 'cs'
              ? `${registerInfo.cs.subject} je zapsána v ${registerInfo.cs.register}, spisová značka ${data.fileNumber}.`
              : `${registerInfo.en.subject} registered in ${registerInfo.en.register}, file no. ${data.fileNumber}.`;
          if (registerInfo.cs.subject === 'Spolek')
            registryText = registryText.replace('zapsána', 'zapsán');
        }
      }
    }

    setDefaultSupplier((prev) => ({
      ...prev,
      name: data.name,
      address: data.address,
      ico: data.ico,
      vat: data.vat,
      isVatPayer: data.isVatPayer || false,
      registry: registryText,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { defaultSupplier } }),
      });
      if (res.ok) {
        alert(lang === 'cs' ? 'Profil uložen!' : 'Profile saved!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      console.error(e);
      alert(
        lang === 'cs' ? 'Chyba při ukládání profilu!' : 'Error saving profile!',
      );
    }
  };

  return (
    <div className='settings-wrapper'>
      <div className='settings-shell'>
        <div className='settings-main'>
          <div className='settings-card settings-card-primary'>
            <div className='card-header'>
              <h2 className='card-title'>
                {lang === 'cs' ? 'Profil firmy' : 'Company profile'}
              </h2>
              <p className='card-subtitle'>
                {lang === 'cs'
                  ? 'Správa identifikačních údajů vaší firmy'
                  : 'Manage your company information'}
              </p>
            </div>

            <div className='card-content'>
              {/* FORM SECTIONS */}
              <div className='form-sections'>
                {/* SECTION 1: IDENTITY */}
                <div className='form-section'>
                  <div className='section-header'>
                    <span className='section-number'>1</span>
                    <h3>
                      {lang === 'cs' ? 'Identifikace' : 'Company Identity'}
                    </h3>
                  </div>
                  <div className='form-group full-width'>
                    <label htmlFor='name'>{t.supplierName} *</label>
                    <Input
                      id='name'
                      name='name'
                      value={defaultSupplier?.name || ''}
                      onChange={handleProfileChange}
                      placeholder={
                        lang === 'cs' ? 'Firma s.r.o.' : 'Company Inc.'
                      }
                      required
                    />
                  </div>
                  <div className='form-group-row'>
                    <div className='form-group'>
                      <label htmlFor='ico'>
                        {lang === 'cs' ? 'IČO *' : 'Business ID *'}
                      </label>
                      <Input
                        id='ico'
                        name='ico'
                        value={defaultSupplier?.ico || ''}
                        onChange={handleProfileChange}
                        placeholder='12345678'
                        required
                      />
                    </div>
                    <div className='form-group'>
                      <label htmlFor='vat'>
                        {lang === 'cs' ? 'DIČ' : 'VAT ID'}
                      </label>
                      <Input
                        id='vat'
                        name='vat'
                        value={defaultSupplier?.vat || ''}
                        onChange={handleProfileChange}
                        placeholder='CZ12345678'
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ADDRESS */}
                <div className='form-section'>
                  <div className='section-header'>
                    <span className='section-number'>2</span>
                    <h3>{lang === 'cs' ? 'Sídlo Firmy' : 'Company Address'}</h3>
                  </div>
                  <div className='form-group full-width'>
                    <label htmlFor='address'>{t.supplierAddress} *</label>
                    <Textarea
                      id='address'
                      name='address'
                      value={defaultSupplier?.address || ''}
                      onChange={handleProfileChange}
                      placeholder={
                        lang === 'cs'
                          ? 'Ulice 123, 110 00 Praha'
                          : 'Street 123, 110 00 Prague'
                      }
                      rows='3'
                      required
                    />
                  </div>
                </div>

                {/* SECTION 3: TAX & REGISTRY */}
                <div className='form-section'>
                  <div className='section-header'>
                    <span className='section-number'>3</span>
                    <h3>
                      {lang === 'cs' ? 'Daň & Rejstřík' : 'Tax & Registry'}
                    </h3>
                  </div>
                  <div className='form-group checkbox-group'>
                    <input
                      type='checkbox'
                      id='isVatPayer'
                      name='isVatPayer'
                      checked={defaultSupplier?.isVatPayer || false}
                      onChange={handleProfileChange}
                    />
                    <label htmlFor='isVatPayer'>
                      {lang === 'cs' ? 'Jsem plátce DPH' : 'I am a VAT payer'}
                    </label>
                    {defaultSupplier?.isVatPayer && (
                      <Select
                        name='taxRate'
                        value={defaultSupplier?.taxRate || '21'}
                        onChange={handleProfileChange}
                        className='vat-rate-select'
                      >
                        <option value='21'>21%</option>
                        <option value='15'>15%</option>
                        <option value='12'>12%</option>
                      </Select>
                    )}
                  </div>
                  <div className='form-group full-width'>
                    <label htmlFor='registry'>
                      {lang === 'cs' ? 'Zápis v rejstříku' : 'Registry Entry'}
                    </label>
                    <Input
                      id='registry'
                      name='registry'
                      value={defaultSupplier?.registry || ''}
                      onChange={handleProfileChange}
                      placeholder={
                        lang === 'cs'
                          ? 'Městský soud v Praze...'
                          : 'Commercial Court...'
                      }
                    />
                  </div>
                </div>

                {/* SECTION 4: BANKING */}
                <div className='form-section'>
                  <div className='section-header'>
                    <span className='section-number'>4</span>
                    <h3>{lang === 'cs' ? 'Bankovní Účet' : 'Bank Account'}</h3>
                  </div>
                  <div className='bank-account-group'>
                    <div className='bank-field prefix'>
                      <label>{lang === 'cs' ? 'Prefix' : 'Prefix'}</label>
                      <Input
                        name='prefix'
                        value={defaultSupplier?.prefix || ''}
                        onChange={handleProfileChange}
                        onPaste={handlePasteBank}
                        placeholder='000'
                        maxLength='6'
                      />
                    </div>
                    <div className='bank-field account'>
                      <label>{lang === 'cs' ? 'Číslo' : 'Number'}</label>
                      <Input
                        name='accountNumber'
                        value={defaultSupplier?.accountNumber || ''}
                        onChange={handleProfileChange}
                        onPaste={handlePasteBank}
                        placeholder='1234567890'
                      />
                    </div>
                    <div className='bank-field code'>
                      <label>{lang === 'cs' ? 'Kód' : 'Code'}</label>
                      <Input
                        name='bankCode'
                        value={defaultSupplier?.bankCode || ''}
                        onChange={handleProfileChange}
                        onPaste={handlePasteBank}
                        placeholder='0800'
                        maxLength='4'
                      />
                    </div>
                  </div>
                  <div className='form-group full-width'>
                    <label htmlFor='iban'>IBAN</label>
                    <Input
                      id='iban'
                      name='iban'
                      value={defaultSupplier?.iban || ''}
                      placeholder='CZ6508000000192000145399'
                      readOnly
                      className='readonly-field'
                    />
                  </div>
                  <p className='form-hint'>
                    {lang === 'cs'
                      ? 'Vložte účet ve tvaru 123-4567890/0800 nebo IBAN.'
                      : '💡 Paste: 123-4567890/0800 or IBAN'}
                  </p>
                </div>

                {/* SECTION 5: CONTACT */}
                <div className='form-section'>
                  <div className='section-header'>
                    <span className='section-number'>5</span>
                    <h3>{lang === 'cs' ? 'Kontakt' : 'Contact'}</h3>
                  </div>
                  <div className='form-group-row'>
                    <div className='form-group'>
                      <label htmlFor='phone'>
                        {lang === 'cs' ? 'Telefon' : 'Phone'}
                      </label>
                      <Input
                        id='phone'
                        name='phone'
                        value={defaultSupplier?.phone || ''}
                        onChange={handleProfileChange}
                        placeholder='+420 777 000 000'
                      />
                    </div>
                    <div className='form-group'>
                      <label htmlFor='email'>Email</label>
                      <Input
                        id='email'
                        name='email'
                        type='email'
                        value={defaultSupplier?.email || ''}
                        onChange={handleProfileChange}
                        placeholder='info@firma.cz'
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className='card-footer'>
              <Button
                onClick={handleSaveProfile}
                className='btn-primary btn-large'
                variant='default'
                size='lg'
              >
                {lang === 'cs' ? 'Uložit profil' : 'Save profile'}
              </Button>
            </div>
          </div>
        </div>

        <aside className='settings-sidebar'>
          <div className='settings-card settings-card-compact'>
            <div className='card-header card-header-compact'>
              <h2 className='card-title card-title-compact'>
                {lang === 'cs' ? 'Rychlé vyplnění' : 'Quick fill'}
              </h2>
              <p className='card-subtitle'>
                {lang === 'cs'
                  ? 'Vyhledejte firmu v ARES a doplňte údaje.'
                  : 'Search ARES and fill company details.'}
              </p>
            </div>

            <div className='quick-lookup-section'>
              <AresSearch
                clientName={defaultSupplier?.name || ''}
                clientIco={defaultSupplier?.ico || ''}
                onClientNameChange={(v) =>
                  setDefaultSupplier((p) => ({ ...p, name: v }))
                }
                onClientIcoChange={(v) =>
                  setDefaultSupplier((p) => ({ ...p, ico: v }))
                }
                onAresData={handleAresData}
                t={t}
              />
            </div>
          </div>

          <div className='settings-card settings-card-compact'>
            <div className='card-header card-header-compact'>
              <h2 className='card-title card-title-compact'>
                {lang === 'cs' ? 'Google integrace' : 'Google integration'}
              </h2>
              <p className='card-subtitle'>
                {lang === 'cs'
                  ? 'Email a automatické zálohování'
                  : 'Email and automatic backup'}
              </p>
            </div>

            <div className='card-content card-content-compact'>
              <div className='integration-box'>
                <div className='integration-header'>
                  <span className='integration-badge'>G</span>
                  <div>
                    <h3>{lang === 'cs' ? 'Google účet' : 'Google account'}</h3>
                    <p>
                      {lang === 'cs'
                        ? 'Připojte Google pro emaily a zálohování.'
                        : 'Connect Google for emails and backups.'}
                    </p>
                  </div>
                </div>

                {!smtpConfig.useGoogle ? (
                  <Button
                    type='button'
                    className='btn-google btn-large'
                    variant='default'
                    size='lg'
                    onClick={async () => {
                      try {
                        const res = await fetch('/auth/google/url');
                        const data = await res.json();
                        if (data.url) {
                          window.open(
                            data.url,
                            'Google Auth',
                            'width=600,height=700',
                          );
                          const handleMessage = (event) => {
                            if (event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                              const { tokens, email } = event.data;
                              localStorage.setItem(
                                'google_tokens',
                                JSON.stringify(tokens),
                              );
                              const newConfig = {
                                ...smtpConfig,
                                useGoogle: true,
                                fromEmail: email,
                              };
                              setSmtpConfig(newConfig);
                              localStorage.setItem(
                                'smtpConfig',
                                JSON.stringify(newConfig),
                              );
                              alert(
                                lang === 'cs'
                                  ? '✅ Úspěšně připojeno!'
                                  : '✅ Successfully connected!',
                              );
                              window.removeEventListener(
                                'message',
                                handleMessage,
                              );
                              window.dispatchEvent(
                                new Event('google_login_update'),
                              );
                            }
                          };
                          window.addEventListener('message', handleMessage);
                        }
                      } catch (e) {
                        alert('Failed to start auth flow');
                      }
                    }}
                  >
                    <span className='google-icon'>G</span>
                    {lang === 'cs' ? 'Připojit Google' : 'Connect Google'}
                  </Button>
                ) : (
                  <div className='connected-status'>
                    <div className='status-badge success'>
                      <span className='status-icon'>✓</span>
                      <div>
                        <p className='status-label'>
                          {lang === 'cs' ? 'Připojeno' : 'Connected'}
                        </p>
                        <p className='status-email'>{smtpConfig.fromEmail}</p>
                      </div>
                    </div>
                    <Button
                      type='button'
                      className='btn-secondary btn-medium'
                      variant='secondary'
                      size='sm'
                      onClick={async () => {
                        if (
                          !confirm(
                            lang === 'cs'
                              ? 'Odhlásit se? Aplikace se restartuje.'
                              : 'Disconnect? The app will restart.',
                          )
                        )
                          return;
                        try {
                          await fetch('/auth/google/disconnect', {
                            method: 'POST',
                          });
                        } catch (e) {
                          console.error('Logout failed on server', e);
                        }
                        localStorage.removeItem('google_tokens');
                        localStorage.removeItem('smtpConfig');
                        localStorage.removeItem('defaultSupplier');
                        localStorage.removeItem('categories');
                        setSmtpConfig({
                          useGoogle: false,
                          fromName: '',
                          fromEmail: '',
                        });
                        window.dispatchEvent(new Event('google_login_update'));
                        window.location.reload();
                      }}
                    >
                      {lang === 'cs' ? 'Odhlásit se' : 'Disconnect'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
