import { useState, useEffect, useRef } from 'react'
import { formatInvoiceNumber, addDays, formatDate, money, getUserId } from '../utils/storage'
import { searchAres, parseAresItem } from '../utils/ares'

import ItemsTable from './ItemsTable'
import InvoicePreview from './InvoicePreview'
import { generateInvoicePDF } from '../utils/pdf'
import { BANK_CODES, calculateIban, parseIban, getCzechQrPayload } from '../utils/bank'
import { QRCodeCanvas } from 'qrcode.react'
import QRCode from 'qrcode'


export default function InvoiceForm({
    invoice,
    categories,
    onSave,
    onAddCategory,
    invoiceCounter,
    draftNumber,
    setDraftNumber,
    lang,
    t,
    defaultSupplier,
    setDefaultSupplier,
    isAuthenticated
}) {
    const qrCanvasRef = useRef(null)
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        issueDate: formatDate(new Date()),
        dueDate: formatDate(addDays(new Date(), 7)),
        taxableSupplyDate: '',
        status: 'draft',
        category: '',
        clientName: '',
        clientEmail: '',
        clientEmailCopy: '',
        clientPhone: '',
        clientArea: 'Prague',
        clientIco: '',
        clientVat: '',
        clientAddress: '',
        currency: 'CZK',
        amount: '0.00',
        iban: '',
        bic: '',
        paymentNote: '',
        accountNumber: '',
        bankCode: '',
        prefix: '',
        variableSymbol: '',
        supplierName: '',
        supplierIco: '',
        supplierVat: '',
        supplierAddress: '',
        supplierRegistry: '',
        supplierPhone: '',
        supplierEmail: '',
        supplierWebsite: '',
        isVatPayer: false,
        taxBase: '0.00',
        taxRate: '21',
        taxAmount: '0.00'
    })

    const [items, setItems] = useState([])
    const stateRef = useRef({ formData, items })

    useEffect(() => {
        stateRef.current = { formData, items }
    }, [formData, items])

    const [itemInput, setItemInput] = useState({ name: '', qty: 1, price: '', taxRate: formData.isVatPayer ? '21' : '0', discount: 0, total: '' })
    const [categoryInput, setCategoryInput] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [emailStatus, setEmailStatus] = useState('')
    const [previewMode, setPreviewMode] = useState(false)
    const [savedItems, setSavedItems] = useState([])
    const [savedCustomers, setSavedCustomers] = useState([])
    const [itemSuggestions, setItemSuggestions] = useState([])
    const [customerSuggestions, setCustomerSuggestions] = useState([])
    const [saveTimer, setSaveTimer] = useState(null)

    useEffect(() => {
        if (invoice) {
            const ibanData = parseIban(invoice.payment.iban || '')
            setFormData({
                invoiceNumber: invoice.invoiceNumber,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate || '',
                taxableSupplyDate: invoice.taxableSupplyDate || '',
                status: invoice.status,
                category: invoice.category || '',
                clientName: invoice.client.name,
                clientEmail: invoice.client.email || '',
                clientEmailCopy: invoice.client.emailCopy || '',
                clientPhone: invoice.client.phone || '',
                clientArea: invoice.client.area || '',
                clientIco: invoice.client.ico || '',
                clientVat: invoice.client.vat || '',
                clientAddress: invoice.client.address || '',
                currency: invoice.currency,
                amount: money(invoice.amount),
                iban: invoice.payment.iban || '',
                bic: invoice.payment.bic || '',
                paymentNote: invoice.payment.note || '',
                accountNumber: ibanData?.accountNumber || '',
                bankCode: ibanData?.bankCode || '',
                prefix: ibanData?.prefix || '',
                variableSymbol: invoice.payment.variableSymbol || invoice.invoiceNumber.replace(/\D/g, ''),
                supplierName: invoice.supplier?.name || '',
                supplierIco: invoice.supplier?.ico || '',
                supplierVat: invoice.supplier?.vat || '',
                supplierAddress: invoice.supplier?.address || '',
                supplierRegistry: invoice.supplier?.registry || '',
                supplierPhone: invoice.supplier?.phone || '',
                supplierEmail: invoice.supplier?.email || '',
                supplierWebsite: invoice.supplier?.website || '',
                isVatPayer: invoice.isVatPayer || false,
                taxBase: invoice.taxBase || '0.00',
                taxRate: invoice.taxRate || '21',
                taxAmount: invoice.taxAmount || '0.00'
            })
            setItems(invoice.items || [])
        } else {
            const today = new Date()
            const newDraftNumber = draftNumber || formatInvoiceNumber(invoiceCounter)
            if (!draftNumber) setDraftNumber(newDraftNumber)

            let bankFields = { accountNumber: '', bankCode: '', prefix: '' }
            if (defaultSupplier?.iban) {
                const parsed = parseIban(defaultSupplier.iban)
                if (parsed) bankFields = parsed
            }

            setFormData({
                invoiceNumber: newDraftNumber,
                issueDate: formatDate(today),
                dueDate: formatDate(addDays(today, 7)),
                taxableSupplyDate: '',
                status: 'draft',
                category: '',
                clientName: '',
                clientEmail: '',
                clientEmailCopy: '',
                clientPhone: '',
                clientArea: '',
                clientIco: '',
                clientVat: '',
                clientAddress: '',
                currency: 'CZK',
                amount: '0.00',
                iban: defaultSupplier?.iban || '',
                bic: '',
                paymentNote: '',
                accountNumber: defaultSupplier?.accountNumber || bankFields.accountNumber,
                bankCode: defaultSupplier?.bankCode || bankFields.bankCode,
                prefix: defaultSupplier?.prefix || bankFields.prefix,
                variableSymbol: newDraftNumber.replace(/\D/g, ''),
                supplierName: defaultSupplier?.name || '',
                supplierIco: defaultSupplier?.ico || '',
                supplierVat: defaultSupplier?.vat || '',
                supplierAddress: defaultSupplier?.address || '',
                supplierRegistry: defaultSupplier?.registry || '',
                supplierPhone: defaultSupplier?.phone || '',
                supplierEmail: defaultSupplier?.email || '',
                supplierWebsite: defaultSupplier?.website || '',
                isVatPayer: defaultSupplier?.isVatPayer || false,
                taxBase: '0.00',
                taxRate: defaultSupplier?.taxRate || '21',
                taxAmount: '0.00'
            })
            setItems([])
        }
    }, [invoice, invoiceCounter, draftNumber, setDraftNumber, defaultSupplier])

    useEffect(() => {
        const total = items.reduce((sum, item) => sum + item.total, 0)
        setFormData(prev => ({ ...prev, amount: money(total) }))
    }, [items])

    useEffect(() => {
        let updates = {}
        if (formData.bankCode) {
            const bankInfo = BANK_CODES[formData.bankCode]
            if (bankInfo?.bic && bankInfo.bic !== formData.bic) {
                updates.bic = bankInfo.bic
            }
        }
        if (formData.accountNumber && formData.bankCode) {
            const newIban = calculateIban(formData.accountNumber, formData.bankCode, formData.prefix)
            if (newIban && newIban !== formData.iban) {
                const currentClean = (formData.iban || '').replace(/\s/g, '')
                const newClean = newIban.replace(/\s/g, '')
                if (currentClean !== newClean) {
                    updates.iban = newIban
                }
            }
        }
        if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }))
        }
    }, [formData.accountNumber, formData.bankCode, formData.prefix])

    // Update item input tax rate when VAT payer status changes
    useEffect(() => {
        setItemInput(prev => ({
            ...prev,
            taxRate: formData.isVatPayer ? '21' : '0'
        }))
    }, [formData.isVatPayer])

    const handleBlurSave = () => {
        if (saveTimer) clearTimeout(saveTimer)
        const timer = setTimeout(() => {
            const currentData = stateRef.current
            const invoiceData = getCurrentInvoiceData(currentData.formData, currentData.items)
            onSave(invoiceData)

            if (invoiceData.client && invoiceData.client.name) {
                fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': getUserId() },
                    body: JSON.stringify({ customer: invoiceData.client })
                }).catch(e => console.error(e))
            }
            console.log('[Auto-Save] Invoice saved:', invoiceData.invoiceNumber)
        }, 1000)
        setSaveTimer(timer)
    }

    useEffect(() => {
        const loadSavedData = async () => {
            try {
                const resItems = await fetch('/api/items', { headers: { 'x-user-id': getUserId() } })
                if (resItems.ok) {
                    const data = await resItems.json()
                    setSavedItems(data.items || [])
                }
                const resCust = await fetch('/api/customers', { headers: { 'x-user-id': getUserId() } })
                if (resCust.ok) {
                    const data = await resCust.json()
                    setSavedCustomers(data.customers || [])
                }
            } catch (e) {
                console.error('[DB] Failed to load data:', e)
            }
        }
        loadSavedData()
    }, [])

    const getCurrentInvoiceData = (currentFormData = formData, currentItems = items) => {
        return {
            id: invoice?.id || crypto.randomUUID(),
            invoiceNumber: currentFormData.invoiceNumber.trim(),
            issueDate: currentFormData.issueDate,
            dueDate: currentFormData.dueDate,
            taxableSupplyDate: currentFormData.taxableSupplyDate || currentFormData.issueDate,
            status: currentFormData.status,
            category: currentFormData.category,
            client: {
                name: currentFormData.clientName.trim(),
                email: currentFormData.clientEmail.trim(),
                emailCopy: (currentFormData.clientEmailCopy || '').trim(),
                phone: (currentFormData.clientPhone || '').trim(),
                area: currentFormData.clientArea.trim(),
                ico: currentFormData.clientIco.trim(),
                vat: currentFormData.clientVat.trim(),
                address: currentFormData.clientAddress.trim()
            },
            items: currentItems,
            currency: currentFormData.currency,
            amount: currentItems.reduce((sum, item) => sum + item.total, 0),
            payment: {
                iban: currentFormData.iban.trim(),
                bic: currentFormData.bic.trim(),
                note: currentFormData.paymentNote.trim(),
                accountNumber: currentFormData.accountNumber,
                bankCode: currentFormData.bankCode,
                variableSymbol: currentFormData.variableSymbol || currentFormData.invoiceNumber.replace(/\D/g, '')
            },
            supplier: {
                name: currentFormData.supplierName.trim(),
                ico: currentFormData.supplierIco.trim(),
                vat: currentFormData.supplierVat.trim(),
                address: currentFormData.supplierAddress.trim(),
                registry: currentFormData.supplierRegistry.trim(),
                phone: currentFormData.supplierPhone.trim(),
                email: currentFormData.supplierEmail.trim(),
                website: currentFormData.supplierWebsite.trim()
            },
            isVatPayer: currentFormData.isVatPayer,
            taxBase: currentFormData.taxBase,
            taxRate: currentFormData.taxRate,
            taxAmount: currentFormData.taxAmount
        }
    }

    const handlePasteBank = (e) => {
        const text = e.clipboardData.getData('text').trim()
        if (!text) return
        const cleanIban = text.replace(/\s/g, '').toUpperCase()
        if (/^[A-Z]{2}\d{10,}/.test(cleanIban)) {
            e.preventDefault()
            const parsed = parseIban(cleanIban)
            const bankInfo = BANK_CODES[parsed.bankCode]
            setFormData(prev => ({
                ...prev,
                iban: cleanIban,
                bankCode: parsed.bankCode || prev.bankCode,
                prefix: parsed.prefix || prev.prefix,
                accountNumber: parsed.accountNumber || prev.accountNumber,
                bic: bankInfo?.bic || prev.bic
            }))
            return
        }
        const czechMatch = text.match(/^(\d{0,6}-)?(\d{1,10})\/(\d{4})$/)
        if (czechMatch) {
            e.preventDefault()
            const prefix = czechMatch[1] ? czechMatch[1].replace('-', '') : ''
            const accountNumber = czechMatch[2]
            const bankCode = czechMatch[3]
            setFormData(prev => ({
                ...prev,
                prefix,
                accountNumber,
                bankCode
            }))
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Debounce reference for ARES
    const aresDebounceRef = useRef(null)

    const handleClientNameChange = (e) => {
        const value = e.target.value
        setFormData(prev => ({ ...prev, clientName: value }))

        if (value.trim().length > 0) {
            // 1. Saved Customers (Instant)
            const matches = savedCustomers.filter(c =>
                c.name.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 5).map(c => ({ ...c, source: 'saved' }))
            setCustomerSuggestions(matches)

            // 2. ARES Search (Debounced)
            if (value.trim().length >= 3) {
                if (aresDebounceRef.current) clearTimeout(aresDebounceRef.current)
                aresDebounceRef.current = setTimeout(() => {
                    searchAres(value).then(aresResults => {
                        const aresMatches = aresResults.map(item => {
                            const parsed = parseAresItem(item)
                            return { ...parsed, source: 'ares' }
                        })
                        setCustomerSuggestions(prev => {
                            // Deduplicate by name
                            const existingNames = new Set(prev.map(p => p.name))
                            const newAres = aresMatches.filter(a => !existingNames.has(a.name)).slice(0, 3)
                            return [...prev, ...newAres]
                        })
                    })
                }, 500)
            }
        } else {
            setCustomerSuggestions([])
        }
    }

    const handleSelectCustomer = (customer) => {
        setFormData(prev => ({
            ...prev,
            clientName: customer.name,
            clientEmail: customer.email || '',
            clientEmailCopy: customer.emailCopy || '',
            clientPhone: customer.phone || '',
            clientIco: customer.ico || '',
            clientVat: customer.vat || '',
            clientAddress: customer.address || '',
            clientArea: customer.city || customer.area || ''
        }))
        setCustomerSuggestions([])
    }

    const handleInputBlur = () => {
        handleBlurSave()
    }

    const handleAddItem = async () => {
        if (!itemInput.name.trim() || itemInput.qty <= 0) return

        const basePrice = Number(itemInput.price) || 0
        const qty = Number(itemInput.qty)
        const discount = Number(itemInput.discount) || 0
        const taxRate = formData.isVatPayer ? (Number(itemInput.taxRate) || 0) : 0

        const priceAfterDiscount = basePrice - discount
        const subtotal = qty * priceAfterDiscount
        const taxAmount = subtotal * (taxRate / 100)
        const total = subtotal + taxAmount

        const newItem = {
            id: crypto.randomUUID(),
            name: itemInput.name.trim(),
            qty,
            price: basePrice,
            discount,
            taxRate,
            taxAmount,
            subtotal,
            total
        }

        console.log('[InvoiceForm] Adding item:', newItem)
        setItems([...items, newItem])

        try {
            await fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': getUserId()
                },
                body: JSON.stringify({
                    item: {
                        name: newItem.name,
                        price: basePrice,
                        taxRate
                    }
                })
            })
            const response = await fetch('/api/items', { headers: { 'x-user-id': getUserId() } })
            if (response.ok) {
                const data = await response.json()
                setSavedItems(data.items || [])
            }
        } catch (e) {
            console.error('[Items] Failed to save item:', e)
        }

        // Reset with default tax rate based on VAT payer status
        setItemInput({ name: '', qty: 1, price: '', taxRate: formData.isVatPayer ? '21' : '0', discount: 0, total: '' })
        setItemSuggestions([])
    }

    const handleClearItems = () => setItems([])

    const handleItemNameChange = (value) => {
        setItemInput(prev => ({ ...prev, name: value }))
        if (value.trim().length > 0) {
            const itemsToFilter = Array.isArray(savedItems) ? savedItems : [];
            const matches = itemsToFilter.filter(item =>
                item.name.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 5)
            setItemSuggestions(matches)
        } else {
            setItemSuggestions([])
        }
    }

    const handleSelectSuggestion = (item) => {
        setItemInput(prev => ({
            ...prev,
            name: item.name,
            price: item.price || 0,
            taxRate: item.taxRate || '21'
        }))
        setItemSuggestions([])
    }

    const handleDeleteRow = (index) => {
        if (window.confirm(lang === 'cs' ? 'Smazat položku?' : 'Delete item?')) {
            const newItems = [...items]
            newItems.splice(index, 1)
            setItems(newItems)
            handleBlurSave()
        }
    }

    const handleItemTotalChange = (e) => {
        const newTotalStr = e.target.value
        const newTotal = Number(newTotalStr)

        const qty = Number(itemInput.qty) || 1
        const taxRate = formData.isVatPayer ? (Number(itemInput.taxRate) || 0) : 0
        const discountPct = Number(itemInput.discount) || 0
        const taxMultiplier = 1 + (taxRate / 100)
        const discountMultiplier = 1 - (discountPct / 100)

        // Working backwards: Total = (Price * DiscountMultiplier * Qty) * TaxMultiplier
        // So: Price = Total / (Qty * TaxMultiplier * DiscountMultiplier)
        if (qty > 0 && taxMultiplier > 0 && discountMultiplier > 0) {
            const price = newTotal / (qty * taxMultiplier * discountMultiplier)
            setItemInput(prev => ({
                ...prev,
                price: price.toFixed(2),
                total: newTotalStr
            }))
        }
        setItemInput(prev => ({ ...prev, total: newTotalStr }))
    }

    const handleAddCategory = () => {
        const normalized = categoryInput.trim()
        if (normalized) {
            onAddCategory(normalized)
            setFormData(prev => ({ ...prev, category: normalized }))
            setCategoryInput('')
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const invoiceData = getCurrentInvoiceData()
        onSave(invoiceData)
        setDefaultSupplier(invoiceData.supplier)
    }

    const handleMarkPaid = () => setFormData(prev => ({ ...prev, status: 'paid' }))

    const handleAresData = (data) => {
        setFormData(prev => ({
            ...prev,
            clientName: data.name || prev.clientName,
            clientAddress: data.address || prev.clientAddress,
            clientIco: data.ico || prev.clientIco,
            clientArea: data.city || prev.clientArea,
            clientVat: data.vat || prev.clientVat
        }))
    }

    const handleDownloadPDF = async () => {
        const currentData = getCurrentInvoiceData()
        setIsGenerating(true)
        try {
            let qrDataUrl = null
            try {
                const qrPayload = getCzechQrPayload(currentData)
                if (qrPayload) {
                    qrDataUrl = await QRCode.toDataURL(qrPayload, {
                        errorCorrectionLevel: 'M',
                        margin: 0,
                        width: 256
                    })
                }
            } catch (err) { }

            const pdf = await generateInvoicePDF(currentData, t, qrDataUrl)
            pdf.save(`${currentData.invoiceNumber}.pdf`)
        } catch (error) {
            alert('Failed to generate PDF')
        }
        setIsGenerating(false)
    }

    const handleEmailPDF = async () => {
        if (!isAuthenticated) {
            return alert(
                lang === 'cs'
                    ? 'Pro odesílání emailů se musíte přihlásit. Klikněte na tlačítko "Přihlášení" v záhlaví.'
                    : 'You must be logged in to send emails. Click the "Login" button in the header.'
            )
        }
        const currentData = getCurrentInvoiceData()
        if (!currentData.client.email) return alert(t.alertEmailMissing)
        setIsGenerating(true)
        setEmailStatus(t.alertGenerating)
        try {
            let qrDataUrl = null
            try {
                const qrPayload = getCzechQrPayload(currentData)
                if (qrPayload) {
                    qrDataUrl = await QRCode.toDataURL(qrPayload, {
                        errorCorrectionLevel: 'M',
                        margin: 0,
                        width: 256
                    })
                }
            } catch (err) { }

            const pdf = await generateInvoicePDF(currentData, t, qrDataUrl)
            const pdfBase64 = pdf.output('datauristring')
            setEmailStatus(t.alertSending)

            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: currentData.client.email,
                    cc: currentData.client.emailCopy,
                    subject: `${t.invoice} ${currentData.invoiceNumber}`,
                    html: `<p>Hello,</p><p>Please find attached the invoice ${currentData.invoiceNumber}.</p><p>Thank you!</p>`,
                    pdfBase64: pdfBase64,
                    filename: `${currentData.invoiceNumber}.pdf`,
                    useGoogle: true
                })
            })
            if (response.ok) {
                setFormData(prev => ({ ...prev, status: 'sent' }))
                alert(t.alertEmailSuccess)
            } else {
                const result = await response.json()
                alert(`${t.alertEmailFailed} ${result.message || result.error}`)
            }
        } catch (error) {
            alert(t.alertError)
        }
        setIsGenerating(false)
        setEmailStatus('')
    }

    const togglePreview = () => setPreviewMode(!previewMode)

    return (
        <section className="card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{t.createEditInvoice}</h2>
                <button
                    type="button"
                    onClick={togglePreview}
                    className="secondary"
                    style={{ padding: '8px 16px' }}
                >
                    {previewMode
                        ? `✏️ ${lang === 'cs' ? 'Upravit' : 'Edit'}`
                        : `👁️ ${lang === 'cs' ? 'Náhled' : 'Preview'}`
                    }
                </button>
            </div>

            <style>{`
                input[type="number"]::-webkit-inner-spin-button,
                input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type="number"] {
                    -moz-appearance: textfield;
                }
            `}</style>

            {previewMode ? (
                <>
                    <InvoicePreview invoice={getCurrentInvoiceData()} t={t} lang={lang} />
                    <div className="actions" style={{ marginTop: '30px' }}>
                        <button type="button" onClick={(e) => { e.preventDefault(); onSave(getCurrentInvoiceData()); }} className="primary">
                            {t.saveInvoice}
                        </button>
                        <button type="button" onClick={(e) => { e.preventDefault(); setPreviewMode(false); }} className="secondary">
                            ✏️ {lang === 'cs' ? 'Upravit' : 'Edit'}
                        </button>
                        <button type="button" onClick={handleDownloadPDF} disabled={isGenerating} className="secondary">
                            {isGenerating && !emailStatus ? t.alertGenerating : t.downloadPdf}
                        </button>
                        <button type="button" onClick={handleEmailPDF} disabled={isGenerating} className="secondary">
                            {emailStatus || t.emailPdf}
                        </button>
                        <button type="button" onClick={handleMarkPaid} className="secondary" style={{ marginLeft: 'auto' }}>
                            {t.markPaid}
                        </button>
                    </div>
                </>
            ) : (
                <form onSubmit={handleSubmit} onBlur={handleInputBlur} className="grid">
                    <div className="grid two">
                        <div>
                            <label>{t.invoiceNumber}</label>
                            <input name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} required />
                        </div>
                        <div>
                            <label>{t.issueDate}</label>
                            <input name="issueDate" type="date" value={formData.issueDate} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="grid two">
                        <div>
                            <label>{t.dueDate}</label>
                            <input name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} />
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'DUZP' : 'DUZP'}</label>
                            <input name="taxableSupplyDate" type="date" value={formData.taxableSupplyDate || formData.issueDate} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid two">
                        <div>
                            <label>{t.status}</label>
                            <select name="status" value={formData.status} onChange={handleChange}>
                                <option value="draft">{t.draft}</option>
                                <option value="sent">{t.sent}</option>
                                <option value="paid">{t.paid}</option>
                                <option value="overdue">{t.overdue}</option>
                            </select>
                        </div>
                        <div>
                            <label>{t.category}</label>
                            <select name="category" value={formData.category} onChange={handleChange}>
                                <option value="">{t.all}</option>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label>{t.addCategory}</label>
                        <div className="actions">
                            <input value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())} />
                            <button type="button" onClick={handleAddCategory} className="secondary">{t.add}</button>
                        </div>
                    </div>

                    <h3>{t.issuer}</h3>
                    <div className="grid two">
                        <div>
                            <label>{t.supplierName}</label>
                            <input name="supplierName" value={formData.supplierName} onChange={handleChange} placeholder="Vaše firma s.r.o." />
                        </div>
                        <div>
                            <label>{t.supplierIco}</label>
                            <input name="supplierIco" value={formData.supplierIco} onChange={handleChange} placeholder="12345678" />
                        </div>
                    </div>
                    <div className="grid two">
                        <div>
                            <label>{t.supplierVat}</label>
                            <input name="supplierVat" value={formData.supplierVat} onChange={handleChange} placeholder="CZ12345678" />
                        </div>
                        <div>
                            <label>{t.supplierAddress}</label>
                            <input name="supplierAddress" value={formData.supplierAddress} onChange={handleChange} placeholder="Ulice 123, Praha" />
                        </div>
                    </div>
                    <div>
                        <label>{lang === 'cs' ? 'Zápis v rejstříku' : 'Registry Entry'}</label>
                        <input name="supplierRegistry" value={formData.supplierRegistry} onChange={handleChange} />
                    </div>

                    <div className="grid two">
                        <div>
                            <label>{lang === 'cs' ? 'Telefon' : 'Phone'}</label>
                            <input name="supplierPhone" value={formData.supplierPhone} onChange={handleChange} />
                        </div>
                        <div>
                            <label>Email</label>
                            <input name="supplierEmail" type="email" value={formData.supplierEmail} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <label>Web</label>
                        <input name="supplierWebsite" value={formData.supplierWebsite} onChange={handleChange} />
                    </div>

                    <div style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="checkbox"
                                name="isVatPayer"
                                id="isVatPayer"
                                checked={formData.isVatPayer}
                                onChange={(e) => setFormData(prev => ({ ...prev, isVatPayer: e.target.checked }))}
                                style={{ width: 'auto', margin: 0 }}
                            />
                            <label htmlFor="isVatPayer" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>
                                {lang === 'cs' ? 'Jsem plátce DPH' : 'I am a VAT payer'}
                            </label>
                        </div>

                        {formData.isVatPayer && (
                            <div className="grid three">
                                <div>
                                    <label>{lang === 'cs' ? 'Základ daně' : 'Tax Base'}</label>
                                    <input name="taxBase" type="number" step="0.01" value={formData.taxBase} onChange={handleChange} />
                                </div>
                                <div>
                                    <label>{lang === 'cs' ? 'Sazba DPH (%)' : 'VAT Rate (%)'}</label>
                                    <select name="taxRate" value={formData.taxRate} onChange={handleChange}>
                                        <option value="21">21%</option>
                                        <option value="15">15%</option>
                                        <option value="12">12%</option>
                                    </select>
                                </div>
                                <div>
                                    <label>{lang === 'cs' ? 'Výše daně' : 'Tax Amount'}</label>
                                    <input name="taxAmount" type="number" step="0.01" value={formData.taxAmount} onChange={handleChange} />
                                </div>
                            </div>
                        )}
                    </div>

                    <h3>{t.client}</h3>
                    <div className="grid two">
                        <div>
                            <label>{t.clientName}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    name="clientName"
                                    value={formData.clientName}
                                    onChange={handleClientNameChange}
                                    onBlur={handleInputBlur}
                                    placeholder={lang === 'cs' ? 'Zadej název firmy nebo IČO pro vyhledávání...' : 'Enter company name or ID...'}
                                    autoComplete="off"
                                />
                                {customerSuggestions.length > 0 && (
                                    <ul className="suggestions" style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: '#1a1d2e',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        zIndex: 10,
                                        listStyle: 'none',
                                        padding: 0,
                                        margin: 0,
                                        maxHeight: '200px',
                                        overflowY: 'auto'
                                    }}>
                                        {customerSuggestions.map((c, i) => (
                                            <li
                                                key={i}
                                                onClick={() => handleSelectCustomer(c)}
                                                style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <b>{c.name}</b>
                                                    <small style={{ color: 'var(--muted)' }}>{c.source === 'ares' ? 'ARES' : 'Saved'}</small>
                                                </div>
                                                <small>{c.ico && `IČO: ${c.ico}`} {c.email && `| ${c.email}`}</small>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div>
                            <label>{t.clientAddress}</label>
                            <input name="clientAddress" value={formData.clientAddress} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid three">
                        <div>
                            <label>{t.clientIco}</label>
                            <input name="clientIco" value={formData.clientIco} onChange={handleChange} />
                        </div>
                        <div>
                            <label>{t.clientVat}</label>
                            <input name="clientVat" value={formData.clientVat} onChange={handleChange} />
                        </div>
                        <div>
                            <label>{t.clientArea}</label>
                            <input name="clientArea" value={formData.clientArea} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid three">
                        <div>
                            <label>Email</label>
                            <input name="clientEmail" type="email" value={formData.clientEmail} onChange={handleChange} />
                        </div>
                        <div>
                            <label>Email (Kopie/CC)</label>
                            <input name="clientEmailCopy" type="email" value={formData.clientEmailCopy} onChange={handleChange} />
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'Telefon' : 'Phone'}</label>
                            <input name="clientPhone" value={formData.clientPhone} onChange={handleChange} placeholder="+420..." />
                        </div>
                    </div>

                    <h3>{t.items}</h3>

                    <div className="add-item-form grid" style={{ gridTemplateColumns: '2.5fr 1fr 0.6fr 0.6fr 1fr', gap: '5px', alignItems: 'end' }}>
                        <div>
                            <label>{t.item}</label>
                            <input
                                value={itemInput.name}
                                onChange={(e) => handleItemNameChange(e.target.value)}
                                placeholder={t.itemPlaceholder}
                            />
                            {itemSuggestions.length > 0 && (
                                <ul className="suggestions" style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: '#1a1d2e', border: '1px solid var(--border)',
                                    borderRadius: '8px', zIndex: 10,
                                    listStyle: 'none', padding: 0, margin: 0
                                }}>
                                    {itemSuggestions.map((s, i) => (
                                        <li key={i} onClick={() => handleSelectSuggestion(s)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                                            {s.name} <small>({s.price} {formData.currency})</small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'Cena (bez dane)' : 'Price (ex. tax)'}</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={itemInput.price}
                                onChange={(e) => {
                                    const price = e.target.value
                                    const qty = Number(itemInput.qty) || 1
                                    const taxRate = formData.isVatPayer ? (Number(itemInput.taxRate) || 0) : 0
                                    const discountPct = Number(itemInput.discount) || 0
                                    const priceAfterDiscount = Number(price) * (1 - discountPct / 100)
                                    const sub = priceAfterDiscount * qty
                                    const total = sub * (1 + taxRate / 100)
                                    setItemInput(prev => ({ ...prev, price, total: total.toFixed(2) }))
                                }}
                            />
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'DPH %' : 'Tax %'}</label>
                            <select
                                value={itemInput.taxRate}
                                onChange={(e) => {
                                    const taxRate = e.target.value
                                    const qty = Number(itemInput.qty) || 1
                                    const price = Number(itemInput.price) || 0
                                    const discountPct = Number(itemInput.discount) || 0
                                    const priceAfterDiscount = price * (1 - discountPct / 100)
                                    const sub = priceAfterDiscount * qty
                                    const total = sub * (1 + Number(taxRate) / 100)
                                    setItemInput(prev => ({ ...prev, taxRate, total: total.toFixed(2) }))
                                }}
                            >
                                {!formData.isVatPayer ? (
                                    <>
                                        <option value="0">0%</option>
                                        <option value="21">21%</option>
                                        <option value="15">15%</option>
                                        <option value="12">12%</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="21">21%</option>
                                        <option value="15">15%</option>
                                        <option value="12">12%</option>
                                        <option value="0">0%</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'Sleva %' : 'Discount %'}</label>
                            <select
                                value={itemInput.discount}
                                onChange={(e) => {
                                    const discountPct = e.target.value
                                    const qty = Number(itemInput.qty) || 1
                                    const price = Number(itemInput.price) || 0
                                    const taxRate = Number(itemInput.taxRate) || 0
                                    const priceAfterDiscount = price * (1 - Number(discountPct) / 100)
                                    const sub = priceAfterDiscount * qty
                                    const total = sub * (1 + taxRate / 100)
                                    setItemInput(prev => ({ ...prev, discount: discountPct, total: total.toFixed(2) }))
                                }}
                            >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="10">10%</option>
                                <option value="15">15%</option>
                                <option value="20">20%</option>
                                <option value="25">25%</option>
                                <option value="50">50%</option>
                            </select>
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'Celkem (s dani)' : 'Total (incl. tax)'}</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={itemInput.total}
                                onChange={handleItemTotalChange}
                            />
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '15px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            padding: '4px',
                            height: '40px'
                        }}>
                            <button
                                type="button"
                                onClick={() => setItemInput(prev => ({ ...prev, qty: Math.max(1, prev.qty - 1) }))}
                                style={{
                                    padding: '0 11px',
                                    height: '28px',
                                    fontSize: '0.85rem',
                                    background: 'rgba(100, 150, 200, 0.3)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: '#6495ed',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(100, 150, 200, 0.5)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(100, 150, 200, 0.3)'}
                            >
                                −
                            </button>
                            <span style={{
                                padding: '0 17px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                minWidth: '42px',
                                textAlign: 'center'
                            }}>
                                {itemInput.qty}
                            </span>
                            <button
                                type="button"
                                onClick={() => setItemInput(prev => ({ ...prev, qty: prev.qty + 1 }))}
                                style={{
                                    padding: '0 11px',
                                    height: '28px',
                                    fontSize: '0.85rem',
                                    background: 'rgba(100, 150, 200, 0.3)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: '#6495ed',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(100, 150, 200, 0.5)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(100, 150, 200, 0.3)'}
                            >
                                +
                            </button>
                        </div>
                        <button type="button" onClick={handleAddItem} className="secondary">
                            {t.addItem}
                        </button>
                    </div>

                    <ItemsTable items={items} lang={lang} t={t} onDelete={handleDeleteRow} />

                    <div className="grid two">
                        <div>
                            <h3>{t.payment}</h3>
                            <label>IBAN</label>
                            <input name="iban" value={formData.iban} onChange={handleChange} onPaste={handlePasteBank} placeholder="CZ..." />
                        </div>
                        <div>
                            <h3>&nbsp;</h3>
                            <label>BIC (SWIFT)</label>
                            <input name="bic" value={formData.bic} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '0.5fr 1.5fr 1fr' }}>
                        <div>
                            <label>{lang === 'cs' ? 'Předčíslí' : 'Prefix'}</label>
                            <input name="prefix" value={formData.prefix} onChange={handleChange} placeholder="000" />
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'Číslo účtu' : 'Account Number'}</label>
                            <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} />
                        </div>
                        <div>
                            <label>{lang === 'cs' ? 'Kód banky' : 'Bank Code'}</label>
                            <input name="bankCode" value={formData.bankCode} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <label>{t.variableSymbol}</label>
                        <input name="variableSymbol" value={formData.variableSymbol} onChange={handleChange} />
                    </div>
                    <div>
                        <label>{lang === 'cs' ? 'Poznámka' : 'Note'}</label>
                        <textarea name="paymentNote" value={formData.paymentNote} onChange={handleChange} rows="2" />
                    </div>

                    <div className="summary">
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'left', marginTop: '20px' }}>
                            {t.total}: {formData.amount} {formData.currency}
                        </div>
                    </div>

                    <div className="actions" style={{ marginTop: '30px' }}>
                        <button type="submit" className="primary">
                            {t.saveInvoice}
                        </button>
                        <button type="button" onClick={(e) => { e.preventDefault(); setPreviewMode(!previewMode); }} className="secondary">
                            👁️ {lang === 'cs' ? 'Náhled' : 'Preview'}
                        </button>
                        <button type="button" onClick={handleDownloadPDF} disabled={isGenerating} className="secondary">
                            {isGenerating && !emailStatus ? t.alertGenerating : t.downloadPdf}
                        </button>
                        <button type="button" onClick={handleEmailPDF} disabled={isGenerating} className="secondary">
                            {emailStatus || t.emailPdf}
                        </button>
                        <button type="button" onClick={handleMarkPaid} className="secondary" style={{ marginLeft: 'auto' }}>
                            {t.markPaid}
                        </button>
                    </div>
                </form>
            )
            }
        </section >
    )
}
