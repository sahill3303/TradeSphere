import { useState, useRef, useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { Menu, Sun, Moon, PanelLeftClose, PanelLeftOpen, User, Settings, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/clients': 'Clients',
    '/trades': 'Trades',
    '/trades/open': 'Open Trade',
    '/paper-trade': 'Paper Trading & Portfolio',
};

export default function Navbar({ onMenuToggle, isCollapsed, onCollapseToggle }) {
    const { pathname } = useLocation();
    const { toggleTheme, isDarkMode } = useTheme();
    const { user, logout } = useAuth();
    const confirm = useConfirm();
    
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setDropdownOpen(false);
        confirm({
            title: 'Confirm Logout',
            message: 'Are you sure you want to end your session? You will need to sign in again to access your dashboard.',
            variant: 'danger',
            onConfirm: logout
        });
    };

    // Match longest prefix
    const title = Object.entries(PAGE_TITLES)
        .find(([path]) => pathname === path || pathname.startsWith(path + '/') || pathname === path)?.[1]
        ?? 'TradeSphere';

    return (
        <header className="navbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                {/* Mobile Off-canvas menu toggle */}
                <button
                    className="navbar__menu-btn hide-desktop"
                    onClick={onMenuToggle}
                    aria-label="Toggle mobile sidebar"
                >
                    <Menu size={24} />
                </button>

                <h1 className="navbar__title">{title}</h1>
            </div>

            <div className="navbar__actions">
                {/* Desktop Collapse toggle */}
                <button
                    className="navbar__menu-btn hide-mobile"
                    onClick={onCollapseToggle}
                    aria-label="Toggle sidebar collapse"
                    style={{ transition: 'transform 0.3s ease' }}
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                </button>
                <button 
                    className={`theme-toggle-switch ${isDarkMode ? 'theme-toggle-switch--dark' : 'theme-toggle-switch--light'}`}
                    onClick={toggleTheme}
                    title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
                >
                    <div className="theme-toggle-switch__thumb"></div>
                    <div className="theme-toggle-switch__icons">
                        <Sun size={14} className="theme-toggle-switch__icon theme-toggle-switch__icon--sun" />
                        <Moon size={14} className="theme-toggle-switch__icon theme-toggle-switch__icon--moon" />
                    </div>
                </button>
                


                {/* User Profile Dropdown */}
                <div className="navbar__user-menu" ref={dropdownRef} style={{ position: 'relative' }}>
                    <button 
                        className="navbar__user-btn" 
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            padding: '0.3rem 0.75rem',
                            paddingLeft: '0.3rem',
                            borderRadius: '2rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'var(--color-gold-soft)',
                            color: 'var(--color-gold)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '0.85rem'
                        }}>
                            {user?.name?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }} className="hide-mobile">
                            {user?.name ?? 'User'}
                        </span>
                    </button>

                    {/* Dropdown Box */}
                    {dropdownOpen && (
                        <div className="navbar__dropdown" style={{
                            position: 'absolute',
                            top: 'calc(100% + 0.5rem)',
                            right: 0,
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-md)',
                            minWidth: '200px',
                            zIndex: 1000,
                            padding: '0.5rem',
                            animation: 'dropdownFadeIn 0.2s ease forwards'
                        }}>
                            <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>{user?.name ?? 'User'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{user?.email ?? ''}</div>
                            </div>
                            
                            <NavLink to="/profile" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                <User size={16} /> Profile
                            </NavLink>
                            <NavLink to="/settings" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                <Settings size={16} /> Settings
                            </NavLink>
                            
                            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }}></div>
                            
                            <button 
                                className="navbar__dropdown-item navbar__dropdown-item--danger" 
                                onClick={handleLogout}
                                style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent' }}
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
