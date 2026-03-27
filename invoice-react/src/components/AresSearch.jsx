import { useState, useEffect, useCallback, useRef } from 'react'
import { debounce } from '../utils/storage'
import { searchAres, lookupAresByIco, formatAresAddress, parseAresItem } from '../utils/ares'

export default function AresSearch({
    clientName,
    clientIco,
    onClientNameChange,
    onClientIcoChange,
    onAresData,
    t
}) {
    const [selectedEntity, setSelectedEntity] = useState(
        (clientName && clientIco) ? { name: clientName, ico: clientIco, address: '' } : null
    )
    const initialMountRef = useRef(true)

    const searchAresLocal = async (query) => {
        const trimmed = query?.trim() || ''
        if (trimmed.length < 3) {
            setShowResults(false)
            setStatus(t.aresPlaceholder)
            if (trimmed.length === 0 && !selectedEntity) setSelectedEntity(null)
            return
        }

        setStatus(t.aresSearching)

        try {
            const resultsCandidate = await searchAres(trimmed)
            setResults(resultsCandidate)

            if (resultsCandidate.length > 0) {
                setShowResults(true)
                setStatus(t.aresSelect)
            } else {
                setShowResults(false)
                setStatus(t.aresNotFound)
            }
        } catch (error) {
            setShowResults(false)
            setStatus(t.aresError)
        }
    }

    const debouncedSearch = useCallback(
        debounce((query) => searchAresLocal(query), 400),
        []
    )

    useEffect(() => {
        if (initialMountRef.current) {
            initialMountRef.current = false
            return
        }
        if (!selectedEntity) {
            debouncedSearch(clientName)
        }
    }, [clientName, debouncedSearch, selectedEntity])

    useEffect(() => {
        const normalized = clientIco.trim()
        if (/^\d{8}$/.test(normalized)) {
            lookupAresByIco(normalized)
        }
    }, [clientIco])

    const lookupByIco = async (ico) => {
        const normalized = ico.trim()
        if (!/^\d{6,10}$/.test(normalized)) return

        setStatus(t.aresSearching)
        try {
            const entity = await lookupAresByIco(normalized)
            if (entity && (entity.obchodniJmeno || entity.nazev || entity.ico)) {
                applyAresEntity(entity)
            } else {
                setStatus(t.aresNotFound)
            }
        } catch (error) {
            setStatus(t.aresError)
        }
    }

    const formatAresAddress = (address) => {
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

    const applyAresEntity = (entity) => {
        const name = entity.obchodniJmeno || entity.nazev || ''
        // Prioritize full address string if available, otherwise parse structured address
        const address = entity.adresa || entity.textovaAdresa || formatAresAddress(entity.sidlo)
        const city = entity.sidlo?.nazevObce || entity.sidlo?.obec || ''
        const ico = entity.ico || ''
        const vat = entity.dic || ''
        const legalFormCode = entity.pravniForma || entity.pravniFormaRos
        const isVatPayer = !!vat // Simple heuristic

        // Extract File Number (Spisová značka) from Public Register (VR)
        let fileNumber = ''
        if (entity.dalsiUdaje) {
            const vrRecord = entity.dalsiUdaje.find(d => d.datovyZdroj === 'vr')
            if (vrRecord && vrRecord.spisovaZnacka) {
                fileNumber = vrRecord.spisovaZnacka
            }
        }

        onAresData({ name, address, city, ico, vat, legalFormCode, isVatPayer, fileNumber })
        setStatus(t.aresFilled)
        setSelectedEntity({ name, ico, address })
        setShowResults(false)
    }

    return (
        <div className="ares-search-container">
            {!selectedEntity ? (
                <>
                    <div className="grid two">
                        <div>
                            <label htmlFor="clientName">{t.name}</label>
                            <input
                                id="clientName"
                                value={clientName}
                                onChange={(e) => onClientNameChange(e.target.value)}
                                placeholder={t.aresPlaceholder}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="clientIco">{t.ico}</label>
                            <div className="inline-actions">
                                <input
                                    id="clientIco"
                                    value={clientIco}
                                    onChange={(e) => onClientIcoChange(e.target.value)}
                                    placeholder="12345678"
                                    autoComplete="off"
                                />
                                <button type="button" onClick={() => lookupByIco(clientIco)} className="secondary">
                                    ARES
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="status-note">{status}</div>

                    {showResults && (
                        <div className="suggestions">
                            {results.map((item, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className="suggestion-item"
                                    onClick={() => applyAresEntity(item)}
                                >
                                    <strong>{item.obchodniJmeno || item.nazev || 'Unknown'}</strong>
                                    <br />
                                    <span className="invoice-meta">
                                        IČO {item.ico || 'n/a'} • {item.adresa || formatAresAddress(item.sidlo) || 'No address'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="selected-company-card">
                    <div className="company-details">
                        <div className="check-mark">✓</div>
                        <div>
                            <strong>{selectedEntity.name}</strong>
                            <div className="invoice-meta">
                                <span>IČO: {selectedEntity.ico}</span>
                                <span> • </span>
                                <span>{selectedEntity.address}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="secondary small"
                        onClick={() => {
                            setSelectedEntity(null)
                            setStatus(t.aresPlaceholder)
                        }}
                    >
                        {t.change || 'Změnit'}
                    </button>
                </div>
            )}
        </div>
    )
}

