import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const AuthInfo = () => {
    const location = useLocation();
    const isRegister = location.pathname === '/register';

    return (
        <div className="auth-info" style={{ 
            /* The user will add the background image for the left side section. 
               This inline style or a CSS class can be updated by the user later. */
            position: 'relative'
        }}>
            
            <div className="auth-info__content" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Desktop view — full info */}
                <div className="auth-info--desktop">
                    <div style={{ flex: 1 }}>
                        {isRegister ? (
                            <>
                                <div className="auth-info__badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', marginRight: '6px' }}></span>
                                    30-Day Free Trial
                                </div>
                                <h1 className="auth-info__title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                                    Start Your Free<br /><span>30-Day Trial</span>
                                </h1>
                                <p className="auth-info__description" style={{ marginBottom: '1.5rem' }}>
                                    Experience the full power of TradeSphere completely free for 30 days. No commitment, no credit card required.
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
                                    {[
                                        'Full access to all premium features',
                                        'Advanced analytics & trade journaling',
                                        'Cancel anytime, no strings attached'
                                    ].map((feature, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ color: 'var(--color-gold)' }}>
                                                <CheckCircle size={20} />
                                            </div>
                                            <span style={{ color: 'var(--color-text)', fontSize: '1.05rem', fontWeight: 500 }}>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="auth-info__badge">
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', marginRight: '6px' }}></span>
                                    v2.4.0 Live
                                </div>
                                <h1 className="auth-info__title">
                                    Master Your Trades<br />with <span><span style={{ color: 'var(--color-text)' }}>Trade</span><span className="text-gold">Sphere</span></span>
                                </h1>
                                <p className="auth-info__description">
                                    The ultimate all-in-one ecosystem for modern traders.<br />Stop juggling spreadsheets and start making<br />data-driven decisions.
                                </p>
                            </>
                        )}



                        <div style={{ marginTop: '2.5rem' }}>
                            <Link to="/" className="auth-info__primary-btn">
                                Discover TradeSphere →
                            </Link>
                        </div>
                    </div>
                    


                    {/* Footer */}
                    <div className="auth-info__footer-row">
                        <p className="auth-info__copyright">
                            © 2026 TradeSphere. All rights reserved.
                        </p>
                        <div className="auth-info__footer-links">
                            <Link to="/privacy">Privacy</Link>
                            <span>|</span>
                            <Link to="/terms">Terms</Link>
                            <span>|</span>
                            <Link to="/support">Support</Link>
                        </div>
                    </div>
                </div>

                {/* Mobile view — compact, just the CTA button */}
                <div className="auth-info--mobile">
                    <Link to="/" className="auth-info__primary-btn" style={{ width: '100%', textAlign: 'center' }}>
                        Discover TradeSphere →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AuthInfo;
