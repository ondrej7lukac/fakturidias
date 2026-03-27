import { useState, useEffect } from 'react'
import Header from './components/Header'
import InvoiceForm from './components/InvoiceForm'
import InvoiceList from './components/InvoiceList'
import Settings from './components/Settings'
import WelcomeScreen from './components/WelcomeScreen'
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

    const t = languages[lang]

    // Show welcome screen only when not logged in
    useEffect(() => {
        if (user) {
            // User is logged in, hide welcome screen
            setShowWelcome(false)
        } else {
            // User is not logged in, show welcome screen
            setShowWelcome(true)
        }
    }, [user])

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
            console.log("Login detected, refreshing auth...")
            await checkAuthStatus()
            await fetchInvoices()
        }

        // Method 1: postMessage from popup
        const handleMessage = async (event) => {
            if (event.data && event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                await handleAuthSuccess()
            }
        }
        window.addEventListener('message', handleMessage)

        // Method 2: localStorage polling fallback (cross-origin popup can't postMessage)
        const pollInterval = setInterval(async () => {
            const flag = localStorage.getItem('auth_success')
            if (flag) {
                localStorage.removeItem('auth_success')
                await handleAuthSuccess()
            }
        }, 500)

        return () => {
            window.removeEventListener('message', handleMessage)
            clearInterval(pollInterval)
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
        } catch (error) {
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
        try {
            const res = await fetch('/auth/google/url')
            if (!res.ok) throw new Error('Failed to start login')
            const data = await res.json()

            if (data.url) {
                const width = 500
                const height = 600
                const left = window.screen.width / 2 - width / 2
                const top = window.screen.height / 2 - height / 2
                window.open(data.url, 'Google Login', `width=${width},height=${height},top=${top},left=${left}`)
            }
        } catch (e) {
            alert('Failed to connect to login server.')
        }
    }

    const handleContinueAsGuest = () => {
        // Just hide welcome screen, don't change auth state
        setShowWelcome(false)
    }

    // Show welcome screen if user hasn't seen it
    if (showWelcome) {
        return <WelcomeScreen onLogin={handleLogin} onContinueAsGuest={handleContinueAsGuest} lang={lang} />
    }

    return (
        <>
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
                onLogout={() => {
                    // Call backend to disconnect/clear session
                    fetch('/auth/google/disconnect', { method: 'POST' })
                        .then(() => {
                            // Clear local storage
                            localStorage.clear()
                            // Reload page to ensure clean state
                            window.location.reload()
                        })
                        .catch((err) => {
                            console.error('Logout error:', err)
                            // Still clear local data even if server call fails
                            localStorage.clear()
                            setUser(null)
                            setInvoices([])
                            setDefaultSupplier(null)
                            setCategories([])
                            setCurrentView('invoices')
                            setInvoiceCounter(1)
                        })
                }}
            />
            <main className={dashboardOpen ? 'dashboard-mode' : ''}>
                {currentView === 'settings' ? (
                    <Settings
                        lang={lang}
                        t={t}
                        defaultSupplier={defaultSupplier}
                        setDefaultSupplier={setDefaultSupplier}
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
