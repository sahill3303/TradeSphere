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
    const [error, setError] = useState('');
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
            navigate('/dashboard', { replace: true });
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

                    {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

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
