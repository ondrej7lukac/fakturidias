import { useState, useEffect, useRef } from 'react'
import { formatInvoiceNumber, addDays, formatDate, money, getUserId } from '../utils/storage'
import AresSearch from './AresSearch'
import ItemsTable from './ItemsTable'
import InvoicePreview from './InvoicePreview'
import { generateInvoicePDF } from '../utils/pdf'
import { BANK_CODES, calculateIban, parseIban, getCzechQrPayload } from '../utils/bank'
import { QRCodeCanvas } from 'qrcode.react'

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
    setDefaultSupplier
}) {
    const qrCanvasRef = useRef(null)
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        issueDate: formatDate(new Date()),
        dueDate: formatDate(addDays(new Date(), 7)),
        taxableSupplyDate: '', // DUZP - Datum uskutečnění zdanitelného plnění
        status: 'draft',
        category: '',
        clientName: 'Test Client',
        clientEmail: 'billing@client.com',
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
        supplierName: '',
        supplierIco: '',
        supplierVat: '',
        supplierAddress: '',
        supplierRegistry: '', // Zápis v rejstříku
        supplierPhone: '',
        supplierEmail: '',
        supplierWebsite: '',
        // Tax fields for VAT payers
        isVatPayer: false,
        taxBase: '0.00', // Základ daně
        taxRate: '21', // Sazba daně (21%, 15%, 12%)
        taxAmount: '0.00' // Výše daně
    })

    const [items, setItems] = useState([])
    const [itemInput, setItemInput] = useState({ name: '', qty: 1, price: 0, taxRate: '21', discount: 0 })
    const [categoryInput, setCategoryInput] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [emailStatus, setEmailStatus] = useState('')
    const [previewMode, setPreviewMode] = useState(false) // Toggle between edit/preview
    const [savedItems, setSavedItems] = useState([]) // Items database
    const [itemSuggestions, setItemSuggestions] = useState([]) // Autocomplete suggestions
    const [saveTimer, setSaveTimer] = useState(null) // Debounce timer for auto-save

    // Load invoice data when selected
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

            setFormData({
                invoiceNumber: newDraftNumber,
                issueDate: formatDate(today),
                dueDate: formatDate(addDays(today, 7)),
                taxableSupplyDate: '',
                status: 'draft',
                category: '',
                clientName: 'Test Client',
                clientEmail: 'ondrej7lukac@gmail.com',
                clientArea: 'Prague',
                clientIco: '',
                clientVat: '',
                clientAddress: '',
                currency: 'CZK',
                amount: '0.00',
                iban: defaultSupplier?.iban || '',
                bic: '',
                paymentNote: '',
                accountNumber: '',
                bankCode: '',
                prefix: '',
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

    // Update amount when items change
    useEffect(() => {
        const total = items.reduce((sum, item) => sum + item.total, 0)
        setFormData(prev => ({ ...prev, amount: money(total) }))
    }, [items])

    // Automatically calculate IBAN and BIC in real-time as user types
    useEffect(() => {
        let updates = {}

        // Update BIC immediately when bank code is entered (even without account number)
        if (formData.bankCode) {
            const bankInfo = BANK_CODES[formData.bankCode]
            if (bankInfo?.bic && bankInfo.bic !== formData.bic) {
                updates.bic = bankInfo.bic
            }
        }

        // Calculate IBAN when we have account number and bank code
        if (formData.accountNumber && formData.bankCode) {
            const newIban = calculateIban(formData.accountNumber, formData.bankCode, formData.prefix)
            if (newIban !== formData.iban) {
                updates.iban = newIban
            }
        }

        // Apply updates if there are any
        if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }))
        }
    }, [formData.accountNumber, formData.bankCode, formData.prefix])

    // Auto-save on blur (when leaving a field) - with debouncing
    const handleBlurSave = () => {
        // Clear any existing timer
        if (saveTimer) {
            clearTimeout(saveTimer)
        }

        // Set new timer - save after 1 second of inactivity
        const timer = setTimeout(() => {
            const invoiceData = getCurrentInvoiceData()
            onSave(invoiceData)
            console.log('[Auto-Save] Invoice saved:', invoiceData.invoiceNumber)
        }, 1000)

        setSaveTimer(timer)
    }

    // Load saved items from database
    useEffect(() => {
        const loadSavedItems = async () => {
            try {
                const response = await fetch('/api/items', {
                    headers: { 'x-user-id': getUserId() }
                })
                if (response.ok) {
                    const data = await response.json()
                    setSavedItems(data.items || [])
                }
            } catch (e) {
                console.error('[Items] Failed to load items database:', e)
            }
        }
        loadSavedItems()
    }, [])


    const getCurrentInvoiceData = () => {
        return {
            id: invoice?.id || crypto.randomUUID(),
            invoiceNumber: formData.invoiceNumber.trim(),
            issueDate: formData.issueDate,
            dueDate: formData.dueDate,
            taxableSupplyDate: formData.taxableSupplyDate || formData.issueDate, // DUZP
            status: formData.status,
            category: formData.category,
            client: {
                name: formData.clientName.trim(),
                email: formData.clientEmail.trim(),
                area: formData.clientArea.trim(),
                ico: formData.clientIco.trim(),
                vat: formData.clientVat.trim(),
                address: formData.clientAddress.trim()
            },
            items,
            currency: formData.currency,
            amount: items.reduce((sum, item) => sum + item.total, 0),
            payment: {
                iban: formData.iban.trim(),
                bic: formData.bic.trim(),
                note: formData.paymentNote.trim()
            },
            supplier: {
                name: formData.supplierName.trim(),
                ico: formData.supplierIco.trim(),
                vat: formData.supplierVat.trim(),
                address: formData.supplierAddress.trim(),
                registry: formData.supplierRegistry.trim(),
                phone: formData.supplierPhone.trim(),
                email: formData.supplierEmail.trim(),
                website: formData.supplierWebsite.trim()
            },
            // VAT fields
            isVatPayer: formData.isVatPayer,
            taxBase: formData.taxBase,
            taxRate: formData.taxRate,
            taxAmount: formData.taxAmount
        }
    }

    const handlePasteBank = (e) => {
        const text = e.clipboardData.getData('text').trim()
        if (!text) return

        // 1. Try parsing IBAN
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

        // 2. Try parsing Czech format (prefix-number/code)
        const czechMatch = text.match(/^(\d{0,6}-)?(\d{1,10})\/(\d{4})$/)
        if (czechMatch) {
            e.preventDefault()
            const prefix = czechMatch[1] ? czechMatch[1].replace('-', '') : ''
            const accountNumber = czechMatch[2]
            const bankCode = czechMatch[3]

            // Set fields and let useEffect calculate IBAN
            setFormData(prev => ({
                ...prev,
                prefix,
                accountNumber,
                bankCode
            }))
        }
        // If not recognized, allow normal paste behavior
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleInputBlur = () => {
        // Save on blur for all invoices (including new drafts)
        handleBlurSave()
    }

    const handleAddItem = async () => {
        if (!itemInput.name.trim() || itemInput.qty <= 0) return

        const basePrice = Number(itemInput.price)
        const qty = Number(itemInput.qty)
        const discount = Number(itemInput.discount) || 0
        const taxRate = Number(itemInput.taxRate) || 0

        // Calculate price after discount
        const priceAfterDiscount = basePrice - discount
        // Calculate total before tax
        const subtotal = qty * priceAfterDiscount
        // Calculate tax amount
        const taxAmount = subtotal * (taxRate / 100)
        // Calculate final total
        const total = subtotal + taxAmount

        const newItem = {
            name: itemInput.name.trim(),
            qty,
            price: basePrice,
            discount,
            taxRate,
            taxAmount,
            subtotal,
            total
        }

        setItems([...items, newItem])

        // Save item to database
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
            // Reload items database
            const response = await fetch('/api/items', {
                headers: { 'x-user-id': getUserId() }
            })
            if (response.ok) {
                const data = await response.json()
                setSavedItems(data.items || [])
            }
        } catch (e) {
            console.error('[Items] Failed to save item:', e)
        }

        setItemInput({ name: '', qty: 1, price: 0, taxRate: '21', discount: 0 })
        setItemSuggestions([])
    }

    const handleClearItems = () => setItems([])

    const handleItemNameChange = (value) => {
        setItemInput(prev => ({ ...prev, name: value }))

        // Show suggestions if typing
        if (value.trim().length > 0) {
            const matches = savedItems.filter(item =>
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
        const newTotal = Number(e.target.value)
        // Calculate Unit Price from Total:
        // Total = (Price - Discount) * Qty * (1 + TaxMultiplier)
        // Price - Discount = Total / (Qty * TaxMultiplier)
        // Price = (Total / (Qty * TaxMultiplier)) + Discount

        const qty = itemInput.qty || 1
        const taxRate = Number(itemInput.taxRate) || 0
        const discount = Number(itemInput.discount) || 0

        const taxMultiplier = 1 + (taxRate / 100)

        if (qty > 0 && taxMultiplier > 0) {
            const price = (newTotal / (qty * taxMultiplier)) + discount
            setItemInput(prev => ({
                ...prev,
                price: Number(price.toFixed(2))
            }))
        }
    }

    // Helper to show current total in the input
    const currentItemTotal = () => {
        const qty = itemInput.qty || 0
        const price = itemInput.price || 0
        const discount = itemInput.discount || 0
        const taxRate = Number(itemInput.taxRate) || 0

        const sub = (price - discount) * qty
        const total = sub * (1 + taxRate / 100)
        return total > 0 ? total.toFixed(2) : ''
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

        // Save as default supplier
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

    const getQrDataUrl = () => {
        if (!qrCanvasRef.current) return null
        const canvas = qrCanvasRef.current.querySelector('canvas')
        return canvas ? canvas.toDataURL('image/png') : null
    }

    const handleDownloadPDF = async () => {
        const currentData = getCurrentInvoiceData()
        setIsGenerating(true)
        try {
            const qrDataUrl = getQrDataUrl()
            const pdf = await generateInvoicePDF(currentData, t, qrDataUrl)
            pdf.save(`${currentData.invoiceNumber}.pdf`)
        } catch (error) {
            console.error('PDF Error:', error)
            alert('Failed to generate PDF')
        }
        setIsGenerating(false)
    }

    const handleEmailPDF = async () => {
        const currentData = getCurrentInvoiceData()
        if (!currentData.client.email) return alert(t.alertEmailMissing)

        setIsGenerating(true)
        setEmailStatus(t.alertGenerating)
        try {
            // Check for local tokens
            const tokensStr = localStorage.getItem('google_tokens')
            let tokens = null
            if (tokensStr) {
                try { tokens = JSON.parse(tokensStr) } catch (e) { }
            }

            // Get sender email from config
            const smtpConfig = localStorage.getItem('smtpConfig')
            let fromEmail = ''
            if (smtpConfig) {
                try { fromEmail = JSON.parse(smtpConfig).fromEmail } catch (e) { }
            }

            if (!tokens) {
                setIsGenerating(false)
                setEmailStatus('')
                return alert(
                    lang === 'cs'
                        ? 'Email nelze odeslat. Připojte prosím váš Google účet v Nastavení.'
                        : 'Cannot send email. Please connect your Google account in Settings.'
                )
            }

            const qrDataUrl = getQrDataUrl()
            const pdf = await generateInvoicePDF(currentData, t, qrDataUrl)
            const pdfBase64 = pdf.output('datauristring')
            setEmailStatus(t.alertSending)

            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: currentData.client.email,
                    subject: `${t.invoice} ${currentData.invoiceNumber}`,
                    html: `<p>Hello,</p><p>Please find attached the invoice ${currentData.invoiceNumber}.</p><p>Thank you!</p>`,
                    attachments: [
                        {
                            filename: `${currentData.invoiceNumber}.pdf`,
                            path: pdfBase64
                        }
                    ],
                    auth: {
                        user: fromEmail,
                        tokens: tokens
                    }
                })
            })
            if (response.ok) {
                const result = await response.json()
                // Auto-mark as sent after successful email
                setFormData(prev => ({ ...prev, status: 'sent' }))
                alert(t.alertEmailSuccess)
            } else {
                const result = await response.json()
                alert(`${t.alertEmailFailed} ${result.message || result.error}`)
            }
        } catch (error) {
            console.error('Email Error:', error)
            alert(t.alertError)
        }
        setIsGenerating(false)
        setEmailStatus('')
    }

    const togglePreview = () => {
        setPreviewMode(!previewMode)
    }

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

            {previewMode ? (
                <>
                    <InvoicePreview invoice={getCurrentInvoiceData()} t={t} lang={lang} />

                    {/* Action buttons in preview mode */}
                    <div className="actions" style={{ marginTop: '30px' }}>
                        <button type="button" onClick={togglePreview} className="secondary">
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
                            <label>{lang === 'cs' ? 'DUZP (Datum uskutečnění zdanitelného plnění)' : 'Date of Taxable Supply (DUZP)'}</label>
                            <input name="taxableSupplyDate" type="date" value={formData.taxableSupplyDate || formData.issueDate} onChange={handleChange} />
                            <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                {lang === 'cs' ? 'Pokud je stejné jako datum vystavení, nemusíte vyplňovat' : 'Leave empty if same as issue date'}
                            </small>
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
                        <label>{lang === 'cs' ? 'Zápis v rejstříku (pro s.r.o.)' : 'Registry Entry (for Ltd.)'}</label>
                        <input name="supplierRegistry" value={formData.supplierRegistry} onChange={handleChange} placeholder={lang === 'cs' ? 'OR vedený u KS v Praze, oddíl C, vložka 12345' : 'Commercial Register...'} />
                    </div>

                    <div className="grid two">
                        <div>
                            <label>{lang === 'cs' ? 'Telefon' : 'Phone'}</label>
                            <input name="supplierPhone" value={formData.supplierPhone} onChange={handleChange} placeholder="+420 123 456 789" />
                        </div>
                        <div>
                            <label>Email</label>
                            <input name="supplierEmail" type="email" value={formData.supplierEmail} onChange={handleChange} placeholder="info@firma.cz" />
                        </div>
                    </div>

                    <div>
                        <label>Web</label>
                        <input name="supplierWebsite" value={formData.supplierWebsite} onChange={handleChange} placeholder="www.firma.cz" />
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
                                    <input
                                        name="taxBase"
                                        type="number"
                                        step="0.01"
                                        value={formData.taxBase}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                    />
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
                                    <input
                                        name="taxAmount"
                                        type="number"
                                        step="0.01"
                                        value={formData.taxAmount}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <h3>{t.client}</h3>
                    <AresSearch
                        clientName={formData.clientName}
                        clientIco={formData.clientIco}
                        onClientNameChange={(v) => setFormData(p => ({ ...p, clientName: v }))}
                        onClientIcoChange={(v) => setFormData(p => ({ ...p, clientIco: v }))}
                        onAresData={handleAresData}
                        t={t}
                    />

                    <div className="grid three">
                        <div>
                            <label>{t.email}</label>
                            <input name="clientEmail" type="email" value={formData.clientEmail} onChange={handleChange} />
                        </div>
                        <div>
                            <label>{t.area}</label>
                            <input name="clientArea" value={formData.clientArea} onChange={handleChange} />
                        </div>
                        <div>
                            <label>{t.vat}</label>
                            <input name="clientVat" value={formData.clientVat} onChange={handleChange} />
                        </div>
                    </div>

                    <div>
                        <label>{t.address}</label>
                        <textarea name="clientAddress" value={formData.clientAddress} onChange={handleChange} />
                    </div>

                    <h3>{t.items}</h3>
                    <div style={{ position: 'relative' }}>
                        <div className="grid" style={{ gridTemplateColumns: '2fr 0.7fr 1fr 0.8fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
                            <div style={{ position: 'relative' }}>
                                <label>{t.item}</label>
                                <input
                                    value={itemInput.name}
                                    onChange={(e) => handleItemNameChange(e.target.value)}
                                    placeholder={lang === 'cs' ? 'Začněte psát...' : 'Start typing...'}
                                />
                                {itemSuggestions.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'var(--card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '4px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        zIndex: 1000,
                                        maxHeight: '200px',
                                        overflowY: 'auto'
                                    }}>
                                        {itemSuggestions.map((item, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleSelectSuggestion(item)}
                                                style={{
                                                    padding: '10px',
                                                    cursor: 'pointer',
                                                    borderBottom: idx < itemSuggestions.length - 1 ? '1px solid var(--border)' : 'none',
                                                    display: 'flex',
                                                    justifyContent: 'space-between'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = 'var(--bg)'}
                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                                <span>{item.name}</span>
                                                <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                                                    {item.price} CZK | {item.taxRate}% DPH
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label>{t.qty}</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={itemInput.qty}
                                    onChange={(e) => setItemInput(p => ({ ...p, qty: Number(e.target.value) }))}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                            <div>
                                <label>{t.unitPrice}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={itemInput.price}
                                    onChange={(e) => setItemInput(p => ({ ...p, price: Number(e.target.value) }))}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                            <div>
                                <label>{lang === 'cs' ? 'DPH %' : 'Tax %'}</label>
                                <select value={itemInput.taxRate} onChange={(e) => setItemInput(p => ({ ...p, taxRate: e.target.value }))}>
                                    <option value="0">0%</option>
                                    <option value="12">12%</option>
                                    <option value="15">15%</option>
                                    <option value="21">21%</option>
                                </select>
                            </div>
                            <div>
                                <label>{lang === 'cs' ? 'Sleva' : 'Discount'}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={itemInput.discount}
                                    onChange={(e) => setItemInput(p => ({ ...p, discount: Number(e.target.value) }))}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label>{t.total}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={currentItemTotal()}
                                    onChange={handleItemTotalChange}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="0.00"
                                    style={{ fontWeight: 'bold' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="actions">
                        <button type="button" onClick={handleAddItem} className="secondary">{t.addItem}</button>
                        <button type="button" onClick={handleClearItems} className="secondary">{t.clearItems}</button>
                    </div>

                    <ItemsTable items={items} lang={lang} t={t} onDelete={handleDeleteRow} />

                    <h3>{t.payment}</h3>
                    <div className="grid two">
                        <div>
                            <label>{t.currency}</label>
                            <select name="currency" value={formData.currency} onChange={handleChange}>
                                <option value="CZK">CZK</option>
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <div>
                            <label>{t.amount}</label>
                            <input name="amount" type="number" value={formData.amount} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="grid three">
                        <div>
                            <label>{t.prefix}</label>
                            <input name="prefix" value={formData.prefix} onChange={handleChange} placeholder="000000" />
                        </div>
                        <div>
                            <label>{t.bankAccount}</label>
                            <input name="accountNumber" value={formData.accountNumber} onChange={handleChange} onPaste={handlePasteBank} placeholder="1234567890" />
                        </div>
                        <div>
                            <label>{t.bankCode}</label>
                            <input name="bankCode" value={formData.bankCode} onChange={handleChange} onPaste={handlePasteBank} list="bankCodesList" placeholder="0100" />
                            <datalist id="bankCodesList">
                                {Object.entries(BANK_CODES).map(([code, info]) => (
                                    <option key={code} value={code}>{info.name}</option>
                                ))}
                            </datalist>
                        </div>
                    </div>

                    <div className="grid two">
                        <div>
                            <label>{t.iban}</label>
                            <input name="iban" value={formData.iban} onChange={handleChange} onPaste={handlePasteBank} />
                        </div>
                        <div>
                            <label>{t.bic}</label>
                            <input name="bic" value={formData.bic} onChange={handleChange} />
                        </div>
                    </div>

                    <div>
                        <label>{t.paymentNote}</label>
                        <input name="paymentNote" value={formData.paymentNote} onChange={handleChange} />
                    </div>

                    <div className="actions" style={{ marginTop: '20px' }}>
                        <button type="submit" className="success">{t.saveInvoice}</button>
                        <button type="button" onClick={togglePreview} className="secondary">
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

                    <div style={{ position: 'absolute', left: '-9999px', top: '0' }} ref={qrCanvasRef}>
                        {invoice && (
                            <QRCodeCanvas
                                value={getCzechQrPayload(invoice)}
                                size={256}
                                level="M"
                                includeMargin={false}
                            />
                        )}
                    </div>
                </form>
            )}
        </section>
    )
}
