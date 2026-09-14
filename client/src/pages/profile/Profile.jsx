import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Target, Sparkles, Save, CheckCircle, ArrowLeft } from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import api from '../../api/axios';
import './Profile.css';

export default function Profile() {
    const { user, updateUserProfile } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        email: '',
        goals: '',
        bio: ''
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || '',
                email: user.email || '',
                goals: user.preferences?.goals || '',
                bio: user.preferences?.bio || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Keep existing preferences, just merge goals and bio
            const updatedPreferences = {
                ...(user.preferences || {}),
                goals: form.goals,
                bio: form.bio
            };

            await api.put('/auth/profile', {
                name: form.name,
                preferences: updatedPreferences
            });

            updateUserProfile(form.name, updatedPreferences);
            setSuccess('Profile updated successfully!');
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page profile-page">
            <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button type="button" onClick={() => navigate(-1)} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '50%', transition: 'background 0.2s' }} title="Go Back" onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-surface)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="page__title">My Profile</h2>
                        <p className="page__subtitle">Personalize your identity and set your trading goals.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {success && <div className="success-msg"><CheckCircle size={16} /> {success}</div>}
                    {error && <div className="error-msg">{error}</div>}
                    <Button type="button" variant="primary" disabled={loading} className="save-btn" onClick={handleSubmit}>
                        {loading ? 'Saving...' : (
                            <>
                                <Save size={18} /> Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="profile-grid">
                {/* Basic Info */}
                <Card className="profile-card">
                    <div className="profile-card__header">
                        <User className="profile-icon" size={20} />
                        <h3>Account Details</h3>
                    </div>
                    <div className="profile-card__content">
                        <Input 
                            label="Full Name" 
                            name="name" 
                            value={form.name} 
                            onChange={handleChange} 
                            placeholder="Enter your name" 
                            required 
                        />
                        <Input 
                            label="Email Address (Read-only)" 
                            name="email" 
                            type="email" 
                            value={form.email} 
                            disabled 
                        />
                    </div>
                </Card>

                {/* Personalization */}
                <Card className="profile-card profile-card--accent">
                    <div className="profile-card__header">
                        <Target className="profile-icon text-gold" size={20} />
                        <h3>Trading Goals</h3>
                    </div>
                    <div className="profile-card__content">
                        <p className="profile-hint">What are you striving to achieve? (e.g. 60% Win Rate, Strict Risk Management)</p>
                        <textarea 
                            className="form-textarea" 
                            name="goals" 
                            value={form.goals} 
                            onChange={handleChange} 
                            placeholder="Define your primary trading goals here..."
                            rows={4}
                        />
                    </div>
                </Card>
            </form>
        </div>
    );
}
