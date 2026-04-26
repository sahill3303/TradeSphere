import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function Profile() {
    const { user, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || ''
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        if (formData.password && formData.password !== formData.confirmPassword) {
            return setStatus({ type: 'error', message: 'Passwords do not match' });
        }

        setIsSubmitting(true);
        try {
            const { data } = await api.put('/auth/profile', {
                name: formData.name,
                email: formData.email,
                password: formData.password || undefined
            });

            updateUser(data.user);
            setStatus({ type: 'success', message: 'Profile updated successfully' });
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (err) {
            setStatus({ 
                type: 'error', 
                message: err.response?.data?.message || 'Failed to update profile' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="profile-page">
            <Card>
                <div className="profile-header">
                    <h2 className="profile-title">Edit Profile</h2>
                    <p className="profile-subtitle">
                        Update your personal information and password
                    </p>
                </div>

                {status.message && (
                    <div className={`profile-status status--${status.type}`}>
                        {status.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="profile-form">
                    <Input
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Your full name"
                    />

                    <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="your.email@example.com"
                    />

                    <hr className="profile-divider" />
                    
                    <div>
                        <p className="profile-section-label">
                            Change Password (leave blank to keep current)
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <Input
                                label="New Password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                            />

                            <Input
                                label="Confirm New Password"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={isSubmitting}
                            style={{ width: '100%' }}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
