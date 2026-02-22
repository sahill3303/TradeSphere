import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function TradeDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trade, setTrade] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/api/trades/${id}`)
            .then(({ data }) => setTrade(data))
            .catch(() => setError('Trade not found or could not be loaded.'))
            .finally(() => setLoading(false));
    }, [id]);

    return (
        <div className="page">
            <div className="page__header">
                <Button variant="secondary" onClick={() => navigate('/trades')}>
                    ← Back
                </Button>
                <h2 className="page__title">Trade Details</h2>
            </div>

            {loading && <p className="status-text">Loading…</p>}
            {error && <div className="alert alert--error">{error}</div>}

            {trade && (
                <div className="detail-grid">
                    <Card className="detail-card">
                        <h3 className="detail-card__title">Trade Info</h3>
                        <dl className="detail-list">
                            <dt>Symbol</dt>       <dd>{trade.symbol}</dd>
                            <dt>Type</dt>         <dd>{trade.type}</dd>
                            <dt>Status</dt>       <dd>{trade.status}</dd>
                            <dt>Entry Price</dt>  <dd>{trade.entryPrice}</dd>
                            <dt>Exit Price</dt>   <dd>{trade.exitPrice ?? '—'}</dd>
                            <dt>Quantity</dt>     <dd>{trade.quantity}</dd>
                        </dl>
                    </Card>

                    <Card className="detail-card">
                        <h3 className="detail-card__title">P&L Analysis</h3>
                        <p className="placeholder-text">P&L breakdown coming soon.</p>
                    </Card>
                </div>
            )}
        </div>
    );
}
