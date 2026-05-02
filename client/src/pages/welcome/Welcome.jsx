import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import './Welcome.css';

const FEATURES = [
    { id: 'watchlist', icon: '📈', label: 'Watchlist', desc: 'Track your stocks with live prices from Screener.in.' },
    { id: 'clients', icon: '◎', label: 'Clients', desc: 'Manage client portfolios and capital tracking.' },
    { id: 'trades', icon: '◈', label: 'Trades', desc: 'Log and analyse your trade entries & exits.' },
    { id: 'analysis', icon: '🔬', label: 'Research', desc: 'AI-powered stock research and analysis.' },
    { id: 'notes', icon: '📝', label: 'Notes', desc: 'Maintain a personal trading journal.' },
];

const COLORS = [
    { id: 'gold', hex: '#D4AF37', label: 'Classic Gold' },
    { id: 'green', hex: '#22C55E', label: 'Bullish Green' },
    { id: 'blue', hex: '#3B82F6', label: 'Pro Blue' },
    { id: 'red', hex: '#EF4444', label: 'Bearish Red' },
];

export default function Welcome() {
    const { user, updateUserPreferences } = useAuth();
    const { setAccentColor, accentColor } = useTheme();
    const navigate = useNavigate();

    const [selectedFeatures, setSelectedFeatures] = useState({
        watchlist: true, clients: true, trades: true, analysis: true, notes: true
    });
    const [selectedColor, setSelectedColor] = useState('gold');
    const [saving, setSaving] = useState(false);

    const toggleFeature = (id) => {
        setSelectedFeatures(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleColorSelect = (colorId) => {
        setSelectedColor(colorId);
        setAccentColor(colorId);
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            const preferences = {
                theme: 'dark',
                accentColor: selectedColor,
                sidebarFeatures: selectedFeatures
            };
            await api.put('/auth/preferences', { preferences });
            if (updateUserPreferences) updateUserPreferences(preferences);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            console.error('Failed to save preferences:', err);
            navigate('/dashboard', { replace: true });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="welcome-page">
            <div className="welcome-card">
                <div className="welcome-header">
                    <div className="welcome-emoji">🎉</div>
                    <h1>Welcome to TradeSphere{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
                    <p>Let's set up your workspace in 30 seconds.</p>
                </div>

                {/* Step 1: Accent Color */}
                <section className="welcome-section">
                    <h3>Choose your accent color</h3>
                    <p>This sets the primary highlight across the entire dashboard.</p>
                    <div className="welcome-colors">
                        {COLORS.map(c => (
                            <button
                                key={c.id}
                                className={`welcome-color-btn ${selectedColor === c.id ? 'active' : ''}`}
                                onClick={() => handleColorSelect(c.id)}
                            >
                                <span className="color-dot" style={{ background: c.hex }} />
                                {c.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Step 2: Feature Toggles */}
                <section className="welcome-section">
                    <h3>Which features do you need?</h3>
                    <p>You can always change these later in Settings.</p>
                    <div className="welcome-features">
                        {FEATURES.map(f => (
                            <button
                                key={f.id}
                                className={`welcome-feature-btn ${selectedFeatures[f.id] ? 'active' : ''}`}
                                onClick={() => toggleFeature(f.id)}
                            >
                                <span className="feature-icon">{f.icon}</span>
                                <div>
                                    <div className="feature-label">{f.label}</div>
                                    <div className="feature-desc">{f.desc}</div>
                                </div>
                                <span className="feature-check">
                                    {selectedFeatures[f.id] ? '✓' : ''}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                <button
                    className="welcome-finish-btn"
                    onClick={handleFinish}
                    disabled={saving}
                >
                    {saving ? 'Setting up your workspace…' : 'Launch My Dashboard →'}
                </button>
            </div>
        </div>
    );
}
