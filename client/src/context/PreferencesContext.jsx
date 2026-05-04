import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const PreferencesContext = createContext();

export function usePreferences() {
    return useContext(PreferencesContext);
}

const DEFAULT_FEATURES = {
    watchlist: true,
    clients: true,
    trades: true,
    analysis: true,
    notes: true
};

const DEFAULT_CHARTS = [
    { symbol: 'NSE:NIFTY', label: 'NIFTY 50', accentColor: '#D4AF37' },
    { symbol: 'NSE:BANKNIFTY', label: 'BANK NIFTY', accentColor: '#60A5FA' },
    { symbol: 'DJI', label: 'DOW JONES', accentColor: '#EF4444' },
    { symbol: 'IXIC', label: 'NASDAQ', accentColor: '#34D399' }
];

export function PreferencesProvider({ children }) {
    const { user, token, updateUserPreferences } = useAuth();

    const [sidebarFeatures, setSidebarFeatures] = useState(DEFAULT_FEATURES);
    const [dashboardCharts, setDashboardCharts] = useState(DEFAULT_CHARTS);

    useEffect(() => {
        if (user?.preferences?.sidebarFeatures) {
            setSidebarFeatures(user.preferences.sidebarFeatures);
        } else {
            setSidebarFeatures(DEFAULT_FEATURES);
        }

        if (user?.preferences?.dashboardCharts) {
            setDashboardCharts(user.preferences.dashboardCharts);
        } else {
            setDashboardCharts(DEFAULT_CHARTS);
        }
    }, [user]);

    // Persist preferences to backend
    const savePreferences = useCallback(async (newFeatures, newCharts) => {
        if (!token) return;
        const updatedPreferences = {
            ...(user?.preferences || {}),
            sidebarFeatures: newFeatures || sidebarFeatures,
            dashboardCharts: newCharts || dashboardCharts
        };
        try {
            await api.put('/auth/preferences', { preferences: updatedPreferences });
            if (updateUserPreferences) updateUserPreferences(updatedPreferences);
        } catch (err) {
            console.error('Failed to save preferences:', err.message);
        }
    }, [token, user, updateUserPreferences, sidebarFeatures, dashboardCharts]);

    const toggleFeature = useCallback((feature) => {
        setSidebarFeatures(prev => {
            const updated = { ...prev, [feature]: !prev[feature] };
            savePreferences(updated, null);
            return updated;
        });
    }, [savePreferences]);

    const updateDashboardCharts = useCallback((newCharts) => {
        setDashboardCharts(newCharts);
        savePreferences(null, newCharts);
    }, [savePreferences]);

    return (
        <PreferencesContext.Provider value={{ sidebarFeatures, toggleFeature, dashboardCharts, updateDashboardCharts }}>
            {children}
        </PreferencesContext.Provider>
    );
}
