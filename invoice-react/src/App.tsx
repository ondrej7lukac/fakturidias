import { useState, useEffect } from 'react'
import Header from './components/Header'
import InvoiceForm from './components/InvoiceForm'
import InvoiceList from './components/InvoiceList'
import Settings from './components/Settings'
import WelcomeScreen from './components/WelcomeScreen'
import CookieBanner from './components/CookieBanner'
import AdminDashboard from './components/AdminDashboard'
import { getNextInvoiceCounter, loadApiData, loadLocalData, saveApiInvoice, saveLocalInvoice, deleteApiInvoice, deleteLocalInvoice } from './utils/storage'
import { generateInvoicePDF } from './utils/pdf'
import { getCzechQrPayload } from './utils/bank'
import QRCode from 'qrcode'
import { languages } from './utils/i18n'

function App() {
    const [user, setUser] = useState(null) // Auth state lifted to App
    const [invoices, setInvoices] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [categories, setCategories] = useState([])
    const [invoiceCounter, setInvoiceCounter] = useState(1)
    const [draftNumber, setDraftNumber] = useState('')
    const [lang, setLang] = useState('cs')
    const [defaultSupplier, setDefaultSupplier] = useState(null)
    const [currentView, setCurrentView] = useState('invoices')
    const [isLoading, setIsLoading] = useState(true)
    const [invoicesLoaded, setInvoicesLoaded] = useState(false)
    const [showWelcome, setShowWelcome] = useState(true)
    const [mobileView, setMobileView] = useState('form') // 'form' or 'list'
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [dashboardOpen, setDashboardOpen] = useState(false)
    const [subscription, setSubscription] = useState<{ plan: string; status: string; interval: string | null; currentPeriodEnd: number | null } | null>(null)
    const [pendingCheckoutPlan, setPendingCheckoutPlan] = useState<'standard' | 'max' | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)

    const t = languages[lang]

    // Show welcome screen only when not logged in
    useEffect(() => {
        if (user) {
            setShowWelcome(false)
        } else {
            setShowWelcome(true)
            setSubscription(null)
        }
    }, [user])

    // Fetch subscription + admin status when user logs in; trigger pending checkout if set
    useEffect(() => {
        if (!user) { setIsAdmin(false); return }
        fetch('/api/billing/subscription')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setSubscription(data) })
            .catch(() => {})
        fetch('/api/admin/check')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setIsAdmin(!!data.isAdmin) })
            .catch(() => {})
        if (pendingCheckoutPlan) {
            const plan = pendingCheckoutPlan
            setPendingCheckoutPlan(null)
            fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval: 'month', plan }),
            })
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data?.url) window.location.href = data.url })
                .catch(() => {})
        }
    }, [user])

    // Handle Stripe redirect back (?billing=success|cancel)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const billing = params.get('billing')
        if (billing === 'success') {
            window.history.replaceState({}, '', '/')
            setCurrentView('settings')
            // Refresh subscription after short delay to allow webhook to process
            setTimeout(() => {
                fetch('/api/billing/subscription')
                    .then(r => r.ok ? r.json() : null)
                    .then(data => { if (data) setSubscription(data) })
                    .catch(() => {})
            }, 2000)
        } else if (billing === 'cancel') {
            window.history.replaceState({}, '', '/')
        }
    }, [])

    // Check Auth Status on Mount
    useEffect(() => {
        checkAuthStatus()
    }, [])

    const checkAuthStatus = async () => {
        try {
            const res = await fetch('/auth/google/status')
            if (res.ok) {
                const data = await res.json()
                if (data.connected && data.user) {
                    setUser({ email: data.user })
                } else {
                    setUser(null)
                }
            }
        } catch (e) {
            console.warn("Auth check failed", e)
            setUser(null)
        }
    }

    // Load lang + categories from localStorage on mount (UI prefs, not sensitive data)
    useEffect(() => {
        const savedLang = localStorage.getItem('lang')
        const savedCategories = localStorage.getItem('categories')
        if (savedLang) setLang(savedLang)
        if (savedCategories) setCategories(JSON.parse(savedCategories))

        // For guest mode: load supplier from localStorage
        // For logged-in: will be overridden by MongoDB load below
        const savedSupplier = localStorage.getItem('defaultSupplier_guest')
        if (savedSupplier) setDefaultSupplier(JSON.parse(savedSupplier))
    }, [])

    // Reusable data loader
    const fetchInvoices = async () => {
        setIsLoading(true)
        try {
            let loadedInvoices = []

            if (user) {
                // Authenticated: Load from API
                const data = await loadApiData()
                if (data) loadedInvoices = data.invoices
            } else {
                // Guest: Load from Local Storage
                const data = loadLocalData()
                loadedInvoices = data.invoices
            }

            setInvoices(loadedInvoices)

            // Calculate next counter based on loaded invoices
            const nextCounter = getNextInvoiceCounter(loadedInvoices)
            setInvoiceCounter(nextCounter)
            setDraftNumber('')       // Always reset so form regenerates number from real counter
            setInvoicesLoaded(true)  // Signal that counter is now reliable
        } catch (err) {
            console.error('Failed to load invoices:', err)
            setDraftNumber('')
            setInvoicesLoaded(true) // Still allow form to show even on error
        } finally {
            setIsLoading(false)
        }
    }

    // Reload data when user changes (Login/Logout)
    useEffect(() => {
        fetchInvoices()
    }, [user])

    // Load settings from MongoDB when user logs in
    useEffect(() => {
        if (!user) return
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings')
                if (res.ok) {
                    const data = await res.json()
                    const settings = data.settings

                    // New format: { defaultSupplier: { name, iban, ... } }
                    // Legacy format: supplier fields at root { name, iban, ... } (old save bug)
                    let supplier = null
                    if (settings?.defaultSupplier && Object.keys(settings.defaultSupplier).length > 0) {
                        supplier = settings.defaultSupplier
                        console.log('[Settings] Loaded (new format):', supplier)
                    } else if (settings?.name || settings?.iban) {
                        // Legacy: migrate root-level fields into defaultSupplier format
                        const { _id, userEmail, updatedAt, __v, smtp, ...supplierFields } = settings
                        supplier = supplierFields
                        console.log('[Settings] Loaded (legacy format), migrating:', supplier)
                        // Auto-fix: re-save in correct format immediately
                        fetch('/api/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ settings: { defaultSupplier: supplier } })
                        }).catch(() => { })
                    }

                    if (supplier) {
                        setDefaultSupplier(supplier)
                    } else {
                        console.log('[Settings] No supplier settings found in MongoDB yet')
                        setDefaultSupplier(null)
                    }
                }
            } catch (err) {
                console.error('[Settings] Failed to load from MongoDB:', err)
            }
        }
        loadSettings()
    }, [user])

    // Listen for Google Login success from OAuth popup
    useEffect(() => {
        const handleAuthSuccess = async () => {
            await checkAuthStatus()
        }

        // Method 1: postMessage from popup
        const handleMessage = async (event: MessageEvent) => {
            if (event.data && event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                await handleAuthSuccess()
            }
        }
        window.addEventListener('message', handleMessage)

        // Method 2: localStorage flag set by Header.tsx popup-close detector (same-origin)
        const pollInterval = setInterval(async () => {
            const flag = localStorage.getItem('auth_success')
            if (flag) {
                localStorage.removeItem('auth_success')
                await handleAuthSuccess()
            }
        }, 500)

        // Method 3: window focus — fires when user returns to this tab after popup closes
        const handleFocus = () => { checkAuthStatus() }
        window.addEventListener('focus', handleFocus)

        return () => {
            window.removeEventListener('message', handleMessage)
            clearInterval(pollInterval)
            window.removeEventListener('focus', handleFocus)
        }
    }, [])

    useEffect(() => {
        localStorage.setItem('lang', lang)
        if (categories.length > 0) {
            localStorage.setItem('categories', JSON.stringify(categories))
        }
        if (defaultSupplier) {
            // Safety: Ensure we don't save a completely empty object or one missing bank details if we have them
            // This is secondary protection for the bug in InvoiceForm
            if (user) {
                // Logged in: save exclusively to MongoDB
                fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: { defaultSupplier } })
                }).catch(err => console.error('[Settings] Failed to save to MongoDB:', err))
            } else {
                // Guest: save to localStorage only
                localStorage.setItem('defaultSupplier_guest', JSON.stringify(defaultSupplier))
            }
        }
    }, [lang, defaultSupplier, categories, user])

    const selectedInvoice = invoices.find(inv => inv.id === selectedId)

    const handleSaveInvoice = async (invoice, { autoSave = false } = {}) => {
        try {

            // Guest Mode Restriction
            if (!user) {
                const isNew = !invoices.find(inv => inv.id === invoice.id)
                if (isNew && invoices.length >= 1) {
                    alert(lang === 'cs'
                        ? 'V režimu hosta můžete mít pouze 1 fakturu. Přihlašte se pro neomezený počet.'
                        : 'Guest mode is limited to 1 invoice. Please log in for unlimited invoices.')
                    return
                }
                saveLocalInvoice(invoice)
            } else {
                await saveApiInvoice(invoice)
            }

            // Update local state
            const existingIndex = invoices.findIndex(inv => inv.id === invoice.id)
            let updatedInvoices = [...invoices]

            if (existingIndex >= 0) {
                // Updating existing invoice — always keep it selected
                updatedInvoices[existingIndex] = invoice
                setSelectedId(invoice.id)
            } else {
                // New invoice saved for the first time
                updatedInvoices = [...invoices, invoice]
                if (!autoSave) {
                    // Explicit save: navigate to the saved invoice, reset draft number
                    setSelectedId(invoice.id)
                    setDraftNumber('')
                }
                // Auto-save: stay in new-invoice mode, don't change selectedId
                // This prevents Effect 1 from firing and wiping items user is adding
            }

            setInvoices(updatedInvoices)

            // Recalculate counter
            setInvoiceCounter(getNextInvoiceCounter(updatedInvoices))

            // Add category if new
            if (invoice.category && !categories.includes(invoice.category)) {
                setCategories([...categories, invoice.category].sort())
            }
        } catch (error: any) {
            if (error?.limitReached) {
                alert(lang === 'cs'
                    ? 'Dosáhli jste limitu 5 faktur bezplatného plánu. Upgradujte na Pro pro neomezený počet faktur.'
                    : 'You reached the 5-invoice limit on the free plan. Upgrade to Pro for unlimited invoices.')
                setCurrentView('settings')
                return
            }
            alert(t.alertError || 'Failed to save invoice')
        }
    }

    const handleDeleteInvoice = async (id) => {
        if (!window.confirm(lang === 'cs' ? 'Smazat fakturu?' : 'Delete invoice?')) return

        try {
            if (user) {
                await deleteApiInvoice(id)
            } else {
                deleteLocalInvoice(id)
            }
            setInvoices(invoices.filter(inv => inv.id !== id))
            if (selectedId === id) {
                setSelectedId(null)
            }
        } catch (error) {
            alert(t.alertError || 'Failed to delete invoice')
        }
    }

    const handleNewInvoice = () => {
        setSelectedId(null)
        setDraftNumber('')       // Reset so next render generates correct number
        setInvoicesLoaded(false) // Brief reset so form waits for counter
        setInvoicesLoaded(true)  // Immediately re-enable (counter is already correct)
        setCurrentView('invoices')
    }

    // handleSendReminderEmail removed for production deployment

    const handleAddCategory = (category) => {
        if (!categories.includes(category)) {
            setCategories([...categories, category].sort())
        }
    }

    // Quick status change from list/dashboard without opening the form
    const handleStatusChange = async (invoiceId, newStatus) => {
        const invoice = invoices.find(inv => inv.id === invoiceId)
        if (!invoice) return
        await handleSaveInvoice({ ...invoice, status: newStatus })
    }

    const handleLogin = async () => {
        const width = 500, height = 600
        const left = window.screen.width / 2 - width / 2
        const top = window.screen.height / 2 - height / 2
        const popup = window.open('about:blank', 'Google Login', `width=${width},height=${height},top=${top},left=${left}`)
        try {
            const res = await fetch('/auth/google/url')
            if (!res.ok) throw new Error('Failed to start login')
            const data = await res.json()
            if (data.url && popup) {
                popup.location.href = data.url
            } else {
                popup?.close()
            }
        } catch (e) {
            popup?.close()
            alert('Failed to connect to login server.')
        }
    }

    const handleLogout = () => {
        fetch('/auth/google/disconnect', { method: 'POST' })
            .catch(err => console.error('Logout error:', err))
            .then(() => {
                localStorage.clear()
                window.location.reload()
            })
    }

    const handleContinueAsGuest = () => {
        setShowWelcome(false)
    }

    const handleStartCheckout = (plan: 'standard' | 'max') => {
        setPendingCheckoutPlan(plan)
        handleLogin()
    }

    // Show welcome screen if user hasn't seen it
    if (showWelcome) {
        return <WelcomeScreen onLogin={handleLogin} onContinueAsGuest={handleContinueAsGuest} onStartCheckout={handleStartCheckout} lang={lang} />
    }

    return (
        <>
            <CookieBanner lang={lang} />
            <Header
                onNewInvoice={handleNewInvoice}
                lang={lang}
                setLang={setLang}
                t={t}
                currentView={currentView}
                onViewChange={setCurrentView}
                user={user}
                mobileView={mobileView}
                setMobileView={setMobileView}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                onOpenDashboard={() => { setCurrentView('invoices'); setDashboardOpen(true) }}
                onLogout={handleLogout}
                isAdmin={isAdmin}
            />
            <main className={`${dashboardOpen ? 'dashboard-mode' : ''} ${currentView === 'settings' ? 'settings-view' : ''}`}>
                {currentView === 'admin' ? (
                    <AdminDashboard />
                ) : currentView === 'settings' ? (
                    <Settings
                        lang={lang}
                        t={t}
                        user={user}
                        categories={categories}
                        onLogin={handleLogin}
                        onLogout={handleLogout}
                        defaultSupplier={defaultSupplier}
                        setDefaultSupplier={setDefaultSupplier}
                        subscription={subscription}
                        invoiceCount={invoices.length}
                    />
                ) : (
                    <>
                        <div className={`invoice-form-container ${mobileView !== 'form' ? 'mobile-hidden' : ''}`}>
                            <InvoiceForm
                                invoice={selectedInvoice}
                                categories={categories}
                                onSave={handleSaveInvoice}
                                onAddCategory={handleAddCategory}
                                invoiceCounter={invoiceCounter}
                                invoicesLoaded={invoicesLoaded}
                                draftNumber={draftNumber}
                                setDraftNumber={setDraftNumber}
                                lang={lang}
                                t={t}
                                defaultSupplier={defaultSupplier}
                                setDefaultSupplier={setDefaultSupplier}
                                isAuthenticated={!!user}
                            />
                        </div>
                        <div className={`invoice-list-container ${mobileView !== 'list' ? 'mobile-hidden' : ''}`}>
                            {isLoading ? (
                                <section className="card" style={{ marginBottom: '20px', textAlign: 'center', padding: '3rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                        <img
                                            src="/GEMINI_LOGO_LONG.png"
                                            alt="Loading..."
                                            style={{ width: '200px', opacity: 0.8, animation: 'pulse 2s ease-in-out infinite' }}
                                        />
                                        <h2>{lang === 'cs' ? 'Načítání faktur...' : 'Loading invoices...'}</h2>
                                    </div>
                                </section>
                            ) : (
                                <InvoiceList
                                    invoices={invoices}
                                    categories={categories}
                                    onSelect={setSelectedId}
                                    onDelete={handleDeleteInvoice}
                                    onStatusChange={handleStatusChange}
                                    selectedId={selectedId}
                                    lang={lang}
                                    t={t}
                                    isAuthenticated={!!user}
                                    dashboardOpen={dashboardOpen}
                                    setDashboardOpen={setDashboardOpen}
                                    onNewInvoice={handleNewInvoice}
                                    // Props for inline editing:
                                    onSave={handleSaveInvoice}
                                    onAddCategory={handleAddCategory}
                                    invoiceCounter={invoiceCounter}
                                    invoicesLoaded={invoicesLoaded}
                                    draftNumber={draftNumber}
                                    setDraftNumber={setDraftNumber}
                                    defaultSupplier={defaultSupplier}
                                    setDefaultSupplier={setDefaultSupplier}
                                />
                            )}
                        </div>
                    </>
                )}
            </main>
        </>
    )
}

export default App
