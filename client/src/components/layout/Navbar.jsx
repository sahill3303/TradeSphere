import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/clients': 'Clients',
    '/trades': 'Trades',
    '/trades/open': 'Open Trade',
};

export default function Navbar({ onMenuToggle }) {
    const { pathname } = useLocation();
    const { toggleTheme, isDarkMode, accentColor, setAccentColor } = useTheme();
    // Match longest prefix
    const title = Object.entries(PAGE_TITLES)
        .find(([path]) => pathname === path || pathname.startsWith(path + '/') || pathname === path)?.[1]
        ?? 'TradeSphere';

    const colors = [
        { id: 'gold', hex: '#D4AF37' },
        { id: 'green', hex: '#22C55E' },
        { id: 'blue', hex: '#3B82F6' },
        { id: 'red', hex: '#EF4444' },
    ];

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
                <div className="navbar__theme-colors" style={{ display: 'flex', gap: '6px', marginRight: '10px' }}>
                    {colors.map(c => (
                        <button
                            key={c.id}
                            title={`Theme: ${c.id}`}
                            onClick={() => setAccentColor(c.id)}
                            style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: c.hex,
                                border: accentColor === c.id ? '2px solid var(--color-text)' : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                padding: 0
                            }}
                        />
                    ))}
                </div>
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
