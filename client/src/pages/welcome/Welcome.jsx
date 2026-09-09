import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, Users, Target, Microscope, FileText, PartyPopper, Crown, Sparkles, Check } from 'lucide-react';
import api from '../../api/axios';
import './Welcome.css';

const FEATURES = [
    { id: 'watchlist', icon: <TrendingUp size={20} />, label: 'Watchlist', desc: 'Track your stocks with live prices from Screener.in.' },
    { id: 'clients', icon: <Users size={20} />, label: 'Clients', desc: 'Manage client portfolios and capital tracking.' },
    { id: 'trades', icon: <Target size={20} />, label: 'Trades', desc: 'Log and analyse your trade entries & exits.' },
    { id: 'analysis', icon: <Microscope size={20} />, label: 'Research', desc: 'AI-powered stock research and analysis.' },
    { id: 'notes', icon: <FileText size={20} />, label: 'Notes', desc: 'Maintain a personal trading journal.' },
];

const COLORS = [
    { id: 'gold', hex: '#D4AF37', label: 'Classic Gold' },
    { id: 'green', hex: '#22C55E', label: 'Bullish Green' },
    { id: 'blue', hex: '#3B82F6', label: 'Pro Blue' },
    { id: 'red', hex: '#EF4444', label: 'Bearish Red' },
];

export default function Welcome() {
    const { user, updateUserPreferences } = useAuth();
    const { setAccentColor, accentColor, setTheme } = useTheme();

    useEffect(() => {
        setTheme('dark');
    }, [setTheme]);
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
            sessionStorage.setItem('justLoggedIn', 'true');
            navigate('/dashboard', { replace: true });
        } catch (err) {
            console.error('Failed to save preferences:', err);
            sessionStorage.setItem('justLoggedIn', 'true');
            navigate('/dashboard', { replace: true });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="welcome-page">
            <div className="welcome-card">
                <div className="welcome-header">
                    <div className="welcome-emoji"><PartyPopper size={48} color="var(--color-gold)" /></div>
                    <h1>Welcome to TradeSphere{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h1>
                    <p>Let's set up your workspace in 30 seconds.</p>
                </div>

                {/* Elite Member Banner */}
                <div className="welcome-elite-banner">
                    <div className="welcome-elite-badge"><Crown size={14} style={{ marginRight: '4px' }} /> 30-DAY FREE TRIAL</div>
                    <h3 className="welcome-elite-title">
                        Premium Plan <span style={{ color: 'var(--color-gold)' }}>Activated!</span>
                    </h3>
                    <p className="welcome-elite-desc">
                        Enjoy a <strong>free 30-day trial</strong> of all exclusive features </p>
                    <div className="welcome-elite-perks">
                        <span><Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} /> Unlimited Clients</span>
                        <span><Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} /> AI Research</span>
                        <span><Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} /> Real-time Watchlist</span>
                        <span><Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} /> Advanced Analytics</span>
                    </div>
                </div>

                <div className="welcome-scroll-hint">
                    Scroll down to continue with configurations ⭣
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
                                    <div className="feature-label">{f.label} <span className="feature-elite-tag"><Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} /> ELITE</span></div>
                                    <div className="feature-desc">{f.desc}</div>
                                </div>
                                <span className="feature-check">
                                    {selectedFeatures[f.id] ? <Check size={18} /> : null}
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
