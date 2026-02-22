import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const INITIAL = {
    clientId: '',
    symbol: '',
    type: 'buy',
    quantity: '',
    entryPrice: '',
    notes: '',
};

export default function OpenTrade() {
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/api/trades', form);
            navigate('/trades');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open trade.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page__header">
                <Button variant="secondary" onClick={() => navigate('/trades')}>
                    ← Back
                </Button>
                <h2 className="page__title">Open Trade</h2>
            </div>

            {error && <div className="alert alert--error">{error}</div>}

            <Card className="form-card">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-grid">
                        <Input
                            id="clientId"
                            label="Client ID"
                            value={form.clientId}
                            onChange={handleChange}
                            placeholder="Client ID"
                            required
                        />
                        <Input
                            id="symbol"
                            label="Symbol"
                            value={form.symbol}
                            onChange={handleChange}
                            placeholder="e.g. RELIANCE"
                            required
                        />
                        <div className="form-group">
                            <label htmlFor="type" className="form-label">Trade Type</label>
                            <select
                                id="type"
                                value={form.type}
                                onChange={handleChange}
                                className="form-input"
                            >
                                <option value="buy">Buy</option>
                                <option value="sell">Sell</option>
                            </select>
                        </div>
                        <Input
                            id="quantity"
                            label="Quantity"
                            type="number"
                            value={form.quantity}
                            onChange={handleChange}
                            placeholder="0"
                            required
                        />
                        <Input
                            id="entryPrice"
                            label="Entry Price (₹)"
                            type="number"
                            value={form.entryPrice}
                            onChange={handleChange}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label htmlFor="notes" className="form-label">Notes</label>
                        <textarea
                            id="notes"
                            value={form.notes}
                            onChange={handleChange}
                            className="form-input"
                            rows={3}
                            placeholder="Strategy notes, risk level, etc."
                        />
                    </div>

                    <div className="form-actions">
                        <Button type="button" variant="secondary" onClick={() => navigate('/trades')}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            {loading ? 'Opening…' : 'Open Trade'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
