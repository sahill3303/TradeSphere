import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    
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

    const [monthlyPerformance, setMonthlyPerformance] = useState([]);
    const [monthlyLoading, setMonthlyLoading] = useState(true);
    const [monthlyError, setMonthlyError] = useState(null);
    const [hoveredMonth, setHoveredMonth] = useState(null);

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

        api.get('/dashboard/monthly-performance')
            .then(res => setMonthlyPerformance(res.data))
            .catch(() => setMonthlyError('Failed to load monthly performance.'))
            .finally(() => setMonthlyLoading(false));
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

    const isBlankState = summary &&
        summary.totalClients === 0 &&
        summary.totalTrades === 0 &&
        (summary.totalNotes || 0) === 0 &&
        (summary.totalWatchlist || 0) === 0;

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

            {/* ── Onboarding / Intro Guide for New Users ── */}
            {!loading && !error && isBlankState && (
                <div className="onboarding-guide">
                    {/* Header Banner */}
                    <div className="onboarding-hero">
                        <div className="onboarding-hero__sparkle">✨</div>
                        <h2>Get Started with TradeSphere</h2>
                        <p>Welcome to your command center! Your dashboard analytics are currently empty. Complete these simple steps to set up your workspace and start tracking your performance.</p>
                    </div>

                    {/* Dashboard Metrics Explained */}
                    <div className="onboarding-section">
                        <h3>📊 Dashboard Metrics Explained</h3>
                        <p className="onboarding-section__subtitle">These KPI cards will track your management metrics and automatically update as you log data:</p>
                        
                        <div className="onboarding-grid">
                            <div className="onboarding-card">
                                <div className="onboarding-card__icon" style={{ color: 'var(--color-gold)', background: 'var(--color-gold-soft)' }}>👥</div>
                                <h4>Total Clients</h4>
                                <p>Tracks the number of client portfolios you manage. Allows you to monitor active status, start dates, and individual P&L contributions.</p>
                            </div>
                            <div className="onboarding-card">
                                <div className="onboarding-card__icon" style={{ color: '#60A5FA', background: 'rgba(96, 165, 250, 0.1)' }}>📈</div>
                                <h4>Total Trades</h4>
                                <p>Displays your aggregate trade volume. Logs active open positions and historical trades with details like ticker symbols, quantities, and direction.</p>
                            </div>
                            <div className="onboarding-card">
                                <div className="onboarding-card__icon" style={{ color: 'var(--color-success)', background: 'var(--color-success-soft)' }}>💰</div>
                                <h4>Total Capital</h4>
                                <p>Aggregates the total active capital invested across all client portfolios. Keep track of cash balances and leverage indicators in one place.</p>
                            </div>
                            <div className="onboarding-card">
                                <div className="onboarding-card__icon" style={{ color: 'var(--color-warning)', background: 'var(--color-warning-soft)' }}>📊</div>
                                <h4>Realised P&L</h4>
                                <p>Calculates the net closed position profit or loss. Currently gross (without tax and interest), operating costs will be added in the future.</p>
                            </div>
                        </div>
                    </div>

                    {/* Features & Actions */}
                    <div className="onboarding-section">
                        <h3>🚀 Core Platform Features</h3>
                        <p className="onboarding-section__subtitle">Unlock full dashboard analytics by completing your first setup actions:</p>
                        
                        <div className="onboarding-actions-list">
                            <div className="onboarding-action-row">
                                <div className="onboarding-action-row__content">
                                    <div className="onboarding-action-row__title">
                                        <span className="onboarding-action-row__emoji">👥</span>
                                        <h4>Add Your First Client</h4>
                                    </div>
                                    <p>Set up an investor profile to start tracking their initial capital, capital history, and dedicated portfolio statistics.</p>
                                </div>
                                <button className="onboarding-action-btn" onClick={() => navigate('/clients')}>
                                    Go to Clients →
                                </button>
                            </div>

                            <div className="onboarding-action-row">
                                <div className="onboarding-action-row__content">
                                    <div className="onboarding-action-row__title">
                                        <span className="onboarding-action-row__emoji">📈</span>
                                        <h4>Log a Live Trade</h4>
                                    </div>
                                    <p>Log a LONG or SHORT entry position. Keep track of shares/quantities, stop losses, and target entries.</p>
                                </div>
                                <button className="onboarding-action-btn" onClick={() => navigate('/trades/open')}>
                                    Log Trade →
                                </button>
                            </div>

                            <div className="onboarding-action-row">
                                <div className="onboarding-action-row__content">
                                    <div className="onboarding-action-row__title">
                                        <span className="onboarding-action-row__emoji">📝</span>
                                        <h4>Write a Journal Entry</h4>
                                    </div>
                                    <p>Document daily market analysis, setups, mistakes, or psychological updates in your secure private notebook.</p>
                                </div>
                                <button className="onboarding-action-btn" onClick={() => navigate('/notes')}>
                                    Open Journal →
                                </button>
                            </div>

                            <div className="onboarding-action-row">
                                <div className="onboarding-action-row__content">
                                    <div className="onboarding-action-row__title">
                                        <span className="onboarding-action-row__emoji">📋</span>
                                        <h4>Build your Watchlist</h4>
                                    </div>
                                    <p>Save symbols and track prices, daily changes, and charts integrated directly from Screener.in.</p>
                                </div>
                                <button className="onboarding-action-btn" onClick={() => navigate('/watchlist')}>
                                    Set Watchlist →
                                </button>
                                {/* Empty placeholder to balance spacing */}
                                <div style={{ width: '40px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stat Cards (For Existing Users) ── */}
            {!loading && !error && summary && !isBlankState && (
                <>
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
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', marginRight: '0.25rem' }}>
                        * Realised P&L is gross (without tax and interest). Operating costs will be added in the future.
                    </div>
                </>
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
            {!loading && !error && summary && !isBlankState && (
                <Profitability summary={summary} />
            )}

            {/* ── Monthly Performance Bar Chart ── */}
            {!loading && !error && summary && !isBlankState && (
                <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
                            Monthly Closing %
                        </h3>
                    </div>

                    {monthlyLoading && <p className="status-text">Loading chart…</p>}
                    {monthlyError && <p className="form-error">{monthlyError}</p>}
                    {!monthlyLoading && !monthlyError && monthlyPerformance.length === 0 && (
                        <p className="placeholder-text">No data available.</p>
                    )}

                    {!monthlyLoading && !monthlyError && monthlyPerformance.length > 0 && (() => {
                        const maxAbs = Math.max(...monthlyPerformance.map(m => Math.abs(m.returnPercentage || 0)), 1);
                        return (
                            <div style={{ display: 'flex', height: '220px', position: 'relative', gap: '8px', padding: '30px 0' }}>
                                {/* Zero Line */}
                                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--color-border)', zIndex: 0 }} />
                                
                                {monthlyPerformance.map(m => {
                                    const val = m.returnPercentage || 0;
                                    const isPositive = val >= 0;
                                    const heightPct = (Math.abs(val) / maxAbs) * 45; // 45% is max half-height
                                    
                                    return (
                                        <div 
                                            key={m.month} 
                                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: hoveredMonth === m.month ? 10 : 1 }}
                                            onMouseEnter={() => setHoveredMonth(m.month)}
                                            onMouseLeave={() => setHoveredMonth(null)}
                                        >
                                            {/* Tooltip */}
                                            {hoveredMonth === m.month && m.stocks && m.stocks.length > 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '100%',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    marginBottom: '15px',
                                                    background: 'var(--color-surface-alt)',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '12px',
                                                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                                    width: 'max-content',
                                                    minWidth: '160px',
                                                    maxWidth: '220px',
                                                    pointerEvents: 'none',
                                                    animation: 'fadeInUp 0.2s ease-out',
                                                    zIndex: 20
                                                }}>
                                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                                                        {m.month} Contributions
                                                    </h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {m.stocks.map((stk, idx) => (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                                                <span style={{ color: 'var(--color-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', paddingRight: '12px' }}>
                                                                    {stk.stock_name}
                                                                </span>
                                                                <span style={{ 
                                                                    color: stk.returnPercentage >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                                                    fontWeight: 600
                                                                }}>
                                                                    {stk.returnPercentage > 0 ? '+' : ''}{stk.returnPercentage.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {m.averageCapital > 0 && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--color-border)' }}>
                                                                <span style={{ color: 'var(--color-text-dim)' }}>Avg Capital:</span>
                                                                <span style={{ fontWeight: 600 }}>₹{m.averageCapital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Top Half (Positive) */}
                                            <div style={{ height: '50%', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                                {isPositive && val > 0 && (
                                                    <div style={{
                                                        width: '100%', maxWidth: '32px', height: `${heightPct * 2}%`, 
                                                        background: 'var(--color-success)',
                                                        borderRadius: '4px 4px 0 0',
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        transition: 'filter 0.2s',
                                                        filter: hoveredMonth === m.month ? 'brightness(1.2)' : 'none'
                                                    }}>
                                                         <span style={{ position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-success)' }}>
                                                             +{val.toFixed(1)}%
                                                         </span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Bottom Half (Negative) */}
                                            <div style={{ height: '50%', width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                                {!isPositive && val < 0 && (
                                                    <div style={{
                                                        width: '100%', maxWidth: '32px', height: `${heightPct * 2}%`, 
                                                        background: 'var(--color-danger)',
                                                        borderRadius: '0 0 4px 4px',
                                                        position: 'relative',
                                                        cursor: 'pointer',
                                                        transition: 'filter 0.2s',
                                                        filter: hoveredMonth === m.month ? 'brightness(1.2)' : 'none'
                                                    }}>
                                                         <span style={{ position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                                                             {val.toFixed(1)}%
                                                         </span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Month Label */}
                                            <span style={{ position: 'absolute', bottom: '-10px', fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>
                                                {m.month}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Daily Market News / Sentiment (Market Intelligence in between) */}
            {!loading && !error && summary && !isBlankState && (optionalFeatures?.marketIntelligence ?? true) && <DailyNews />}

            {/* ── Sections Grid ── */}
            {!loading && !error && summary && !isBlankState && (
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
            )}

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
            <style>{`
                .onboarding-guide {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-xl);
                    animation: fadeInUp 0.45s ease-out;
                }

                .onboarding-hero {
                    background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.02) 100%);
                    border: 1px solid rgba(212, 175, 55, 0.25);
                    border-radius: var(--radius-lg);
                    padding: 2.5rem 2rem;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                .onboarding-hero__sparkle {
                    font-size: 2.2rem;
                    margin-bottom: 0.75rem;
                    animation: float 3.5s ease-in-out infinite;
                }

                .onboarding-hero h2 {
                    font-family: var(--font-heading);
                    font-size: 1.55rem;
                    font-weight: 700;
                    color: var(--color-gold);
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.01em;
                }

                .onboarding-hero p {
                    font-size: 0.88rem;
                    color: var(--color-text-muted);
                    max-width: 600px;
                    margin: 0 auto;
                    line-height: 1.6;
                }

                .onboarding-section {
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: 2.25rem 2rem;
                    box-shadow: var(--shadow-sm);
                }

                .onboarding-section h3 {
                    font-family: var(--font-heading);
                    font-size: 1.15rem;
                    font-weight: 600;
                    color: var(--color-text);
                    margin-bottom: 0.35rem;
                }

                .onboarding-section__subtitle {
                    font-size: 0.82rem;
                    color: var(--color-text-dim);
                    margin-bottom: 1.5rem;
                }

                .onboarding-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: var(--space-lg);
                }

                .onboarding-card {
                    background: var(--color-surface-alt);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                    transition: transform var(--transition), border-color var(--transition);
                }

                .onboarding-card:hover {
                    border-color: var(--color-gold);
                    transform: translateY(-2px);
                }

                .onboarding-card__icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    margin-bottom: 0.25rem;
                }

                .onboarding-card h4 {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--color-text);
                    margin: 0;
                }

                .onboarding-card p {
                    font-size: 0.8rem;
                    color: var(--color-text-muted);
                    line-height: 1.55;
                    margin: 0;
                }

                .onboarding-actions-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }

                .onboarding-action-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--color-surface-alt);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    padding: 1.25rem 1.5rem;
                    gap: var(--space-lg);
                    flex-wrap: wrap;
                    transition: border-color var(--transition);
                }

                .onboarding-action-row:hover {
                    border-color: var(--color-gold);
                }

                .onboarding-action-row__content {
                    flex: 1;
                    min-width: 250px;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .onboarding-action-row__title {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                }

                .onboarding-action-row__title h4 {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--color-text);
                    margin: 0;
                }

                .onboarding-action-row__emoji {
                    font-size: 1.1rem;
                }

                .onboarding-action-row p {
                    font-size: 0.8rem;
                    color: var(--color-text-muted);
                    margin: 0;
                    line-height: 1.45;
                }

                .onboarding-action-btn {
                    background: none;
                    border: 1px solid var(--color-border);
                    color: var(--color-gold);
                    font-size: 0.82rem;
                    font-weight: 600;
                    padding: 0.55rem 1.1rem;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: all var(--transition);
                    white-space: nowrap;
                }

                .onboarding-action-btn:hover {
                    background: var(--color-gold-soft);
                    border-color: var(--color-gold);
                }
            `}</style>
        </div>
    );
}
// deployment planning