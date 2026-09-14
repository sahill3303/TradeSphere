import React from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import TS2Logo from '../../assets/TS2.png';

export default function ForgotPassword() {
    return (
        <div className="auth-page">
            <div className="auth-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div className="auth-card" style={{ flex: 1, maxWidth: '450px', padding: '3rem', background: '#0B0B0D', borderRadius: 'var(--radius-xl)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div className="auth-card__logo" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
                        <div className="auth-card__logo-mark">
                            <img src={TS2Logo} alt="TradeSphere Logo" />
                        </div>
                        <span className="auth-card__logo-text">TradeSphere</span>
                    </div>

                    <h2 className="auth-card__title" style={{ textAlign: 'center' }}>Reset Password</h2>
                    <p className="auth-card__subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>Enter your email address to receive a password reset link.</p>

                    <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                        <Input
                            id="email"
                            label="Email"
                            type="email"
                            placeholder="Enter your email address"
                            required
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem', marginTop: '1rem' }}
                        >
                            Send Reset Link →
                        </Button>
                    </form>

                    <p className="auth-link" style={{ textAlign: 'center', marginTop: '2rem' }}>
                        Remember your password?{' '}
                        <Link to="/login" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 500 }}>Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
