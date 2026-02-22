import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.email || !form.password) {
            setError('Email and password are required.');
            return;
        }

        setLoading(true);
        try {
            // Backend returns: { message, token, admin: { id, name, email, role } }
            const { data } = await api.post('/api/auth/login', {
                email: form.email.trim(),
                password: form.password,
            });

            // Store token + save admin into AuthContext
            login(data.token, data.admin);

            // Redirect to dashboard
            navigate('/dashboard', { replace: true });

        } catch (err) {
            const msg = err.response?.data?.message;
            setError(msg || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <Card className="auth-card">
                <div className="auth-header">
                    <span className="auth-logo">⚡</span>
                    <h2 className="auth-title">AJ Consulting</h2>
                    <p className="auth-subtitle">Sign in to your account</p>
                </div>

                {error && <div className="alert alert--error">{error}</div>}

                <form onSubmit={handleSubmit} noValidate>
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
                        placeholder="••••••••"
                        required
                    />
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={loading}
                        className="auth-btn"
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </Button>
                </form>

                <p className="auth-footer">
                    Don&apos;t have an account?{' '}
                    <Link to="/register" className="auth-link">Register</Link>
                </p>
            </Card>
        </div>
    );
}
