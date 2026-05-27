import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthInfo from '../../components/auth/AuthInfo';
import TS2Logo from '../../assets/TS2.png';

export default function Login() {
    const { login } = useAuth();
    const { hydrateFromPreferences } = useTheme();
    const navigate = useNavigate();

    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get('error') || '';
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.email || !form.password) { setError('Email and password are required.'); return; }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', {
                email: form.email.trim(),
                password: form.password,
            });
            login(data.token, data.admin);
            if (data.admin?.preferences) {
                hydrateFromPreferences(data.admin.preferences);
            }
            sessionStorage.setItem('justLoggedIn', 'true');
            if (data.admin?.role === 'superadmin') {
                navigate('/super-admin', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <AuthInfo />
                
                <div className="auth-card">
                    {/* Logo */}
                    <div className="auth-card__logo">
                        <div className="auth-card__logo-mark">
                            <img src={TS2Logo} alt="TradeSphere Logo" />
                        </div>
                        <span className="auth-card__logo-text">TradeSphere</span>
                    </div>

                    <h2 className="auth-card__title">Welcome back</h2>
                    <p className="auth-card__subtitle">Sign in to your trading dashboard</p>

                    {error && (
                        <div className={`alert ${error.includes('expired') || error.includes('trial') ? 'alert--warning' : 'alert--error'}`} style={{ 
                            marginBottom: 'var(--space-md)',
                            border: (error.includes('expired') || error.includes('trial')) ? '1px solid var(--color-gold)' : '1px solid var(--color-danger)',
                            background: (error.includes('expired') || error.includes('trial')) ? 'var(--color-gold-soft)' : 'var(--color-danger-soft)',
                            color: (error.includes('expired') || error.includes('trial')) ? 'var(--color-gold)' : 'var(--color-danger)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700, marginBottom: '4px', fontSize: '0.85rem' }}>
                                <span>{(error.includes('expired') || error.includes('trial')) ? '⚠️ Trial Expired' : '❌ Error'}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.4 }}>{error}</p>
                            {(error.includes('expired') || error.includes('trial')) && (
                                <a 
                                    href="mailto:support@tradesphere.com?subject=TradeSphere Premium Activation Request"
                                    style={{
                                        display: 'inline-block',
                                        marginTop: '0.65rem',
                                        padding: '0.35rem 0.75rem',
                                        background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
                                        color: '#0B0B0D',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        textAlign: 'center'
                                    }}
                                >
                                    📧 Contact Team TradeSphere
                                </a>
                            )}
                        </div>
                    )}

                    <form className="auth-form" onSubmit={handleSubmit} noValidate autoComplete="off">
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
                            placeholder="Enter your password"
                            required
                            autoComplete="new-password"
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading}
                            style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
                        >
                            {loading ? 'Signing in…' : 'Sign In →'}
                        </Button>
                    </form>

                    <p className="auth-link">
                        Don&apos;t have an account?{' '}
                        <Link to="/register">Register</Link>
                    </p>

                    {/* Footer — visible on mobile only */}
                    <div className="auth-card__mobile-footer show-mobile">
                        <p>© 2026 Sahil Yadav</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
