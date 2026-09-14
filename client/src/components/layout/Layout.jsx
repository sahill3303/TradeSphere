import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import TickerBar from './TickerBar';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem('ts_sidebar_collapsed');
        return stored ? JSON.parse(stored) : false;
    });

    useEffect(() => {
        localStorage.setItem('ts_sidebar_collapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const toggleMobileMenu = () => setSidebarOpen(prev => !prev);
    const closeMobileMenu = () => setSidebarOpen(false);
    
    const toggleDesktopCollapse = () => setIsCollapsed(prev => !prev);

    return (
        <div className={`layout ${isCollapsed ? 'layout--collapsed' : ''}`}>
            <Sidebar 
                isOpen={sidebarOpen} 
                isCollapsed={isCollapsed} 
                onClose={closeMobileMenu} 
            />

            <div className="layout__main">
                <TickerBar />
                <Navbar 
                    onMenuToggle={toggleMobileMenu} 
                    isCollapsed={isCollapsed} 
                    onCollapseToggle={toggleDesktopCollapse} 
                />
                <main className="layout__content" id="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
