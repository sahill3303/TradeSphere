import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatWidget from '../ui/ChatWidget';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Force dark theme always (Black+Gold design)
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
    }, []);

    const toggleSidebar = () => setSidebarOpen(prev => !prev);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="layout">
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            <div className="layout__main">
                <Navbar onMenuToggle={toggleSidebar} />
                <main className="layout__content" id="main-content">
                    {children}
                </main>
            </div>
            
            <ChatWidget />
        </div>
    );
}
