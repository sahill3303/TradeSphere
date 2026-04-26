import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/clients': 'Clients',
    '/trades': 'Trades',
    '/trades/open': 'Open Trade',
    '/profile': 'Profile',
};

export default function Navbar({ onMenuToggle }) {
    const { pathname } = useLocation();
    const { toggleTheme, isDarkMode } = useTheme();
    // Match longest prefix
    const title = Object.entries(PAGE_TITLES)
        .find(([path]) => pathname === path || pathname.startsWith(path + '/') || pathname === path)?.[1]
        ?? 'TradeSphere';

    return (
        <header className="navbar">
            <button
                className="navbar__menu-btn"
                onClick={onMenuToggle}
                aria-label="Toggle sidebar"
            >
                ☰
            </button>

            <h1 className="navbar__title">{title}</h1>

            <div className="navbar__actions">
                <button 
                    className="navbar__theme-toggle" 
                    onClick={toggleTheme}
                    title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
                >
                    {isDarkMode ? '☀️' : '🌙'}
                </button>
                <span style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-text-dim)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.3rem 0.7rem',
                    fontWeight: 500,
                    letterSpacing: '0.03em',
                }}>
                    {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
            </div>
        </header>
    );
}
//no changes made
