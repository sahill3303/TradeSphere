import React from 'react';
import { Link } from 'react-router-dom';


const AuthInfo = () => {
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
                        <div className="auth-info__badge">
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', marginRight: '6px' }}></span>
                            v2.4.0 Live
                        </div>
                        <h1 className="auth-info__title">
                            Master Your Trades<br />with <span className="text-gold">TradeSphere</span>
                        </h1>
                        <p className="auth-info__description">
                            The ultimate all-in-one ecosystem for modern traders.<br />Stop juggling spreadsheets and start making<br />data-driven decisions.
                        </p>



                        <div style={{ marginTop: '2.5rem' }}>
                            <Link to="/about" className="auth-info__primary-btn">
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
                    <Link to="/about" className="auth-info__primary-btn" style={{ width: '100%', textAlign: 'center' }}>
                        Discover TradeSphere →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AuthInfo;
