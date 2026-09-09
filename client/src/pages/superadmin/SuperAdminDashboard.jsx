import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Shield, Users, CheckCircle, Snowflake, Search, Calendar, X, Key, Zap, Trash2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useConfirm } from '../../context/ConfirmContext';

// Safe date formatter
function fmtDate(val) {
    if (!val) return '—';
    const s = val instanceof Date ? val.toISOString() : String(val);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

function fmtDateTime(val) {
    if (!val) return '—';
    const d = new Date(val);
    return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtLakhs(val) {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    const abs = Math.abs(num);
    const sign = num >= 0 ? '+' : '-';
    if (abs < 1000) {
        return sign + '₹' + abs;
    }
    if (abs < 100000) {
        return sign + '₹' + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return sign + '₹' + (abs / 100000).toFixed(2) + 'L';
}

function fmtLakhsPlain(val) {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    const abs = Math.abs(num);
    if (abs < 1000) {
        return '₹' + abs;
    }
    if (abs < 100000) {
        return '₹' + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return '₹' + (abs / 100000).toFixed(2) + 'L';
}

const getSubscriptionStatus = (expiresAt) => {
    if (!expiresAt) return { label: 'No Limit', color: 'var(--color-text-dim)', isExpired: false, daysLeft: Infinity };
    const diffTime = new Date(expiresAt) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
        return { label: `Expired (${Math.abs(diffDays)}d ago)`, color: 'var(--color-danger)', isExpired: true, daysLeft: diffDays };
    } else if (diffDays === 0) {
        return { label: 'Expires Today', color: 'var(--color-warning)', isExpired: false, daysLeft: 0 };
    } else {
        return { label: `${diffDays} days left`, color: 'var(--color-success)', isExpired: false, daysLeft: diffDays };
    }
};

export default function SuperAdminDashboard() {
    const confirm = useConfirm();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Search and filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, frozen, expired

    // Details Modal
    const [selectedUser, setSelectedUser] = useState(null);
    const [detailsTab, setDetailsTab] = useState('clients'); // clients, trades, capital
    const [detailsData, setDetailsData] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Subscription Edit Modal
    const [userToUpdate, setUserToUpdate] = useState(null);
    const [daysToAdd, setDaysToAdd] = useState('30');
    const [customExpiry, setCustomExpiry] = useState('');
    const [subUpdating, setSubUpdating] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/superadmin/users');
            setUsers(data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch registered users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Fetch Details when tab or user changes
    useEffect(() => {
        if (!selectedUser) return;

        const fetchDetails = async () => {
            setDetailsLoading(true);
            setDetailsData(null);
            try {
                if (detailsTab === 'clients') {
                    const { data } = await api.get(`/superadmin/users/${selectedUser.id}/clients`);
                    setDetailsData(data);
                } else if (detailsTab === 'trades') {
                    const { data } = await api.get(`/superadmin/users/${selectedUser.id}/trades`);
                    setDetailsData(data);
                } else if (detailsTab === 'capital') {
                    const { data } = await api.get(`/superadmin/users/${selectedUser.id}/capital`);
                    setDetailsData(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setDetailsLoading(false);
            }
        };

        fetchDetails();
    }, [selectedUser, detailsTab]);

    const closeInspectModal = () => {
        setSelectedUser(null);
        setDetailsTab('clients');
        setDetailsData(null);
    };

    const handleFreezeToggle = async (user) => {
        const action = user.is_frozen ? 'unfreeze' : 'freeze';
        const description = user.is_frozen 
            ? `Are you sure you want to unfreeze ${user.name}'s account? They will regain access to their TradeSphere workspace.`
            : `Are you sure you want to freeze ${user.name}'s account? Their session will be revoked immediately and they won't be able to log in.`;

        confirm({
            title: `${action.toUpperCase()} Account`,
            message: description,
            variant: user.is_frozen ? 'warning' : 'danger',
            onConfirm: async () => {
                try {
                    await api.post(`/superadmin/users/${user.id}/${action}`);
                    await fetchUsers();
                    if (selectedUser && selectedUser.id === user.id) {
                        setSelectedUser(prev => prev ? { ...prev, is_frozen: !prev.is_frozen } : prev);
                    }
                } catch (err) {
                    alert(err.response?.data?.message || `Failed to ${action} user.`);
                }
            }
        });
    };

    const handleDeleteUser = (user) => {
        confirm({
            title: 'Delete User Account',
            message: `CRITICAL: Are you sure you want to delete ${user.name} (${user.email})? This action is permanent and will cascade-delete all their clients, trades, and logs from the system!`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/superadmin/users/${user.id}`);
                    await fetchUsers();
                    if (selectedUser?.id === user.id) setSelectedUser(null);
                } catch (err) {
                    alert(err.response?.data?.message || 'Failed to delete user.');
                }
            }
        });
    };

    const handleUpdateSubscription = async (e) => {
        e.preventDefault();
        if (!userToUpdate) return;

        setSubUpdating(true);
        try {
            const body = customExpiry 
                ? { expiresAt: customExpiry }
                : { daysToAdd: parseInt(daysToAdd) };
            
            const { data } = await api.put(`/superadmin/users/${userToUpdate.id}/subscription`, body);
            await fetchUsers();
            
            // If currently viewing this user, update active modal data too
            if (selectedUser?.id === userToUpdate.id) {
                setSelectedUser(prev => prev ? {
                    ...prev,
                    subscription_expires_at: data.expiresAt
                } : prev);
            }
            
            setUserToUpdate(null);
            setDaysToAdd('30');
            setCustomExpiry('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update subscription.');
        } finally {
            setSubUpdating(false);
        }
    };

    // Filters logic
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || 
                              user.email.toLowerCase().includes(search.toLowerCase());
        
        if (!matchesSearch) return false;

        const sub = getSubscriptionStatus(user.subscription_expires_at);
        if (statusFilter === 'frozen') return user.is_frozen;
        if (statusFilter === 'active') return !user.is_frozen && !sub.isExpired;
        if (statusFilter === 'expired') return !user.is_frozen && sub.isExpired;
        
        return true;
    });

    // Compute stats
    const totalUsers = users.length;
    const frozenCount = users.filter(u => u.is_frozen).length;
    const activeCount = users.filter(u => !u.is_frozen && !getSubscriptionStatus(u.subscription_expires_at).isExpired).length;
    const expiredCount = users.filter(u => !u.is_frozen && getSubscriptionStatus(u.subscription_expires_at).isExpired).length;

    return (
        <div className="page">
            {/* Header */}
            <div className="page__header" style={{ marginBottom: 'var(--space-md)' }}>
                <div>
                    <h2 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={24} /> Super Admin Control Room</h2>
                    <p className="page__subtitle">Monitor and manage registered tenants, track activities, and manage active licenses.</p>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="stats-grid">
                <div className="stat-card" style={{ '--card-accent': '#60A5FA' }}>
                    <div className="stat-card__icon" style={{ background: '#60A5FA18', border: '1px solid #60A5FA30' }}><Users size={24} /></div>
                    <div className="stat-card__body">
                        <span className="stat-card__value">{totalUsers}</span>
                        <span className="stat-card__label">Total Tenants</span>
                    </div>
                </div>
                <div className="stat-card" style={{ '--card-accent': 'var(--color-success)' }}>
                    <div className="stat-card__icon" style={{ background: 'var(--color-success-soft)', border: '1px solid rgba(34,197,94,0.3)' }}><CheckCircle size={24} /></div>
                    <div className="stat-card__body">
                        <span className="stat-card__value">{activeCount}</span>
                        <span className="stat-card__label">Active Licenses</span>
                    </div>
                </div>
                <div className="stat-card" style={{ '--card-accent': 'var(--color-warning)' }}>
                    <div className="stat-card__icon" style={{ background: 'var(--color-warning-soft)', border: '1px solid rgba(245,158,11,0.3)' }}>⏳</div>
                    <div className="stat-card__body">
                        <span className="stat-card__value">{expiredCount}</span>
                        <span className="stat-card__label">Expired Licenses</span>
                    </div>
                </div>
                <div className="stat-card" style={{ '--card-accent': 'var(--color-danger)' }}>
                    <div className="stat-card__icon" style={{ background: 'var(--color-danger-soft)', border: '1px solid rgba(239,68,68,0.3)' }}><Snowflake size={24} /></div>
                    <div className="stat-card__body">
                        <span className="stat-card__value">{frozenCount}</span>
                        <span className="stat-card__label">Frozen Accounts</span>
                    </div>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className="card" style={{ padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <Input
                            id="search"
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            style={{ marginBottom: 0 }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        {['all', 'active', 'expired', 'frozen'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                style={{
                                    padding: '0.45rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    cursor: 'pointer',
                                    border: '1px solid var(--color-border)',
                                    background: statusFilter === filter ? 'var(--color-gold-soft)' : 'var(--color-surface)',
                                    color: statusFilter === filter ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="section-header">
                    <h3>Registered Tenants</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', background: 'var(--color-surface-alt)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                        Found {filteredUsers.length}
                    </span>
                </div>

                {loading && <p className="status-text" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Loading registered users...</p>}
                {error && <p className="form-error" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>{error}</p>}
                
                {!loading && !error && filteredUsers.length === 0 && (
                    <p className="placeholder-text" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>No users match the search/filters criteria.</p>
                )}

                {!loading && !error && filteredUsers.length > 0 && (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tenant User</th>
                                    <th>Registration Date</th>
                                    <th>Trial Expires</th>
                                    <th>Status</th>
                                    <th>Days Left</th>
                                    <th>Total Capital</th>
                                    <th>Last Login</th>
                                    <th style={{ textAlign: 'center', minWidth: '120px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => {
                                    const sub = getSubscriptionStatus(user.subscription_expires_at);
                                    return (
                                        <tr key={user.id}>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{user.name}</span>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>{user.email}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                                {fmtDate(user.created_at)}
                                            </td>
                                            <td style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                                {user.subscription_expires_at ? fmtDate(user.subscription_expires_at) : 'No Limit'}
                                            </td>
                                            <td>
                                                {user.is_frozen ? (
                                                    <span className="badge badge--red" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>Frozen</span>
                                                ) : sub.isExpired ? (
                                                    <span className="badge badge--yellow" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>Expired</span>
                                                ) : (
                                                    <span className="badge badge--green" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>Active</span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600, color: sub.color }}>
                                                {sub.label}
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{fmtLakhsPlain(user.total_capital)}</td>
                                            <td style={{ color: 'var(--color-text-muted)' }}>
                                                {user.last_login_at ? fmtDateTime(user.last_login_at) : 'Never'}
                                            </td>
                                            <td style={{ minWidth: '120px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    title="Open overview & account management"
                                                    className="btn btn--secondary"
                                                    style={{
                                                        padding: '0.45rem 1rem',
                                                        fontSize: '0.8rem',
                                                        borderColor: 'var(--color-gold)',
                                                        color: 'var(--color-gold)',
                                                        background: 'var(--color-gold-soft)'
                                                    }}
                                                >
                                                    <><Search size={16} /> Overview</>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* License Duration Update Modal */}
            {userToUpdate && (
                <div className="superadmin-overlay" style={{ zIndex: 1000 }}>
                    <div className="superadmin-modal-card superadmin-modal-card--small">
                        <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)', marginBottom: 'var(--space-md)' }}>
                            <><Calendar size={16} /> Adjust License Duration</>
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
                            Update subscription credentials for <strong>{userToUpdate.name}</strong> ({userToUpdate.email}).
                            Current Expiry: <strong>{userToUpdate.subscription_expires_at ? fmtDate(userToUpdate.subscription_expires_at) : 'No Limit'}</strong>
                        </p>

                        <form onSubmit={handleUpdateSubscription}>
                            <div style={{ marginBottom: 'var(--space-md)' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text)', marginBottom: '4px', fontWeight: 600 }}>
                                    Select Duration Preset
                                </label>
                                <select
                                    value={daysToAdd}
                                    onChange={(e) => {
                                        setDaysToAdd(e.target.value);
                                        setCustomExpiry('');
                                    }}
                                    disabled={!!customExpiry}
                                    style={selectStyle}
                                >
                                    <option value="30">Add 30 Days (1 Month)</option>
                                    <option value="90">Add 90 Days (3 Months)</option>
                                    <option value="180">Add 180 Days (6 Months)</option>
                                    <option value="365">Add 365 Days (1 Year)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', margin: 'var(--space-md) 0' }}>
                                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>OR CHOOSE DATE</span>
                                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
                            </div>

                            <div style={{ marginBottom: 'var(--space-lg)' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text)', marginBottom: '4px', fontWeight: 600 }}>
                                    Select Specific Expiry Date
                                </label>
                                <input
                                    type="date"
                                    value={customExpiry}
                                    onChange={(e) => {
                                        setCustomExpiry(e.target.value);
                                        setDaysToAdd('30');
                                    }}
                                    style={dateInputStyle}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setUserToUpdate(null)}
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={subUpdating}
                                    style={{ padding: '0.5rem 1.25rem' }}
                                >
                                    {subUpdating ? 'Saving...' : 'Update License'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Inspect User Activity & Workspace Details Modal */}
            {selectedUser && (
                <div className="superadmin-overlay">
                    <div className="superadmin-modal-card superadmin-modal-card--large">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)', margin: 0 }}>
                                Inspect Workspace: {selectedUser.name}
                            </h3>
                            <button
                                onClick={closeInspectModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-muted)',
                                    fontSize: '1.25rem',
                                    cursor: 'pointer',
                                    padding: '0.2rem 0.5rem'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)', marginTop: '-0.2rem' }}>
                            Email: {selectedUser.email} &bull; Member Since: {fmtDate(selectedUser.created_at)} &bull; Expiry: {selectedUser.subscription_expires_at ? fmtDate(selectedUser.subscription_expires_at) : 'No Limit'}
                        </p>

                        {/* Credentials Card */}
                        <div style={{
                            background: 'var(--color-surface-alt)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-md)',
                            marginBottom: 'var(--space-lg)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <h4 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '0.85rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <><Key size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Tenant Login Credentials</>
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', fontSize: '0.8rem' }}>
                                <div>
                                    <span style={{ color: 'var(--color-text-dim)' }}>Login Email ID:</span>
                                    <strong style={{ display: 'block', color: 'var(--color-text)', marginTop: '2px', fontSize: '0.88rem' }}>
                                        {selectedUser.email}
                                    </strong>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--color-text-dim)' }}>Password:</span>
                                    <strong style={{ display: 'block', color: 'var(--color-text)', marginTop: '2px', fontSize: '0.88rem' }}>
                                        {selectedUser.password_plain || 'Encrypted (Hash)'}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Account Controls Card */}
                        <div style={{
                            background: 'var(--color-surface-alt)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-md)',
                            marginBottom: 'var(--space-lg)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <h4 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '0.85rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <><Shield size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Account Management Controls</>
                            </h4>
                            <p style={{ margin: '0 0 var(--space-md) 0', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                                Modify active license limits, freeze tenant workspace access, or delete this account.
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setUserToUpdate(selectedUser)}
                                    className="btn btn--secondary"
                                    style={{ padding: '0.45rem 1rem', fontSize: '0.78rem' }}
                                >
                                    <><Calendar size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Adjust License</>
                                </button>
                                <button
                                    onClick={() => handleFreezeToggle(selectedUser)}
                                    className="btn btn--secondary"
                                    style={{
                                        padding: '0.45rem 1rem',
                                        fontSize: '0.78rem',
                                        color: selectedUser.is_frozen ? 'var(--color-success)' : 'var(--color-warning)',
                                        borderColor: selectedUser.is_frozen ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'
                                    }}
                                >
                                    {selectedUser.is_frozen ? <><Zap size={16} style={{marginRight: '6px', verticalAlign: 'middle'}}/> Unfreeze Account</> : <><Snowflake size={16} style={{marginRight: '6px', verticalAlign: 'middle'}}/> Freeze Account</>}
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(selectedUser)}
                                    className="btn btn--danger"
                                    style={{ padding: '0.45rem 1rem', fontSize: '0.78rem' }}
                                >
                                    <><Trash2 size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Delete Tenant</>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-md)' }}>
                            {[
                                { id: 'clients', label: 'Clients' },
                                { id: 'trades', label: 'Trades List' },
                                { id: 'capital', label: 'Capital Ledger' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setDetailsTab(tab.id);
                                        setDetailsData(null);
                                    }}
                                    style={{
                                        padding: '0.65rem 1.25rem',
                                        border: 'none',
                                        borderBottom: detailsTab === tab.id ? '2px solid var(--color-gold)' : 'none',
                                        background: 'none',
                                        color: detailsTab === tab.id ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                        fontWeight: 600,
                                        fontSize: '0.82rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div style={{ minHeight: '300px', maxHeight: '450px', overflowY: 'auto' }}>
                            {detailsLoading && <p style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-dim)' }}>Loading workspace details...</p>}
                            
                            {!detailsLoading && detailsData && (
                                <>
                                    {detailsTab === 'clients' && Array.isArray(detailsData) && (
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Client Name</th>
                                                    <th>Broker</th>
                                                    <th>Invested Capital</th>
                                                    <th>Status</th>
                                                    <th>Join Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailsData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-dim)' }}>No clients registered by this user.</td>
                                                    </tr>
                                                ) : (
                                                    detailsData.map(c => (
                                                        <tr key={c.client_id}>
                                                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                                                            <td>{c.broker || '—'}</td>
                                                            <td style={{ fontWeight: 500 }}>{fmtLakhsPlain(c.capital_invested)}</td>
                                                            <td>
                                                                <span style={{
                                                                    padding: '0.15rem 0.5rem',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    background: c.status === 'ACTIVE' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                                                                    color: c.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)'
                                                                }}>
                                                                    {c.status}
                                                                </span>
                                                            </td>
                                                            <td>{fmtDate(c.join_date)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {detailsTab === 'trades' && Array.isArray(detailsData) && (
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Stock</th>
                                                    <th>Direction</th>
                                                    <th>Mode</th>
                                                    <th>Quantity</th>
                                                    <th>Entry Price</th>
                                                    <th>Target</th>
                                                    <th>Stop Loss</th>
                                                    <th>Status</th>
                                                    <th>Realised PnL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailsData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="9" style={{ textAlign: 'center', color: 'var(--color-text-dim)' }}>No trades recorded by this user.</td>
                                                    </tr>
                                                ) : (
                                                    detailsData.map(t => (
                                                        <tr key={t.trade_id}>
                                                            <td style={{ fontWeight: 600 }}>{t.stock_name}</td>
                                                            <td>
                                                                <span style={{
                                                                    color: t.trade_type === 'LONG' ? 'var(--color-success)' : 'var(--color-danger)',
                                                                    fontWeight: 600, fontSize: '0.72rem',
                                                                }}>
                                                                    {t.trade_type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                                                                </span>
                                                            </td>
                                                            <td>{t.mode}</td>
                                                            <td>{t.quantity}</td>
                                                            <td>₹{t.entry_price}</td>
                                                            <td>{t.target ? `₹${t.target}` : '—'}</td>
                                                            <td>{t.stop_loss ? `₹${t.stop_loss}` : '—'}</td>
                                                            <td>
                                                                <span className={`badge ${t.status === 'OPEN' ? 'badge--yellow' : 'badge--green'}`}>
                                                                    {t.status}
                                                                </span>
                                                            </td>
                                                            <td style={{
                                                                fontWeight: 600,
                                                                color: t.status === 'OPEN' ? 'inherit' : (t.total_pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)')
                                                            }}>
                                                                {t.status === 'OPEN' ? '—' : fmtLakhs(t.total_pnl)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {detailsTab === 'capital' && detailsData && !Array.isArray(detailsData) && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-lg)', padding: 'var(--space-md) 0' }}>
                                            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-lg)' }}>
                                                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-gold)' }}>
                                                    {fmtLakhsPlain(detailsData.total_capital)}
                                                </span>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 500 }}>
                                                    Total Capital Pool
                                                </span>
                                            </div>
                                            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-lg)' }}>
                                                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>
                                                    {fmtLakhsPlain(detailsData.deployed_capital)}
                                                </span>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 500 }}>
                                                    Currently Deployed Capital
                                                </span>
                                            </div>
                                            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-lg)' }}>
                                                <span style={{
                                                    fontSize: '1.75rem',
                                                    fontWeight: 700,
                                                    color: detailsData.total_pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                                }}>
                                                    {fmtLakhs(detailsData.total_pnl)}
                                                </span>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 500 }}>
                                                    Cumulative Realised Profit/Loss
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .superadmin-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(8px);
                    z-index: 999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                }

                @media (max-width: 768px) {
                    .superadmin-overlay {
                        background-color: #0B0B0D !important;
                        backdrop-filter: none !important;
                        padding: 1rem;
                        align-items: flex-start;
                        overflow-y: auto;
                    }
                }

                .superadmin-modal-card {
                    width: 100%;
                    background-color: var(--color-surface);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-xl);
                    box-shadow: var(--shadow-lg);
                    position: relative;
                }

                .superadmin-modal-card--small {
                    max-width: 500px;
                }

                .superadmin-modal-card--large {
                    max-width: 900px;
                    width: 95%;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                @media (max-width: 768px) {
                    .superadmin-modal-card {
                        margin-top: 1rem;
                        margin-bottom: 1rem;
                        max-height: calc(100vh - 2rem);
                        overflow-y: auto;
                    }
                    .superadmin-modal-card--large {
                        width: 100%;
                        max-height: calc(100vh - 2rem);
                    }
                }
            `}</style>
        </div>
    );
}

// Inline Styles

const selectStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface-alt)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    outline: 'none',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    cursor: 'pointer'
};

const dateInputStyle = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface-alt)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    outline: 'none',
    fontSize: '0.85rem',
    fontFamily: 'inherit'
};
