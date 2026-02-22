import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/api/clients/${id}`)
            .then(({ data }) => setClient(data))
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
                <div className="detail-grid">
                    <Card className="detail-card">
                        <h3 className="detail-card__title">Personal Info</h3>
                        <dl className="detail-list">
                            <dt>Name</dt>   <dd>{client.name}</dd>
                            <dt>Email</dt>  <dd>{client.email}</dd>
                            <dt>Phone</dt>  <dd>{client.phone}</dd>
                        </dl>
                    </Card>

                    <Card className="detail-card">
                        <h3 className="detail-card__title">Portfolio Summary</h3>
                        <p className="placeholder-text">Trade summary coming soon.</p>
                    </Card>
                </div>
            )}
        </div>
    );
}
