import { useState, useEffect, useCallback } from 'react';
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
    { value: 'Intraday', label: '⚡ Intraday' },
    { value: 'Swing (2–10 weeks)', label: '🌊 Swing Trade' },
    { value: 'Long Term Investment', label: '📅 Long Term' },
];

// ─── Stock Analysis Tab ───────────────────────────────────────────────────────
function StockAnalysis() {
    const [symbol, setSymbol] = useState('');
    const [horizon, setHorizon] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        const sym = symbol.trim().toUpperCase();
        if (!sym) return;
        setLoading(true); setError(''); setData(null);
        try {
            const params = horizon ? `?horizon=${encodeURIComponent(horizon)}` : '';
            const res = await api.get(`/api/screener/${sym}${params}`);
            if (res.data.success) setData(res.data.data);
            else setError(res.data.message || 'Failed to fetch data.');
        } catch (err) {
            setError(err.response?.data?.message || 'Stock not found. Try the exact NSE/BSE symbol (e.g. BIRLASOFT or INFY).');
        } finally { setLoading(false); }
    };

    const ai = data?.aiSummary;

    return (
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
            {/* Search + Horizon */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', alignItems: 'flex-end' }} className="analysis-form-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock Symbol</label>
                    <input
                        type="text"
                        value={symbol}
                        onChange={e => setSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g. RELIANCE, HDFCBANK, BIRLASOFT"
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '0.68rem 1rem', background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text)', fontSize: '0.92rem', outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        Horizon <span style={{ color: 'var(--color-text-muted)', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <select
                        value={horizon}
                        onChange={e => setHorizon(e.target.value)}
                        style={{
                            padding: '0.68rem 0.8rem', background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            color: horizon ? 'var(--color-gold)' : 'var(--color-text-dim)',
                            fontSize: '0.88rem', cursor: 'pointer', outline: 'none'
                        }}
                    >
                        {HORIZONS.map(h => (
                            <option key={h.value} value={h.value}>{h.label}</option>
                        ))}
                    </select>
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
                                        {data.quarterly.rows.map((row, i) => (
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
    const STORAGE_KEY = 'tradesphere_analysis_notes';
    const [notes, setNotes] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
    const [saved, setSaved] = useState(false);

    const handleSave = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, notes);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [notes]);

    // Ctrl+S to save
    useEffect(() => {
        const handler = (e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); } };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    📌 Write your analysis, trade thesis, price targets here. Saves locally in your browser. Press <kbd style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '0 4px', fontSize: '0.75rem' }}>Ctrl+S</kbd> to save.
                </p>
                <button onClick={handleSave} style={{
                    padding: '0.5rem 1.2rem', background: saved ? 'var(--color-success)' : 'var(--color-gold)',
                    color: '#0B0B0D', fontWeight: 700, fontSize: '0.85rem', border: 'none',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.3s', whiteSpace: 'nowrap'
                }}>
                    {saved ? '✓ Saved!' : '💾 Save Notes'}
                </button>
            </div>
            <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={`📌 BIRLASOFT — 5 Apr 2026\n\nHorizon: Swing (2–4 weeks)\nEntry Zone: ₹510–520\nStop Loss: ₹490\nTarget: ₹560\n\nThesis:\n- Consistent revenue growth in IT services\n- ROE improving YoY\n- FII interest increasing\n\nRisks:\n- Margin pressure from salary hikes\n- Slowdown in BFSI vertical...\n\n────────────────────────\n\n📌 RELIANCE — Analysis`}
                style={{
                    minHeight: '60vh', padding: '1.2rem',
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
                    fontSize: '0.9rem', lineHeight: 1.8, resize: 'vertical',
                    fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace", outline: 'none'
                }}
            />
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                {notes.length.toLocaleString()} characters · Stored locally in your browser
            </div>
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

            {activeTab === 'analysis' && <StockAnalysis />}
            {activeTab === 'notes' && <AnalysisNotes />}
        </div>
    );
}
