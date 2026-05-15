import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2, RotateCcw, Loader2 } from 'lucide-react';
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

function fmtLakhs(val) {
    if (!val) return '—';
    const num = Number(val);
    const abs = Math.abs(num);
    const sign = num >= 0 ? '' : '-';
    if (abs < 1000) {
        return sign + `₹${abs}`;
    }
    if (abs < 100000) {
        return sign + `₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    const lakhs = abs / 100000;
    return sign + `₹${lakhs.toFixed(2)}L`;
}

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
    const confirmAction = useConfirm();
    const [activeTab, setActiveTab] = useState('active');

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    const [deleted, setDeleted] = useState([]);
    const [deletedLoading, setDeletedLoading] = useState(false);
    const [deletedError, setDeletedError] = useState('');
    const [restoringId, setRestoringId] = useState(null);
    const [hardDeletingId, setHardDeletingId] = useState(null);

    const [modalMode, setModalMode] = useState('add');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(BLANK_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const fetchClients = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/clients');
            setClients(data.data);
        } catch {
            setError('Failed to load clients.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDeleted = useCallback(async () => {
        setDeletedLoading(true);
        setDeletedError('');
        try {
            const { data } = await api.get('/clients/deleted');
            setDeleted(data);
        } catch {
            setDeletedError('Failed to load deleted clients.');
        } finally {
            setDeletedLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    useEffect(() => {
        if (activeTab === 'deleted') fetchDeleted();
    }, [activeTab, fetchDeleted]);

    const openAddModal = () => {
        setModalMode('add');
        setEditingId(null);
        setForm(BLANK_FORM);
        setFormErrors({});
        setSubmitError('');
        setShowModal(true);
    };

    const openEditModal = (client) => {
        setModalMode('edit');
        setEditingId(client.client_id);
        setForm({
            name: client.name,
            broker: client.broker || '',
            capital_invested: client.capital_invested,
            join_date: toDateInput(client.join_date),
            status: client.status,
        });
        setFormErrors({});
        setSubmitError('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = validate(form);
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setSubmitting(true);
        setSubmitError('');
        try {
            if (modalMode === 'add') {
                await api.post('/clients', form);
            } else {
                await api.put(`/clients/${editingId}`, form);
                if (form.status) await api.patch(`/clients/${editingId}/status`, { status: form.status });
            }
            setShowModal(false);
            fetchClients();
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to save client');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        confirmAction({
            title: 'Delete Client',
            message: `Are you sure you want to move "${name}" to Recently Deleted?`,
            variant: 'warning',
            onConfirm: async () => {
                setDeletingId(id);
                try {
                    await api.delete(`/clients/${id}`);
                    setClients(clients.filter(c => c.client_id !== id));
                } catch (err) {
                    alert(err.response?.data?.message || 'Delete failed');
                } finally {
                    setDeletingId(null);
                }
            }
        });
    };

    const handleRestore = async (id, name) => {
        confirmAction({
            title: 'Restore Client',
            message: `Restore "${name}" to active clients?`,
            variant: 'primary',
            onConfirm: async () => {
                setRestoringId(id);
                try {
                    await api.patch(`/clients/${id}/restore`);
                    setDeleted(deleted.filter(c => c.client_id !== id));
                    fetchClients();
                } catch (err) {
                    alert(err.response?.data?.message || 'Restore failed');
                } finally {
                    setRestoringId(null);
                }
            }
        });
    };

    const handleHardDelete = async (id, name) => {
        confirmAction({
            title: 'Permanent Delete',
            message: `⚠️ Permanently delete "${name}"? This action CANNOT be undone.`,
            variant: 'danger',
            onConfirm: async () => {
                setHardDeletingId(id);
                try {
                    await api.delete(`/clients/${id}/permanent`);
                    setDeleted(deleted.filter(c => c.client_id !== id));
                } catch (err) {
                    alert(err.response?.data?.message || 'Delete failed');
                } finally {
                    setHardDeletingId(null);
                }
            }
        });
    };

    return (
        <div className="page">
            <div className="page__header">
                <h2 className="page__title">Clients</h2>
                <Button variant="primary" onClick={openAddModal} className="hide-mobile">+ Add Client</Button>
            </div>

            <button className="fab show-mobile" onClick={openAddModal} title="Add Client">+</button>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-sm)' }}>
                <TabBtn active={activeTab === 'active'} onClick={() => setActiveTab('active')}>Active Clients</TabBtn>
                <TabBtn active={activeTab === 'deleted'} onClick={() => setActiveTab('deleted')}>Recently Deleted</TabBtn>
            </div>

            {activeTab === 'active' && (
                <>
                    {loading && <p className="status-text">Loading clients…</p>}
                    {error && <div className="alert alert--error">{error}</div>}

                    {!loading && !error && clients.length === 0 && (
                        <Card className="empty-state"><p>No clients found.</p></Card>
                    )}

                    {!loading && !error && clients.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40%' }}>Name</th>
                                            <th className="hide-col-mobile">Broker</th>
                                            <th style={{ width: '25%' }}>Capital</th>
                                            <th style={{ width: '15%' }}>Status</th>
                                            <th className="hide-col-mobile">Joined</th>
                                            <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map((client) => (
                                            <tr key={client.client_id}>
                                                <td style={{ fontWeight: 600, fontSize: '0.8rem', width: '40%' }}>{client.name}</td>
                                                <td className="hide-col-mobile">{client.broker ?? '—'}</td>
                                                <td style={{ fontSize: '0.8rem', width: '25%' }}>{fmtLakhs(client.capital_invested)}</td>
                                                <td style={{ width: '15%' }}>
                                                    <span className={`badge ${STATUS_BADGE[client.status] ?? ''}`} style={{ fontSize: '0.55rem', padding: '0.15rem 0.3rem' }}>
                                                        {client.status === 'ACTIVE' ? 'ACT' : 'INA'}
                                                    </span>
                                                </td>
                                                <td className="hide-col-mobile">{toDateInput(client.join_date)}</td>
                                                <td style={{ width: '20%' }}>
                                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                        <Link to={`/clients/${client.client_id}`} className="table-btn-icon" title="View">
                                                            <Eye size={16} />
                                                        </Link>
                                                        <button onClick={() => openEditModal(client)} className="table-btn-icon" title="Edit">
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(client.client_id, client.name)} disabled={deletingId === client.client_id} className="table-btn-icon danger" title="Delete">
                                                            {deletingId === client.client_id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
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

            {activeTab === 'deleted' && (
                <>
                    {deletedLoading && <p className="status-text">Loading deleted clients…</p>}
                    {deletedError && <div className="alert alert--error">{deletedError}</div>}

                    {!deletedLoading && !deletedError && deleted.length === 0 && (
                        <Card className="empty-state"><p>No deleted clients found.</p></Card>
                    )}

                    {!deletedLoading && !deletedError && deleted.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Deleted At</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deleted.map((client) => (
                                            <tr key={client.client_id}>
                                                <td>{client.name}</td>
                                                <td>{new Date(client.deleted_at).toLocaleDateString()}</td>
                                                <td style={{ width: '20%' }}>
                                                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                        <ActionBtn onClick={() => handleRestore(client.client_id, client.name)}
                                                            disabled={restoringId === client.client_id} color="var(--color-success)">
                                                            {restoringId === client.client_id ? <Loader2 size={14} className="spin" /> : <><RotateCcw size={14} style={{marginRight: '4px'}} /> Restore</>}
                                                        </ActionBtn>
                                                        <ActionBtn onClick={() => handleHardDelete(client.client_id, client.name)}
                                                            disabled={hardDeletingId === client.client_id} color="var(--color-danger)">
                                                            {hardDeletingId === client.client_id ? <Loader2 size={14} className="spin" /> : <><Trash2 size={14} style={{marginRight: '4px'}} /> Delete</>}
                                                        </ActionBtn>
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

            {/* Modal code remains here... but let's keep it simple for now */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal__header">
                            <h3>{modalMode === 'add' ? 'Add New Client' : 'Edit Client'}</h3>
                            <button onClick={() => setShowModal(false)} className="modal__close">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal__body">
                            {submitError && <div className="alert alert--error">{submitError}</div>}
                            <Input label="Name" id="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} error={formErrors.name} required />
                            <Input label="Broker" id="broker" value={form.broker} onChange={e => setForm({...form, broker: e.target.value})} />
                            <Input label="Capital Invested" id="capital_invested" type="number" value={form.capital_invested} onChange={e => setForm({...form, capital_invested: e.target.value})} error={formErrors.capital_invested} required />
                            <Input label="Join Date" id="join_date" type="date" value={form.join_date} onChange={e => setForm({...form, join_date: e.target.value})} error={formErrors.join_date} required />
                            {modalMode === 'edit' && (
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="PENDING">Pending</option>
                                    </select>
                                </div>
                            )}
                            <div className="modal__footer">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Client'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
