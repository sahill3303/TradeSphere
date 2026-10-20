import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import TickerBar from './TickerBar';
import ForcePasswordResetModal from '../auth/ForcePasswordResetModal';

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

    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        };
    }, [sidebarOpen]);

    const toggleMobileMenu = () => setSidebarOpen(prev => !prev);
    const closeMobileMenu = () => setSidebarOpen(false);
    
    const toggleDesktopCollapse = () => setIsCollapsed(prev => !prev);

    return (
        <div className={`layout ${isCollapsed ? 'layout--collapsed' : ''}`}>
            <div className="layout__topbar">
                {!isSuperAdmin && <TickerBar />}
                <Navbar 
                    onMenuToggle={toggleMobileMenu} 
                    isCollapsed={isCollapsed} 
                    onCollapseToggle={toggleDesktopCollapse} 
                    isSidebarOpen={sidebarOpen}
                />
            </div>

            {!isSuperAdmin && (
                <Sidebar 
                    isOpen={sidebarOpen} 
                    isCollapsed={isCollapsed} 
                    onClose={closeMobileMenu} 
                />
            )}

            <div className="layout__main" style={isSuperAdmin ? { marginLeft: 0, maxWidth: '100%' } : {}}>
                <main className="layout__content" id="main-content">
                    {children}
                </main>
            </div>

            <ForcePasswordResetModal />
        </div>
    );
}
