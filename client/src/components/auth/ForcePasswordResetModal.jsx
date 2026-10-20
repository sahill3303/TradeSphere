import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { 
    Lock, 
    Key, 
    ShieldAlert, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    Circle, 
    AlertCircle, 
    LogOut,
    Check
} from 'lucide-react';
import Button from '../ui/Button';

const getStrengthDetails = (score) => {
    switch (score) {
        case 1: return { label: 'Weak', color: '#EF4444', width: '25%' };
        case 2: return { label: 'Fair', color: '#F59E0B', width: '50%' };
        case 3: return { label: 'Good', color: '#3B82F6', width: '75%' };
        case 4: return { label: 'Strong', color: '#22C55E', width: '100%' };
        default: return { label: '', color: 'transparent', width: '0%' };
    }
};

export default function ForcePasswordResetModal() {
    const { user, markPasswordUpdated, logout } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Live password complexity checks
    const checks = {
        length: newPassword.length >= 8,
        uppercase: /[A-Z]/.test(newPassword),
        lowercase: /[a-z]/.test(newPassword),
        number: /\d/.test(newPassword),
        specialChar: /[@$!%*?&]/.test(newPassword),
    };

    const passedChecksCount = Object.values(checks).filter(Boolean).length;
    let strengthScore = 0;
    if (newPassword.length > 0) {
        if (passedChecksCount <= 2) strengthScore = 1;
        else if (passedChecksCount === 3 || passedChecksCount === 4) strengthScore = 2;
        else if (passedChecksCount === 5 && newPassword.length >= 10) strengthScore = 4;
        else if (passedChecksCount === 5) strengthScore = 3;
    }
    const strength = getStrengthDetails(strengthScore);

    const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
    const isFormValid = passedChecksCount === 5 && passwordsMatch;

    // Only render if user is flagged for password reset
    if (!user || !user.must_reset_password) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (passedChecksCount < 5) {
            setError('Please satisfy all password complexity requirements.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match. Please re-enter to confirm.');
            return;
        }

        setLoading(true);
        try {
            await api.put('/auth/update-temporary-password', { newPassword });
            setSuccess(true);
            setTimeout(() => {
                markPasswordUpdated();
            }, 1200);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '540px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.15)',
                position: 'relative',
                animation: 'fadeInModal 0.25s ease'
            }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '1.25rem' }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-gold)',
                        flexShrink: 0
                    }}>
                        <Key size={24} />
                    </div>

                    <div>
                        <h2 style={{
                            margin: 0,
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--color-text)'
                        }}>
                            Temporary Password Active
                        </h2>
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '0.82rem',
                            color: 'var(--color-text-muted)',
                            lineHeight: 1.45
                        }}>
                            You logged in with a temporary password. For your account security, you must create a new private password before accessing your workspace.
                        </p>
                    </div>
                </div>

                {/* Important Security Warnings & Tips Box */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(30, 30, 34, 0.95) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--color-gold)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        marginBottom: '6px'
                    }}>
                        <ShieldAlert size={15} />
                        <span>Crucial Security Tips & Advice</span>
                    </div>

                    <ul style={{
                        margin: 0,
                        paddingLeft: '1.2rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.55
                    }}>
                        <li>
                            <strong style={{ color: 'var(--color-text)' }}>Store safely:</strong> Keep this password in a secure place (e.g. password manager like Bitwarden, 1Password, or Keychain).
                        </li>
                        <li>
                            <strong style={{ color: 'var(--color-text)' }}>Keep it with you:</strong> Never share your password with anyone. TradeSphere team will never ask for it.
                        </li>
                        <li>
                            <strong style={{ color: 'var(--color-text)' }}>Zero-Knowledge:</strong> Because passwords are cryptographically hashed, nobody else can view or recover it for you.
                        </li>
                    </ul>
                </div>

                {error && (
                    <div style={{
                        background: 'var(--color-danger-soft)',
                        border: '1px solid var(--color-danger)',
                        color: 'var(--color-danger)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.65rem 0.85rem',
                        fontSize: '0.8rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div style={{
                        background: 'var(--color-success-soft)',
                        border: '1px solid var(--color-success)',
                        color: 'var(--color-success)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textAlign: 'center',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <Check size={18} />
                        <span>Password updated successfully! Entering workspace...</span>
                    </div>
                )}

                {/* Password Form */}
                <form onSubmit={handleSubmit}>
                    {/* New Password Input */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                            New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter strong new password"
                                required
                                autoFocus
                                style={inputStyle}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                style={toggleEyeBtnStyle}
                                tabIndex={-1}
                            >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {/* Strength Indicator */}
                        {newPassword && (
                            <div style={{ marginTop: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '3px' }}>
                                    <span style={{ color: 'var(--color-text-dim)' }}>Password Strength:</span>
                                    <span style={{ fontWeight: 600, color: strength.color }}>{strength.label}</span>
                                </div>
                                <div style={{ height: '4px', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'all 0.3s ease' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Complexity Checklist */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '4px 10px',
                        background: 'var(--color-surface-alt)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1rem',
                        fontSize: '0.72rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: checks.length ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                            {checks.length ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                            <span>8+ characters</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: checks.uppercase ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                            {checks.uppercase ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                            <span>Uppercase letter (A-Z)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: checks.lowercase ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                            {checks.lowercase ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                            <span>Lowercase letter (a-z)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: checks.number ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                            {checks.number ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                            <span>At least 1 number</span>
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '6px', color: checks.specialChar ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                            {checks.specialChar ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                            <span>Special character (@, $, !, %, *, ?, &)</span>
                        </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                            Confirm New Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your new password"
                                required
                                style={{
                                    ...inputStyle,
                                    borderColor: confirmPassword && !passwordsMatch ? 'var(--color-danger)' : passwordsMatch ? 'var(--color-success)' : 'var(--color-border)'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={toggleEyeBtnStyle}
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {confirmPassword && !passwordsMatch && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-danger)', marginTop: '4px', display: 'block' }}>
                                Passwords do not match
                            </span>
                        )}
                        {passwordsMatch && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', marginTop: '4px', display: 'block' }}>
                                ✓ Passwords match
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button
                            type="button"
                            onClick={logout}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-text-dim)',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <LogOut size={14} /> Log out
                        </button>

                        <Button
                            type="submit"
                            variant="primary"
                            disabled={!isFormValid || loading || success}
                            style={{ padding: '0.65rem 1.4rem', fontSize: '0.85rem' }}
                        >
                            {loading ? 'Securing Workspace...' : success ? 'Saved!' : 'Save Password & Enter →'}
                        </Button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes fadeInModal {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
}

const inputStyle = {
    width: '100%',
    padding: '0.65rem 2.5rem 0.65rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface-alt)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    outline: 'none',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s'
};

const toggleEyeBtnStyle = {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-dim)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};
