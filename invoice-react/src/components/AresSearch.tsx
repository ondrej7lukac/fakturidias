import './AresSearch.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles } from '@/lib/icons'
import { debounce } from '../utils/storage'
import { searchAres, lookupAresByIco, formatAresAddress } from '../utils/ares'
import { searchRpo, lookupRpoByIco } from '../utils/rpo'

interface AresEntity {
    obchodniJmeno?: string
    nazev?: string
    name?: string
    adresa?: string
    textovaAdresa?: string
    address?: string
    ico?: string
    sidlo?: Record<string, unknown>
    [key: string]: unknown
}

interface AresSearchProps {
    clientName: string
    clientIco: string
    onClientNameChange: (v: string) => void
    onClientIcoChange: (v: string) => void
    onAresData: (data: Record<string, unknown>) => void
    t: Record<string, string>
    region?: string
}

export default function AresSearch({
    clientName,
    clientIco,
    onClientNameChange,
    onClientIcoChange,
    onAresData,
    t,
    region = 'CZ'
}: AresSearchProps) {
    const [status, setStatus] = useState(t.aresPlaceholder)
    const [results, setResults] = useState<AresEntity[]>([])
    const [showResults, setShowResults] = useState(false)
    const [selectedEntity, setSelectedEntity] = useState<{ name: string; ico: string; address: string } | null>(
        (clientName && clientIco) ? { name: clientName, ico: clientIco, address: '' } : null
    )
    const initialMountRef = useRef(true)

    const searchAresLocal = async (query: string) => {
        const trimmed = query?.trim() || ''
        if (trimmed.length < 3) {
            setShowResults(false)
            if (trimmed.length === 0 && !selectedEntity) setSelectedEntity(null)
            return
        }
        setStatus(t.aresSearching)
        try {
            const resultsCandidate = region === 'SK' ? await searchRpo(trimmed) : await searchAres(trimmed)
            setResults(resultsCandidate)
            if (resultsCandidate.length > 0) {
                setShowResults(true)
                setStatus(t.aresSelect)
            } else {
                setShowResults(false)
                setStatus(t.aresNotFound)
            }
        } catch (error) { setStatus(t.aresError) }
    }

    const debouncedSearch = useCallback(
        debounce((query) => searchAresLocal(query), 400),
        []
    )

    useEffect(() => {
        if (!initialMountRef.current && !selectedEntity) debouncedSearch(clientName)
        initialMountRef.current = false
    }, [clientName, selectedEntity])

    const applyAresEntity = (entity: AresEntity) => {
        const name = entity.obchodniJmeno || entity.nazev || entity.name || ''
        const address = entity.adresa || entity.textovaAdresa || entity.address || (entity.sidlo ? formatAresAddress(entity.sidlo) : '')
        const ico = entity.ico || ''
        onAresData({ ...entity, name, address, ico })
        setSelectedEntity({ name, ico, address })
        setShowResults(false)
    }

    return (
        <div className="ares-v3-root">
            {!selectedEntity ? (
                <>
                    <div className="settings-v3-form-grid">
                        <div className="settings-v3-field">
                            <label>{t.name}</label>
                            <input
                                value={clientName}
                                onChange={(e) => onClientNameChange(e.target.value)}
                                placeholder="Vyhledat firmu..."
                                autoComplete="off"
                            />
                        </div>
                        <div className="settings-v3-field">
                            <label>{t.ico}</label>
                            <input
                                value={clientIco}
                                onChange={(e) => onClientIcoChange(e.target.value)}
                                placeholder="IČO"
                                autoComplete="off"
                            />
                        </div>
                    </div>
                    {showResults && (
                        <div style={{ marginTop: '1rem', display: 'grid', gap: '8px' }}>
                            {results.map((item, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', cursor: 'pointer' }}
                                    onClick={() => applyAresEntity(item)}
                                >
                                    <div style={{ fontWeight: 600 }}>{item.obchodniJmeno || item.nazev || item.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>IČO: {item.ico} • {item.adresa || item.address}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={16} strokeWidth={2} />{selectedEntity.name}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>IČO: {selectedEntity.ico} • {selectedEntity.address}</div>
                    </div>
                    <button 
                        className="settings-v3-edit-link" 
                        onClick={() => { setSelectedEntity(null); setResults([]); setShowResults(false); }}
                    >
                        Změnit firmu
                    </button>
                </div>
            )}
        </div>
    )
}
