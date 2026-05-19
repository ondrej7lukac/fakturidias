import './PolicyPage.css'
import { ArrowLeftRight, ICON_SM, STROKE } from '@/lib/icons'

type PolicyType = 'terms-privacy' | 'terms' | 'privacy' | 'cookies' | 'gdpr'

interface PolicyPageProps {
    page: PolicyType
    lang: string
    onBack: () => void
}

const CONTENT: Record<PolicyType, Record<string, { title: string; body: React.ReactNode }>> = {
    'terms-privacy': {
        en: {
            title: 'Terms & Privacy',
            body: (
                <>
                    {/* ── Terms of Service ── */}
                    <p className="pp-effective">Effective date: 1 January 2026</p>
                    <h2>1. Acceptance</h2>
                    <p>By accessing or using Fakturidias ("Service"), operated by Fakturidias s.r.o., Václavské náměstí 1, Prague, Czech Republic ("we", "us"), you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>
                    <h2>2. Description of Service</h2>
                    <p>Fakturidias is a cloud-based invoice management platform for Czech and Slovak businesses. It allows users to create, store, send, and manage invoices using AI-assisted data entry, ARES integration, and PDF generation.</p>
                    <h2>3. User Accounts</h2>
                    <p>Authentication is handled via Google OAuth 2.0. You are responsible for maintaining the security of your Google account. We store only your email address and the invoice data you create. Guest mode is limited to 1 invoice without an account.</p>
                    <h2>4. Acceptable Use</h2>
                    <p>You may use the Service only for lawful invoicing purposes. You must not attempt to reverse-engineer the Service, use it to generate fraudulent invoices, or interfere with other users' data.</p>
                    <h2>5. Data Ownership</h2>
                    <p>All invoice data you create remains yours. We do not sell, share, or use your invoice data for any purpose other than operating the Service. You may export or delete your data at any time through the Settings page.</p>
                    <h2>6. Limitation of Liability</h2>
                    <p>To the maximum extent permitted by law, Fakturidias s.r.o. is not liable for indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid by you in the preceding 12 months.</p>
                    <h2>7. Governing Law</h2>
                    <p>These Terms are governed by the laws of the Czech Republic. Disputes shall be resolved in the courts of Prague.</p>

                    {/* ── Privacy Policy ── */}
                    <div style={{ marginTop: 48, paddingTop: 32, borderTop: '2px solid var(--border)' }}>
                        <h2 style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Privacy Policy</h2>
                    </div>
                    <h2>8. Data Controller</h2>
                    <p>Fakturidias s.r.o., Václavské náměstí 1, 110 00 Praha 1. Contact: <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a></p>
                    <h2>9. Data We Collect</h2>
                    <ul>
                        <li><strong>Account data:</strong> Your Google email address obtained via OAuth when you sign in.</li>
                        <li><strong>Invoice data:</strong> Client names, addresses, IČO/DIČ, amounts, and line items you enter.</li>
                        <li><strong>Analytics:</strong> Page views and interactions via Google Analytics 4.</li>
                        <li><strong>Behavioural data:</strong> Heatmaps and session recordings via Microsoft Clarity (only with your consent).</li>
                    </ul>
                    <h2>10. Legal Basis</h2>
                    <ul>
                        <li><strong>Contract performance (Art. 6(1)(b) GDPR):</strong> Account and invoice data.</li>
                        <li><strong>Legitimate interest (Art. 6(1)(f) GDPR):</strong> Analytics and security.</li>
                        <li><strong>Consent (Art. 6(1)(a) GDPR):</strong> Clarity behavioural tracking.</li>
                    </ul>
                    <h2>11. Third-Party Processors</h2>
                    <ul>
                        <li><strong>Google LLC</strong> — OAuth, Analytics 4, Drive backup.</li>
                        <li><strong>Microsoft Corporation</strong> — Clarity behavioural analytics.</li>
                        <li><strong>MongoDB, Inc.</strong> — Cloud database (EU region).</li>
                        <li><strong>Resend Inc.</strong> — Transactional email delivery.</li>
                    </ul>
                    <h2>12. Your Rights</h2>
                    <p>Under GDPR you have the right to access, rectify, erase, restrict, and port your data. Email <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a> to exercise any right. See our <strong>GDPR</strong> page for full details.</p>
                    <h2>13. Contact</h2>
                    <p><a href="mailto:legal@fakturidias.cz">legal@fakturidias.cz</a></p>
                </>
            ),
        },
        cs: {
            title: 'Podmínky a ochrana soukromí',
            body: (
                <>
                    {/* ── Obchodní podmínky ── */}
                    <p className="pp-effective">Platnost od: 1. ledna 2026</p>
                    <h2>1. Přijetí podmínek</h2>
                    <p>Přístupem ke službě Fakturidias provozované společností Fakturidias s.r.o., Václavské náměstí 1, Praha, souhlasíte s těmito podmínkami. Pokud nesouhlasíte, službu nepoužívejte.</p>
                    <h2>2. Popis služby</h2>
                    <p>Fakturidias je cloudová platforma pro správu faktur pro české a slovenské podnikatele s AI asistentem, integrací ARES a generováním PDF.</p>
                    <h2>3. Uživatelské účty</h2>
                    <p>Přihlášení probíhá přes Google OAuth 2.0. Ukládáme pouze vaši e-mailovou adresu a fakturační data. Režim hosta je omezen na 1 fakturu.</p>
                    <h2>4. Přípustné užití</h2>
                    <p>Službu smíte používat pouze k zákonné fakturaci. Nesmíte generovat podvodné faktury ani narušovat data jiných uživatelů.</p>
                    <h2>5. Vlastnictví dat</h2>
                    <p>Veškerá fakturační data jsou vašim majetkem. Data neprodáváme ani nesdílíme. Můžete je kdykoliv exportovat nebo smazat v Nastavení.</p>
                    <h2>6. Omezení odpovědnosti</h2>
                    <p>Fakturidias s.r.o. nenese odpovědnost za nepřímé ani následné škody. Naše celková odpovědnost nepřesáhne částku uhrazenou za předchozích 12 měsíců.</p>
                    <h2>7. Rozhodné právo</h2>
                    <p>Podmínky se řídí právem České republiky. Spory řeší soudy v Praze.</p>

                    {/* ── Ochrana osobních údajů ── */}
                    <div style={{ marginTop: 48, paddingTop: 32, borderTop: '2px solid var(--border)' }}>
                        <h2 style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Ochrana osobních údajů</h2>
                    </div>
                    <h2>8. Správce osobních údajů</h2>
                    <p>Fakturidias s.r.o., Václavské náměstí 1, 110 00 Praha 1. Kontakt: <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a></p>
                    <h2>9. Jaké údaje sbíráme</h2>
                    <ul>
                        <li><strong>Údaje o účtu:</strong> Vaše e-mailová adresa Google získaná přes OAuth.</li>
                        <li><strong>Fakturační data:</strong> Názvy klientů, adresy, IČO/DIČ, částky a položky.</li>
                        <li><strong>Analytická data:</strong> Zobrazení stránek a interakce přes Google Analytics 4.</li>
                        <li><strong>Behaviorální data:</strong> Teplotní mapy a záznamy relací přes Microsoft Clarity (pouze se souhlasem).</li>
                    </ul>
                    <h2>10. Právní základ</h2>
                    <ul>
                        <li><strong>Plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR):</strong> Účet a fakturační data.</li>
                        <li><strong>Oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR):</strong> Analytika a bezpečnost.</li>
                        <li><strong>Souhlas (čl. 6 odst. 1 písm. a) GDPR):</strong> Behaviorální sledování přes Clarity.</li>
                    </ul>
                    <h2>11. Zpracovatelé třetích stran</h2>
                    <ul>
                        <li><strong>Google LLC</strong> — OAuth, Analytics 4, záloha na Disk.</li>
                        <li><strong>Microsoft Corporation</strong> — Behaviorální analytika Clarity.</li>
                        <li><strong>MongoDB, Inc.</strong> — Cloudová databáze (region EU).</li>
                        <li><strong>Resend Inc.</strong> — Transakční e-maily.</li>
                    </ul>
                    <h2>12. Vaše práva</h2>
                    <p>Podle GDPR máte právo na přístup, opravu, výmaz, omezení a přenositelnost dat. Napište na <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>. Více viz stránka <strong>GDPR</strong>.</p>
                    <h2>13. Kontakt</h2>
                    <p><a href="mailto:legal@fakturidias.cz">legal@fakturidias.cz</a></p>
                </>
            ),
        },
    },
    terms: {
        en: {
            title: 'Terms of Service',
            body: (
                <>
                    <p className="pp-effective">Effective date: 1 January 2026</p>

                    <h2>1. Acceptance</h2>
                    <p>By accessing or using Fakturidias ("Service"), operated by Fakturidias s.r.o., Václavské náměstí 1, Prague, Czech Republic ("we", "us"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

                    <h2>2. Description of Service</h2>
                    <p>Fakturidias is a cloud-based invoice management platform for Czech and Slovak businesses. It allows users to create, store, send, and manage invoices using AI-assisted data entry, ARES integration, and PDF generation.</p>

                    <h2>3. User Accounts</h2>
                    <p>Authentication is handled via Google OAuth 2.0. You are responsible for maintaining the security of your Google account. We store only your email address and the invoice data you create. Guest mode is limited to 1 invoice without an account.</p>

                    <h2>4. Acceptable Use</h2>
                    <p>You may use the Service only for lawful invoicing purposes. You must not attempt to reverse-engineer the Service, use it to generate fraudulent invoices, or interfere with other users' data. We reserve the right to suspend accounts that violate this policy.</p>

                    <h2>5. Data Ownership</h2>
                    <p>All invoice data you create remains yours. We do not sell, share, or use your invoice data for any purpose other than operating the Service. You may export or delete your data at any time through the Settings page.</p>

                    <h2>6. Service Availability</h2>
                    <p>We aim for high availability but do not guarantee uninterrupted access. We may perform maintenance with or without advance notice. We are not liable for losses arising from temporary unavailability.</p>

                    <h2>7. Intellectual Property</h2>
                    <p>The Fakturidias name, logo, and application code are the intellectual property of Fakturidias s.r.o. You may not copy, reproduce, or redistribute any part of the Service without written permission.</p>

                    <h2>8. Limitation of Liability</h2>
                    <p>To the maximum extent permitted by law, Fakturidias s.r.o. is not liable for indirect, incidental, or consequential damages arising from use of the Service. Our total liability shall not exceed the amount paid by you in the preceding 12 months.</p>

                    <h2>9. Governing Law</h2>
                    <p>These Terms are governed by the laws of the Czech Republic. Any disputes shall be resolved exclusively in the courts of Prague, Czech Republic.</p>

                    <h2>10. Changes</h2>
                    <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance. Material changes will be announced via email or in-app notification.</p>

                    <h2>11. Contact</h2>
                    <p>For questions about these Terms, contact us at <a href="mailto:legal@fakturidias.cz">legal@fakturidias.cz</a>.</p>
                </>
            ),
        },
        cs: {
            title: 'Obchodní podmínky',
            body: (
                <>
                    <p className="pp-effective">Platnost od: 1. ledna 2026</p>

                    <h2>1. Přijetí podmínek</h2>
                    <p>Přístupem ke službě Fakturidias provozované společností Fakturidias s.r.o., Václavské náměstí 1, Praha, Česká republika ("my"), souhlasíte s těmito Obchodními podmínkami. Pokud nesouhlasíte, službu nepoužívejte.</p>

                    <h2>2. Popis služby</h2>
                    <p>Fakturidias je cloudová platforma pro správu faktur určená pro české a slovenské podnikatele. Umožňuje vytvářet, ukládat, odesílat a spravovat faktury s využitím AI asistenta, integrace ARES a generování PDF.</p>

                    <h2>3. Uživatelské účty</h2>
                    <p>Přihlášení probíhá prostřednictvím Google OAuth 2.0. Jste odpovědni za bezpečnost svého Google účtu. Ukládáme pouze vaši e-mailovou adresu a fakturační data, která vytvoříte. Režim hosta je omezen na 1 fakturu.</p>

                    <h2>4. Přípustné užití</h2>
                    <p>Službu smíte používat pouze k zákonné fakturaci. Nesmíte se pokoušet o zpětné inženýrství, generovat podvodné faktury ani narušovat data jiných uživatelů. Vyhrazujeme si právo pozastavit účty porušující tato pravidla.</p>

                    <h2>5. Vlastnictví dat</h2>
                    <p>Veškerá fakturační data, která vytvoříte, jsou vašim majetkem. Vaše fakturační data neprodáváme ani nesdílíme. Data můžete kdykoliv exportovat nebo smazat prostřednictvím stránky Nastavení.</p>

                    <h2>6. Dostupnost služby</h2>
                    <p>Usilujeme o vysokou dostupnost, ale nezaručujeme nepřerušený provoz. Údržbu můžeme provádět s předchozím upozorněním nebo bez něj. Neodpovídáme za škody vzniklé dočasnou nedostupností.</p>

                    <h2>7. Duševní vlastnictví</h2>
                    <p>Název Fakturidias, logo a kód aplikace jsou duševním vlastnictvím společnosti Fakturidias s.r.o. Bez písemného svolení nesmíte kopírovat, reprodukovat ani šířit žádnou část služby.</p>

                    <h2>8. Omezení odpovědnosti</h2>
                    <p>V maximálním rozsahu povoleném zákonem nenese Fakturidias s.r.o. odpovědnost za nepřímé, náhodné ani následné škody. Naše celková odpovědnost nepřesáhne částku uhrazenou za předchozích 12 měsíců.</p>

                    <h2>9. Rozhodné právo</h2>
                    <p>Tyto podmínky se řídí právem České republiky. Veškeré spory budou řešeny výlučně u soudů v Praze.</p>

                    <h2>10. Změny podmínek</h2>
                    <p>Tyto podmínky můžeme kdykoliv aktualizovat. Pokračováním v používání služby po změnách vyjadřujete souhlas. O podstatných změnách vás budeme informovat e-mailem nebo oznámením v aplikaci.</p>

                    <h2>11. Kontakt</h2>
                    <p>S dotazy k těmto podmínkám se obraťte na <a href="mailto:legal@fakturidias.cz">legal@fakturidias.cz</a>.</p>
                </>
            ),
        },
    },
    privacy: {
        en: {
            title: 'Privacy Policy',
            body: (
                <>
                    <p className="pp-effective">Effective date: 1 January 2026</p>

                    <h2>1. Controller</h2>
                    <p>The data controller is Fakturidias s.r.o., Václavské náměstí 1, Prague 110 00, Czech Republic. Contact: <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>.</p>

                    <h2>2. Data We Collect</h2>
                    <ul>
                        <li><strong>Account data:</strong> Your Google email address and profile name, obtained via Google OAuth when you sign in.</li>
                        <li><strong>Invoice data:</strong> Client names, addresses, IČO/DIČ numbers, amounts, and line items that you enter into the Service.</li>
                        <li><strong>Usage analytics:</strong> Page views, feature interactions, and session data collected via Google Analytics 4.</li>
                        <li><strong>Behavioural data:</strong> Heatmaps, session recordings, and scroll depth collected via Microsoft Clarity.</li>
                        <li><strong>Technical data:</strong> IP address, browser type, and device information collected automatically for security and performance.</li>
                    </ul>

                    <h2>3. Legal Basis</h2>
                    <ul>
                        <li><strong>Contract performance (Art. 6(1)(b) GDPR):</strong> Processing your account and invoice data to provide the Service.</li>
                        <li><strong>Legitimate interest (Art. 6(1)(f) GDPR):</strong> Analytics and product improvement, security monitoring.</li>
                        <li><strong>Consent (Art. 6(1)(a) GDPR):</strong> Behavioural tracking via Clarity (you may withdraw consent by clearing cookies).</li>
                    </ul>

                    <h2>4. Third-Party Processors</h2>
                    <ul>
                        <li><strong>Google LLC</strong> — OAuth authentication, Analytics 4, Drive backup. Privacy policy: policies.google.com/privacy</li>
                        <li><strong>Microsoft Corporation</strong> — Clarity behavioural analytics. Privacy policy: privacy.microsoft.com</li>
                        <li><strong>MongoDB, Inc.</strong> — Cloud database hosting (MongoDB Atlas, EU region).</li>
                        <li><strong>Resend Inc.</strong> — Transactional email delivery.</li>
                    </ul>

                    <h2>5. Data Retention</h2>
                    <p>Invoice data is retained for as long as your account is active. Analytics data is retained according to the retention settings of each third-party service (GA4: 14 months, Clarity: 30 days). You may request deletion at any time.</p>

                    <h2>6. Your Rights</h2>
                    <p>Under GDPR you have the right to access, rectify, erase, restrict, and port your personal data. You may also object to processing based on legitimate interest. To exercise these rights, email <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>. For more details see our <strong>GDPR page</strong>.</p>

                    <h2>7. International Transfers</h2>
                    <p>Some processors are based in the United States. Transfers are covered by Standard Contractual Clauses (SCCs) as approved by the European Commission.</p>

                    <h2>8. Changes</h2>
                    <p>We will notify you of material changes to this policy by email or in-app notification at least 14 days before they take effect.</p>
                </>
            ),
        },
        cs: {
            title: 'Ochrana osobních údajů',
            body: (
                <>
                    <p className="pp-effective">Platnost od: 1. ledna 2026</p>

                    <h2>1. Správce osobních údajů</h2>
                    <p>Správcem osobních údajů je Fakturidias s.r.o., Václavské náměstí 1, 110 00 Praha, Česká republika. Kontakt: <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>.</p>

                    <h2>2. Jaké údaje sbíráme</h2>
                    <ul>
                        <li><strong>Údaje o účtu:</strong> Vaše e-mailová adresa Google a jméno profilu, získané prostřednictvím Google OAuth při přihlášení.</li>
                        <li><strong>Fakturační data:</strong> Názvy klientů, adresy, IČO/DIČ, částky a položky, které zadáváte do služby.</li>
                        <li><strong>Analytická data:</strong> Zobrazení stránek, interakce s funkcemi a data relace sbíraná prostřednictvím Google Analytics 4.</li>
                        <li><strong>Behaviorální data:</strong> Teplotní mapy, záznamy relací a hloubka posouvání sbíraná prostřednictvím Microsoft Clarity.</li>
                        <li><strong>Technická data:</strong> IP adresa, typ prohlížeče a informace o zařízení sbírané automaticky pro účely bezpečnosti a výkonu.</li>
                    </ul>

                    <h2>3. Právní základ</h2>
                    <ul>
                        <li><strong>Plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR):</strong> Zpracování vašeho účtu a fakturačních dat za účelem poskytnutí služby.</li>
                        <li><strong>Oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR):</strong> Analytika, zlepšování produktu a bezpečnostní monitoring.</li>
                        <li><strong>Souhlas (čl. 6 odst. 1 písm. a) GDPR):</strong> Behaviorální sledování prostřednictvím Clarity (souhlas lze odvolat vymazáním cookies).</li>
                    </ul>

                    <h2>4. Zpracovatelé třetích stran</h2>
                    <ul>
                        <li><strong>Google LLC</strong> — OAuth přihlášení, Analytics 4, záloha na Disk. Zásady ochrany soukromí: policies.google.com/privacy</li>
                        <li><strong>Microsoft Corporation</strong> — Behaviorální analytika Clarity. Zásady: privacy.microsoft.com</li>
                        <li><strong>MongoDB, Inc.</strong> — Cloudové hostování databáze (MongoDB Atlas, region EU).</li>
                        <li><strong>Resend Inc.</strong> — Transakční doručování e-mailů.</li>
                    </ul>

                    <h2>5. Uchovávání dat</h2>
                    <p>Fakturační data jsou uchovávána po dobu existence vašeho účtu. Analytická data jsou uchovávána dle nastavení příslušné služby (GA4: 14 měsíců, Clarity: 30 dní). Smazání můžete kdykoliv vyžádat.</p>

                    <h2>6. Vaše práva</h2>
                    <p>V souladu s GDPR máte právo na přístup, opravu, výmaz, omezení a přenositelnost svých osobních údajů. Máte také právo vznést námitku proti zpracování na základě oprávněného zájmu. Pro uplatnění práv napište na <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>. Více viz naše stránka <strong>GDPR</strong>.</p>

                    <h2>7. Mezinárodní přenosy</h2>
                    <p>Někteří zpracovatelé sídlí ve Spojených státech. Přenosy jsou zajištěny standardními smluvními doložkami (SCC) schválenými Evropskou komisí.</p>

                    <h2>8. Změny zásad</h2>
                    <p>O podstatných změnách vás budeme informovat e-mailem nebo oznámením v aplikaci nejméně 14 dní před nabytím jejich účinnosti.</p>
                </>
            ),
        },
    },
    cookies: {
        en: {
            title: 'Cookie Policy',
            body: (
                <>
                    <p className="pp-effective">Effective date: 1 January 2026</p>

                    <p>Fakturidias uses cookies and similar tracking technologies to operate the Service, understand how it is used, and improve your experience. This policy explains what cookies we use and why.</p>

                    <h2>1. Essential Cookies</h2>
                    <p>These cookies are strictly necessary for the Service to function and cannot be disabled.</p>
                    <div className="pp-table">
                        <div className="pp-table__row pp-table__row--head">
                            <span>Cookie</span><span>Purpose</span><span>Duration</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>connect.sid</code></span><span>Maintains your authenticated session after Google sign-in</span><span>Session</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>lang</code></span><span>Remembers your language preference (cs / en)</span><span>1 year</span>
                        </div>
                    </div>

                    <h2>2. Analytics Cookies — Google Analytics 4</h2>
                    <p>We use Google Analytics 4 to understand which features are used and how users navigate the Service. The data is aggregated and does not identify you personally.</p>
                    <div className="pp-table">
                        <div className="pp-table__row pp-table__row--head">
                            <span>Cookie</span><span>Purpose</span><span>Duration</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>_ga</code></span><span>Distinguishes unique users</span><span>2 years</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>_ga_*</code></span><span>Persists session state</span><span>2 years</span>
                        </div>
                    </div>
                    <p>Google Analytics data is processed by Google LLC in accordance with their <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p>

                    <h2>3. Behavioural Cookies — Microsoft Clarity</h2>
                    <div className="pp-clarity-notice">
                        <p>We use Microsoft Clarity to understand how visitors use our website through behavioural metrics, heatmaps, and session recordings. This helps us improve our product and experience. Usage data is captured using first- and third-party cookies and tracking technologies. By using this site, you agree that we and Microsoft may collect and use this data. Our privacy policy has more details.</p>
                    </div>
                    <div className="pp-table">
                        <div className="pp-table__row pp-table__row--head">
                            <span>Cookie</span><span>Purpose</span><span>Duration</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>_clck</code></span><span>Persists Clarity user ID</span><span>1 year</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>_clsk</code></span><span>Connects page views to a session</span><span>1 day</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>MUID</code></span><span>Microsoft user identifier</span><span>1 year</span>
                        </div>
                    </div>
                    <p>Clarity data is processed by Microsoft Corporation. Learn more at <a href="https://privacy.microsoft.com" target="_blank" rel="noopener noreferrer">privacy.microsoft.com</a>.</p>

                    <h2>4. Managing Cookies</h2>
                    <p>You can control and delete cookies through your browser settings. Please note that disabling essential cookies will prevent you from signing in. Deleting analytics cookies will not affect your ability to use the Service but will prevent us from improving it based on your usage.</p>
                    <p>Browser cookie guides: <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a>, <a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer">Firefox</a>, <a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a>.</p>
                </>
            ),
        },
        cs: {
            title: 'Zásady cookies',
            body: (
                <>
                    <p className="pp-effective">Platnost od: 1. ledna 2026</p>

                    <p>Fakturidias používá soubory cookies a podobné sledovací technologie k provozu služby, pochopení způsobu jejího používání a ke zlepšení vašeho zážitku.</p>

                    <h2>1. Nezbytné cookies</h2>
                    <p>Tyto cookies jsou nezbytně nutné pro fungování služby a nelze je zakázat.</p>
                    <div className="pp-table">
                        <div className="pp-table__row pp-table__row--head">
                            <span>Cookie</span><span>Účel</span><span>Doba platnosti</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>connect.sid</code></span><span>Udržuje přihlášenou relaci po přihlášení přes Google</span><span>Relace</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>lang</code></span><span>Zapamatuje vaši jazykovou preferenci (cs / en)</span><span>1 rok</span>
                        </div>
                    </div>

                    <h2>2. Analytické cookies — Google Analytics 4</h2>
                    <p>Používáme Google Analytics 4 k pochopení, které funkce jsou využívány a jak uživatelé ve službě navigují. Data jsou agregovaná a neidentifikují vás osobně.</p>
                    <div className="pp-table">
                        <div className="pp-table__row pp-table__row--head">
                            <span>Cookie</span><span>Účel</span><span>Doba platnosti</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>_ga</code></span><span>Rozlišuje unikátní uživatele</span><span>2 roky</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>_ga_*</code></span><span>Udržuje stav relace</span><span>2 roky</span>
                        </div>
                    </div>

                    <h2>3. Behaviorální cookies — Microsoft Clarity</h2>
                    <div className="pp-clarity-notice">
                        <p>We use Microsoft Clarity to understand how visitors use our website through behavioural metrics, heatmaps, and session recordings. This helps us improve our product and experience. Usage data is captured using first- and third-party cookies and tracking technologies. By using this site, you agree that we and Microsoft may collect and use this data. Our privacy policy has more details.</p>
                    </div>
                    <div className="pp-table">
                        <div className="pp-table__row pp-table__row--head">
                            <span>Cookie</span><span>Účel</span><span>Doba platnosti</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>_clck</code></span><span>Uchovává ID uživatele Clarity</span><span>1 rok</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>_clsk</code></span><span>Propojuje zobrazení stránek do relace</span><span>1 den</span>
                        </div>
                        <div className="pp-table__row">
                            <span><code>MUID</code></span><span>Identifikátor uživatele Microsoft</span><span>1 rok</span>
                        </div>
                    </div>
                    <p>Data Clarity zpracovává Microsoft Corporation. Více na <a href="https://privacy.microsoft.com" target="_blank" rel="noopener noreferrer">privacy.microsoft.com</a>.</p>

                    <h2>4. Správa cookies</h2>
                    <p>Cookies můžete spravovat a mazat v nastavení prohlížeče. Zakázání nezbytných cookies znemožní přihlášení. Smazání analytických cookies neovlivní funkčnost, ale omezí naši schopnost službu zlepšovat.</p>
                </>
            ),
        },
    },
    gdpr: {
        en: {
            title: 'GDPR — Your Rights',
            body: (
                <>
                    <p className="pp-effective">Effective date: 1 January 2026</p>

                    <p>Fakturidias s.r.o. is committed to full compliance with the EU General Data Protection Regulation (GDPR — Regulation (EU) 2016/679). This page summarises your rights as a data subject and explains how to exercise them.</p>

                    <h2>1. Data Controller</h2>
                    <p>
                        Fakturidias s.r.o.<br />
                        Václavské náměstí 1, 110 00 Praha 1<br />
                        Czech Republic<br />
                        Email: <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>
                    </p>

                    <h2>2. Your Rights Under GDPR</h2>

                    <h3>Right of Access (Art. 15)</h3>
                    <p>You have the right to request a copy of all personal data we hold about you, including the purposes of processing, categories of data, recipients, and retention periods.</p>

                    <h3>Right to Rectification (Art. 16)</h3>
                    <p>If any of your personal data is inaccurate or incomplete, you have the right to have it corrected. You can update most data directly in the Settings page.</p>

                    <h3>Right to Erasure / "Right to be Forgotten" (Art. 17)</h3>
                    <p>You may request deletion of your personal data when it is no longer necessary for the purposes it was collected, when you withdraw consent, or when you object to processing. We will erase your data within 30 days, subject to legal retention obligations.</p>

                    <h3>Right to Restriction of Processing (Art. 18)</h3>
                    <p>You may request that we restrict processing of your data — for example while a dispute about accuracy is resolved.</p>

                    <h3>Right to Data Portability (Art. 20)</h3>
                    <p>You have the right to receive your invoice data in a structured, commonly used, machine-readable format (JSON or CSV). Use the export feature in Settings, or request a full data export via email.</p>

                    <h3>Right to Object (Art. 21)</h3>
                    <p>You may object at any time to processing based on our legitimate interest (analytics, product improvement). We will stop processing unless we can demonstrate compelling legitimate grounds.</p>

                    <h3>Rights Related to Automated Decision-Making (Art. 22)</h3>
                    <p>We do not make decisions about you based solely on automated processing that produce significant legal effects.</p>

                    <h2>3. How to Exercise Your Rights</h2>
                    <p>Send a request to <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>. We will respond within 30 days. We may need to verify your identity before processing the request.</p>

                    <h2>4. Right to Lodge a Complaint</h2>
                    <p>If you believe we have not handled your data correctly, you have the right to lodge a complaint with the supervisory authority:</p>
                    <p>
                        <strong>Úřad pro ochranu osobních údajů (ÚOOÚ)</strong><br />
                        Pplk. Sochora 27, 170 00 Praha 7<br />
                        Web: <a href="https://www.uoou.cz" target="_blank" rel="noopener noreferrer">uoou.cz</a>
                    </p>

                    <h2>5. Data Transfers Outside the EEA</h2>
                    <p>Some of our processors (Google, Microsoft, MongoDB, Resend) are based in the United States. All transfers are subject to Standard Contractual Clauses (SCCs) approved by the European Commission, ensuring equivalent protection to that provided within the EU/EEA.</p>

                    <h2>6. Retention Periods</h2>
                    <ul>
                        <li><strong>Account and invoice data:</strong> Retained until account deletion request, or 3 years of inactivity.</li>
                        <li><strong>Google Analytics:</strong> 14 months (configured in GA4 property settings).</li>
                        <li><strong>Microsoft Clarity:</strong> 30 days.</li>
                        <li><strong>Server logs:</strong> 90 days for security purposes.</li>
                    </ul>
                </>
            ),
        },
        cs: {
            title: 'GDPR — Vaše práva',
            body: (
                <>
                    <p className="pp-effective">Platnost od: 1. ledna 2026</p>

                    <p>Fakturidias s.r.o. se zavazuje k plnému souladu s nařízením EU o obecné ochraně osobních údajů (GDPR — nařízení (EU) 2016/679). Tato stránka shrnuje vaše práva jako subjektu údajů a vysvětluje, jak je uplatnit.</p>

                    <h2>1. Správce osobních údajů</h2>
                    <p>
                        Fakturidias s.r.o.<br />
                        Václavské náměstí 1, 110 00 Praha 1<br />
                        Česká republika<br />
                        E-mail: <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>
                    </p>

                    <h2>2. Vaše práva podle GDPR</h2>

                    <h3>Právo na přístup (čl. 15)</h3>
                    <p>Máte právo požádat o kopii všech osobních údajů, které o vás uchováváme, včetně účelů zpracování, kategorií údajů, příjemců a dob uchovávání.</p>

                    <h3>Právo na opravu (čl. 16)</h3>
                    <p>Pokud jsou vaše osobní údaje nepřesné nebo neúplné, máte právo na jejich opravu. Většinu údajů můžete aktualizovat přímo na stránce Nastavení.</p>

                    <h3>Právo na výmaz / „Právo být zapomenut" (čl. 17)</h3>
                    <p>Můžete požádat o smazání svých osobních údajů, pokud již nejsou potřebné pro účely, pro které byly shromážděny, nebo pokud odvoláte souhlas. Vaše data vymažeme do 30 dní, s výhradou zákonných povinností uchovávání.</p>

                    <h3>Právo na omezení zpracování (čl. 18)</h3>
                    <p>Můžete požádat o omezení zpracování vašich údajů — například po dobu řešení sporu o přesnosti.</p>

                    <h3>Právo na přenositelnost údajů (čl. 20)</h3>
                    <p>Máte právo obdržet svá fakturační data ve strukturovaném, běžně používaném, strojově čitelném formátu (JSON nebo CSV). Použijte funkci exportu v Nastavení nebo vyžádejte úplný export e-mailem.</p>

                    <h3>Právo vznést námitku (čl. 21)</h3>
                    <p>Kdykoli můžete vznést námitku proti zpracování na základě oprávněného zájmu (analytika, zlepšování produktu). Zpracování zastavíme, pokud nemůžeme prokázat přesvědčivé oprávněné důvody.</p>

                    <h2>3. Jak uplatnit svá práva</h2>
                    <p>Pošlete žádost na <a href="mailto:privacy@fakturidias.cz">privacy@fakturidias.cz</a>. Odpovíme do 30 dní. Před vyřízením žádosti možná budeme muset ověřit vaši totožnost.</p>

                    <h2>4. Právo podat stížnost</h2>
                    <p>Pokud se domníváte, že jsme s vašimi daty nenakládali správně, máte právo podat stížnost u dozorového úřadu:</p>
                    <p>
                        <strong>Úřad pro ochranu osobních údajů (ÚOOÚ)</strong><br />
                        Pplk. Sochora 27, 170 00 Praha 7<br />
                        Web: <a href="https://www.uoou.cz" target="_blank" rel="noopener noreferrer">uoou.cz</a>
                    </p>

                    <h2>5. Předávání dat mimo EHP</h2>
                    <p>Někteří naši zpracovatelé (Google, Microsoft, MongoDB, Resend) sídlí ve Spojených státech. Veškeré přenosy podléhají standardním smluvním doložkám (SCC) schváleným Evropskou komisí, čímž je zajištěna ochrana odpovídající ochraně v EU/EHP.</p>

                    <h2>6. Doby uchovávání</h2>
                    <ul>
                        <li><strong>Účet a fakturační data:</strong> Uchováváno do žádosti o smazání účtu nebo 3 roky neaktivity.</li>
                        <li><strong>Google Analytics:</strong> 14 měsíců.</li>
                        <li><strong>Microsoft Clarity:</strong> 30 dní.</li>
                        <li><strong>Serverové logy:</strong> 90 dní z bezpečnostních důvodů.</li>
                    </ul>
                </>
            ),
        },
    },
}

const TITLES: Record<PolicyType, Record<string, string>> = {
    'terms-privacy': { en: 'Terms & Privacy', cs: 'Podmínky a ochrana soukromí' },
    terms:   { en: 'Terms of Service',    cs: 'Obchodní podmínky' },
    privacy: { en: 'Privacy Policy',       cs: 'Ochrana osobních údajů' },
    cookies: { en: 'Cookie Policy',        cs: 'Zásady cookies' },
    gdpr:    { en: 'GDPR — Your Rights',   cs: 'GDPR — Vaše práva' },
}

export default function PolicyPage({ page, lang, onBack }: PolicyPageProps) {
    const l = lang === 'cs' ? 'cs' : 'en'
    const content = CONTENT[page][l]

    return (
        <div className="pp-root">
            <div className="pp-container">
                <button className="pp-back" onClick={onBack}>
                    <ArrowLeftRight size={ICON_SM} strokeWidth={STROKE} style={{ transform: 'scaleX(-1)' }} />
                    {l === 'cs' ? 'Zpět' : 'Back'}
                </button>
                <h1 className="pp-title">{content.title}</h1>
                <div className="pp-body">
                    {content.body}
                </div>
            </div>
        </div>
    )
}
