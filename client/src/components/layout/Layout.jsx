import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import TickerBar from './TickerBar';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(prev => !prev);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="layout">
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            <div className="layout__main">
                <TickerBar />
                <Navbar onMenuToggle={toggleSidebar} />
                <main className="layout__content" id="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
