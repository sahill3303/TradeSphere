import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, HelpCircle } from 'lucide-react';

export default function Support() {
    return (
        <div className="auth-page">
            <div className="auth-container" style={{ display: 'flex', flexDirection: 'column', padding: '3rem', background: '#0B0B0D', borderRadius: 'var(--radius-xl)', maxWidth: '800px', margin: 'auto', overflowY: 'auto' }}>
                <h1 style={{ color: 'var(--color-gold)', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Support & Help Center</h1>
                <div style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', flex: 1 }}>
                    <p style={{ marginBottom: '2rem' }}>Need help with TradeSphere? Our support team is here to ensure your trading operations run smoothly.</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <Mail size={32} style={{ color: 'var(--color-gold)', margin: '0 auto 1rem' }} />
                            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Email Support</h3>
                            <p style={{ fontSize: '0.85rem' }}>support@tradesphere.com<br/>24/7 Response</p>
                        </div>
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <MessageCircle size={32} style={{ color: 'var(--color-gold)', margin: '0 auto 1rem' }} />
                            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Live Chat</h3>
                            <p style={{ fontSize: '0.85rem' }}>Available for Premium Users<br/>9AM - 5PM EST</p>
                        </div>
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <HelpCircle size={32} style={{ color: 'var(--color-gold)', margin: '0 auto 1rem' }} />
                            <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Knowledge Base</h3>
                            <p style={{ fontSize: '0.85rem' }}>Explore guides and tutorials for TradeSphere</p>
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <Link to="/login" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: 600 }}>← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
