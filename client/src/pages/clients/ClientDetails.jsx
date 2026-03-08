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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/api/clients/${id}`)
            // Backend returns { success: true, data: { client_id, name, broker, … } }
            .then(({ data }) => setClient(data.data))
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
            )}
        </div>
    );
}


// client edit - edit capital invested & date change not working