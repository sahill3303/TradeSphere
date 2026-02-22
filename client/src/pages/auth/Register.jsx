import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
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
            <Card className="auth-card">
                <div className="auth-header">
                    <span className="auth-logo">⚡</span>
                    <h2 className="auth-title">AJ Consulting</h2>
                    <p className="auth-subtitle">Create your account</p>
                </div>

                {error && <div className="alert alert--error">{error}</div>}
                {success && <div className="alert alert--success">{success}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    <Input
                        id="name"
                        label="Full Name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="John Doe"
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
                    <Button type="submit" variant="primary" size="lg" disabled={loading} className="auth-btn">
                        {loading ? 'Creating account…' : 'Register'}
                    </Button>
                </form>

                <p className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login" className="auth-link">Sign In</Link>
                </p>
            </Card>
        </div>
    );
}
