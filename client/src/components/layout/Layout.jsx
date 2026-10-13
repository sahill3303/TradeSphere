import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import TickerBar from './TickerBar';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem('ts_sidebar_collapsed');
        return stored ? JSON.parse(stored) : false;
    });
    
    const location = useLocation();
    const isSuperAdmin = location.pathname.startsWith('/super-admin');

    useEffect(() => {
        localStorage.setItem('ts_sidebar_collapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const toggleMobileMenu = () => setSidebarOpen(prev => !prev);
    const closeMobileMenu = () => setSidebarOpen(false);
    
    const toggleDesktopCollapse = () => setIsCollapsed(prev => !prev);

    return (
        <div className={`layout ${isCollapsed ? 'layout--collapsed' : ''}`}>
            <div className="layout__topbar">
                <TickerBar />
                <Navbar 
                    onMenuToggle={toggleMobileMenu} 
                    isCollapsed={isCollapsed} 
                    onCollapseToggle={toggleDesktopCollapse} 
                />
            </div>

            {!isSuperAdmin && (
                <Sidebar 
                    isOpen={sidebarOpen} 
                    isCollapsed={isCollapsed} 
                    onClose={closeMobileMenu} 
                />
            )}

            {sidebarOpen && !isSuperAdmin && (
                <div 
                    onClick={closeMobileMenu}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 998, backdropFilter: 'blur(2px)' }} 
                />
            )}

            <div className="layout__main" style={isSuperAdmin ? { marginLeft: 0, maxWidth: '100%' } : {}}>
                <main className="layout__content" id="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
