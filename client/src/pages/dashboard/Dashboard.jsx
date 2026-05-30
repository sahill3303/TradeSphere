import { useState, useEffect } from 'react';
import api from '../../api/axios';
import DailyNews from '../../components/dashboard/DailyNews';
import Profitability from '../../components/dashboard/Profitability';
import { usePreferences } from '../../context/PreferencesContext';
import { useAuth } from '../../context/AuthContext';

// Safe date formatter (DD/MM/YYYY, no timezone issues)
function fmtDate(val) {
    if (!val) return '—';
    const s = val instanceof Date ? val.toISOString() : String(val);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

function fmtLakhs(val) {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    const abs = Math.abs(num);
    const sign = num >= 0 ? '+' : '-';
    if (abs < 1000) {
        return sign + '₹' + abs;
    }
    if (abs < 100000) {
        return sign + '₹' + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return sign + '₹' + (abs / 100000).toFixed(2) + 'L';
}

function fmtLakhsPlain(val) {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    const abs = Math.abs(num);
    if (abs < 1000) {
        return '₹' + abs;
    }
    if (abs < 100000) {
        return '₹' + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return '₹' + (abs / 100000).toFixed(2) + 'L';
}

// Icon components (inline SVG-like characters for stat cards)
const STAT_ICONS = {
    'Total Clients': '👥',
    'Total Trades': '📈',
    'Total Capital': '💰',
    'Realised P&L': '📊',
};

const STAT_COLORS = {
    'Total Clients': 'var(--color-gold)',
    'Total Trades': '#60A5FA',
    'Total Capital': 'var(--color-success)',
    'Realised P&L': 'var(--color-warning)',
};

export default function Dashboard() {
    const { optionalFeatures } = usePreferences();
    const { user } = useAuth();
    
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [recentTrades, setRecentTrades] = useState([]);
    const [tradesLoading, setTradesLoading] = useState(true);
    const [tradesError, setTradesError] = useState(null);

    const [clientActivity, setClientActivity] = useState([]);
    const [activityLoading, setActivityLoading] = useState(true);
    const [activityError, setActivityError] = useState(null);

    useEffect(() => {
        if (sessionStorage.getItem('justLoggedIn') === 'true') {
            setShowWelcomeModal(true);
            sessionStorage.removeItem('justLoggedIn');
        }

        api.get('/dashboard/summary')
            .then(res => setSummary(res.data))
            .catch(() => setError('Failed to load summary.'))
            .finally(() => setLoading(false));

        api.get('/dashboard/recent-trades')
            .then(res => setRecentTrades(res.data))
            .catch(() => setTradesError('Failed to load recent trades.'))
            .finally(() => setTradesLoading(false));

        api.get('/clients/client-activity')
            .then(res => setClientActivity(res.data))
            .catch(() => setActivityError('Failed to load activity.'))
            .finally(() => setActivityLoading(false));
    }, []);

    // Prevent background scrolling when welcome modal is shown
    useEffect(() => {
        if (showWelcomeModal) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            const contentEl = document.getElementById('main-content');
            if (contentEl) {
                contentEl.style.overflow = 'hidden';
            }
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            const contentEl = document.getElementById('main-content');
            if (contentEl) {
                contentEl.style.overflow = '';
            }
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            const contentEl = document.getElementById('main-content');
            if (contentEl) {
                contentEl.style.overflow = '';
            }
        };
    }, [showWelcomeModal]);

    const SUMMARY_CARDS = summary ? [
        { label: 'Total Clients', value: summary.totalClients },
        { label: 'Total Trades', value: summary.totalTrades },
        { label: 'Total Capital', value: fmtLakhsPlain(summary.totalCapital) },
        {
            label: 'Realised P&L',
            value: fmtLakhs(summary.totalPnl),
            pnl: summary.totalPnl,
        },
    ] : [];

    return (
        <div className="page">
            {/* Header */}
            <div className="page__header" style={{ marginBottom: 'var(--space-md)' }}>
                <div>
                    <h2 className="page__title">Dashboard</h2>
                    <p className="page__subtitle">Your portfolio at a glance</p>
                </div>
            </div>

            {/* Errors */}
            {error && <div className="alert alert--error">{error}</div>}

            {/* ── Stat Cards ── */}
            {!loading && !error && (
                <div className="stats-grid">
                    {SUMMARY_CARDS.map(({ label, value, pnl }) => {
                        const accentColor = pnl !== undefined
                            ? (pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)')
                            : STAT_COLORS[label];
                        return (
                            <div key={label} className="stat-card" style={{ '--card-accent': accentColor }}>
                                <div className="stat-card__icon" style={{
                                    background: `${accentColor}18`,
                                    border: `1px solid ${accentColor}30`,
                                }}>
                                    {STAT_ICONS[label]}
                                </div>
                                <div className="stat-card__body">
                                    <span className="stat-card__value" style={{
                                        color: pnl !== undefined
                                            ? (pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)')
                                            : 'var(--color-text)',
                                    }}>{value}</span>
                                    <span className="stat-card__label">{label}</span>
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0,
                                    height: 2,
                                    background: `linear-gradient(90deg, ${accentColor}, transparent)`,
                                    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                                }} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Skeleton for loading */}
            {loading && (
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="stat-card">
                            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div className="skeleton" style={{ height: 28, width: '60%', borderRadius: 4 }} />
                                <div className="skeleton" style={{ height: 14, width: '80%', borderRadius: 4 }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Profitability Gauge & Ratios ── */}
            {!loading && !error && summary && (
                <Profitability summary={summary} />
            )}

            {/* Daily Market News / Sentiment (Market Intelligence in between) */}
            {(optionalFeatures?.marketIntelligence ?? true) && <DailyNews />}

            {/* ── Sections Grid ── */}
            <div className="dashboard-sections">
                {/* Recent Trades */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
                            Recent Trades
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', background: 'var(--color-surface-alt)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                            Last 5
                        </span>
                    </div>

                    {tradesLoading && <p className="status-text" style={{ padding: 'var(--space-lg)' }}>Loading…</p>}
                    {tradesError && <p className="form-error" style={{ padding: 'var(--space-lg)' }}>{tradesError}</p>}
                    {!tradesLoading && !tradesError && recentTrades.length === 0 && (
                        <p className="placeholder-text">No recent trades.</p>
                    )}

                    {!tradesLoading && !tradesError && recentTrades.length > 0 && (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Dir</th>
                                        <th>P&L</th>
                                        <th className="hide-col-mobile">Status</th>
                                        <th className="hide-col-mobile">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTrades.map(t => {
                                        const pnlPos = t.total_pnl > 0;
                                        const pnlNeg = t.total_pnl < 0;
                                        return (
                                            <tr key={t.trade_id}>
                                                <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.stock_name}</td>
                                                <td>
                                                    <span style={{
                                                        color: t.trade_type === 'LONG' ? 'var(--color-success)' : 'var(--color-danger)',
                                                        fontWeight: 600, fontSize: '0.7rem',
                                                    }}>
                                                        {t.trade_type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    color: pnlPos ? 'var(--color-success)' : pnlNeg ? 'var(--color-danger)' : 'inherit',
                                                }}>
                                                    {t.status === 'OPEN' ? '—' : fmtLakhs(t.total_pnl)}
                                                </td>
                                                <td className="hide-col-mobile">
                                                    <span className={`badge ${t.status === 'OPEN' ? 'badge--yellow' : 'badge--green'}`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="hide-col-mobile" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(t.created_at)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Client Activity */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: 'var(--space-md) var(--space-lg)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
                            Client Activity
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', background: 'var(--color-surface-alt)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                            Last 5
                        </span>
                    </div>

                    {activityLoading && <p className="status-text" style={{ padding: 'var(--space-lg)' }}>Loading…</p>}
                    {activityError && <p className="form-error" style={{ padding: 'var(--space-lg)' }}>{activityError}</p>}
                    {!activityLoading && !activityError && clientActivity.length === 0 && (
                        <p className="placeholder-text">No recent client activity.</p>
                    )}

                    {!activityLoading && !activityError && clientActivity.length > 0 && (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>Client</th>
                                        <th style={{ width: '40%' }}>Capital</th>
                                        <th style={{ width: '20%', textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientActivity.map(c => (
                                        <tr key={c.client_id}>
                                            <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{c.name.split(' ')[0]}</td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{fmtLakhsPlain(c.capital_invested)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    display: 'inline-block',
                                                    background: c.status === 'ACTIVE' ? 'var(--color-success)' :
                                                                c.status === 'INACTIVE' ? 'var(--color-danger)' :
                                                                'var(--color-warning)'
                                                }} title={c.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showWelcomeModal && (
                <div className="welcome-overlay">
                    <div className="welcome-card">
                        {/* Glow effect */}
                        <div style={{
                            position: 'absolute',
                            top: '-40px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '120px',
                            height: '120px',
                            background: 'var(--color-gold)',
                            filter: 'blur(50px)',
                            opacity: 0.25,
                            pointerEvents: 'none'
                        }} />

                        {/* Emblem with Pulsing Golden Rings */}
                        <div style={{ position: 'relative', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', width: '100px' }}>
                            <div style={{
                                position: 'absolute',
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                border: '2px solid var(--color-gold)',
                                animation: 'ringPulse 2s infinite ease-out'
                            }} />
                            <div style={{
                                position: 'absolute',
                                width: '110px',
                                height: '110px',
                                borderRadius: '50%',
                                border: '1px solid var(--color-gold)',
                                animation: 'ringPulse 2s infinite ease-out',
                                animationDelay: '0.6s'
                            }} />
                            <div style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.2rem',
                                boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
                                animation: 'float 3.5s ease-in-out infinite',
                                color: '#0B0B0D',
                                zIndex: 2
                            }}>👑</div>
                        </div>

                        {/* Title */}
                        <h2 style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            color: 'var(--color-gold)',
                            marginBottom: '0.35rem',
                            letterSpacing: '-0.02em',
                            animation: 'fadeInUp 0.5s ease-out both',
                            animationDelay: '0.15s'
                        }}>
                            Welcome, {user?.name?.split(' ')[0] || 'Trader'}
                        </h2>

                        {/* Elite Badge */}
                        <div style={{
                            background: 'var(--color-gold-soft)',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            padding: '0.35rem 0.95rem',
                            borderRadius: '999px',
                            color: 'var(--color-gold)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            marginBottom: '1.25rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            animation: 'fadeInUp 0.5s ease-out both',
                            animationDelay: '0.3s'
                        }}>
                            <span>✦</span> ELITE MEMBER ACCESS <span>✦</span>
                        </div>

                        {/* Punchy Subtitle */}
                        <p style={{
                            fontSize: '0.86rem',
                            lineHeight: 1.5,
                            color: 'var(--color-text-muted)',
                            marginBottom: '2rem',
                            fontWeight: 500,
                            padding: '0 0.5rem',
                            animation: 'fadeInUp 0.5s ease-out both',
                            animationDelay: '0.45s'
                        }}>
                            Let's execute with discipline and dominate the markets today.
                        </p>

                        {/* Close button */}
                        <button
                            onClick={() => setShowWelcomeModal(false)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
                                color: '#0B0B0D',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.25)',
                                animation: 'fadeInUp 0.5s ease-out both',
                                animationDelay: '0.6s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.08)'}
                            onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                        >
                            Access Workspace →
                        </button>
                    </div>

                    <style>{`


                        .welcome-overlay {
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            width: 100vw;
                            height: 100vh;
                            height: 100dvh;
                            background-color: rgba(0, 0, 0, 0.85);
                            backdrop-filter: blur(12px);
                            z-index: 99999;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 1.5rem;
                            animation: modalFadeIn 0.3s ease-out;
                        }

                        @media (max-width: 768px) {
                            .welcome-overlay {
                                background-color: #0B0B0D !important;
                                backdrop-filter: none !important;
                                padding: 1rem;
                                width: 100vw;
                                height: 100vh;
                                height: 100dvh;
                            }
                        }

                        .welcome-card {
                            width: 100%;
                            max-width: 400px;
                            background-color: var(--color-surface);
                            border: 1px solid var(--color-gold);
                            border-radius: var(--radius-xl);
                            padding: 3rem 2rem 2.5rem;
                            box-shadow: 0 0 45px rgba(212, 175, 55, 0.3), var(--shadow-lg);
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                            position: relative;
                            animation: modalZoomIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
                        }

                        @media (max-width: 768px) {
                            .welcome-card {
                                max-height: 90vh;
                                overflow-y: auto;
                            }
                        }

                        @keyframes modalFadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes modalZoomIn {
                            from { transform: scale(0.9) translateY(15px); opacity: 0; }
                            to { transform: scale(1) translateY(0); opacity: 1; }
                        }
                        @keyframes float {
                            0% { transform: translateY(0px); }
                            50% { transform: translateY(-6px); }
                            100% { transform: translateY(0px); }
                        }
                        @keyframes ringPulse {
                            0% { transform: scale(0.85); opacity: 0.6; }
                            50% { transform: scale(1.1); opacity: 0.1; }
                            100% { transform: scale(1.2); opacity: 0; }
                        }
                        @keyframes fadeInUp {
                            from { opacity: 0; transform: translateY(15px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
// deployment planning