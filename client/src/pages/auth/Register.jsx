import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthInfo from '../../components/auth/AuthInfo';
import TS2Logo from '../../assets/TS2.png';

const getStrengthDetails = (score) => {
    switch (score) {
        case 1: return { label: 'Weak', color: '#EF4444', width: '25%' };
        case 2: return { label: 'Fair', color: '#F59E0B', width: '50%' };
        case 3: return { label: 'Good', color: '#3B82F6', width: '75%' };
        case 4: return { label: 'Strong', color: '#22C55E', width: '100%' };
        default: return { label: '', color: 'transparent', width: '0%' };
    }
};

export default function Register() {
    const { login } = useAuth();
    const { hydrateFromPreferences } = useTheme();
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [passwordChecks, setPasswordChecks] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        specialChar: false,
    });
    const [strengthScore, setStrengthScore] = useState(0);

    useEffect(() => {
        const p = form.password;
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
    }, [form.password]);

    const handleChange = (e) =>
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Name validation
        if (!form.name.trim()) {
            setError('Full name is required.');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }

        // Password complexity validation
        const { length, uppercase, lowercase, number, specialChar } = passwordChecks;
        if (!length || !uppercase || !lowercase || !number || !specialChar) {
            setError('Please satisfy all password complexity requirements.');
            return;
        }

        setLoading(true);
        try {
            // Register the account
            await api.post('/auth/register', {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password
            });
            // Auto-login immediately after registration
            const { data } = await api.post('/auth/login', {
                email: form.email.trim(),
                password: form.password,
            });
            login(data.token, data.admin);
            if (data.admin?.preferences) {
                hydrateFromPreferences(data.admin.preferences);
            }
            // Send to Welcome onboarding screen
            navigate('/welcome', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <AuthInfo />

                <div className="auth-card">
                    <div className="auth-card__logo">
                        <div className="auth-card__logo-mark">
                            <img src={TS2Logo} alt="TradeSphere Logo" />                        </div>
                        <span className="auth-card__logo-text">TradeSphere</span>
                    </div>

                    <h2 className="auth-card__title">Create account</h2>
                    <p className="auth-card__subtitle">Start managing your trading portfolio</p>

                    {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

                    <form className="auth-form" onSubmit={handleSubmit} noValidate autoComplete="off">
                        <Input
                            id="name"
                            label="Full Name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                            autoComplete="off"
                        />
                        <Input
                            id="email"
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Enter your email address"
                            required
                            autoComplete="off"
                        />
                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Create a strong password"
                            required
                            autoComplete="new-password"
                        />
                        {form.password && (
                            <div className="password-strength-container" style={{ marginTop: '-0.25rem', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                                {/* Strength Bar */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Password Strength:</span>
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
                                        <span style={{ fontSize: '0.85rem' }}>{passwordChecks.length ? '✓' : '○'}</span>
                                        <span>At least 8 characters</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: (passwordChecks.uppercase && passwordChecks.lowercase) ? 'var(--color-success)' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{(passwordChecks.uppercase && passwordChecks.lowercase) ? '✓' : '○'}</span>
                                        <span>Uppercase & lowercase letters</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordChecks.number ? 'var(--color-success)' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{passwordChecks.number ? '✓' : '○'}</span>
                                        <span>At least one number</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordChecks.specialChar ? 'var(--color-success)' : 'var(--color-text-dim)', transition: 'color 0.2s' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{passwordChecks.specialChar ? '✓' : '○'}</span>
                                        <span>At least one special character (@, $, !, %, *, ?, &)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                            style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
                        >
                            {loading ? 'Creating account…' : 'Register →'}
                        </Button>
                    </form>

                    <p className="auth-link">
                        Already have an account?{' '}
                        <Link to="/login">Sign In</Link>
                    </p>

                    {/* Footer — visible on mobile only */}
                    <div className="auth-card__mobile-footer show-mobile">
                        <p>© 2026 TradeSphere</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
