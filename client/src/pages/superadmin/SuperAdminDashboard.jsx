import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { 
    Shield, 
    Users, 
    CheckCircle, 
    Snowflake, 
    Search, 
    Calendar, 
    X, 
    Zap, 
    Trash2, 
    Bell, 
    AlertTriangle, 
    Clock, 
    LogIn, 
    UserPlus, 
    UserX, 
    ArrowUpDown, 
    Copy, 
    Check, 
    Lock, 
    RefreshCw, 
    Mail,
    Filter,
    Key,
    ExternalLink
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useConfirm } from '../../context/ConfirmContext';

// Helper: Robust Date parser across all browsers
function parseDateSafe(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    let s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
        s = s.replace(' ', 'T');
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

// Helper: Formats Date as DD/MM/YYYY
function fmtDate(val) {
    if (!val) return '—';
    const d = parseDateSafe(val);
    if (!d) return '—';
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Helper: Formats Date & Time in IST
function fmtDateTime(val) {
    const d = parseDateSafe(val);
    if (!d) return '—';
    return d.toLocaleString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
    });
}

// Helper: Relative time (e.g. "Just now", "5m ago", "3h ago", "2d ago")
function timeAgo(dateVal) {
    const past = parseDateSafe(dateVal);
    if (!past) return 'Never';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffSec < 60 && diffSec >= 0) return 'Just now';
    if (diffSec < 0) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
}

// Helper: Subscription / License Status
const getSubscriptionStatus = (expiresAt) => {
    if (!expiresAt) {
        return { 
            label: 'No Limit', 
            badgeClass: 'badge--blue', 
            color: 'var(--color-text-dim)', 
            isExpired: false, 
            isNear: false, 
            daysLeft: Infinity 
        };
    }
    const expDate = parseDateSafe(expiresAt);
    if (!expDate) {
        return { 
            label: 'No Limit', 
            badgeClass: 'badge--blue', 
            color: 'var(--color-text-dim)', 
            isExpired: false, 
            isNear: false, 
            daysLeft: Infinity 
        };
    }
    const diffTime = expDate.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { 
            label: `Expired (${Math.abs(diffDays)}d ago)`, 
            badgeClass: 'badge--red', 
            color: 'var(--color-danger)', 
            isExpired: true, 
            isNear: false, 
            daysLeft: diffDays 
        };
    } else if (diffDays === 0) {
        return { 
            label: 'Expires Today', 
            badgeClass: 'badge--yellow', 
            color: 'var(--color-warning)', 
            isExpired: false, 
            isNear: true, 
            daysLeft: 0 
        };
    } else if (diffDays <= 7) {
        return { 
            label: `Expires in ${diffDays}d`, 
            badgeClass: 'badge--yellow', 
            color: 'var(--color-warning)', 
            isExpired: false, 
            isNear: true, 
            daysLeft: diffDays 
        };
    } else {
        return { 
            label: `${diffDays} days left`, 
            badgeClass: 'badge--green', 
            color: 'var(--color-success)', 
            isExpired: false, 
            isNear: false, 
            daysLeft: diffDays 
        };
    }
};

export default function SuperAdminDashboard() {
    const confirm = useConfirm();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Primary View Tabs: 'directory' (Tenants Directory) or 'alerts' (Alerts & Notifications)
    const [activeTab, setActiveTab] = useState('directory');

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [notifSummary, setNotifSummary] = useState({
        total: 0,
        newUsers: 0,
        expiryNear: 0,
        recentLogins: 0,
        inactiveUsers: 0
    });
    const [notifFilter, setNotifFilter] = useState('all'); // all, new_user_registered, user_expiry_near, user_login, user_inactive

    // Search, sorting, and filters for Directory tab
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('registered_desc'); 
    // Options: 'registered_desc' (New user registered), 'expiry_near' (Expiry near), 'login_desc' (User login), 'inactive_desc' (User inactive), 'email_asc' (Email A-Z)
    const [statusFilter, setStatusFilter] = useState('all'); // all, new, expiry_near, login, inactive, frozen, active, expired

    // Copy to clipboard notification toast
    const [copiedEmail, setCopiedEmail] = useState(null);
    const [copiedTempPass, setCopiedTempPass] = useState(false);

    // License Duration Update Modal
    const [userToUpdate, setUserToUpdate] = useState(null);
    const [daysToAdd, setDaysToAdd] = useState('30');
    const [customExpiry, setCustomExpiry] = useState('');
    const [subUpdating, setSubUpdating] = useState(false);

    // Password Reset Modal for forgotten passwords
    const [userToResetPassword, setUserToResetPassword] = useState(null);
    const [customTempPassword, setCustomTempPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState(null);

    // Fetch registered users (Safe sanitized metadata only)
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/superadmin/users');
            setUsers(data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch registered tenant accounts.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch system notifications & activity events
    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/superadmin/notifications');
            if (data?.notifications) {
                setNotifications(data.notifications);
                setNotifSummary(data.summary || {});
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    const refreshAll = async () => {
        await Promise.all([fetchUsers(), fetchNotifications()]);
    };

    useEffect(() => {
        refreshAll();
    }, []);

    // Copy Email to Clipboard helper
    const handleCopyEmail = (email) => {
        navigator.clipboard?.writeText(email);
        setCopiedEmail(email);
        setTimeout(() => setCopiedEmail(null), 2000);
    };

    // Copy Temporary Password helper
    const handleCopyTempPass = (pwd) => {
        navigator.clipboard?.writeText(pwd);
        setCopiedTempPass(true);
        setTimeout(() => setCopiedTempPass(false), 2500);
    };

    // Freeze / Unfreeze user account
    const handleFreezeToggle = async (user) => {
        const action = user.is_frozen ? 'unfreeze' : 'freeze';
        const description = user.is_frozen 
            ? `Are you sure you want to unfreeze ${user.email}? They will immediately regain access to their TradeSphere workspace.`
            : `Are you sure you want to freeze ${user.email}? Their session will be revoked immediately and they will be barred from logging in.`;

        confirm({
            title: `${action.toUpperCase()} Account`,
            message: description,
            variant: user.is_frozen ? 'warning' : 'danger',
            onConfirm: async () => {
                try {
                    await api.post(`/superadmin/users/${user.id}/${action}`);
                    await refreshAll();
                } catch (err) {
                    alert(err.response?.data?.message || `Failed to ${action} user account.`);
                }
            }
        });
    };

    // Delete user account permanently
    const handleDeleteUser = (user) => {
        confirm({
            title: 'Delete Tenant Account',
            message: `CRITICAL: Are you sure you want to delete ${user.email}? This action is irreversible and permanently wipes the tenant workspace license.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/superadmin/users/${user.id}`);
                    await refreshAll();
                } catch (err) {
                    alert(err.response?.data?.message || 'Failed to delete user.');
                }
            }
        });
    };

    // Handle Subscription update
    const handleUpdateSubscription = async (e) => {
        e.preventDefault();
        if (!userToUpdate) return;

        setSubUpdating(true);
        try {
            const body = customExpiry 
                ? { expiresAt: customExpiry }
                : { daysToAdd: parseInt(daysToAdd) };
            
            await api.put(`/superadmin/users/${userToUpdate.id}/subscription`, body);
            await refreshAll();
            
            setUserToUpdate(null);
            setDaysToAdd('30');
            setCustomExpiry('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update subscription.');
        } finally {
            setSubUpdating(false);
        }
    };

    // Handle Password Reset
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!userToResetPassword) return;

        setResettingPassword(true);
        try {
            const body = customTempPassword ? { customPassword: customTempPassword } : {};
            const { data } = await api.post(`/superadmin/users/${userToResetPassword.id}/reset-password`, body);
            setGeneratedPassword(data.tempPassword);
            await refreshAll();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setResettingPassword(false);
        }
    };

    const closeResetModal = () => {
        setUserToResetPassword(null);
        setCustomTempPassword('');
        setGeneratedPassword(null);
        setCopiedTempPass(false);
    };

    // Filtered & Sorted Users
    const processedUsers = useMemo(() => {
        const now = new Date();
        const searchLower = search.trim().toLowerCase();

        return users
            .filter(user => {
                // Search filter strictly by Email ID
                if (searchLower && !user.email.toLowerCase().includes(searchLower)) {
                    return false;
                }

                const sub = getSubscriptionStatus(user.subscription_expires_at);
                const createdAt = new Date(user.created_at);
                const daysSinceCreated = (now - createdAt) / (1000 * 60 * 60 * 24);

                const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
                const hoursSinceLogin = lastLogin ? (now - lastLogin) / (1000 * 60 * 60) : Infinity;
                const daysSinceLogin = lastLogin ? Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24)) : Infinity;

                // Status tabs filter
                if (statusFilter === 'new') {
                    return daysSinceCreated <= 7;
                }
                if (statusFilter === 'expiry_near') {
                    return sub.isNear || sub.isExpired;
                }
                if (statusFilter === 'login') {
                    return hoursSinceLogin <= 48;
                }
                if (statusFilter === 'inactive') {
                    return daysSinceLogin >= 14 || (!user.last_login_at && daysSinceCreated >= 3);
                }
                if (statusFilter === 'frozen') {
                    return user.is_frozen;
                }
                if (statusFilter === 'active') {
                    return !user.is_frozen && !sub.isExpired;
                }
                if (statusFilter === 'expired') {
                    return !user.is_frozen && sub.isExpired;
                }

                return true;
            })
            .sort((a, b) => {
                // Sorting logic
                if (sortBy === 'registered_desc') {
                    // New user registered: newest registration first
                    const dateA = parseDateSafe(a.created_at);
                    const dateB = parseDateSafe(b.created_at);
                    return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
                }
                if (sortBy === 'registered_asc') {
                    // Oldest registration first
                    const dateA = parseDateSafe(a.created_at);
                    const dateB = parseDateSafe(b.created_at);
                    return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
                }
                if (sortBy === 'expiry_near') {
                    // User expiry near: Expiring soonest or already expired first
                    if (!a.subscription_expires_at && !b.subscription_expires_at) return 0;
                    if (!a.subscription_expires_at) return 1;
                    if (!b.subscription_expires_at) return -1;
                    const dateA = parseDateSafe(a.subscription_expires_at);
                    const dateB = parseDateSafe(b.subscription_expires_at);
                    return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
                }
                if (sortBy === 'login_desc') {
                    // User login: Most recent login first
                    if (!a.last_login_at && !b.last_login_at) return 0;
                    if (!a.last_login_at) return 1;
                    if (!b.last_login_at) return -1;
                    const dateA = parseDateSafe(a.last_login_at);
                    const dateB = parseDateSafe(b.last_login_at);
                    return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
                }
                if (sortBy === 'inactive_desc') {
                    // User inactive: Longest inactive / never logged in first
                    if (!a.last_login_at && !b.last_login_at) {
                        const dateA = parseDateSafe(a.created_at);
                        const dateB = parseDateSafe(b.created_at);
                        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
                    }
                    if (!a.last_login_at) return -1;
                    if (!b.last_login_at) return 1;
                    const dateA = parseDateSafe(a.last_login_at);
                    const dateB = parseDateSafe(b.last_login_at);
                    return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
                }
                if (sortBy === 'email_asc') {
                    return a.email.localeCompare(b.email);
                }
                return 0;
            });
    }, [users, search, statusFilter, sortBy]);

    // Computed Stats
    const totalUsers = users.length;
    const now = new Date();
    const newUsersCount = users.filter(u => {
        const d = parseDateSafe(u.created_at);
        return d && ((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)) <= 7;
    }).length;
    const expiryNearCount = users.filter(u => {
        const sub = getSubscriptionStatus(u.subscription_expires_at);
        return sub.isNear || sub.isExpired;
    }).length;
    const recentLoginCount = users.filter(u => {
        const d = parseDateSafe(u.last_login_at);
        return d && ((now.getTime() - d.getTime()) / (1000 * 60 * 60)) <= 48;
    }).length;
    const inactiveUsersCount = users.filter(u => {
        const lastLogin = parseDateSafe(u.last_login_at);
        const created = parseDateSafe(u.created_at);
        if (!lastLogin) return created && ((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) >= 3;
        return ((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) >= 14;
    }).length;
    const frozenCount = users.filter(u => u.is_frozen).length;

    // Filtered Notifications list
    const filteredNotifications = useMemo(() => {
        if (notifFilter === 'all') return notifications;
        return notifications.filter(n => n.type === notifFilter);
    }, [notifications, notifFilter]);

    return (
        <div className="page" style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div className="page__header" style={{ marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div>
                    <h2 className="page__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield size={26} color="var(--color-gold)" /> Super Admin Control Room
                    </h2>
                    <p className="page__subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        Tenant account lifecycle, licensing parameters, password resets, and activity alerts.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <button
                        onClick={refreshAll}
                        title="Refresh data"
                        className="btn btn--secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.5rem 0.85rem',
                            fontSize: '0.82rem'
                        }}
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>
            </div>

            {/* Zero-Knowledge Privacy Architecture Shield Banner */}
            <div style={{
                background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.08) 0%, rgba(23, 23, 26, 0.95) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1.25rem',
                marginBottom: 'var(--space-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-gold)'
                    }}>
                        <Lock size={18} />
                    </div>
                    <div>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-gold)', display: 'block' }}>
                            Zero-Knowledge Privacy Architecture Active
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            User passwords, client rosters, trading logs, and financial portfolios are strictly encrypted and restricted solely to the client. No client data is visible to superadmin.
                        </span>
                    </div>
                </div>
                <div style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-gold)',
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600
                }}>
                    Only Email ID Visible
                </div>
            </div>

            {/* Primary Super Admin View Navigation Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid var(--color-border)',
                marginBottom: 'var(--space-lg)',
                alignItems: 'center'
            }}>
                <button
                    onClick={() => setActiveTab('directory')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.75rem 1.25rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'directory' ? '2px solid var(--color-gold)' : '2px solid transparent',
                        color: activeTab === 'directory' ? 'var(--color-gold)' : 'var(--color-text-muted)',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={17} />
                    <span>Tenants Directory</span>
                    <span style={{
                        fontSize: '0.72rem',
                        background: 'var(--color-surface-alt)',
                        color: activeTab === 'directory' ? 'var(--color-gold)' : 'var(--color-text-dim)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--color-border)'
                    }}>
                        {totalUsers}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab('alerts')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.75rem 1.25rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'alerts' ? '2px solid var(--color-gold)' : '2px solid transparent',
                        color: activeTab === 'alerts' ? 'var(--color-gold)' : 'var(--color-text-muted)',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Bell size={17} />
                    <span>Alerts & System Notifications</span>
                    {notifications.length > 0 && (
                        <span style={{
                            background: activeTab === 'alerts' ? 'var(--color-gold)' : 'var(--color-surface-alt)',
                            color: activeTab === 'alerts' ? '#000' : 'var(--color-gold)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid var(--color-gold)'
                        }}>
                            {notifications.length}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: TENANTS DIRECTORY */}
            {activeTab === 'directory' && (
                <>
                    {/* Slim Minimized Alerts Bar */}
                    {notifications.length > 0 && (
                        <div style={{
                            background: 'var(--color-surface-alt)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.6rem 1rem',
                            marginBottom: 'var(--space-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 'var(--space-md)',
                            flexWrap: 'wrap'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                <Bell size={15} color="var(--color-gold)" />
                                <span style={{ color: 'var(--color-text)' }}>
                                    <strong>{notifications.length} Active System Alerts</strong>: 
                                    {' '}{notifSummary.newUsers || 0} new registrations, {notifSummary.expiryNear || 0} expiry warnings, {notifSummary.recentLogins || 0} logins.
                                </span>
                            </div>
                            <button
                                onClick={() => setActiveTab('alerts')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-gold)',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                Open Alerts Tab <ExternalLink size={12} />
                            </button>
                        </div>
                    )}

                    {/* Top Interactive Metric Cards (Clicking any card applies that filter) */}
                    <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
                        {/* Total Tenants */}
                        <div 
                            className="stat-card" 
                            onClick={() => setStatusFilter('all')}
                            style={{ 
                                '--card-accent': '#60A5FA', 
                                cursor: 'pointer',
                                outline: statusFilter === 'all' ? '2px solid #60A5FA' : 'none'
                            }}
                        >
                            <div className="stat-card__icon" style={{ background: '#60A5FA18', border: '1px solid #60A5FA30' }}>
                                <Users size={22} color="#60A5FA" />
                            </div>
                            <div className="stat-card__body">
                                <span className="stat-card__value">{totalUsers}</span>
                                <span className="stat-card__label">Total Tenants</span>
                            </div>
                        </div>

                        {/* New Users Registered */}
                        <div 
                            className="stat-card" 
                            onClick={() => { setStatusFilter('new'); setSortBy('registered_desc'); }}
                            style={{ 
                                '--card-accent': 'var(--color-success)', 
                                cursor: 'pointer',
                                outline: statusFilter === 'new' ? '2px solid var(--color-success)' : 'none'
                            }}
                        >
                            <div className="stat-card__icon" style={{ background: 'var(--color-success-soft)', border: '1px solid rgba(34,197,94,0.3)' }}>
                                <UserPlus size={22} color="var(--color-success)" />
                            </div>
                            <div className="stat-card__body">
                                <span className="stat-card__value">{newUsersCount}</span>
                                <span className="stat-card__label">New Users (≤7d)</span>
                            </div>
                        </div>

                        {/* Expiry Near */}
                        <div 
                            className="stat-card" 
                            onClick={() => { setStatusFilter('expiry_near'); setSortBy('expiry_near'); }}
                            style={{ 
                                '--card-accent': 'var(--color-warning)', 
                                cursor: 'pointer',
                                outline: statusFilter === 'expiry_near' ? '2px solid var(--color-warning)' : 'none'
                            }}
                        >
                            <div className="stat-card__icon" style={{ background: 'var(--color-warning-soft)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                <Clock size={22} color="var(--color-warning)" />
                            </div>
                            <div className="stat-card__body">
                                <span className="stat-card__value">{expiryNearCount}</span>
                                <span className="stat-card__label">Expiry Near (≤7d)</span>
                            </div>
                        </div>

                        {/* Recent Logins */}
                        <div 
                            className="stat-card" 
                            onClick={() => { setStatusFilter('login'); setSortBy('login_desc'); }}
                            style={{ 
                                '--card-accent': 'var(--color-gold)', 
                                cursor: 'pointer',
                                outline: statusFilter === 'login' ? '2px solid var(--color-gold)' : 'none'
                            }}
                        >
                            <div className="stat-card__icon" style={{ background: 'var(--color-gold-soft)', border: '1px solid rgba(212,175,55,0.3)' }}>
                                <LogIn size={22} color="var(--color-gold)" />
                            </div>
                            <div className="stat-card__body">
                                <span className="stat-card__value">{recentLoginCount}</span>
                                <span className="stat-card__label">Recent Logins (≤48h)</span>
                            </div>
                        </div>

                        {/* Inactive Users */}
                        <div 
                            className="stat-card" 
                            onClick={() => { setStatusFilter('inactive'); setSortBy('inactive_desc'); }}
                            style={{ 
                                '--card-accent': '#A855F7', 
                                cursor: 'pointer',
                                outline: statusFilter === 'inactive' ? '2px solid #A855F7' : 'none'
                            }}
                        >
                            <div className="stat-card__icon" style={{ background: '#A855F718', border: '1px solid #A855F730' }}>
                                <UserX size={22} color="#A855F7" />
                            </div>
                            <div className="stat-card__body">
                                <span className="stat-card__value">{inactiveUsersCount}</span>
                                <span className="stat-card__label">Inactive Users (≥14d)</span>
                            </div>
                        </div>

                        {/* Frozen Accounts */}
                        <div 
                            className="stat-card" 
                            onClick={() => setStatusFilter('frozen')}
                            style={{ 
                                '--card-accent': 'var(--color-danger)', 
                                cursor: 'pointer',
                                outline: statusFilter === 'frozen' ? '2px solid var(--color-danger)' : 'none'
                            }}
                        >
                            <div className="stat-card__icon" style={{ background: 'var(--color-danger-soft)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                <Snowflake size={22} color="var(--color-danger)" />
                            </div>
                            <div className="stat-card__body">
                                <span className="stat-card__value">{frozenCount}</span>
                                <span className="stat-card__label">Frozen Accounts</span>
                            </div>
                        </div>
                    </div>

                    {/* Controls Bar: Search, Sorting, and Filters */}
                    <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Search Strictly By Email ID */}
                            <div style={{ flex: 1, minWidth: '260px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
                                    <input
                                        id="superadmin-search"
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by email ID (e.g. user@domain.com)..."
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem 0.85rem 0.6rem 2.25rem',
                                            backgroundColor: 'var(--color-surface-alt)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--color-text)',
                                            fontSize: '0.85rem',
                                            outline: 'none'
                                        }}
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--color-text-dim)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Sorting Dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                    <ArrowUpDown size={14} /> Sort By:
                                </span>
                                <select
                                    id="superadmin-sort"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{
                                        padding: '0.55rem 0.85rem',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'var(--color-surface-alt)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-gold)',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="registered_desc">🆕 New User Registered (Newest First)</option>
                                    <option value="registered_asc">📅 Registration Date (Oldest First)</option>
                                    <option value="expiry_near">⏳ User Expiry Near (Expiring Soonest)</option>
                                    <option value="login_desc">🔑 User Login (Recent Logins First)</option>
                                    <option value="inactive_desc">⚠️ User Inactive (Longest Inactive First)</option>
                                    <option value="email_asc">✉️ Email ID (A to Z)</option>
                                </select>
                            </div>
                        </div>

                        {/* Quick Filter Tabs */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Filter size={12} /> Filter:
                            </span>
                            {[
                                { id: 'all', label: 'All Tenants' },
                                { id: 'new', label: '🆕 New (≤7d)' },
                                { id: 'expiry_near', label: '⏳ Expiry Near' },
                                { id: 'login', label: '🔑 Recent Logins' },
                                { id: 'inactive', label: '⚠️ Inactive (≥14d)' },
                                { id: 'active', label: '✅ Active Licenses' },
                                { id: 'expired', label: '🛑 Expired' },
                                { id: 'frozen', label: '❄️ Frozen' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setStatusFilter(f.id)}
                                    style={{
                                        padding: '0.35rem 0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        border: '1px solid',
                                        borderColor: statusFilter === f.id ? 'var(--color-gold)' : 'var(--color-border)',
                                        background: statusFilter === f.id ? 'var(--color-gold-soft)' : 'var(--color-surface)',
                                        color: statusFilter === f.id ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="section-header" style={{ padding: 'var(--space-md) var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Tenant Accounts Directory</h3>
                                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                                    Zero-knowledge view &bull; Only Email ID & licensing parameters displayed
                                </p>
                            </div>
                            <span style={{ 
                                fontSize: '0.72rem', 
                                color: 'var(--color-text-dim)', 
                                background: 'var(--color-surface-alt)', 
                                padding: '0.2rem 0.6rem', 
                                borderRadius: 'var(--radius-full)', 
                                border: '1px solid var(--color-border)' 
                            }}>
                                Showing {processedUsers.length} of {users.length}
                            </span>
                        </div>

                        {loading && (
                            <p className="status-text" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                                Loading tenant accounts securely...
                            </p>
                        )}
                        
                        {error && (
                            <p className="form-error" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                                {error}
                            </p>
                        )}
                        
                        {!loading && !error && processedUsers.length === 0 && (
                            <div style={{ padding: 'var(--space-2xl)', textAlign: 'center' }}>
                                <Users size={32} color="var(--color-text-dim)" style={{ margin: '0 auto var(--space-sm) auto' }} />
                                <p className="placeholder-text" style={{ margin: 0 }}>
                                    No tenants match the search or filter criteria.
                                </p>
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="btn btn--secondary"
                                        style={{ marginTop: 'var(--space-md)', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        )}

                        {!loading && !error && processedUsers.length > 0 && (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Tenant User (Email ID)</th>
                                            <th>Account Status</th>
                                            <th>Registration Date</th>
                                            <th>Trial / License Expiry</th>
                                            <th>Last Login Activity</th>
                                            <th style={{ textAlign: 'center', minWidth: '180px' }}>License & Account Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {processedUsers.map(user => {
                                            const sub = getSubscriptionStatus(user.subscription_expires_at);
                                            const createdAt = new Date(user.created_at);
                                            const isNew = ((now - createdAt) / (1000 * 60 * 60 * 24)) <= 7;

                                            const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
                                            const daysInactive = lastLogin 
                                                ? Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24))
                                                : Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
                                            const isInactive = daysInactive >= 14 || (!user.last_login_at && daysInactive >= 3);
                                            const isRecentlyActive = lastLogin && ((now - lastLogin) / (1000 * 60 * 60)) <= 48;

                                            return (
                                                <tr key={user.id}>
                                                    {/* Email ID with Copy Button */}
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: 'var(--radius-full)',
                                                                background: 'var(--color-surface-alt)',
                                                                border: '1px solid var(--color-border)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'var(--color-gold)',
                                                                fontWeight: 700,
                                                                fontSize: '0.8rem',
                                                                flexShrink: 0
                                                            }}>
                                                                {user.email.charAt(0).toUpperCase()}
                                                            </div>

                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.88rem' }}>
                                                                        {user.email}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleCopyEmail(user.email)}
                                                                        title="Copy email address"
                                                                        style={{
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            color: copiedEmail === user.email ? 'var(--color-success)' : 'var(--color-text-dim)',
                                                                            padding: '2px',
                                                                            display: 'inline-flex'
                                                                        }}
                                                                    >
                                                                        {copiedEmail === user.email ? <Check size={13} /> : <Copy size={13} />}
                                                                    </button>
                                                                </div>

                                                                <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                                                    {isNew && (
                                                                        <span style={{
                                                                            fontSize: '0.65rem',
                                                                            background: 'var(--color-success-soft)',
                                                                            color: 'var(--color-success)',
                                                                            padding: '0.1rem 0.4rem',
                                                                            borderRadius: 'var(--radius-sm)',
                                                                            fontWeight: 700
                                                                        }}>
                                                                            NEW USER
                                                                        </span>
                                                                    )}
                                                                    {user.is_frozen && (
                                                                        <span style={{
                                                                            fontSize: '0.65rem',
                                                                            background: 'var(--color-danger-soft)',
                                                                            color: 'var(--color-danger)',
                                                                            padding: '0.1rem 0.4rem',
                                                                            borderRadius: 'var(--radius-sm)',
                                                                            fontWeight: 700
                                                                        }}>
                                                                            FROZEN
                                                                        </span>
                                                                    )}
                                                                    {user.must_reset_password && (
                                                                        <span style={{
                                                                            fontSize: '0.65rem',
                                                                            background: 'rgba(212, 175, 55, 0.15)',
                                                                            color: 'var(--color-gold)',
                                                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                                                            padding: '0.1rem 0.4rem',
                                                                            borderRadius: 'var(--radius-sm)',
                                                                            fontWeight: 700
                                                                        }}>
                                                                            TEMP PWD ACTIVE
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Account Status */}
                                                    <td>
                                                        {user.is_frozen ? (
                                                            <span className="badge badge--red" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                                                                <Snowflake size={11} style={{ marginRight: '4px' }} /> Frozen
                                                            </span>
                                                        ) : sub.isExpired ? (
                                                            <span className="badge badge--yellow" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}>
                                                                <AlertTriangle size={11} style={{ marginRight: '4px' }} /> Expired
                                                            </span>
                                                        ) : sub.isNear ? (
                                                            <span className="badge badge--yellow" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}>
                                                                <Clock size={11} style={{ marginRight: '4px' }} /> Expiring Soon
                                                            </span>
                                                        ) : (
                                                            <span className="badge badge--green" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>
                                                                <CheckCircle size={11} style={{ marginRight: '4px' }} /> Active
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Registration Date */}
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ color: 'var(--color-text)', fontWeight: 500, fontSize: '0.85rem' }}>
                                                                {fmtDate(user.created_at)}
                                                            </span>
                                                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                                                                {timeAgo(user.created_at)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Trial / License Expiry */}
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 600, color: sub.color, fontSize: '0.85rem' }}>
                                                                {sub.label}
                                                            </span>
                                                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                                                                {user.subscription_expires_at ? fmtDate(user.subscription_expires_at) : 'No Limit'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Last Login Activity */}
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ color: 'var(--color-text)', fontSize: '0.85rem' }}>
                                                                {user.last_login_at ? fmtDateTime(user.last_login_at) : 'Never Logged In'}
                                                            </span>
                                                            
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                                <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)' }}>
                                                                    {user.login_count || 0} {(user.login_count || 0) === 1 ? 'login' : 'logins'}
                                                                </span>

                                                                {isRecentlyActive && (
                                                                    <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', background: 'var(--color-success-soft)', padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-sm)' }}>
                                                                        Active recently
                                                                    </span>
                                                                )}

                                                                {isInactive && (
                                                                    <span style={{ fontSize: '0.68rem', color: '#A855F7', background: '#A855F718', padding: '0.05rem 0.35rem', borderRadius: 'var(--radius-sm)' }}>
                                                                        Inactive {daysInactive}d
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td style={{ minWidth: '180px', textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                                            {/* Adjust License */}
                                                            <button
                                                                onClick={() => setUserToUpdate(user)}
                                                                title="Adjust License Duration"
                                                                className="btn btn--secondary"
                                                                style={{
                                                                    padding: '0.4rem 0.65rem',
                                                                    fontSize: '0.75rem',
                                                                    borderColor: 'var(--color-gold)',
                                                                    color: 'var(--color-gold)',
                                                                    background: 'var(--color-gold-soft)'
                                                                }}
                                                            >
                                                                <Calendar size={14} style={{ marginRight: '3px' }} /> License
                                                            </button>

                                                            {/* Reset Password */}
                                                            <button
                                                                onClick={() => setUserToResetPassword(user)}
                                                                title="Reset User Password"
                                                                className="btn btn--secondary"
                                                                style={{
                                                                    padding: '0.4rem 0.65rem',
                                                                    fontSize: '0.75rem',
                                                                    color: 'var(--color-text)',
                                                                    borderColor: 'var(--color-border)'
                                                                }}
                                                            >
                                                                <Key size={14} style={{ marginRight: '3px' }} /> Reset
                                                            </button>

                                                            {/* Freeze / Unfreeze */}
                                                            <button
                                                                onClick={() => handleFreezeToggle(user)}
                                                                title={user.is_frozen ? 'Unfreeze Account' : 'Freeze Account'}
                                                                className="btn btn--secondary"
                                                                style={{
                                                                    padding: '0.4rem 0.65rem',
                                                                    fontSize: '0.75rem',
                                                                    color: user.is_frozen ? 'var(--color-success)' : 'var(--color-warning)',
                                                                    borderColor: user.is_frozen ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'
                                                                }}
                                                            >
                                                                {user.is_frozen ? <Zap size={14} /> : <Snowflake size={14} />}
                                                            </button>

                                                            {/* Delete Tenant */}
                                                            <button
                                                                onClick={() => handleDeleteUser(user)}
                                                                title="Delete Tenant Account"
                                                                className="btn btn--danger"
                                                                style={{
                                                                    padding: '0.4rem 0.65rem',
                                                                    fontSize: '0.75rem'
                                                                }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* TAB 2: ALERTS & NOTIFICATIONS FEED */}
            {activeTab === 'alerts' && (
                <div>
                    {/* Notification Category Filters */}
                    <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Bell size={18} color="var(--color-gold)" /> Live System Alerts & Activity Feed
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                    Categorized notifications for registrations, expiry warnings, logins, and inactivity.
                                </p>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', background: 'var(--color-surface-alt)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
                                {filteredNotifications.length} Events Showing
                            </span>
                        </div>

                        {/* Category filter pills */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { id: 'all', label: 'All Alerts', count: notifSummary.total || notifications.length },
                                { id: 'new_user_registered', label: '🟢 New Registrations', count: notifSummary.newUsers || 0 },
                                { id: 'user_expiry_near', label: '⏳ Expiry Warnings', count: notifSummary.expiryNear || 0 },
                                { id: 'user_login', label: '🔑 User Logins', count: notifSummary.recentLogins || 0 },
                                { id: 'user_inactive', label: '⚠️ Inactive Users', count: notifSummary.inactiveUsers || 0 }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setNotifFilter(item.id)}
                                    style={{
                                        padding: '0.4rem 0.85rem',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        border: '1px solid',
                                        borderColor: notifFilter === item.id ? 'var(--color-gold)' : 'var(--color-border)',
                                        background: notifFilter === item.id ? 'var(--color-gold-soft)' : 'var(--color-surface)',
                                        color: notifFilter === item.id ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {item.label} ({item.count})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notifications Grid */}
                    {filteredNotifications.length === 0 ? (
                        <div className="card" style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                            <Bell size={32} color="var(--color-text-dim)" style={{ margin: '0 auto var(--space-sm) auto' }} />
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>No alerts found in this category.</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                            gap: 'var(--space-md)'
                        }}>
                            {filteredNotifications.map((notif) => {
                                const isNewUser = notif.type === 'new_user_registered';
                                const isExpiry = notif.type === 'user_expiry_near';
                                const isLogin = notif.type === 'user_login';
                                const isInactive = notif.type === 'user_inactive';

                                let iconColor = 'var(--color-gold)';
                                let iconBg = 'var(--color-gold-soft)';
                                let IconComp = Bell;

                                if (isNewUser) {
                                    iconColor = 'var(--color-success)';
                                    iconBg = 'var(--color-success-soft)';
                                    IconComp = UserPlus;
                                } else if (isExpiry) {
                                    iconColor = notif.severity === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)';
                                    iconBg = notif.severity === 'danger' ? 'var(--color-danger-soft)' : 'var(--color-warning-soft)';
                                    IconComp = AlertTriangle;
                                } else if (isLogin) {
                                    iconColor = '#60A5FA';
                                    iconBg = '#60A5FA18';
                                    IconComp = LogIn;
                                } else if (isInactive) {
                                    iconColor = '#A855F7';
                                    iconBg = '#A855F718';
                                    IconComp = UserX;
                                }

                                return (
                                    <div
                                        key={notif.id}
                                        className="card"
                                        style={{
                                            padding: 'var(--space-md)',
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'flex-start',
                                            border: '1px solid var(--color-border)',
                                            margin: 0
                                        }}
                                    >
                                        <div style={{
                                            background: iconBg,
                                            color: iconColor,
                                            padding: '8px',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <IconComp size={18} />
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: iconColor }}>
                                                    {notif.title}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                                                    {timeAgo(notif.timestamp)}
                                                </span>
                                            </div>
                                            
                                            <div style={{
                                                fontSize: '0.88rem',
                                                color: 'var(--color-text)',
                                                fontWeight: 600,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                marginTop: '4px'
                                            }} title={notif.email}>
                                                {notif.email}
                                            </div>

                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                                                {notif.message}
                                            </div>

                                            <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => {
                                                        setActiveTab('directory');
                                                        setSearch(notif.email);
                                                    }}
                                                    style={{
                                                        background: 'var(--color-surface-alt)',
                                                        border: '1px solid var(--color-border)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        padding: '0.25rem 0.6rem',
                                                        fontSize: '0.72rem',
                                                        color: 'var(--color-gold)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    View Tenant in Directory →
                                                </button>

                                                {isExpiry && (
                                                    <button
                                                        onClick={() => {
                                                            const targetUser = users.find(u => u.id === notif.userId || u.email === notif.email);
                                                            if (targetUser) setUserToUpdate(targetUser);
                                                        }}
                                                        style={{
                                                            background: 'rgba(245, 158, 11, 0.1)',
                                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            padding: '0.25rem 0.6rem',
                                                            fontSize: '0.72rem',
                                                            color: 'var(--color-warning)',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Adjust License
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => {
                                                        const targetUser = users.find(u => u.id === notif.userId || u.email === notif.email);
                                                        if (targetUser) setUserToResetPassword(targetUser);
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: '1px solid var(--color-border)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        padding: '0.25rem 0.6rem',
                                                        fontSize: '0.72rem',
                                                        color: 'var(--color-text-muted)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Reset Password
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* License Duration Update Modal */}
            {userToUpdate && createPortal(
                <div className="superadmin-overlay" style={{ zIndex: 10000 }}>
                    <div className="superadmin-modal-card superadmin-modal-card--small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} /> Adjust License Duration
                            </h3>
                            <button
                                onClick={() => setUserToUpdate(null)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
                            Tenant Email: <strong style={{ color: 'var(--color-text)' }}>{userToUpdate.email}</strong><br />
                            Current Expiry: <strong style={{ color: 'var(--color-gold)' }}>{userToUpdate.subscription_expires_at ? fmtDate(userToUpdate.subscription_expires_at) : 'No Limit'}</strong>
                        </p>

                        <form onSubmit={handleUpdateSubscription}>
                            <div style={{ marginBottom: 'var(--space-md)' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text)', marginBottom: '4px', fontWeight: 600 }}>
                                    Select Extension Preset
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
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>OR SPECIFY EXACT DATE</span>
                                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
                            </div>

                            <div style={{ marginBottom: 'var(--space-lg)' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text)', marginBottom: '4px', fontWeight: 600 }}>
                                    Target Expiry Date
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
            , document.body)}

            {/* Password Reset Modal (For Forgotten Passwords) */}
            {userToResetPassword && createPortal(
                <div className="superadmin-overlay" style={{ zIndex: 10000 }}>
                    <div className="superadmin-modal-card superadmin-modal-card--small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Key size={18} /> Reset Tenant Password
                            </h3>
                            <button
                                onClick={closeResetModal}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {!generatedPassword ? (
                            <>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
                                    Generate a new temporary password for <strong style={{ color: 'var(--color-text)' }}>{userToResetPassword.email}</strong>.
                                </p>

                                <div style={{
                                    background: 'var(--color-surface-alt)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-md)',
                                    marginBottom: 'var(--space-lg)',
                                    fontSize: '0.78rem',
                                    color: 'var(--color-text-muted)'
                                }}>
                                    <div style={{ fontWeight: 600, color: 'var(--color-gold)', marginBottom: '4px' }}>
                                        🔒 Zero-Knowledge Security Notice
                                    </div>
                                    Original user passwords cannot be retrieved because passwords are encrypted using one-way bcrypt hashing. Setting a temporary password allows the user to log in and set their own private password in their Profile.
                                </div>

                                <form onSubmit={handleResetPassword}>
                                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text)', marginBottom: '4px', fontWeight: 600 }}>
                                            Custom Temporary Password (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={customTempPassword}
                                            onChange={(e) => setCustomTempPassword(e.target.value)}
                                            placeholder="Leave empty to auto-generate a secure password..."
                                            style={dateInputStyle}
                                        />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '4px', display: 'block' }}>
                                            If left blank, the system will auto-generate a strong temporary password.
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={closeResetModal}
                                            style={{ padding: '0.5rem 1rem' }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={resettingPassword}
                                            style={{ padding: '0.5rem 1.25rem' }}
                                        >
                                            {resettingPassword ? 'Resetting...' : 'Generate Temporary Password'}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div>
                                <div style={{
                                    background: 'var(--color-success-soft)',
                                    border: '1px solid var(--color-success)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-md)',
                                    marginBottom: 'var(--space-lg)',
                                    textAlign: 'center'
                                }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                                        ✓ TEMPORARY PASSWORD CREATED
                                    </span>
                                    
                                    <div style={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '0.75rem',
                                        fontSize: '1.1rem',
                                        fontFamily: 'monospace',
                                        fontWeight: 700,
                                        color: 'var(--color-gold)',
                                        letterSpacing: '1px',
                                        wordBreak: 'break-all',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>{generatedPassword}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyTempPass(generatedPassword)}
                                            title="Copy temporary password"
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: copiedTempPass ? 'var(--color-success)' : 'var(--color-gold)',
                                                padding: '4px'
                                            }}
                                        >
                                            {copiedTempPass ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>

                                    {copiedTempPass && (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', marginTop: '4px', display: 'block' }}>
                                            Copied to clipboard!
                                        </span>
                                    )}
                                </div>

                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
                                    Share this temporary password with <strong>{userToResetPassword.email}</strong>. Once they log in, advise them to immediately navigate to <strong>Profile / Settings</strong> to choose their new private password.
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={closeResetModal}
                                        style={{ padding: '0.5rem 1.25rem' }}
                                    >
                                        Done
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            , document.body)}

            <style>{`
                .superadmin-overlay {
                    position: fixed;
                    inset: 0;
                    background-color: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(8px);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    overflow-y: auto;
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
                    max-width: 480px;
                }

                @media (max-width: 768px) {
                    .superadmin-modal-card {
                        padding: var(--space-lg);
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
