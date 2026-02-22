import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/clients', label: 'Clients', icon: '👥' },
    { to: '/trades', label: 'Trades', icon: '📈' },
];

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
            )}

            <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
                {/* Brand */}
                <div className="sidebar__brand">
                    <span className="sidebar__brand-icon">⚡</span>
                    <span className="sidebar__brand-name">AJ Consulting</span>
                </div>

                {/* Navigation */}
                <nav className="sidebar__nav" aria-label="Main navigation">
                    <ul className="sidebar__list">
                        {navItems.map(({ to, label, icon }) => (
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

                {/* User section at bottom */}
                <div className="sidebar__footer">
                    <div className="sidebar__user">
                        <div className="sidebar__avatar">
                            {user?.name?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <div className="sidebar__user-info">
                            <span className="sidebar__user-name">{user?.name ?? 'User'}</span>
                            <span className="sidebar__user-email">{user?.email ?? ''}</span>
                        </div>
                    </div>
                    <button className="sidebar__logout" onClick={logout} aria-label="Logout">
                        🚪 Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
