import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/clients': 'Clients',
    '/trades': 'Trades',
};

export default function Navbar({ onMenuToggle, theme, onThemeToggle }) {
    const { pathname } = useLocation();
    const title = PAGE_TITLES[pathname] ?? 'AJ Consulting';

    return (
        <header className="navbar">
            {/* Mobile hamburger */}
            <button
                className="navbar__menu-btn"
                onClick={onMenuToggle}
                aria-label="Toggle sidebar"
            >
                ☰
            </button>

            {/* Page title */}
            <h1 className="navbar__title">{title}</h1>

            {/* Right-side controls */}
            <div className="navbar__actions">
                {/* Dark / Light mode toggle */}
                <button
                    className="navbar__theme-toggle"
                    onClick={onThemeToggle}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </div>
        </header>
    );
}
