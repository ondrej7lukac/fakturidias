export async function searchAres(query) {
    const trimmed = query.trim()
    if (trimmed.length < 3) return []

    const isIco = /^\d+$/.test(trimmed)
    try {
        const response = await fetch('/api/ares/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                obchodniJmeno: isIco ? undefined : trimmed,
                ico: isIco ? trimmed : undefined,
                pocet: 5,
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

export async function lookupAresByIco(ico) {
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

export function formatAresAddress(address) {
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

export function parseAresItem(entity) {
    const name = entity.obchodniJmeno || entity.nazev || ''
    const address = entity.adresa || entity.textovaAdresa || formatAresAddress(entity.sidlo)
    const city = entity.sidlo?.nazevObce || entity.sidlo?.obec || ''
    const ico = entity.ico || ''
    const vat = entity.dic || ''

    return { name, address, city, ico, vat }
}
