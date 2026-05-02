import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import './Settings.css';

export default function Settings() {
    const { toggleTheme, isDarkMode, accentColor, setAccentColor } = useTheme();
    const { sidebarFeatures, toggleFeature } = usePreferences();

    const colors = [
        { id: 'gold', hex: '#D4AF37', label: 'Classic Gold' },
        { id: 'green', hex: '#22C55E', label: 'Bullish Green' },
        { id: 'blue', hex: '#3B82F6', label: 'Pro Blue' },
        { id: 'red', hex: '#EF4444', label: 'Bearish Red' },
    ];

    const features = [
        { id: 'watchlist', label: 'Watchlist', icon: '📈', desc: 'Track your customized stock lists and prices.' },
        { id: 'clients', label: 'Clients', icon: '◎', desc: 'Manage client portfolios and onboarding.' },
        { id: 'trades', label: 'Trades', icon: '◈', desc: 'Log and monitor active or past trades.' },
        { id: 'analysis', label: 'Research', icon: '🔬', desc: 'Perform AI-driven stock research and analysis.' },
        { id: 'notes', label: 'Notes', icon: '📝', desc: 'Keep a personal trading journal.' },
    ];

    return (
        <div className="settings-page">
            <header className="settings-header">
                <h2>Configurations</h2>
                <p>Manage your preferences and interface settings.</p>
            </header>

            <div className="settings-grid">
                {/* Appearance Section */}
                <section className="settings-card">
                    <div className="settings-card-header">
                        <h3>🎨 Appearance</h3>
                        <p>Customize the look and feel of TradeSphere.</p>
                    </div>

                    <div className="settings-item">
                        <div className="settings-item-info">
                            <h4>Theme Mode</h4>
                            <p>Switch between Light and Dark interface.</p>
                        </div>
                        <button className="settings-toggle-btn" onClick={toggleTheme}>
                            {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                        </button>
                    </div>

                    <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                        <div className="settings-item-info">
                            <h4>Accent Color</h4>
                            <p>Choose your primary highlight color.</p>
                        </div>
                        <div className="settings-colors-grid">
                            {colors.map(c => (
                                <button
                                    key={c.id}
                                    className={`settings-color-btn ${accentColor === c.id ? 'active' : ''}`}
                                    onClick={() => setAccentColor(c.id)}
                                >
                                    <span className="color-swatch" style={{ background: c.hex }} />
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Navigation Section */}
                <section className="settings-card">
                    <div className="settings-card-header">
                        <h3>🧭 Sidebar Navigation</h3>
                        <p>Toggle modules on or off to keep your workspace clean.</p>
                    </div>

                    <div className="settings-features-list">
                        {features.map(f => (
                            <div key={f.id} className="settings-item">
                                <div className="settings-item-info">
                                    <h4>{f.icon} {f.label}</h4>
                                    <p>{f.desc}</p>
                                </div>
                                <label className="settings-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={sidebarFeatures[f.id]} 
                                        onChange={() => toggleFeature(f.id)} 
                                    />
                                    <span className="settings-slider"></span>
                                </label>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
