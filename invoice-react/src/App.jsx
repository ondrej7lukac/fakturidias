import { useState, useEffect } from 'react'
import Header from './components/Header'
import InvoiceForm from './components/InvoiceForm'
import InvoiceList from './components/InvoiceList'
import Settings from './components/Settings'
import LoginPage from './components/LoginPage'
import { getNextInvoiceCounter, loadData, saveInvoice, deleteInvoice } from './utils/storage'
import { languages } from './utils/i18n'

function App() {
    const [invoices, setInvoices] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [categories, setCategories] = useState([])
    const [invoiceCounter, setInvoiceCounter] = useState(1)
    const [draftNumber, setDraftNumber] = useState('')
    const [lang, setLang] = useState('cs')
    const [defaultSupplier, setDefaultSupplier] = useState(null)
    const [currentView, setCurrentView] = useState('invoices')
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isAuthChecking, setIsAuthChecking] = useState(true)

    const t = languages[lang]

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
            const invoiceData = await loadData() // internal fetch to /api/invoices
            const loadedInvoices = invoiceData.invoices || []
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

    // Load invoices and settings from server on mount
    // Check Auth and Load Data
    useEffect(() => {
        const checkAuthAndLoad = async () => {
            setIsAuthChecking(true)
            try {
                // 1. Check Session
                const authRes = await fetch('/api/me')
                const authData = await authRes.json()

                if (authData.authenticated) {
                    setIsAuthenticated(true)

                    // 2. Load Invoices
                    await fetchInvoices()

                    // 3. Load Settings
                    try {
                        const res = await fetch('/api/settings')
                        if (res.ok) {
                            const { settings } = await res.json()
                            if (settings && Object.keys(settings).length > 0) {
                                setDefaultSupplier(settings)
                            }
                        }
                    } catch (e) { console.error("Failed to load settings", e) }

                } else {
                    setIsAuthenticated(false)
                }
            } catch (e) {
                console.error("Auth check failed", e)
                setIsAuthenticated(false)
            } finally {
                setIsAuthChecking(false)
            }
        }

        checkAuthAndLoad()

        // Handle success from LoginPage
        const handleLoginSuccess = async () => {
            // Re-run the full check to load data
            checkAuthAndLoad()
        }

        // Listen for global login events (e.g. from Settings reconnection or LoginPage)
        window.addEventListener('google_login_update', handleLoginSuccess)
        return () => window.removeEventListener('google_login_update', handleLoginSuccess)
    }, [])

    // Save local settings to localStorage (only preferences)
    useEffect(() => {
        localStorage.setItem('lang', lang)
        // localStorage.setItem('defaultSupplier', JSON.stringify(defaultSupplier)) // Don't cache supplier locally for security? Or maybe ok.
        // Let's keep caching for offline fallback visual consistency?
        // Actually, for multi-user, local storage shared is BAD.
        // We should clear supplier from local storage or namespace it?
        // For now, let's NOT save defaultSupplier to global localStorage to avoid leaking to other users on same PC
        localStorage.setItem('categories', JSON.stringify(categories))
    }, [lang, categories])

    const selectedInvoice = invoices.find(inv => inv.id === selectedId)

    const handleSaveInvoice = async (invoice) => {
        try {
            await saveInvoice(invoice)

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
            await deleteInvoice(id)
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

    if (isAuthChecking) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
                Loading...
            </div>
        )
    }

    if (!isAuthenticated) {
        return <LoginPage lang={lang} onLoginSuccess={() => window.dispatchEvent(new Event('google_login_update'))} />
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
                            <InvoiceList
                                invoices={invoices}
                                categories={categories}
                                onSelect={setSelectedId}
                                onDelete={handleDeleteInvoice}
                                selectedId={selectedId}
                                lang={lang}
                                t={t}
                            />
                        </div>
                    </>
                )}
            </main>
        </>
    )
}

export default App
