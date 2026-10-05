import { NavLink } from 'react-router-dom';
import { TrendingUp, Briefcase, FileText, Shield, Settings, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useConfirm } from '../../context/ConfirmContext';
import TS2Logo from '../../assets/TS2.png';

const navGroups = [
    {
        title: 'MARKET',
        items: [
            { to: '/dashboard',    label: 'Dashboard',    icon: '⊞',  key: 'dashboard' },
            { to: '/watchlist',    label: 'Watchlist',    icon: <TrendingUp size={18} />, key: 'watchlist' },
            { to: '/intelligence', label: 'Intelligence', icon: <Zap size={18} />, key: 'intelligence', alwaysShow: true },
        ]
    },
    {
        title: 'TRADING',
        items: [
            { to: '/trades',       label: 'Trades',       icon: '◈',  key: 'trades' },
            { to: '/paper-trade',  label: 'Paper Trading',icon: <Briefcase size={18} />, key: 'paperTrade' },
        ]
    },
    {
        title: 'RESEARCH',
        items: [
            { to: '/analysis',     label: 'Research',     icon: '🔬', key: 'analysis' },
            { to: '/notes',        label: 'Notes',        icon: <FileText size={18} />, key: 'notes' },
        ]
    },
    {
        title: 'MANAGEMENT',
        items: [
            { to: '/clients',      label: 'Clients',      icon: '◎',  key: 'clients' },
        ]
    }
];

export default function Sidebar({ isOpen, isCollapsed, onClose }) {
    const { user } = useAuth();
    const { sidebarFeatures } = usePreferences();
    const confirm = useConfirm();



    return (
        <>
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
            )}

            <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>


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
                            navGroups.map((group) => {
                                const visibleItems = group.items.filter(item => item.alwaysShow || item.key === 'dashboard' || (sidebarFeatures?.[item.key] ?? true));
                                if (visibleItems.length === 0) return null;
                                
                                return (
                                    <li key={group.title} className="sidebar__group">
                                        <div className="sidebar__group-title">{group.title}</div>
                                        <ul className="sidebar__list">
                                            {visibleItems.map(({ to, label, icon }) => (
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
                                            ))}
                                        </ul>
                                    </li>
                                );
                            })
                        )}
                        {user?.role !== 'superadmin' && (
                            <li className="sidebar__item" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
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
                            </li>
                        )}
                    </ul>
                </nav>

            </aside>
        </>
    );
}
