interface AresAddress {
    textovaAdresa?: string
    ulice?: string
    cisloDomovni?: string | number
    cisloOrientacni?: string | number
    nazevObce?: string
    obec?: string
    psc?: string | number
}

interface AresEntity {
    obchodniJmeno?: string
    nazev?: string
    adresa?: string
    textovaAdresa?: string
    sidlo?: AresAddress
    ico?: string
    dic?: string
}

export async function searchAres(query: string) {
    // Collapse internal whitespace and trim — tolerate sloppy paste/typing.
    const trimmed = (query || '').trim().replace(/\s+/g, ' ')
    if (trimmed.length < 3) return []

    // Treat "mostly numeric" input (digits possibly separated by spaces, dots,
    // dashes or slashes) as an IČO. A Czech IČO is 8 digits; users often paste it
    // with spaces ("123 456 78") or drop a leading zero, so normalize + zero-pad.
    const isMostlyNumeric = /^[\d\s.\-/]+$/.test(trimmed)
    const digitsOnly = trimmed.replace(/\D/g, '')
    const isIco = isMostlyNumeric && digitsOnly.length >= 6 && digitsOnly.length <= 8
    const ico = isIco ? digitsOnly.padStart(8, '0') : undefined

    try {
        const response = await fetch('/api/ares/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                obchodniJmeno: isIco ? undefined : trimmed,
                ico,
                pocet: 8,
                strana: 1
            })
        })
        if (!response.ok) return []

        const data = await response.json()
        const results =
            data.ekonomickeSubjekty ||
            data.data?.ekonomickeSubjekty ||
            data.data?.ekonomickeSubjekty?.ekonomickeSubjekty ||
            []

        return Array.isArray(results) ? results : (results.ekonomickeSubjekty || [])
    } catch (e) {
        console.error("ARES Search failed", e)
        return []
    }
}

export async function lookupAresByIco(ico: string) {
    // ... existing logic adaptation if needed
    // For now searchAres handles ICO too via POST if only numbers
    // But GET /api/ares/ico is more specific for details
    try {
        const response = await fetch(`/api/ares/ico?ico=${encodeURIComponent(ico)}`)
        if (!response.ok) return null
        const data = await response.json()
        return data.ekonomickySubjekt || data
    } catch (e) { return null }
}

export function formatAresAddress(address: AresAddress | null | undefined) {
    if (!address) return ''
    if (address.textovaAdresa) return address.textovaAdresa
    const parts = [
        address.ulice,
        address.cisloDomovni,
        address.cisloOrientacni ? `/${address.cisloOrientacni}` : ''
    ].filter(Boolean).join(' ')
    const city = address.nazevObce || address.obec || ''
    const zip = address.psc || ''
    return [parts.trim(), `${city} ${zip}`.trim()].filter(Boolean).join(', ')
}

export function parseAresItem(entity: AresEntity) {
    const name = entity.obchodniJmeno || entity.nazev || ''
    const address = entity.adresa || entity.textovaAdresa || formatAresAddress(entity.sidlo)
    const city = entity.sidlo?.nazevObce || entity.sidlo?.obec || ''
    const ico = entity.ico || ''
    const vat = entity.dic || ''

    return { name, address, city, ico, vat }
}
