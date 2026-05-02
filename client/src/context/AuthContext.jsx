import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Session restore on app load
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            setLoading(false);
            return;
        }

        api.get('/auth/me')
            .then(({ data }) => {
                setUser(data);
                setToken(storedToken);
            })
            .catch(() => {
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    // Login
    const login = useCallback((newToken, adminData) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(adminData);
    }, []);

    // Logout — also clear any local preference caches
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('sidebarFeatures');
        localStorage.removeItem('accentColor');
        localStorage.removeItem('theme');
        setToken(null);
        setUser(null);
    }, []);

    // Update local user state after preferences save (used by PreferencesContext)
    const updateUserPreferences = useCallback((preferences) => {
        setUser(prev => prev ? { ...prev, preferences } : prev);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUserPreferences }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

export default AuthContext;
