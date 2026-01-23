import { useState, useEffect } from 'react'
import Header from './components/Header'
import InvoiceForm from './components/InvoiceForm'
import InvoiceList from './components/InvoiceList'
import Settings from './components/Settings'
import { loadData, saveInvoice, deleteInvoice } from './utils/storage'
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

    const t = languages[lang]

    // Load local settings from localStorage (not invoices)
    useEffect(() => {
        const savedLang = localStorage.getItem('lang')
        const savedSupplier = localStorage.getItem('defaultSupplier')
        const savedCategories = localStorage.getItem('categories')
        const savedCounter = localStorage.getItem('invoiceCounter')

        if (savedLang) setLang(savedLang)
        if (savedSupplier) setDefaultSupplier(JSON.parse(savedSupplier))
        if (savedCategories) setCategories(JSON.parse(savedCategories))
        if (savedCounter) setInvoiceCounter(Number(savedCounter))
    }, [])

    // Load invoices and settings from server on mount
    useEffect(() => {
        const loadInitialData = async () => {
            // 1. Load Invoices
            try {
                const invoiceData = await loadData() // internal fetch to /api/invoices
                setInvoices(invoiceData.invoices || [])
            } catch (err) {
                console.error('Failed to load invoices:', err)
            }

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

            setIsLoading(false)
        }

        loadInitialData()

        // Listen for Google Login to auto-fill email and reload settings
        const handleGoogleLogin = () => {
            const tokensStr = localStorage.getItem('google_tokens')
            if (tokensStr) {
                // Reload settings from server after login
                fetch('/api/settings').then(res => {
                    if (res.ok) return res.json()
                }).then(data => {
                    if (data?.settings) setDefaultSupplier(data.settings)
                })

                // Try to get email from localStorage (Settings.jsx saves it there now in smtpConfig)
                const smtpConfig = localStorage.getItem('smtpConfig')
                if (smtpConfig) {
                    const { fromEmail } = JSON.parse(smtpConfig)
                    if (fromEmail) {
                        setDefaultSupplier(prev => {
                            if (!prev || !prev.email) {
                                return { ...prev, email: fromEmail }
                            }
                            return prev
                        })
                    }
                }
            }
        }
        window.addEventListener('google_login_update', handleGoogleLogin)
        return () => window.removeEventListener('google_login_update', handleGoogleLogin)
    }, [])

    // Save local settings to localStorage (not server)
    useEffect(() => {
        localStorage.setItem('lang', lang)
        localStorage.setItem('defaultSupplier', JSON.stringify(defaultSupplier))
        localStorage.setItem('categories', JSON.stringify(categories))
        localStorage.setItem('invoiceCounter', invoiceCounter)
    }, [lang, defaultSupplier, categories, invoiceCounter])

    const selectedInvoice = invoices.find(inv => inv.id === selectedId)

    const handleSaveInvoice = async (invoice) => {
        try {
            await saveInvoice(invoice)

            // Update local state
            const existingIndex = invoices.findIndex(inv => inv.id === invoice.id)

            if (existingIndex >= 0) {
                const updated = [...invoices]
                updated[existingIndex] = invoice
                setInvoices(updated)
            } else {
                setInvoices([invoice, ...invoices])
                setInvoiceCounter(prev => prev + 1)
                setDraftNumber('')
            }

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
