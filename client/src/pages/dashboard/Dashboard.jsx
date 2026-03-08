import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';

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
        // Fetch Summary
        api.get('/api/dashboard/summary')
            .then(res => setSummary(res.data))
            .catch(() => setError('Failed to load dashboard summary.'))
            .finally(() => setLoading(false));

        // Fetch Recent Trades
        api.get('/api/dashboard/recent-trades')
            .then(res => setRecentTrades(res.data))
            .catch(() => setTradesError('Failed to load recent trades.'))
            .finally(() => setTradesLoading(false));

        // Fetch Client Activity
        api.get('/api/clients/client-activity')
            .then(res => setClientActivity(res.data))
            .catch(() => setActivityError('Failed to load client activity.'))
            .finally(() => setActivityLoading(false));
    }, []);

    const SUMMARY_CARDS = [
        { label: 'Total Clients', value: summary ? summary.totalClients : '—', icon: '👥' },
        { label: 'Total Trades', value: summary ? summary.totalTrades : '—', icon: '📈' },
        { label: 'Total Capital', value: summary ? `₹${summary.totalCapital.toLocaleString()}` : '—', icon: '💰' },
        { label: 'Realised P&L', value: summary ? `₹${summary.totalPnl.toLocaleString()}` : '—', icon: '📊' },
    ];

    return (
        <div className="page">
            <div className="page__header">
                <h2 className="page__title">Dashboard</h2>
                <p className="page__subtitle">Overview of your portfolio</p>
            </div>

            {loading && <p className="status-text">Loading summary…</p>}
            {error && <div className="alert alert--error">{error}</div>}

            {/* Summary cards */}
            {!loading && !error && (
                <div className="stats-grid">
                    {SUMMARY_CARDS.map(({ label, value, icon }) => (
                        <Card key={label} className="stat-card">
                            <div className="stat-card__icon">{icon}</div>
                            <div className="stat-card__body">
                                <span className="stat-card__value">{value}</span>
                                <span className="stat-card__label">{label}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Placeholder for charts / recent trades */}
            <div className="dashboard-sections">
                <Card className="section-placeholder" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Recent Trades</h3>
                    </div>

                    {tradesLoading && <p className="status-text" style={{ padding: 'var(--space-lg)' }}>Loading recent trades…</p>}
                    {tradesError && <p className="form-error" style={{ padding: 'var(--space-lg)' }}>{tradesError}</p>}

                    {!tradesLoading && !tradesError && recentTrades.length === 0 && (
                        <p className="placeholder-text" style={{ padding: 'var(--space-lg)' }}>No recent trades found.</p>
                    )}

                    {!tradesLoading && !tradesError && recentTrades.length > 0 && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Stock Name</th>
                                    <th>Trade Type</th>
                                    <th>PnL</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTrades.map((trade) => (
                                    <tr key={trade.trade_id}>
                                        <td>{trade.stock_name}</td>
                                        <td style={{ textTransform: 'capitalize' }}>{trade.trade_type}</td>
                                        <td style={{
                                            color: trade.total_pnl > 0 ? 'var(--color-success)' :
                                                trade.total_pnl < 0 ? 'var(--color-danger)' : 'inherit',
                                            fontWeight: '500'
                                        }}>
                                            {trade.total_pnl > 0 ? '+' : ''}{trade.total_pnl}
                                        </td>
                                        <td>
                                            <span className={`badge badge--${trade.status === 'CLOSED' ? (trade.total_pnl >= 0 ? 'green' : 'red') : 'yellow'
                                                }`}>
                                                {trade.status}
                                            </span>
                                        </td>
                                        <td>{new Date(trade.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>

                <Card className="section-placeholder" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>Client Activity</h3>
                    </div>

                    {activityLoading && <p className="status-text" style={{ padding: 'var(--space-lg)' }}>Loading activity…</p>}
                    {activityError && <p className="form-error" style={{ padding: 'var(--space-lg)' }}>{activityError}</p>}

                    {!activityLoading && !activityError && clientActivity.length === 0 && (
                        <p className="placeholder-text" style={{ padding: 'var(--space-lg)' }}>No recent client activity.</p>
                    )}

                    {!activityLoading && !activityError && clientActivity.length > 0 && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Client Name</th>
                                    <th>Status</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientActivity.map((c) => (
                                    <tr key={c.client_id}>
                                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                                        <td>
                                            <span className={`badge ${c.status === 'ACTIVE' ? 'badge--green' :
                                                c.status === 'INACTIVE' ? 'badge--red' :
                                                    'badge--yellow'
                                                }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td>{c.join_date ? new Date(c.join_date).toLocaleDateString() : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Card>
            </div>
        </div>
    );
}
