import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // true until session check completes

    // ─── Session restore on app load ───────────────────────────────────────────
    // If a token exists in localStorage, call GET /api/auth/me to restore the
    // admin object into state (avoids stale user data from localStorage).
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            setLoading(false);
            return;
        }

        api.get('/api/auth/me')
            .then(({ data }) => {
                // Backend returns the admin object directly
                setUser(data);
                setToken(storedToken);
            })
            .catch(() => {
                // Token invalid / expired — clear everything
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []); // runs once on mount

    // ─── Login ─────────────────────────────────────────────────────────────────
    const login = useCallback((newToken, adminData) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(adminData);
    }, []);

    // ─── Logout ────────────────────────────────────────────────────────────────
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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
