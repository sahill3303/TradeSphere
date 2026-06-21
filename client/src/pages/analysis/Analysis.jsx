import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';

// ─── Small reusable components ────────────────────────────────────────────────

function RatioCard({ label, value }) {
    return (
        <div style={{
            background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem',
        }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-text)' }}>{value || '—'}</div>
        </div>
    );
}

function SectionCard({ title, children }) {
    return (
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
            <h3 style={{ margin: '0 0 var(--space-md) 0', fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>{title}</h3>
            {children}
        </div>
    );
}

const HORIZONS = [
    { value: '', label: 'General Analysis' },
];

// ─── Stock Analysis Tab ───────────────────────────────────────────────────────
function StockAnalysis() {
    const [symbol, setSymbol] = useState('');
    const [horizon, setHorizon] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Autocomplete state
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeout = useRef(null);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (
                inputRef.current && !inputRef.current.contains(e.target) &&
                suggestionsRef.current && !suggestionsRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleSymbolInput(e) {
        const value = e.target.value;
        setSymbol(value.toUpperCase());

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (value.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            try {
                setIsSearching(true);
                const { data: res } = await api.get(`/watchlist/search?q=${encodeURIComponent(value)}`);
                if (res.success && res.data.length > 0) {
                    setSuggestions(res.data);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch (err) {
                console.error('Stock search failed', err);
            } finally {
                setIsSearching(false);
            }
        }, 400);
    }

    function handleSelectSuggestion(s) {
        const cleanSymbol = s.symbol ? s.symbol.replace(/^[A-Z]+:/, '') : s.symbol;
        setSymbol(cleanSymbol.toUpperCase());
        setSuggestions([]);
        setShowSuggestions(false);
        // Auto-trigger search after selecting
        triggerSearch(cleanSymbol.toUpperCase());
    }

    const triggerSearch = async (sym) => {
        const s = (sym || symbol).trim().toUpperCase();
        if (!s) return;
        setLoading(true); setError(''); setData(null);
        try {
            const params = horizon ? `?horizon=${encodeURIComponent(horizon)}` : '';
            const res = await api.get(`/screener/${s}${params}`);
            if (res.data.success) setData(res.data.data);
            else setError(res.data.message || 'Failed to fetch data.');
        } catch (err) {
            setError(err.response?.data?.message || 'Stock not found. Try the exact NSE/BSE symbol (e.g. BIRLASOFT or INFY).');
        } finally { setLoading(false); }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        triggerSearch();
    };

    const ai = data?.aiSummary;

    return (
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
            {/* Search + Horizon */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', alignItems: 'flex-end' }} className="analysis-form-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0, position: 'relative' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock Symbol</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={symbol}
                            onChange={handleSymbolInput}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            placeholder="e.g. RELIANCE, HDFCBANK, BIRLASOFT"
                            autoComplete="off"
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                padding: '0.68rem 1rem', background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text)', fontSize: '0.92rem', outline: 'none',
                                paddingRight: isSearching ? '2.5rem' : '1rem',
                            }}
                        />
                        {isSearching && (
                            <div className="stock-search-spinner" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                        )}
                    </div>
                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div
                            ref={suggestionsRef}
                            className="stock-suggestions-dropdown"
                            style={{ top: 'calc(100% + 4px)', zIndex: 100 }}
                        >
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="stock-suggestion-item"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                                >
                                    <span className="stock-suggestion-name">{s.name}</span>
                                    <span className="stock-suggestion-symbol">{s.symbol}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>



                <button
                    onClick={handleSearch} type="button" disabled={loading}
                    style={{
                        padding: '0.68rem 1.4rem',
                        background: loading ? 'var(--color-border)' : 'var(--color-gold)',
                        color: '#0B0B0D', fontWeight: 700, fontSize: '0.88rem',
                        border: 'none', borderRadius: 'var(--radius-md)',
                        cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                        whiteSpace: 'nowrap', alignSelf: 'flex-end'
                    }}
                >
                    {loading ? 'Analysing…' : '🔍 Analyse'}
                </button>
            </div>
            <style jsx="true">{`
                @media (max-width: 680px) {
                    .analysis-form-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            {horizon && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-gold-soft)', border: '1px solid var(--color-gold)', borderRadius: 'var(--radius-full)', padding: '0.3rem 0.8rem', fontSize: '0.78rem', color: 'var(--color-gold)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
                    📌 Viewing through lens of: {horizon}
                </div>
            )}

            {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '0.9rem 1.2rem', color: 'var(--color-danger)', marginBottom: 'var(--space-lg)', fontSize: '0.88rem' }}>
                    ⚠ {error}
                </div>
            )}

            {loading && (
                <div className="card" style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>⏳</div>
                    <p style={{ color: 'var(--color-text-dim)', margin: 0, lineHeight: 1.8 }}>
                        Resolving stock symbol · Fetching live data from Screener.in<br />
                        <span style={{ opacity: 0.7, fontSize: '0.82rem' }}>Generating AI analysis… (10–20 sec)</span>
                    </p>
                </div>
            )}

            {data && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                    {/* Header */}
                    <div className="card" style={{ padding: 'var(--space-lg)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--color-gold), transparent)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.3rem', color: 'var(--color-text)' }}>
                                    {data.name || data.resolvedName}
                                </h2>
                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
                                    {data.symbol} · Source:{' '}
                                    <a href={data.screenerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold)' }}>Screener.in ↗</a>
                                </span>
                            </div>
                            {horizon && (
                                <span style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                                    Horizon: <strong style={{ color: 'var(--color-gold)' }}>{horizon}</strong>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* AI Factual Summary */}
                    {ai && (
                        <SectionCard title="🤖 TradeSphere AI — Factual Summary">
                            {/* Summary */}
                            <p style={{ margin: '0 0 var(--space-md) 0', color: 'var(--color-text)', lineHeight: 1.75, fontSize: '0.9rem', background: 'var(--color-surface-alt)', padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-gold)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                {ai.summary}
                            </p>

                            {/* Horizon context (shown only if horizon was selected) */}
                            {horizon && ai.horizonContext && (
                                <div style={{ background: 'rgba(212, 175, 55, 0.06)', border: '1px solid var(--color-gold)', borderRadius: 'var(--radius-md)', padding: '0.9rem 1rem', marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>📌 For {horizon} specifically</div>
                                    {ai.horizonContext}
                                </div>
                            )}

                            {/* New Insight: Global Context & Future Potential */}
                            {ai.futurePotential && (
                                <div style={{ background: 'rgba(55, 125, 212, 0.06)', border: '1px solid #377DD4', borderRadius: 'var(--radius-md)', padding: '0.9rem 1rem', marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#377DD4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>🌏 Global Context & Future Potential</div>
                                    {ai.futurePotential}
                                </div>
                            )}

                            {/* Key Metrics & Watch Points */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)', minWidth: 0 }}>
                                {ai.keyMetrics && ai.keyMetrics.length > 0 && (
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>📊 Key Metrics Context</div>
                                        {ai.keyMetrics.slice(0, 4).map((m, i) => (
                                            <div key={i} style={{ marginBottom: '0.5rem', fontSize: '0.82rem', minWidth: 0 }}>
                                                <span style={{ color: 'var(--color-gold)', fontWeight: 600, display: 'block', wordBreak: 'break-word' }}>{m.label}: {m.value}</span>
                                                <span style={{ color: 'var(--color-text-dim)', display: 'block', paddingLeft: '0.8rem', borderLeft: '2px solid var(--color-border)', wordBreak: 'break-word' }}>{m.context}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {ai.watchPoints && ai.watchPoints.length > 0 && (
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>👁 Watch Points</div>
                                        {ai.watchPoints.map((p, i) => (
                                            <div key={i} style={{ fontSize: '0.82rem', color: 'var(--color-text)', marginBottom: '0.4rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                <span style={{ color: 'var(--color-gold)', marginTop: '1px', flexShrink: 0 }}>›</span> {p}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.68rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                ⚠ TradeSphere AI provides factual data context only. This is not investment advice. Always do your own research.
                            </div>
                        </SectionCard>
                    )}

                    {/* Key Ratios */}
                    {data.ratios && Object.keys(data.ratios).length > 0 && (
                        <SectionCard title="📈 Key Financial Ratios">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 'var(--space-sm)' }}>
                                {Object.entries(data.ratios)
                                    .filter(([k]) => !k.toLowerCase().includes('promoter')) // Deduplicate promoter holding
                                    .map(([k, v]) => (
                                        <RatioCard key={k} label={k} value={v} />
                                    ))}
                            </div>
                        </SectionCard>
                    )}

                    {/* About */}
                    {data.about && (
                        <SectionCard title="🏢 About the Company">
                            <p style={{ margin: 0, fontSize: '0.87rem', lineHeight: 1.75, color: 'var(--color-text-dim)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{data.about}</p>
                        </SectionCard>
                    )}

                    {/* Pros & Cons */}
                    {(data.pros?.length > 0 || data.cons?.length > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            <SectionCard title="✅ Pros (from Screener.in)">
                                {data.pros.map((p, i) => (
                                    <div key={i} style={{ fontSize: '0.83rem', color: 'var(--color-text)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', paddingBottom: '0.4rem', borderBottom: i < data.pros.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <span style={{ color: 'var(--color-success)', fontWeight: 700, flexShrink: 0 }}>+</span> {p}
                                    </div>
                                ))}
                            </SectionCard>
                            <SectionCard title="⚠ Cons (from Screener.in)">
                                {data.cons.map((c, i) => (
                                    <div key={i} style={{ fontSize: '0.83rem', color: 'var(--color-text)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', paddingBottom: '0.4rem', borderBottom: i < data.cons.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <span style={{ color: 'var(--color-danger)', fontWeight: 700, flexShrink: 0 }}>–</span> {c}
                                    </div>
                                ))}
                            </SectionCard>
                        </div>
                    )}

                    {/* Quarterly Results */}
                    {data.quarterly?.rows?.length > 0 && (
                        <SectionCard title="📅 Quarterly Results (₹ Cr)">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {data.quarterly.headers.map((h, i) => <th key={i}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.quarterly.rows
                                            .filter(row => !row[0].toLowerCase().includes('promoter'))
                                            .map((row, i) => (
                                                <tr key={i}>
                                                    {row.map((cell, j) => (
                                                        <td key={j} style={{ fontWeight: j === 0 ? 600 : 400, color: j === 0 ? 'var(--color-text)' : 'var(--color-text-dim)' }}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>
                    )}

                    {/* Shareholding Section - Enhanced with AI Insights */}
                    {data.shareholding?.rows?.length > 0 && (
                        <SectionCard title="🏦 Shareholding Pattern Trends">
                            {/* AI Insights on Shareholding */}
                            {ai && ai.shareholdingAnalysis && (
                                <div style={{ background: 'var(--color-surface-alt)', borderLeft: '3px solid var(--color-gold)', borderRadius: 'var(--radius-md)', padding: '0.8rem 1rem', marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Institutional & Public Activity</div>
                                    {ai.shareholdingAnalysis}
                                </div>
                            )}

                            {/* Shareholding Trend Table */}
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {data.shareholding.headers.map((h, i) => <th key={i}>{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.shareholding.rows.map((row, i) => (
                                            <tr key={i}>
                                                {row.map((cell, j) => {
                                                    let cellColor = j === 0 ? 'var(--color-text)' : 'var(--color-text-dim)';
                                                    
                                                    // Highlight trends starting from the second data column (j > 1)
                                                    // row[0] is the group name, row[1] is the first quarter
                                                    if (j > 1) {
                                                        const current = parseFloat(cell.replace(/[^0-9.]/g, ''));
                                                        const prev = parseFloat(row[j-1].replace(/[^0-9.]/g, ''));
                                                        if (!isNaN(current) && !isNaN(prev)) {
                                                            if (current > prev) cellColor = '#4ade80'; // Green
                                                            else if (current < prev) cellColor = '#f87171'; // Red
                                                        }
                                                    }

                                                    return (
                                                        <td key={j} style={{ 
                                                            fontWeight: j === 0 ? 600 : 400, 
                                                            color: cellColor 
                                                        }}>
                                                            {cell}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>
                    )}

                    <a href={data.screenerUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: '0.82rem', color: 'var(--color-gold)', alignSelf: 'flex-start', textDecoration: 'none' }}>
                        View full report on Screener.in ↗
                    </a>
                </div>
            )}

            <style jsx="true">{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .analysis-form-grid { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: flex-end; }
            `}</style>
        </div>
    );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────
function AnalysisNotes() {
    const STORAGE_KEY = 'tradesphere_analysis_notes_v2';
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState({});
    const [pricesLoading, setPricesLoading] = useState(false);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formTitle, setFormTitle] = useState('');
    const [formSymbol, setFormSymbol] = useState('');
    const [formContent, setFormContent] = useState('');
    const [formSaving, setFormSaving] = useState(false);

    // Autocomplete for symbol in form
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeout = useRef(null);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/analysis-notes');
            if (data.success) {
                setNotes(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch notes from server', error);
        } finally {
            setLoading(false);
        }
    };

    const migrateLocalToBackend = async () => {
        try {
            const v2Stored = localStorage.getItem(STORAGE_KEY);
            let localNotes = [];
            
            if (v2Stored) {
                localNotes = JSON.parse(v2Stored);
            } else {
                const legacy = localStorage.getItem('tradesphere_analysis_notes');
                if (legacy && legacy.trim()) {
                    localNotes = [{
                        title: 'Legacy Note',
                        symbol: '',
                        content: legacy,
                        savedPrice: null,
                        createdAt: new Date().toISOString()
                    }];
                }
            }

            if (localNotes.length > 0) {
                console.log('Migrating local notes to backend...', localNotes);
                const { data } = await api.post('/analysis-notes/bulk', { notes: localNotes });
                if (data.success) {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem('tradesphere_analysis_notes');
                }
            }
        } catch (err) {
            console.error('Migration failed:', err);
        }
    };

    useEffect(() => {
        const initNotes = async () => {
            // First migrate if needed
            await migrateLocalToBackend();
            // Then fetch from server
            await fetchNotes();
        };
        initNotes();
    }, []);

    // Fetch CMPs for all symbols in notes
    useEffect(() => {
        const uniqueSymbols = [...new Set(notes.map(n => n.symbol).filter(Boolean))];
        if (uniqueSymbols.length > 0) {
            fetchPrices(uniqueSymbols);
        }
    }, [notes]);

    const fetchPrices = async (symbols) => {
        setPricesLoading(true);
        try {
            const symbolString = symbols.join(',');
            const { data } = await api.get(`/watchlist/prices?symbols=${symbolString}`);
            if (data.success) {
                const pricesFlat = {};
                for (const [k, v] of Object.entries(data.data)) {
                    pricesFlat[k] = typeof v === 'object' ? v.price : v;
                }
                setPrices(prev => ({ ...prev, ...pricesFlat }));
            }
        } catch (error) {
            console.error('Failed to fetch prices', error);
        } finally {
            setPricesLoading(false);
        }
    };

    // Close suggestions
    useEffect(() => {
        function handleClickOutside(e) {
            if (
                inputRef.current && !inputRef.current.contains(e.target) &&
                suggestionsRef.current && !suggestionsRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSymbolInput = (e) => {
        const value = e.target.value;
        setFormSymbol(value.toUpperCase());

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (value.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            try {
                setIsSearching(true);
                const { data: res } = await api.get(`/watchlist/search?q=${encodeURIComponent(value)}`);
                if (res.success && res.data.length > 0) {
                    setSuggestions(res.data);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch (err) {
                console.error('Stock search failed', err);
            } finally {
                setIsSearching(false);
            }
        }, 400);
    };

    const handleSelectSuggestion = (s) => {
        const cleanSymbol = s.symbol ? s.symbol.replace(/^[A-Z]+:/, '') : s.symbol;
        setFormSymbol(cleanSymbol.toUpperCase());
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSaveNote = async () => {
        if (!formTitle.trim()) {
            alert('Title is required');
            return;
        }
        
        setFormSaving(true);
        let savedPrice = null;

        if (formSymbol.trim()) {
            try {
                const { data } = await api.get(`/watchlist/prices?symbols=${formSymbol.trim().toUpperCase()}`);
                if (data.success && data.data[formSymbol.trim().toUpperCase()]) {
                    const priceData = data.data[formSymbol.trim().toUpperCase()];
                    savedPrice = typeof priceData === 'object' ? priceData.price : priceData;
                }
            } catch (err) {
                console.error('Failed to fetch price for note', err);
            }
        }

        const payload = {
            title: formTitle.trim(),
            symbol: formSymbol.trim().toUpperCase(),
            content: formContent.trim(),
            savedPrice: savedPrice
        };

        try {
            if (editingId) {
                const { data } = await api.put(`/analysis-notes/${editingId}`, payload);
                if (data.success) {
                    setNotes(notes.map(n => n.id === editingId ? data.data : n));
                }
            } else {
                const { data } = await api.post('/analysis-notes', payload);
                if (data.success) {
                    setNotes([data.data, ...notes]);
                }
            }

            // Reset form
            setFormTitle('');
            setFormSymbol('');
            setFormContent('');
            setEditingId(null);
            setShowForm(false);
        } catch (error) {
            console.error('Failed to save note', error);
            alert('Failed to save note');
        } finally {
            setFormSaving(false);
        }
    };

    const handleEdit = (note) => {
        setFormTitle(note.title);
        setFormSymbol(note.symbol || '');
        setFormContent(note.content);
        setEditingId(note.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this note?')) {
            try {
                const { data } = await api.delete(`/analysis-notes/${id}`);
                if (data.success) {
                    setNotes(notes.filter(n => n.id !== id));
                }
            } catch (error) {
                console.error('Failed to delete note', error);
                alert('Failed to delete note');
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    📌 Multiple chunked notes. Synced across your devices safely in the database.
                </p>
                {!showForm && (
                    <button onClick={() => {
                        setFormTitle(''); setFormSymbol(''); setFormContent(''); setEditingId(null); setShowForm(true);
                    }} style={{
                        padding: '0.5rem 1.2rem', background: 'var(--color-gold)',
                        color: '#0B0B0D', fontWeight: 700, fontSize: '0.85rem', border: 'none',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.3s', whiteSpace: 'nowrap'
                    }}>
                        + New Note
                    </button>
                )}
            </div>

            {showForm ? (
                <div className="card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--color-gold)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: 'var(--space-md)', color: 'var(--color-gold)', fontSize: '1.1rem' }}>
                        {editingId ? 'Edit Note' : 'Create New Note'}
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Title *</label>
                            <input 
                                type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                                placeholder="e.g. Q3 Earnings Setup"
                                style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock Symbol</label>
                            <input 
                                ref={inputRef}
                                type="text" value={formSymbol} onChange={handleSymbolInput}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                placeholder="Search symbol..." autoComplete="off"
                                style={{ width: '100%', padding: '0.6rem 0.8rem', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', paddingRight: isSearching ? '2.5rem' : '0.8rem' }}
                            />
                            {isSearching && <div className="stock-search-spinner" style={{ top: '65%', transform: 'translateY(-50%)' }} />}
                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div ref={suggestionsRef} className="stock-suggestions-dropdown" style={{ top: 'calc(100% + 4px)', zIndex: 100 }}>
                                    {suggestions.map((s, i) => (
                                        <button key={i} type="button" className="stock-suggestion-item" onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}>
                                            <span className="stock-suggestion-name">{s.name}</span>
                                            <span className="stock-suggestion-symbol">{s.symbol}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div style={{ marginBottom: 'var(--space-md)' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
                        <textarea 
                            value={formContent} onChange={e => setFormContent(e.target.value)}
                            placeholder="Write your analysis thesis here..."
                            style={{ width: '100%', minHeight: '150px', padding: '0.8rem', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                        <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Cancel</button>
                        <button type="button" onClick={handleSaveNote} disabled={formSaving} style={{ padding: '0.5rem 1.2rem', background: 'var(--color-primary)', border: 'none', color: '#fff', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                            {formSaving ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </div>
            ) : loading ? (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ color: 'var(--color-text-dim)', margin: 0 }}>Loading your notes...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {notes.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: 'var(--space-xl)', textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ color: 'var(--color-text-dim)', margin: 0 }}>No notes created yet. Click "New Note" to get started.</p>
                        </div>
                    ) : notes.map(note => (
                        <div key={note.id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-md)', borderTop: '3px solid var(--color-gold)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text)' }}>{note.title}</h4>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <button onClick={() => handleEdit(note)} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 5px' }}>Edit</button>
                                    <button onClick={() => handleDelete(note.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 5px' }}>Del</button>
                                </div>
                            </div>
                            
                            {note.symbol && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
                                    <span style={{ padding: '0.2rem 0.5rem', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                        {note.symbol}
                                    </span>
                                    {note.saved_price && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                            Saved @ ₹{note.saved_price}
                                        </span>
                                    )}
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                                        CMP: {prices[note.symbol] ? <strong style={{ color: 'var(--color-success)' }}>₹{prices[note.symbol]}</strong> : (pricesLoading ? '...' : 'N/A')}
                                    </span>
                                </div>
                            )}

                            <div style={{ flex: 1, fontSize: '0.88rem', color: 'var(--color-text-dim)', whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 'var(--space-sm)', overflowWrap: 'break-word' }}>
                                {note.content}
                            </div>
                            
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 'auto', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--color-border)' }}>
                                {new Date(note.created_at || note.createdAt).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Analysis() {
    const [activeTab, setActiveTab] = useState('analysis');

    const tabs = [
        { id: 'analysis', label: '📊 Stock Analysis' },
        { id: 'notes', label: '📝 Analysis Notes' },
    ];

    return (
        <div className="page">
            <div className="page__header">
                <div>
                    <h2 className="page__title">Stock Research</h2>
                    <p className="page__subtitle">Live data from Screener.in · Factual AI summary · Your private notes</p>
                </div>
            </div>

            {/* Tab Nav */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: 'var(--space-xl)', gap: 'var(--space-xs)' }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        padding: '0.65rem 1.4rem', background: 'transparent', border: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid var(--color-gold)' : '2px solid transparent',
                        marginBottom: '-2px',
                        color: activeTab === tab.id ? 'var(--color-gold)' : 'var(--color-text-dim)',
                        fontWeight: activeTab === tab.id ? 700 : 500,
                        fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ display: activeTab === 'analysis' ? 'block' : 'none' }}>
                <StockAnalysis />
            </div>
            <div style={{ display: activeTab === 'notes' ? 'block' : 'none' }}>
                <AnalysisNotes />
            </div>
        </div>
    );
}
