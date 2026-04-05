import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const STATUS_BADGE = {
    ACTIVE: 'badge--green',
    INACTIVE: 'badge--red',
    PENDING: 'badge--yellow',
};

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [client, setClient] = useState(null);
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/api/clients/${id}`)
            .then(({ data }) => {
                setClient(data.data);
                setTrades(data.data.trades || []);
            })
            .catch(() => setError('Client not found or could not be loaded.'))
            .finally(() => setLoading(false));
    }, [id]);

    return (
        <div className="page">
            <div className="page__header">
                <Button variant="secondary" onClick={() => navigate('/clients')}>
                    ← Back
                </Button>
                <h2 className="page__title">Client Details</h2>
            </div>

            {loading && <p className="status-text">Loading…</p>}
            {error && <div className="alert alert--error">{error}</div>}

            {client && (
                <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
                    <Card className="detail-card" style={{ maxWidth: 520 }}>
                        <h3 className="detail-card__title">Client Information</h3>
                        <dl className="detail-list">
                            <dt>Name</dt>
                            <dd style={{ fontWeight: 600 }}>{client.name}</dd>

                            <dt>Broker</dt>
                            <dd>{client.broker ?? '—'}</dd>

                            <dt>Capital Invested</dt>
                            <dd>₹{Number(client.capital_invested).toLocaleString()}</dd>

                            <dt>Status</dt>
                            <dd>
                                <span className={`badge ${STATUS_BADGE[client.status] ?? ''}`}>
                                    {client.status}
                                </span>
                            </dd>

                            <dt>Joined</dt>
                            <dd>
                                {client.join_date
                                    ? new Date(client.join_date).toLocaleDateString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    })
                                    : '—'}
                            </dd>

                            <dt>Added On</dt>
                            <dd>
                                {client.created_at
                                    ? new Date(client.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    })
                                    : '—'}
                            </dd>
                        </dl>
                    </Card>

                    <Card>
                        <h3 className="detail-card__title">Related Trades</h3>
                        {trades.length === 0 ? (
                            <p className="placeholder-text">No trades associated with this client.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Symbol</th>
                                            <th>Direction</th>
                                            <th>Mode</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'right' }}>P&L</th>
                                            <th style={{ textAlign: 'right' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map(t => (
                                            <tr key={t.trade_id}>
                                                <td>{t.trade_date ? new Date(t.trade_date).toLocaleDateString('en-IN') : '—'}</td>
                                                <td style={{ fontWeight: 600 }}>{t.stock_name}</td>
                                                <td style={{ color: t.trade_type === 'LONG' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 500 }}>
                                                    {t.trade_type === 'LONG' ? '▲' : '▼'} {t.trade_type}
                                                </td>
                                                <td><span className="badge badge--yellow">{t.mode}</span></td>
                                                <td><span className={`badge ${t.status === 'OPEN' ? 'badge--yellow' : 'badge--green'}`}>{t.status}</span></td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: t.status === 'OPEN' ? 'inherit' : (t.total_pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)') }}>
                                                    {t.status === 'OPEN' ? '—' : `${t.total_pnl >= 0 ? '+' : ''}₹${Number(t.total_pnl).toLocaleString()}`}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <Button variant="secondary" onClick={() => navigate(`/trades/${t.trade_id}`)}>
                                                        View
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}


// client edit - edit capital invested & date change not working