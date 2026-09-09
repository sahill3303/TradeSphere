import { NavLink } from 'react-router-dom';
import { TrendingUp, Briefcase, FileText, Shield, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useConfirm } from '../../context/ConfirmContext';
import TS2Logo from '../../assets/TS2.png';

const navItems = [
    { to: '/dashboard',    label: 'Dashboard',    icon: '⊞',  key: 'dashboard' },
    { to: '/watchlist',    label: 'Watchlist',    icon: <TrendingUp size={18} />, key: 'watchlist' },
    { to: '/intelligence', label: 'Intelligence', icon: '⚡', key: 'intelligence', alwaysShow: true },
    { to: '/clients',      label: 'Clients',      icon: '◎',  key: 'clients' },
    { to: '/trades',       label: 'Trades',       icon: '◈',  key: 'trades' },
    { to: '/paper-trade',  label: 'Paper Trading',icon: <Briefcase size={18} />, key: 'paperTrade' },
    { to: '/analysis',     label: 'Research',     icon: '🔬', key: 'analysis' },
    { to: '/notes',        label: 'Notes',        icon: <FileText size={18} />, key: 'notes' },
];

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();
    const { sidebarFeatures } = usePreferences();
    const confirm = useConfirm();

    const handleLogout = () => {
        confirm({
            title: 'Confirm Logout',
            message: 'Are you sure you want to end your session? You will need to sign in again to access your dashboard.',
            variant: 'danger',
            onConfirm: logout
        });
    };

    return (
        <>
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
            )}

            <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
                {/* Brand */}
                <div className="sidebar__brand">
                    <div className="sidebar__logo">
                        <img src={TS2Logo} alt="TradeSphere Logo" />

                    </div>
                    <span className="sidebar__brand-name">TradeSphere</span>
                </div>

                {/* Navigation */}
                <nav className="sidebar__nav" aria-label="Main navigation">
                    <ul className="sidebar__list">
                        {user?.role === 'superadmin' ? (
                            <li className="sidebar__item">
                                <NavLink
                                    to="/super-admin"
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                        `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                    }
                                >
                                    <span className="sidebar__icon"><Shield size={18} /></span>
                                    <span className="sidebar__label">Super Admin</span>
                                </NavLink>
                            </li>
                        ) : (
                            navItems
                                .filter(item => item.alwaysShow || item.key === 'dashboard' || (sidebarFeatures?.[item.key] ?? true))
                                .map(({ to, label, icon }) => (
                                <li key={to} className="sidebar__item">
                                    <NavLink
                                        to={to}
                                        onClick={onClose}
                                        className={({ isActive }) =>
                                            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                        }
                                    >
                                        <span className="sidebar__icon">{icon}</span>
                                        <span className="sidebar__label">{label}</span>
                                    </NavLink>
                                </li>
                            ))
                        )}
                    </ul>
                </nav>

                {user?.role !== 'superadmin' && (
                    <div className="sidebar__settings" style={{ marginTop: 'auto', padding: '0 0.75rem', marginBottom: '1rem' }}>
                        <NavLink
                            to="/settings"
                            onClick={onClose}
                            className={({ isActive }) =>
                                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                            }
                        >
                            <span className="sidebar__icon"><Settings size={18} /></span>
                            <span className="sidebar__label">Settings</span>
                        </NavLink>
                    </div>
                )}

                {/* User + Logout */}
                <div className="sidebar__footer">
                    <div className="sidebar__user">
                        <div className="sidebar__avatar">
                            {user?.name?.[0]?.toUpperCase() ?? 'U'}
                            {/* for profile img */}
                        </div>
                        <div className="sidebar__user-info">
                            <span className="sidebar__user-name">{user?.name ?? 'User'}</span>
                            <span className="sidebar__user-email">{user?.email ?? ''}</span>
                        </div>
                    </div>
                    <button className="sidebar__logout" onClick={handleLogout} aria-label="Logout">
                        ⭳ Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
