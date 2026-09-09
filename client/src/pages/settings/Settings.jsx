import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { LineChart, Users, Target, BookOpen, Briefcase, FileText, Palette, Compass, Sparkles, Flame, Lock, CheckCircle, Circle, Moon, Sun, Microscope } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import api from '../../api/axios';
import './Settings.css';

const getStrengthDetails = (score) => {
    switch (score) {
        case 1: return { label: 'Weak', color: '#EF4444', width: '25%' };
        case 2: return { label: 'Fair', color: '#F59E0B', width: '50%' };
        case 3: return { label: 'Good', color: '#3B82F6', width: '75%' };
        case 4: return { label: 'Strong', color: '#22C55E', width: '100%' };
        default: return { label: '', color: 'transparent', width: '0%' };
    }
};

export default function Settings() {
    const { toggleTheme, isDarkMode, accentColor, setAccentColor } = useTheme();
    const { sidebarFeatures, toggleFeature, optionalFeatures, toggleOptionalFeature } = usePreferences();

    const [pwdForm, setPwdForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');
    const [pwdLoading, setPwdLoading] = useState(false);

    const [passwordChecks, setPasswordChecks] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        specialChar: false,
    });
    const [strengthScore, setStrengthScore] = useState(0);

    useEffect(() => {
        const p = pwdForm.newPassword;
        if (!p) {
            setPasswordChecks({ length: false, uppercase: false, lowercase: false, number: false, specialChar: false });
            setStrengthScore(0);
            return;
        }
        const checks = {
            length: p.length >= 8,
            uppercase: /[A-Z]/.test(p),
            lowercase: /[a-z]/.test(p),
            number: /\d/.test(p),
            specialChar: /[@$!%*?&]/.test(p),
        };
        setPasswordChecks(checks);

        let finalScore = 0;
        if (p.length > 0) {
            const count = Object.values(checks).filter(Boolean).length;
            if (count <= 2) finalScore = 1;      // Weak
            else if (count === 3) finalScore = 2; // Fair
            else if (count === 4) finalScore = 3; // Good
            else if (count === 5) finalScore = 4; // Strong
        }
        setStrengthScore(finalScore);
    }, [pwdForm.newPassword]);

    const handlePwdSubmit = async (e) => {
        e.preventDefault();
        setPwdError('');
        setPwdSuccess('');

        if (!pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
            setPwdError('All password fields are required.');
            return;
        }

        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            setPwdError('New passwords do not match.');
            return;
        }

        // Validate complexity criteria
        const { length, uppercase, lowercase, number, specialChar } = passwordChecks;
        if (!length || !uppercase || !lowercase || !number || !specialChar) {
            setPwdError('New password does not satisfy all complexity requirements.');
            return;
        }

        setPwdLoading(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: pwdForm.currentPassword,
                newPassword: pwdForm.newPassword
            });
            setPwdSuccess('Password updated successfully!');
            setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPwdError(err.response?.data?.message || 'Failed to update password. Please check your credentials.');
        } finally {
            setPwdLoading(false);
        }
    };

    const colors = [
        { id: 'gold', hex: '#D4AF37', label: 'Classic Gold' },
        { id: 'green', hex: '#22C55E', label: 'Bullish Green' },
        { id: 'blue', hex: '#3B82F6', label: 'Pro Blue' },
        { id: 'red', hex: '#EF4444', label: 'Bearish Red' },
    ];

    const features = [
        { id: 'watchlist', label: 'Watchlist', icon: <LineChart size={18} />, desc: 'Track your customized stock lists and prices.' },
        { id: 'clients', label: 'Clients', icon: '◎', desc: 'Manage client portfolios and onboarding.' },
        { id: 'trades', label: 'Trades', icon: '◈', desc: 'Log and monitor active or past trades.' },
        { id: 'paperTrade', label: 'Paper Trading', icon: <Briefcase size={18} />, desc: 'Simulated trading journal & long-term conviction portfolio.' },
        { id: 'analysis', label: 'Research', icon: <Microscope size={18} />, desc: 'Perform AI-driven stock research and analysis.' },
        { id: 'notes', label: 'Notes', icon: <FileText size={18} />, desc: 'Keep a personal trading journal.' },
    ];

    return (
        <div className="page settings-page">
            <header className="settings-header">
                <h2>Configurations</h2>
                <p>Manage your preferences, security credentials, and interface options.</p>
            </header>

            <div className="settings-grid">
                {/* Appearance Section */}
                <section className="settings-card">
                    <div className="settings-card-header">
                        <h3><Palette size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Appearance</h3>
                        <p>Customize the look and feel of TradeSphere.</p>
                    </div>

                    <div className="settings-item">
                        <div className="settings-item-info">
                            <h4>Theme Mode</h4>
                            <p>Switch between Light and Dark interface.</p>
                        </div>
                        <button className="settings-toggle-btn" onClick={toggleTheme}>
                            {isDarkMode ? <><Moon size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Dark Mode</> : <><Sun size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Light Mode</>}
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
                        <h3><Compass size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Sidebar Navigation</h3>
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

                {/* Optional Features Section */}
                <section className="settings-card">
                    <div className="settings-card-header">
                        <h3><Sparkles size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Optional Features</h3>
                        <p>Toggle additional dashboard widgets and intelligence features.</p>
                    </div>

                    <div className="settings-features-list">
                        <div className="settings-item">
                            <div className="settings-item-info">
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Flame size={16} /> Market Intelligence</h4>
                                <p>Show live market news and sentiment on the dashboard.</p>
                            </div>
                            <label className="settings-switch">
                                <input 
                                    type="checkbox" 
                                    checked={optionalFeatures?.marketIntelligence ?? true} 
                                    onChange={() => toggleOptionalFeature('marketIntelligence')} 
                                />
                                <span className="settings-slider"></span>
                            </label>
                        </div>
                    </div>
                </section>

                {/* Change Password / Security Section */}
                <section className="settings-card">
                    <div className="settings-card-header">
                        <h3><Lock size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Security Settings</h3>
                        <p>Change your password credentials securely.</p>
                    </div>

                    {pwdError && <div className="alert alert--error" style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>{pwdError}</div>}
                    {pwdSuccess && <div className="alert alert--success" style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', backgroundColor: 'var(--color-success-soft)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }}>{pwdSuccess}</div>}

                    <form onSubmit={handlePwdSubmit} noValidate autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Input
                            id="currentPassword"
                            label="Current Password"
                            type="password"
                            value={pwdForm.currentPassword}
                            onChange={(e) => setPwdForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Enter current password"
                            required
                        />
                        <Input
                            id="newPassword"
                            label="New Password"
                            type="password"
                            value={pwdForm.newPassword}
                            onChange={(e) => setPwdForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Enter new password"
                            required
                        />
                        
                        {pwdForm.newPassword && (
                            <div className="password-strength-container" style={{ marginTop: '-0.25rem', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
                                {/* Strength Bar */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Strength:</span>
                                    <span style={{ fontWeight: 600, color: getStrengthDetails(strengthScore).color }}>
                                        {getStrengthDetails(strengthScore).label}
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.6rem' }}>
                                    <div style={{
                                        width: getStrengthDetails(strengthScore).width,
                                        height: '100%',
                                        backgroundColor: getStrengthDetails(strengthScore).color,
                                        transition: 'width 0.3s ease, background-color 0.3s ease'
                                    }} />
                                </div>
                                
                                {/* Checklist */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', color: 'var(--color-text-muted)', paddingLeft: '0.2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordChecks.length ? 'var(--color-success)' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{passwordChecks.length ? <CheckCircle size={14} color="var(--color-success)" /> : <Circle size={14} color="var(--color-text-dim)" />}</span>
                                        <span>At least 8 characters</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (passwordChecks.uppercase && passwordChecks.lowercase) ? 'var(--color-success)' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{(passwordChecks.uppercase && passwordChecks.lowercase) ? <CheckCircle size={14} color="var(--color-success)" /> : <Circle size={14} color="var(--color-text-dim)" />}</span>
                                        <span>Uppercase & lowercase letters</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordChecks.number ? 'var(--color-success)' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{passwordChecks.number ? <CheckCircle size={14} color="var(--color-success)" /> : <Circle size={14} color="var(--color-text-dim)" />}</span>
                                        <span>At least one number</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordChecks.specialChar ? 'var(--color-success)' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{passwordChecks.specialChar ? <CheckCircle size={14} color="var(--color-success)" /> : <Circle size={14} color="var(--color-text-dim)" />}</span>
                                        <span>At least one special character (@, $, !, %, *, ?, &)</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Input
                            id="confirmPassword"
                            label="Confirm New Password"
                            type="password"
                            value={pwdForm.confirmPassword}
                            onChange={(e) => setPwdForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Re-enter new password"
                            required
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={pwdLoading}
                            style={{ width: '100%', padding: '0.65rem', fontSize: '0.88rem', marginTop: '0.5rem' }}
                        >
                            {pwdLoading ? 'Updating Password...' : 'Update Password →'}
                        </Button>
                    </form>
                </section>

            </div>
        </div>
    );
}
