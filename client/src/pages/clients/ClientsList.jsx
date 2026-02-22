import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function ClientsList() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/clients')
            .then(({ data }) => setClients(data))
            .catch(() => setError('Failed to load clients.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page">
            <div className="page__header">
                <h2 className="page__title">Clients</h2>
                <Button variant="primary">+ Add Client</Button>
            </div>

            {loading && <p className="status-text">Loading clients…</p>}
            {error && <div className="alert alert--error">{error}</div>}

            {!loading && !error && clients.length === 0 && (
                <Card className="empty-state">
                    <p>No clients found. Add your first client to get started.</p>
                </Card>
            )}

            {!loading && clients.length > 0 && (
                <Card>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((client) => (
                                <tr key={client.id}>
                                    <td>{client.name}</td>
                                    <td>{client.email}</td>
                                    <td>{client.phone}</td>
                                    <td>
                                        <Link to={`/clients/${client.id}`} className="table-link">
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
