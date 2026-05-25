const STRIPE_HOSTS = new Set(['checkout.stripe.com', 'billing.stripe.com'])

export function safeStripeRedirect(url: string | null | undefined): void {
    if (!url) return
    try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:' && STRIPE_HOSTS.has(parsed.hostname)) {
            window.location.href = url
        }
    } catch { /* invalid URL */ }
}

export function safeGoogleOAuthPopup(popup: Window, url: string): void {
    try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:' && parsed.hostname === 'accounts.google.com') {
            popup.location.href = url
        } else {
            popup.close()
        }
    } catch {
        popup.close()
    }
}
