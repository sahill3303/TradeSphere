import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const STATUS_BADGE = {
    open: 'badge--green',
    closed: 'badge--red',
    pending: 'badge--yellow',
};

export default function TradesList() {
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/trades')
            .then(({ data }) => setTrades(data))
            .catch(() => setError('Failed to load trades.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page">
            <div className="page__header">
                <h2 className="page__title">Trades</h2>
                <Link to="/trades/open">
                    <Button variant="primary">+ Open Trade</Button>
                </Link>
            </div>

            {loading && <p className="status-text">Loading trades…</p>}
            {error && <div className="alert alert--error">{error}</div>}

            {!loading && !error && trades.length === 0 && (
                <Card className="empty-state">
                    <p>No trades recorded yet.</p>
                </Card>
            )}

            {!loading && trades.length > 0 && (
                <Card>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Type</th>
                                <th>Entry</th>
                                <th>Exit</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((trade) => (
                                <tr key={trade.id}>
                                    <td>{trade.symbol}</td>
                                    <td>{trade.type}</td>
                                    <td>{trade.entryPrice}</td>
                                    <td>{trade.exitPrice ?? '—'}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[trade.status] ?? ''}`}>
                                            {trade.status}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/trades/${trade.id}`} className="table-link">
                                            View →
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
