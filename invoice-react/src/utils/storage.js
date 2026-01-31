// Helper to get current user ID
export function getUserId() {
    try {
        const config = localStorage.getItem('smtpConfig');
        if (config) {
            const { fromEmail } = JSON.parse(config);
            return fromEmail || 'default';
        }
    } catch (e) { }
    return 'default';
}

// Server-based storage functions
// Helper to get current user ID (Legacy/SMTP fallback)
export function getUserId() {
    try {
        const config = localStorage.getItem('smtpConfig');
        if (config) {
            const { fromEmail } = JSON.parse(config);
            return fromEmail || 'default';
        }
    } catch (e) { }
    return 'default';
}

// --- API Storage (Authenticated) ---

export async function loadApiData() {
    try {
        const response = await fetch('/api/invoices')
        if (!response.ok) {
            if (response.status === 401) return null; // Signal not authenticated
            throw new Error('Failed to load invoices')
        }
        const data = await response.json()
        return { invoices: data.invoices || [] }
    } catch (error) {
        console.error('Failed to load API data:', error)
        return null
    }
}

export async function saveApiInvoice(invoice) {
    const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invoice })
    })
    if (!response.ok) throw new Error('Failed to save invoice to API')
    const data = await response.json()
    return data.invoice
}

export async function deleteApiInvoice(invoiceId) {
    const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete invoice from API')
    return true
}

// --- Local Storage (Guest Mode) ---

const LOCAL_STORAGE_KEY = 'invoices_guest';

export function loadLocalData() {
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY)
        return { invoices: data ? JSON.parse(data) : [] }
    } catch (e) {
        console.error("Failed to load local data", e)
        return { invoices: [] }
    }
}

export function saveLocalInvoice(invoice) {
    // Guest Validations are handled in App.jsx (e.g. max count)
    const { invoices } = loadLocalData();
    const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);

    if (existingIndex >= 0) {
        invoices[existingIndex] = invoice;
    } else {
        invoices.unshift(invoice);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(invoices));
    return invoice;
}

export function deleteLocalInvoice(invoiceId) {
    const { invoices } = loadLocalData();
    const newInvoices = invoices.filter(inv => inv.id !== invoiceId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newInvoices));
    return true;
}

// Legacy export compatibility (defaults to API but warns, or we can remove if we refactor App.jsx completely)
export async function loadData() { return loadApiData(); }
export async function saveInvoice(inv) { return saveApiInvoice(inv); }
export async function deleteInvoice(id) { return deleteApiInvoice(id); }

export function formatInvoiceNumber(counter) {
    const year = new Date().getFullYear()
    // 2024001 style - better for Variable Symbol
    const suffix = String(counter).padStart(3, '0')
    return `${year}${suffix}`
}

export function getNextInvoiceCounter(invoices) {
    const year = new Date().getFullYear()
    const prefix = String(year)

    // Find all invoices that start with current year
    const currentYearInvoices = invoices.filter(inv =>
        inv.invoiceNumber &&
        String(inv.invoiceNumber).startsWith(prefix) &&
        inv.invoiceNumber.length >= 5 // at least year + 1 digit
    )

    if (currentYearInvoices.length === 0) return 1

    // Extract the counter part and find max
    const counters = currentYearInvoices.map(inv => {
        // Remove year prefix
        const suffix = String(inv.invoiceNumber).slice(4)
        // Clean non-numeric characters just in case
        const cleanSuffix = suffix.replace(/\D/g, '')
        return parseInt(cleanSuffix, 10)
    }).filter(n => !isNaN(n))

    if (counters.length === 0) return 1

    return Math.max(...counters) + 1
}

export function addDays(date, days) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

export function formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().split('T')[0]
}

export function money(value) {
    return Number(value || 0).toFixed(2)
}

export function debounce(callback, wait = 400) {
    let timeoutId
    return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => callback(...args), wait)
    }
}
