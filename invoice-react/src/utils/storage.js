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
export async function loadData() {
    try {
        const response = await fetch('/api/invoices', {
            headers: { 'x-user-id': getUserId() }
        })
        if (!response.ok) {
            if (response.status === 401) {
                console.warn('Not authenticated - returning empty data')
                return {}
            }
            throw new Error('Failed to load invoices')
        }
        const data = await response.json()
        return { invoices: data.invoices || [] }
    } catch (error) {
        console.error('Failed to load data:', error)
        return { invoices: [] }
    }
}

export async function saveInvoice(invoice) {
    try {
        const response = await fetch('/api/invoices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': getUserId()
            },
            body: JSON.stringify({ invoice })
        })
        if (!response.ok) {
            throw new Error('Failed to save invoice')
        }
        const data = await response.json()
        return data.invoice
    } catch (error) {
        console.error('Failed to save invoice:', error)
        throw error
    }
}

export async function deleteInvoice(invoiceId) {
    try {
        const response = await fetch(`/api/invoices/${invoiceId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': getUserId() }
        })
        if (!response.ok) {
            throw new Error('Failed to delete invoice')
        }
        return true
    } catch (error) {
        console.error('Failed to delete invoice:', error)
        throw error
    }
}

export function formatInvoiceNumber(counter) {
    const year = new Date().getFullYear()
    const suffix = String(counter).padStart(3, '0')
    return `INV-${year}-${suffix}`
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
