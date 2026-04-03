import { useState, useEffect, useCallback } from 'react';
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

// New Comment
const BLANK_FORM = {
    name: '',
    broker: '',
    capital_invested: '',
    join_date: '',
    status: 'ACTIVE',
};

function validate(form) {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required.';
    if (!form.capital_invested) errors.capital_invested = 'Capital invested is required.';
    else if (isNaN(form.capital_invested) || Number(form.capital_invested) < 0)
        errors.capital_invested = 'Must be a valid positive number.';
    if (!form.join_date) errors.join_date = 'Join date is required.';
    return errors;
}

function toDateInput(raw) {
    if (!raw) return '';
    return new Date(raw).toISOString().split('T')[0];
}

// ── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-family)',
                fontWeight: active ? 600 : 500,
                fontSize: 'var(--font-size-sm)',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                transition: 'color var(--transition), border-color var(--transition)',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </button>
    );
}

export default function ClientsList() {
    // ── Tab ───────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'deleted'

    // ── Active clients state ──────────────────────────────────────────────────
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // ── Deleted clients state ─────────────────────────────────────────────────
    const [deleted, setDeleted] = useState([]);
    const [deletedLoading, setDeletedLoading] = useState(false);
    const [deletedError, setDeletedError] = useState('');
    const [restoringId, setRestoringId] = useState(null);
    const [hardDeletingId, setHardDeletingId] = useState(null);

    // ── Modal state ───────────────────────────────────────────────────────────
    const [modalMode, setModalMode] = useState('add');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(BLANK_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // ── Fetch active clients ──────────────────────────────────────────────────
    const fetchClients = useCallback(async () => {
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
    }, []);

    // ── Fetch deleted clients ─────────────────────────────────────────────────
    const fetchDeleted = useCallback(async () => {
        setDeletedLoading(true);
        setDeletedError('');
        try {
            const { data } = await api.get('/api/clients/deleted');
            // Backend returns array directly (no wrapper)
            setDeleted(data);
        } catch {
            setDeletedError('Failed to load deleted clients.');
        } finally {
            setDeletedLoading(false);
        }
    }, []);

    // Load on mount
    useEffect(() => { fetchClients(); }, [fetchClients]);

    // Load deleted tab lazily on first switch
    useEffect(() => {
        if (activeTab === 'deleted') fetchDeleted();
    }, [activeTab, fetchDeleted]);

    // ── Hard delete client (permanent) ────────────────────────────────────────
    async function handleHardDelete(clientId, name) {
        if (!window.confirm(`⚠️ Permanently delete "${name}"? This CANNOT be undone.`)) return;
        setHardDeletingId(clientId);
        try {
            await api.delete(`/api/clients/${clientId}/permanent`);
            setDeleted(prev => prev.filter(c => c.client_id !== clientId));
        } catch (err) { alert(err.response?.data?.message || 'Hard delete failed.'); }
        finally { setHardDeletingId(null); }
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

    // ── Submit ────────────────────────────────────────────────────────────────
    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');
        const errors = validate(form);
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

        setSubmitting(true);
        try {
            if (modalMode === 'add') {
                await api.post('/api/clients', {
                    name: form.name.trim(),
                    broker: form.broker.trim() || null,
                    capital_invested: Number(form.capital_invested),
                    join_date: form.join_date,
                    status: form.status,
                });
            } else {
                await api.put(`/api/clients/${editingId}`, {
                    name: form.name.trim(),
                    broker: form.broker.trim() || null,
                    capital_invested: Number(form.capital_invested),
                    join_date: form.join_date,
                });
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
        if (!window.confirm(`Delete client "${clientName}"? They will be moved to Recently Deleted.`)) return;
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

    // ── Restore ───────────────────────────────────────────────────────────────
    async function handleRestore(clientId, clientName) {
        if (!window.confirm(`Restore "${clientName}"?`)) return;
        setRestoringId(clientId);
        try {
            await api.patch(`/api/clients/${clientId}/restore`);
            // Remove from deleted list, refresh active list
            setDeleted(prev => prev.filter(c => c.client_id !== clientId));
            fetchClients();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to restore client.');
        } finally {
            setRestoringId(null);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="page">
            {/* Page Header */}
            <div className="page__header">
                <h2 className="page__title">Clients</h2>
                {activeTab === 'active' && (
                    <Button variant="primary" onClick={openAddModal}>+ Add Client</Button>
                )}
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--color-border)',
                marginBottom: 'var(--space-sm)',
            }}>
                <TabBtn active={activeTab === 'active'} onClick={() => setActiveTab('active')}>
                    Active Clients
                </TabBtn>
                <TabBtn active={activeTab === 'deleted'} onClick={() => setActiveTab('deleted')}>
                    Recently Deleted
                </TabBtn>
            </div>

            {/* ── ACTIVE CLIENTS TAB ─────────────────────────────────────── */}
            {activeTab === 'active' && (
                <>
                    {loading && <p className="status-text">Loading clients…</p>}
                    {error && <div className="alert alert--error">{error}</div>}

                    {!loading && !error && clients.length === 0 && (
                        <Card className="empty-state">
                            <p>No clients found. Add your first client to get started.</p>
                        </Card>
                    )}

                    {!loading && !error && clients.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
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
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 500, padding: 0 }}
                                                        >Edit</button>
                                                        <span style={{ color: 'var(--color-border)' }}>|</span>
                                                        <button
                                                            onClick={() => handleDelete(client.client_id, client.name)}
                                                            disabled={deletingId === client.client_id}
                                                            style={{ background: 'none', border: 'none', cursor: deletingId === client.client_id ? 'not-allowed' : 'pointer', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', fontWeight: 500, padding: 0 }}
                                                        >
                                                            {deletingId === client.client_id ? 'Deleting…' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* ── RECENTLY DELETED TAB ──────────────────────────────────── */}
            {activeTab === 'deleted' && (
                <>
                    {deletedLoading && <p className="status-text">Loading deleted clients…</p>}
                    {deletedError && <div className="alert alert--error">{deletedError}</div>}

                    {!deletedLoading && !deletedError && deleted.length === 0 && (
                        <Card className="empty-state">
                            <p>No recently deleted clients.</p>
                        </Card>
                    )}

                    {!deletedLoading && !deletedError && deleted.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Broker</th>
                                            <th>Capital Invested</th>
                                            <th>Status</th>
                                            <th>Deleted On</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deleted.map((client) => (
                                            <tr key={client.client_id} style={{ opacity: 0.75 }}>
                                                <td style={{ fontWeight: 500 }}>{client.name}</td>
                                                <td>{client.broker ?? '—'}</td>
                                                <td>₹{Number(client.capital_invested).toLocaleString()}</td>
                                                <td>
                                                    <span className={`badge ${STATUS_BADGE[client.status] ?? ''}`}>
                                                        {client.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {client.deleted_at
                                                        ? (() => { const s = String(client.deleted_at); const m = s.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; })()
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                        <button
                                                            onClick={() => handleRestore(client.client_id, client.name)}
                                                            disabled={restoringId === client.client_id}
                                                            style={{ background: 'none', border: 'none', cursor: restoringId === client.client_id ? 'not-allowed' : 'pointer', color: 'var(--color-success)', fontSize: 'var(--font-size-sm)', fontWeight: 500, padding: 0, opacity: restoringId === client.client_id ? 0.5 : 1 }}
                                                        >
                                                            {restoringId === client.client_id ? 'Restoring…' : '↩ Restore'}
                                                        </button>
                                                        <span style={{ color: 'var(--color-border)' }}>|</span>
                                                        <button
                                                            onClick={() => handleHardDelete(client.client_id, client.name)}
                                                            disabled={hardDeletingId === client.client_id}
                                                            style={{ background: 'none', border: 'none', cursor: hardDeletingId === client.client_id ? 'not-allowed' : 'pointer', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', fontWeight: 500, padding: 0, opacity: hardDeletingId === client.client_id ? 0.5 : 1 }}
                                                        >
                                                            {hardDeletingId === client.client_id ? 'Deleting…' : '🗑 Delete Forever'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
            {showModal && (
                <div
                    className="modal-overlay"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <div className="modal__header">
                            <h3 className="modal__title" id="modal-title">
                                {modalMode === 'add' ? 'Add New Client' : 'Edit Client'}
                            </h3>
                            <button className="modal__close" onClick={closeModal} aria-label="Close">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="modal__body">
                                {submitError && <div className="alert alert--error">{submitError}</div>}

                                <Input id="name" label="Full Name" value={form.name} onChange={handleChange}
                                    placeholder="e.g. Rahul Sharma" error={formErrors.name} required />
                                <Input id="broker" label="Broker / Platform" value={form.broker} onChange={handleChange}
                                    placeholder="e.g. Zerodha, Groww" />
                                <Input id="capital_invested" label="Capital Invested (₹)" type="number"
                                    value={form.capital_invested} onChange={handleChange}
                                    placeholder="e.g. 100000" error={formErrors.capital_invested} required />
                                <Input id="join_date" label="Join Date" type="date"
                                    value={form.join_date} onChange={handleChange}
                                    error={formErrors.join_date} required />
                                <div className="form-group">
                                    <label htmlFor="status" className="form-label">Status</label>
                                    <select id="status" value={form.status} onChange={handleChange} className="form-input">
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                        <option value="PENDING">PENDING</option>
                                    </select>
                                </div>
                            </div>

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
