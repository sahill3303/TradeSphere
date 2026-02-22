import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    // Apply theme class to <html> element whenever it changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () =>
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

    const toggleSidebar = () => setSidebarOpen((prev) => !prev);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="layout">
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            <div className="layout__main">
                <Navbar
                    onMenuToggle={toggleSidebar}
                    theme={theme}
                    onThemeToggle={toggleTheme}
                />
                <main className="layout__content" id="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
