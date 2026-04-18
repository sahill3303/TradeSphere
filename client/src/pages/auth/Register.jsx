import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        setLoading(true);
        try {
            await api.post('/api/auth/register', form);
            setSuccess('Account created! Redirecting to login…');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__logo">
                    <div className="auth-card__logo-mark">
                        <img src="src\assets\AJC_Logo.png" alt="" />
                    </div>
                    <span className="auth-card__logo-text">TradeSphere</span>
                </div>

                <h2 className="auth-card__title">Create account</h2>
                <p className="auth-card__subtitle">Start managing your trading portfolio</p>

                {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}
                {success && <div className="alert alert--success" style={{ marginBottom: 'var(--space-md)' }}>{success}</div>}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <Input
                        id="name"
                        label="Full Name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Rahul Sharma"
                        required
                    />
                    <Input
                        id="email"
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                    />
                    <Input
                        id="password"
                        label="Password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Min. 8 characters"
                        required
                    />
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
            </div>
        </div>
    );
}
