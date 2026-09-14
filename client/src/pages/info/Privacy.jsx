import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
    return (
        <div className="auth-page">
            <div className="auth-container" style={{ display: 'flex', flexDirection: 'column', padding: '3rem', background: '#0B0B0D', borderRadius: 'var(--radius-xl)', maxWidth: '800px', margin: 'auto', overflowY: 'auto' }}>
                <h1 style={{ color: 'var(--color-gold)', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Privacy Policy</h1>
                <div style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', flex: 1 }}>
                    <p style={{ marginBottom: '1rem' }}>Last updated: September 2026</p>
                    <h3 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>1. Data Collection</h3>
                    <p style={{ marginBottom: '1rem' }}>TradeSphere collects necessary data to provide you with the best trading tools and analytics. This includes your account information, trade history, and interaction data within our platform.</p>
                    
                    <h3 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>2. Data Usage</h3>
                    <p style={{ marginBottom: '1rem' }}>We use your data to generate personalized trade analytics, run AI-driven narrative intelligence, and ensure the security of your account. We do not sell your personal data to third parties.</p>

                    <h3 style={{ color: '#fff', marginTop: '1.5rem', marginBottom: '0.5rem' }}>3. Security</h3>
                    <p style={{ marginBottom: '1rem' }}>Your trading data is encrypted and securely stored. We use industry-standard practices to prevent unauthorized access.</p>
                </div>
                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <Link to="/login" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 600 }}>← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
