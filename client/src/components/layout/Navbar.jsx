import { useState, useRef, useEffect } from 'react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { 
    Menu, Sun, Moon, User, Settings, LogOut, 
    ChevronDown, Briefcase, TrendingUp, Shield
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import TS2Logo from '../../assets/TS2.png';

const PAGE_CONFIG = {
    '/dashboard': { title: 'Dashboard', section: 'Market' },
    '/watchlist': { title: 'Watchlist', section: 'Market' },
    '/intelligence': { title: 'Intelligence', section: 'Market' },
    '/trades/open': { title: 'Open Trade', section: 'Trading' },
    '/trades': { title: 'Trades', section: 'Trading' },
    '/paper-trade': { title: 'Paper Trading', section: 'Trading' },
    '/analysis': { title: 'Research', section: 'Research' },
    '/notes': { title: 'Notes', section: 'Research' },
    '/clients': { title: 'Clients', section: 'Management' },
    '/settings': { title: 'Settings', section: 'System' },
    '/profile': { title: 'Profile', section: 'Account' },
    '/super-admin': { title: 'Super Admin', section: 'Administration' },
};

function getMarketStatus() {
    try {
        const now = new Date();
        const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const ist = new Date(istString);
        const day = ist.getDay(); // 0: Sun, 6: Sat
        const hours = ist.getHours();
        const minutes = ist.getMinutes();
        const totalMins = hours * 60 + minutes;

        const isWeekend = day === 0 || day === 6;
        const isPreMarket = !isWeekend && totalMins >= 540 && totalMins < 555; // 09:00 - 09:15 IST
        const isLive = !isWeekend && totalMins >= 555 && totalMins < 930;      // 09:15 - 15:30 IST

        const timeStr = ist.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).toUpperCase();

        if (isLive) {
            return { type: 'live', label: 'NSE LIVE', time: timeStr };
        }
        if (isPreMarket) {
            return { type: 'pre', label: 'PRE-MARKET', time: timeStr };
        }
        return { type: 'closed', label: 'MARKET CLOSED', time: timeStr };
    } catch {
        return { type: 'closed', label: 'NSE CLOSED', time: '' };
    }
}

export default function Navbar({ onMenuToggle, isCollapsed, onCollapseToggle, isSidebarOpen }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { toggleTheme, isDarkMode } = useTheme();
    const { user, logout } = useAuth();
    const confirm = useConfirm();
    
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [marketStatus, setMarketStatus] = useState(getMarketStatus);

    // Update market status every 30 seconds
    useEffect(() => {
        setMarketStatus(getMarketStatus());
        const timer = setInterval(() => {
            setMarketStatus(getMarketStatus());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

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

    // Ensure dropdown is always closed when sidebar opens
    useEffect(() => {
        if (isSidebarOpen) {
            setDropdownOpen(false);
        }
    }, [isSidebarOpen]);

    const handleLogout = () => {
        setDropdownOpen(false);
        confirm({
            title: 'Confirm Logout',
            message: 'Are you sure you want to end your session? You will need to sign in again to access your dashboard.',
            variant: 'danger',
            onConfirm: logout
        });
    };

    // Current page configuration
    const currentConfig = Object.entries(PAGE_CONFIG)
        .find(([path]) => pathname === path || (path !== '/' && pathname.startsWith(path + '/')))?.[1]
        ?? { title: 'TradeSphere', section: 'Terminal' };

    return (
        <header className="navbar">
            {/* Left section: Sidebar toggle, Brand & Breadcrumbs */}
            <div className="navbar__left">
                {!pathname.startsWith('/super-admin') && (
                    <button
                        className="navbar__menu-btn"
                        onClick={() => {
                            if (window.innerWidth > 768) {
                                onCollapseToggle();
                            } else {
                                setDropdownOpen(false);
                                onMenuToggle();
                            }
                        }}
                        aria-label="Toggle sidebar"
                        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <Menu size={20} />
                    </button>
                )}

                <NavLink to="/dashboard" className="navbar__brand-container" title="TradeSphere Home">
                    <img src={TS2Logo} alt="TradeSphere Logo" className="navbar__logo-img" />
                    <span className="navbar__brand-text hide-mobile">
                        Trade<span className="text-gold">Sphere</span>
                    </span>
                </NavLink>

                {/* Sleek Breadcrumb for desktop navigation */}
                <div className="navbar__divider hide-mobile" />
                <div className="navbar__breadcrumb hide-mobile">
                    <span className="navbar__breadcrumb-section">{currentConfig.section}</span>
                    <span className="navbar__breadcrumb-sep">/</span>
                    <span className="navbar__breadcrumb-current">{currentConfig.title}</span>
                </div>
            </div>

            {/* Center section: Live Market Status Indicator */}
            <div className="navbar__center">
                <div 
                    className={`navbar__market-status navbar__market-status--${marketStatus.type}`}
                    title="Indian Market Trading Hours: Mon-Fri 09:15 AM - 03:30 PM IST"
                >
                    <span className={`market-dot market-dot--${marketStatus.type}`} />
                    <span className="market-label">{marketStatus.label}</span>
                    {marketStatus.time && (
                        <span className="market-time hide-mobile">{marketStatus.time} IST</span>
                    )}
                </div>
            </div>

            {/* Right section: Theme switch, Profile */}
            <div className="navbar__actions">
                {/* Theme Toggle Switch */}
                <button 
                    className={`theme-toggle-switch ${isDarkMode ? 'theme-toggle-switch--dark' : 'theme-toggle-switch--light'}`}
                    onClick={toggleTheme}
                    title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
                >
                    <div className="theme-toggle-switch__thumb"></div>
                    <div className="theme-toggle-switch__icons">
                        <Sun size={13} className="theme-toggle-switch__icon theme-toggle-switch__icon--sun" />
                        <Moon size={13} className="theme-toggle-switch__icon theme-toggle-switch__icon--moon" />
                    </div>
                </button>

                {/* User Profile Dropdown */}
                <div className="navbar__user-menu" ref={dropdownRef}>
                    <button 
                        className={`navbar__user-btn ${dropdownOpen ? 'navbar__user-btn--active' : ''}`}
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        aria-expanded={dropdownOpen}
                        title="User account menu"
                    >
                        <div className="navbar__user-avatar">
                            {user?.name?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <div className="navbar__user-info hide-mobile">
                            <span className="navbar__user-name">
                                {user?.name ? user.name.split(' ')[0] : 'User'}
                            </span>
                        </div>
                        <ChevronDown 
                            size={14} 
                            className={`navbar__user-chevron ${dropdownOpen ? 'navbar__user-chevron--open' : ''} hide-mobile`} 
                        />
                    </button>

                    {/* Enhanced Dropdown Menu */}
                    {dropdownOpen && (
                        <div className="navbar__dropdown">
                            <div className="navbar__dropdown-header">
                                <div className="navbar__dropdown-avatar">
                                    {user?.name?.[0]?.toUpperCase() ?? 'U'}
                                </div>
                                <div className="navbar__dropdown-user-details">
                                    <div className="navbar__dropdown-name">{user?.name ?? 'User'}</div>
                                    <div className="navbar__dropdown-email">{user?.email ?? ''}</div>
                                </div>
                            </div>
                            
                            <div className="navbar__dropdown-section">
                                <NavLink to="/profile" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <User size={15} />
                                    <span>My Profile</span>
                                </NavLink>
                                <NavLink to="/paper-trade" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <Briefcase size={15} />
                                    <span>Paper Portfolio</span>
                                </NavLink>
                                <NavLink to="/settings" className="navbar__dropdown-item" onClick={() => setDropdownOpen(false)}>
                                    <Settings size={15} />
                                    <span>Preferences & Security</span>
                                </NavLink>
                            </div>
                            
                            <div className="navbar__dropdown-divider" />
                            
                            <button 
                                className="navbar__dropdown-item navbar__dropdown-item--danger" 
                                onClick={handleLogout}
                            >
                                <LogOut size={15} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
