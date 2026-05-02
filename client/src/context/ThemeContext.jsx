import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const ThemeContext = createContext();

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');
    const [accentColor, setAccentColorState] = useState('gold');
    // token is only available after login; read it lazily
    const getToken = () => localStorage.getItem('token');

    // When app loads, apply whatever is in localStorage as a fast initial paint
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        const savedColor = localStorage.getItem('accentColor') || 'gold';
        setTheme(savedTheme);
        setAccentColorState(savedColor);
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.documentElement.setAttribute('data-color', savedColor);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-color', accentColor);
        localStorage.setItem('accentColor', accentColor);
    }, [accentColor]);

    const persistPreferences = useCallback(async (newTheme, newColor) => {
        if (!getToken()) return;
        try {
            // Merge into existing preferences
            const res = await api.get('/auth/me');
            const existing = res.data?.preferences || {};
            await api.put('/auth/preferences', {
                preferences: { ...existing, theme: newTheme, accentColor: newColor }
            });
        } catch (_) { /* fail silently — local state is fine */ }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            persistPreferences(next, accentColor);
            return next;
        });
    }, [accentColor, persistPreferences]);

    const setAccentColor = useCallback((color) => {
        setAccentColorState(color);
        persistPreferences(theme, color);
    }, [theme, persistPreferences]);

    // Called after login to hydrate theme from backend preferences
    const hydrateFromPreferences = useCallback((preferences) => {
        if (!preferences) return;
        if (preferences.theme) setTheme(preferences.theme);
        if (preferences.accentColor) setAccentColorState(preferences.accentColor);
    }, []);

    const isDarkMode = theme === 'dark';

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode, accentColor, setAccentColor, hydrateFromPreferences }}>
            {children}
        </ThemeContext.Provider>
    );
}
