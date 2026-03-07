import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_BADGE = {
    ACTIVE: 'badge--green',
    INACTIVE: 'badge--red',
    PENDING: 'badge--yellow',
};

const BLANK_FORM = {
    name: '',
    broker: '',
    capital_invested: '',
    join_date: '',
    status: 'ACTIVE',
};

// ── Validation ────────────────────────────────────────────────────────────────
function validate(form) {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    if (!form.capital_invested) errors.capital_invested = 'Capital invested is required.';
    else if (isNaN(form.capital_invested) || Number(form.capital_invested) < 0)
        errors.capital_invested = 'Must be a valid positive number.';
    if (!form.join_date) errors.join_date = 'Join date is required.';
    return errors;
}

// ── Helper: format date for <input type="date"> (YYYY-MM-DD) ─────────────────
function toDateInput(raw) {
    if (!raw) return '';
    return new Date(raw).toISOString().split('T')[0];
}

export default function ClientsList() {
    // ── List state ────────────────────────────────────────────────────────────
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // ── Modal state (shared for Add & Edit) ───────────────────────────────────
    const [modalMode, setModalMode] = useState('add');   // 'add' | 'edit'
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(BLANK_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // ── Fetch on mount ────────────────────────────────────────────────────────
    useEffect(() => { fetchClients(); }, []);

    async function fetchClients() {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/api/clients');
            setClients(data.data);
        } catch {
            setError('Failed to load clients.');
        } finally {
            setLoading(false);
        }
    }

    // ── Modal helpers ─────────────────────────────────────────────────────────
    function openAddModal() {
        setModalMode('add');
        setEditingId(null);
        setForm(BLANK_FORM);
        setFormErrors({});
        setSubmitError('');
        setShowModal(true);
    }

    function openEditModal(client) {
        setModalMode('edit');
        setEditingId(client.client_id);
        setForm({
            name: client.name,
            broker: client.broker ?? '',
            capital_invested: String(client.capital_invested),
            join_date: toDateInput(client.join_date),
            status: client.status,
        });
        setFormErrors({});
        setSubmitError('');
        setShowModal(true);
    }

    function closeModal() { setShowModal(false); }

    function handleChange(e) {
        const { id, value } = e.target;
        setForm(prev => ({ ...prev, [id]: value }));
        if (formErrors[id]) setFormErrors(prev => ({ ...prev, [id]: '' }));
    }

    // ── Submit (Add or Edit) ──────────────────────────────────────────────────
    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');

        const errors = validate(form);
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

        setSubmitting(true);
        try {
            if (modalMode === 'add') {
                // POST /api/clients
                await api.post('/api/clients', {
                    name: form.name.trim(),
                    broker: form.broker.trim() || null,
                    capital_invested: Number(form.capital_invested),
                    join_date: form.join_date,
                    status: form.status,
                });
            } else {
                // PUT /api/clients/:id  — updates name, broker, capital_invested, join_date
                await api.put(`/api/clients/${editingId}`, {
                    name: form.name.trim(),
                    broker: form.broker.trim() || null,
                    capital_invested: Number(form.capital_invested),
                    join_date: form.join_date,
                });
                // PATCH /api/clients/:id/status — updates status separately
                await api.patch(`/api/clients/${editingId}/status`, {
                    status: form.status,
                });
            }
            closeModal();
            fetchClients();
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Operation failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    async function handleDelete(clientId, clientName) {
        if (!window.confirm(`Delete client "${clientName}"? This cannot be undone.`)) return;
        setDeletingId(clientId);
        try {
            await api.delete(`/api/clients/${clientId}`);
            setClients(prev => prev.filter(c => c.client_id !== clientId));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete client.');
        } finally {
            setDeletingId(null);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="page">
            {/* Header */}
            <div className="page__header">
                <h2 className="page__title">Clients</h2>
                <Button variant="primary" onClick={openAddModal}>+ Add Client</Button>
            </div>

            {loading && <p className="status-text">Loading clients…</p>}
            {error && <div className="alert alert--error">{error}</div>}

            {!loading && !error && clients.length === 0 && (
                <Card className="empty-state">
                    <p>No clients found. Add your first client to get started.</p>
                </Card>
            )}

            {/* Table */}
            {!loading && !error && clients.length > 0 && (
                <Card>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Broker</th>
                                <th>Capital Invested</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((client) => (
                                <tr key={client.client_id}>
                                    <td style={{ fontWeight: 500 }}>{client.name}</td>
                                    <td>{client.broker ?? '—'}</td>
                                    <td>₹{Number(client.capital_invested).toLocaleString()}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[client.status] ?? ''}`}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td>
                                        {client.join_date
                                            ? new Date(client.join_date).toLocaleDateString()
                                            : '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <Link to={`/clients/${client.client_id}`} className="table-link">View</Link>
                                            <span style={{ color: 'var(--color-border)' }}>|</span>
                                            <button
                                                onClick={() => openEditModal(client)}
                                                style={{
                                                    background: 'none', border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--color-primary)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    fontWeight: 500, padding: 0,
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <span style={{ color: 'var(--color-border)' }}>|</span>
                                            <button
                                                onClick={() => handleDelete(client.client_id, client.name)}
                                                disabled={deletingId === client.client_id}
                                                style={{
                                                    background: 'none', border: 'none',
                                                    cursor: deletingId === client.client_id ? 'not-allowed' : 'pointer',
                                                    color: 'var(--color-danger)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    fontWeight: 500, padding: 0,
                                                }}
                                            >
                                                {deletingId === client.client_id ? 'Deleting…' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
            {showModal && (
                <div
                    className="modal-overlay"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        {/* Header */}
                        <div className="modal__header">
                            <h3 className="modal__title" id="modal-title">
                                {modalMode === 'add' ? 'Add New Client' : 'Edit Client'}
                            </h3>
                            <button className="modal__close" onClick={closeModal} aria-label="Close">✕</button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="modal__body">
                                {submitError && (
                                    <div className="alert alert--error">{submitError}</div>
                                )}

                                <Input
                                    id="name"
                                    label="Full Name"
                                    value={form.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Rahul Sharma"
                                    error={formErrors.name}
                                    required
                                />
                                <Input
                                    id="broker"
                                    label="Broker / Platform"
                                    value={form.broker}
                                    onChange={handleChange}
                                    placeholder="e.g. Zerodha, Groww"
                                />
                                <Input
                                    id="capital_invested"
                                    label="Capital Invested (₹)"
                                    type="number"
                                    value={form.capital_invested}
                                    onChange={handleChange}
                                    placeholder="e.g. 100000"
                                    error={formErrors.capital_invested}
                                    required
                                />
                                <Input
                                    id="join_date"
                                    label="Join Date"
                                    type="date"
                                    value={form.join_date}
                                    onChange={handleChange}
                                    error={formErrors.join_date}
                                    required
                                />
                                <div className="form-group">
                                    <label htmlFor="status" className="form-label">Status</label>
                                    <select
                                        id="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className="form-input"
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                        <option value="PENDING">PENDING</option>
                                    </select>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="modal__footer">
                                <Button type="button" variant="secondary" onClick={closeModal} disabled={submitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={submitting}>
                                    {submitting
                                        ? (modalMode === 'add' ? 'Adding…' : 'Saving…')
                                        : (modalMode === 'add' ? 'Add Client' : 'Save Changes')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
