import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
    return (
        <div className="auth-page">
            <div className="auth-container" style={{ display: 'flex', flexDirection: 'column', padding: '3rem', background: '#0B0B0D', borderRadius: 'var(--radius-xl)', maxWidth: '800px', margin: 'auto', overflowY: 'auto' }}>
                <h1 style={{ color: 'var(--color-gold)', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Terms of Service</h1>
                <div style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', flex: 1 }}>
                    <p style={{ marginBottom: '1rem' }}>Last updated: September 2026</p>
                    
                    <h3 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>1. Acceptance of Terms</h3>
                    <p style={{ marginBottom: '1rem' }}>By accessing and using TradeSphere, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
                    
                    <h3 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>2. User Responsibilities</h3>
                    <p style={{ marginBottom: '1rem' }}>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. TradeSphere is a tool for analytics and intelligence, and is not responsible for your financial trading decisions or outcomes.</p>

                    <h3 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>3. Service Limitations</h3>
                    <p style={{ marginBottom: '1rem' }}>We strive to provide uninterrupted service, but TradeSphere is provided "as is". We reserve the right to modify or discontinue any part of the service at any time.</p>
                </div>
                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <Link to="/login" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 600 }}>← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
