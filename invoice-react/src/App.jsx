import { useState, useEffect } from 'react'
import Header from './components/Header'
import InvoiceForm from './components/InvoiceForm'
import InvoiceList from './components/InvoiceList'
import Settings from './components/Settings'
import { getNextInvoiceCounter, loadApiData, loadLocalData, saveApiInvoice, saveLocalInvoice, deleteApiInvoice, deleteLocalInvoice } from './utils/storage'
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

    const t = languages[lang]

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

    // Load local settings from localStorage (not invoices)
    useEffect(() => {
        const savedLang = localStorage.getItem('lang')
        const savedSupplier = localStorage.getItem('defaultSupplier')
        const savedCategories = localStorage.getItem('categories')

        if (savedLang) setLang(savedLang)
        if (savedSupplier) setDefaultSupplier(JSON.parse(savedSupplier))
        if (savedCategories) setCategories(JSON.parse(savedCategories))
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
        } catch (err) {
            console.error('Failed to load invoices:', err)
        } finally {
            setIsLoading(false)
        }
    }

    // Reload data when user changes (Login/Logout)
    useEffect(() => {
        fetchInvoices()
    }, [user])

    // Load invoices and settings from server on mount
    useEffect(() => {
        const loadInitialData = async () => {
            await fetchInvoices()

            // 2. Load Settings (Supplier Profile)
            try {
                // Check for tokens first to avoid 401 spam if not logged in
                const tokensStr = localStorage.getItem('google_tokens')
                if (tokensStr) {
                    const res = await fetch('/api/settings')
                    if (res.ok) {
                        const { settings } = await res.json()
                        if (settings && Object.keys(settings).length > 0) {
                            setDefaultSupplier(settings)
                            console.log('Loaded settings from server', settings)
                        } else {
                            // Fallback to local storage if server is empty (first sync)
                            const savedSupplier = localStorage.getItem('defaultSupplier')
                            if (savedSupplier) setDefaultSupplier(JSON.parse(savedSupplier))
                        }
                    }
                } else {
                    // Fallback to local storage if not logged in
                    const savedSupplier = localStorage.getItem('defaultSupplier')
                    if (savedSupplier) setDefaultSupplier(JSON.parse(savedSupplier))
                }
            } catch (err) {
                console.error('Failed to load settings:', err)
                // Fallback
                const savedSupplier = localStorage.getItem('defaultSupplier')
                if (savedSupplier) setDefaultSupplier(JSON.parse(savedSupplier))
            }
        }

        // Initial load is triggered by user state change or mount
        // We just need to load settings if user is present

        const loadSettings = async () => {
            // ... logic to load settings
        }

        // Listen for Google Login updates from OAuth popup via postMessage
        const handleMessage = async (event) => {
            // Security: Validate origin if needed (for now accept all for localhost + production)
            if (event.data && event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                console.log("Login detected via postMessage, refreshing auth...")
                await checkAuthStatus()
                // Force reload invoices after auth status updates
                await fetchInvoices()
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    // Save local settings to localStorage and sync to server if authenticated
    useEffect(() => {
        localStorage.setItem('lang', lang)
        if (defaultSupplier) {
            localStorage.setItem('defaultSupplier', JSON.stringify(defaultSupplier))

            // Sync to server if logged in
            if (user) {
                fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: defaultSupplier })
                }).catch(err => console.error('Failed to sync settings to server:', err))
            }
        }
        if (categories.length > 0) {
            localStorage.setItem('categories', JSON.stringify(categories))
        }
    }, [lang, defaultSupplier, categories, user])

    const selectedInvoice = invoices.find(inv => inv.id === selectedId)

    const handleSaveInvoice = async (invoice) => {
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
                updatedInvoices[existingIndex] = invoice
            } else {
                updatedInvoices = [invoice, ...invoices]
                setDraftNumber('')
            }

            setInvoices(updatedInvoices)

            // Recalculate counter
            setInvoiceCounter(getNextInvoiceCounter(updatedInvoices))

            setSelectedId(invoice.id)

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
        setCurrentView('invoices')
    }

    const handleAddCategory = (category) => {
        if (!categories.includes(category)) {
            setCategories([...categories, category].sort())
        }
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
            <main>
                {currentView === 'settings' ? (
                    <Settings
                        lang={lang}
                        t={t}
                        defaultSupplier={defaultSupplier}
                        setDefaultSupplier={setDefaultSupplier}
                    />
                ) : (
                    <>
                        <InvoiceForm
                            invoice={selectedInvoice}
                            categories={categories}
                            onSave={handleSaveInvoice}
                            onAddCategory={handleAddCategory}
                            invoiceCounter={invoiceCounter}
                            draftNumber={draftNumber}
                            setDraftNumber={setDraftNumber}
                            lang={lang}
                            t={t}
                            defaultSupplier={defaultSupplier}
                            setDefaultSupplier={setDefaultSupplier}
                        />
                        <div>
                            {isLoading ? (
                                <section className="card" style={{ marginBottom: '20px', textAlign: 'center', padding: '3rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                                    <h2>{lang === 'cs' ? 'Načítání faktur...' : 'Loading invoices...'}</h2>
                                </section>
                            ) : (
                                <InvoiceList
                                    invoices={invoices}
                                    categories={categories}
                                    onSelect={setSelectedId}
                                    onDelete={handleDeleteInvoice}
                                    selectedId={selectedId}
                                    lang={lang}
                                    t={t}
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
