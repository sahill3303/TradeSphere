import { useState, useEffect } from 'react';
import api from '../../api/axios';
import MarketChart from '../../components/ui/MarketChart';
import DailyNews from '../../components/dashboard/DailyNews';
import Profitability from '../../components/dashboard/Profitability';

// Safe date formatter (DD/MM/YYYY, no timezone issues)
function fmtDate(val) {
    if (!val) return '—';
    const s = val instanceof Date ? val.toISOString() : String(val);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
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
        api.get('/api/dashboard/summary')
            .then(res => setSummary(res.data))
            .catch(() => setError('Failed to load summary.'))
            .finally(() => setLoading(false));

        api.get('/api/dashboard/recent-trades')
            .then(res => setRecentTrades(res.data))
            .catch(() => setTradesError('Failed to load recent trades.'))
            .finally(() => setTradesLoading(false));

        api.get('/api/clients/client-activity')
            .then(res => setClientActivity(res.data))
            .catch(() => setActivityError('Failed to load activity.'))
            .finally(() => setActivityLoading(false));
    }, []);

    const SUMMARY_CARDS = summary ? [
        { label: 'Total Clients', value: summary.totalClients },
        { label: 'Total Trades', value: summary.totalTrades },
        { label: 'Total Capital', value: `₹${Number(summary.totalCapital).toLocaleString('en-IN')}` },
        {
            label: 'Realised P&L',
            value: `${summary.totalPnl >= 0 ? '+' : ''}₹${Number(summary.totalPnl).toLocaleString('en-IN')}`,
            pnl: summary.totalPnl,
        },
    ] : [];

    return (
        <div className="page">
            {/* Header */}
            <div className="page__header">
                <div>
                    <h2 className="page__title">Dashboard</h2>
                    <p className="page__subtitle">Your portfolio at a glance</p>
                </div>
            </div>

            <DailyNews />

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

            {/* ── Market Overview (Lightweight Charts via backend proxy) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}
                 className="market-overview-grid">
                <MarketChart
                    symbol="%5ENSEI"
                    label="NIFTY 50"
                    accentColor="#D4AF37"
                    height={260}
                />
                <MarketChart
                    symbol="%5ENSEBANK"
                    label="BANK NIFTY"
                    accentColor="#60A5FA"
                    height={260}
                />
            </div>

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
                                    <th>Direction</th>
                                    <th>P&L</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTrades.map(t => {
                                    const pnlPos = t.total_pnl > 0;
                                    const pnlNeg = t.total_pnl < 0;
                                    return (
                                        <tr key={t.trade_id}>
                                            <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>{t.stock_name}</td>
                                            <td>
                                                <span style={{
                                                    color: t.trade_type === 'LONG' ? 'var(--color-success)' : 'var(--color-danger)',
                                                    fontWeight: 600, fontSize: 'var(--font-size-sm)',
                                                }}>
                                                    {t.trade_type === 'LONG' ? '▲' : '▼'} {t.trade_type}
                                                </span>
                                            </td>
                                            <td style={{
                                                fontWeight: 600,
                                                color: pnlPos ? 'var(--color-success)' : pnlNeg ? 'var(--color-danger)' : 'var(--color-text-muted)',
                                            }}>
                                                {t.status === 'OPEN' ? '—' : `${pnlPos ? '+' : ''}₹${Number(t.total_pnl).toLocaleString('en-IN')}`}
                                            </td>
                                            <td>
                                                <span className={`badge ${t.status === 'OPEN' ? 'badge--yellow' : 'badge--green'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{fmtDate(t.created_at)}</td>
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
                                        <th>Client</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientActivity.map(c => (
                                        <tr key={c.client_id}>
                                            <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{c.name}</td>
                                            <td>
                                                <span className={`badge ${c.status === 'ACTIVE' ? 'badge--green' :
                                                        c.status === 'INACTIVE' ? 'badge--red' :
                                                            'badge--yellow'
                                                    }`}>{c.status}</span>
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>{fmtDate(c.join_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
