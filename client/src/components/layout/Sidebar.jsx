import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '⊞', key: 'dashboard' },
    { to: '/watchlist', label: 'Watchlist', icon: '📈', key: 'watchlist' },
    { to: '/clients', label: 'Clients', icon: '◎', key: 'clients' },
    { to: '/trades', label: 'Trades', icon: '◈', key: 'trades' },
    { to: '/analysis', label: 'Research', icon: '🔬', key: 'analysis' },
    { to: '/notes', label: 'Notes', icon: '📝', key: 'notes' },
];

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();
    const { sidebarFeatures } = usePreferences();

    return (
        <>
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
            )}

            <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
                {/* Brand */}
                <div className="sidebar__brand">
                    <div className="sidebar__logo">
                        <img src="src\assets\TS2.png" alt="" />

                    </div>
                    <span className="sidebar__brand-name">TradeSphere</span>
                </div>

                {/* Navigation */}
                <nav className="sidebar__nav" aria-label="Main navigation">
                    <ul className="sidebar__list">
                        {navItems
                            .filter(item => item.key === 'dashboard' || sidebarFeatures[item.key])
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
                        ))}
                    </ul>
                </nav>

                <div className="sidebar__settings" style={{ marginTop: 'auto', padding: '0 1rem', marginBottom: '1rem' }}>
                    <NavLink
                        to="/settings"
                        onClick={onClose}
                        className={({ isActive }) =>
                            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                        }
                    >
                        <span className="sidebar__icon">⚙️</span>
                        <span className="sidebar__label">Settings</span>
                    </NavLink>
                </div>

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
                    <button className="sidebar__logout" onClick={() => {
                        if (window.confirm('Are you sure you want to log out?')) logout();
                    }} aria-label="Logout">
                        ⭳ Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
