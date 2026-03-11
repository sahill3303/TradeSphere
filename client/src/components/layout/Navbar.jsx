import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/clients': 'Clients',
    '/trades': 'Trades',
    '/trades/open': 'Open Trade',
};

export default function Navbar({ onMenuToggle }) {
    const { pathname } = useLocation();
    // Match longest prefix
    const title = Object.entries(PAGE_TITLES)
        .find(([path]) => pathname === path || pathname.startsWith(path + '/') || pathname === path)?.[1]
        ?? 'AJ Consulting';

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
