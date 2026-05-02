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

export function PreferencesProvider({ children }) {
    const { user, token, updateUserPreferences } = useAuth();

    // Derive state from user.preferences (backend) when user is loaded
    const [sidebarFeatures, setSidebarFeatures] = useState(DEFAULT_FEATURES);

    useEffect(() => {
        if (user?.preferences?.sidebarFeatures) {
            setSidebarFeatures(user.preferences.sidebarFeatures);
        } else {
            setSidebarFeatures(DEFAULT_FEATURES);
        }
    }, [user]);

    // Persist preferences to backend
    const savePreferences = useCallback(async (newFeatures) => {
        if (!token) return;
        const updatedPreferences = {
            ...(user?.preferences || {}),
            sidebarFeatures: newFeatures
        };
        try {
            await api.put('/auth/preferences', { preferences: updatedPreferences });
            if (updateUserPreferences) updateUserPreferences(updatedPreferences);
        } catch (err) {
            console.error('Failed to save preferences:', err.message);
        }
    }, [token, user, updateUserPreferences]);

    const toggleFeature = useCallback((feature) => {
        setSidebarFeatures(prev => {
            const updated = { ...prev, [feature]: !prev[feature] };
            savePreferences(updated);
            return updated;
        });
    }, [savePreferences]);

    return (
        <PreferencesContext.Provider value={{ sidebarFeatures, toggleFeature }}>
            {children}
        </PreferencesContext.Provider>
    );
}
