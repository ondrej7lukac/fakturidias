import './AresSearch.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Loader2, Search, ICON_SM, STROKE } from '@/lib/icons';
import { debounce } from '../utils/storage';
import { useLiveActivity } from '@/contexts/activity';
import { searchAres, formatAresAddress } from '../utils/ares';
import { searchRpo } from '../utils/rpo';

interface AresEntity {
  obchodniJmeno?: string;
  nazev?: string;
  name?: string;
  adresa?: string;
  textovaAdresa?: string;
  address?: string;
  ico?: string;
  sidlo?: Record<string, unknown>;
  [key: string]: unknown;
}

interface AresSearchProps {
  clientName: string;
  clientIco: string;
  onClientNameChange: (v: string) => void;
  onClientIcoChange: (v: string) => void;
  onAresData: (data: Record<string, unknown>) => void;
  t: Record<string, string>;
  region?: string;
}

export default function AresSearch({
  clientName,
  clientIco,
  onClientNameChange,
  onClientIcoChange,
  onAresData,
  t,
  region = 'CZ',
}: AresSearchProps) {
  const [status, setStatus] = useState(t.aresPlaceholder);
  const [results, setResults] = useState<AresEntity[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedEntity, setSelectedEntity] = useState<{
    name: string;
    ico: string;
    address: string;
  } | null>(
    clientName && clientIco
      ? { name: clientName, ico: clientIco, address: '' }
      : null,
  );
  const initialMountRef = useRef(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const { announce } = useLiveActivity();

  // Prefer a complete-looking IČO over the name when deciding what to search.
  const icoDigits = (clientIco || '').replace(/\D/g, '');
  const icoReady =
    /^[\d\s.\-/]*$/.test(clientIco || '') &&
    icoDigits.length >= 6 &&
    icoDigits.length <= 8;
  const query = icoReady ? icoDigits : clientName;

  const searchAresLocal = async (raw: string) => {
    const trimmed = raw?.trim() || '';
    if (trimmed.length < 3) {
      setShowResults(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    setStatus(t.aresSearching);
    announce({ kind: 'scanning', label: t.aresSearching || 'Searching…' });
    try {
      const resultsCandidate =
        region === 'SK' ? await searchRpo(trimmed) : await searchAres(trimmed);
      setResults(resultsCandidate);
      setActiveIndex(-1);
      setShowResults(true);
      if (resultsCandidate.length > 0) {
        setStatus(t.aresSelect);
        announce({ kind: 'info', label: t.aresSelect || 'Results found' });
      } else {
        setStatus(t.aresNotFound);
        announce({ kind: 'info', label: t.aresNotFound || 'Not found' });
      }
    } catch (error) {
      setShowResults(false);
      setStatus(t.aresError);
      announce({ kind: 'error', label: t.aresError || 'Search error' });
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((q: string) => searchAresLocal(q), 400),
    [region],
  );

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    if (!selectedEntity) debouncedSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedEntity]);

  // Dismiss the results dropdown when clicking outside the component.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyAresEntity = (entity: AresEntity) => {
    const name = (
      entity.obchodniJmeno ||
      entity.nazev ||
      entity.name ||
      ''
    ).trim();
    const address = (
      entity.adresa ||
      entity.textovaAdresa ||
      entity.address ||
      (entity.sidlo ? formatAresAddress(entity.sidlo) : '') ||
      ''
    ).trim();
    const ico = (entity.ico || '').trim();
    onAresData({ ...entity, name, address, ico });
    setSelectedEntity({ name, ico, address });
    setShowResults(false);
    setActiveIndex(-1);
    announce({ kind: 'done', label: name ? `${name}` : 'Firma vybrána' });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < results.length) {
        e.preventDefault();
        applyAresEntity(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  return (
    <div className='ares-v3-root' ref={rootRef}>
      {!selectedEntity ? (
        <>
          <div className='settings-v3-form-grid'>
            <div className='settings-v3-field'>
              <label>{t.name}</label>
              <input
                value={clientName}
                onChange={(e) => onClientNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (results.length > 0) setShowResults(true);
                }}
                placeholder={t.aresPlaceholder || 'Vyhledat firmu...'}
                autoComplete='off'
                role='combobox'
                aria-expanded={showResults}
                aria-autocomplete='list'
              />
            </div>
            <div className='settings-v3-field'>
              <label>{t.ico}</label>
              <input
                value={clientIco}
                onChange={(e) => onClientIcoChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='IČO'
                inputMode='numeric'
                autoComplete='off'
              />
            </div>
          </div>

          {searching && (
            <div className='ares-results-status'>
              <Loader2
                size={ICON_SM}
                strokeWidth={STROKE}
                className='ares-spin'
              />
              {t.aresSearching || 'Searching…'}
            </div>
          )}

          {!searching && showResults && results.length === 0 && query.trim().length >= 3 && (
            <div className='ares-results-status ares-results-status--empty'>
              <Search size={ICON_SM} strokeWidth={STROKE} />
              {t.aresNotFound || 'No results found.'}
            </div>
          )}

          {!searching && showResults && results.length > 0 && (
            <div className='ares-results-list' role='listbox'>
              {results.map((item, index) => (
                <button
                  key={index}
                  type='button'
                  className={`ares-result-item${index === activeIndex ? ' ares-result-item--active' : ''}`}
                  role='option'
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => applyAresEntity(item)}
                >
                  <div className='ares-result-name'>
                    {item.obchodniJmeno || item.nazev || item.name}
                  </div>
                  <div className='ares-result-meta'>
                    IČO: {item.ico} • {item.adresa || item.address}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className='ares-selected'>
          <div>
            <div className='ares-selected__name'>
              <Sparkles size={ICON_SM} strokeWidth={STROKE} />
              {selectedEntity.name}
            </div>
            <div className='ares-selected__meta'>
              IČO: {selectedEntity.ico} • {selectedEntity.address}
            </div>
          </div>
          <button
            className='settings-v3-edit-link'
            type='button'
            onClick={() => {
              setSelectedEntity(null);
              setResults([]);
              setShowResults(false);
              announce({ kind: 'info', label: 'Změna firmy' });
            }}
          >
            {t.aresChange || 'Změnit firmu'}
          </button>
        </div>
      )}
    </div>
  );
}
