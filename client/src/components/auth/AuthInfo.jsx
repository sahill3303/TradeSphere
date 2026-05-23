import React from 'react';
import { Link } from 'react-router-dom';

const AuthInfo = () => {
    return (
        <div className="auth-info">
            <div className="auth-info__content">
                {/* Desktop view — full info */}
                <div className="auth-info--desktop">
                    <div className="auth-info__badge">v2.4.0 Live</div>
                    <h1 className="auth-info__title">
                        Master Your Trades with <span className="text-gold">TradeSphere</span>
                    </h1>
                    <p className="auth-info__description">
                        The ultimate all-in-one ecosystem designed for modern traders. Stop juggling spreadsheets and start making data-driven decisions.
                    </p>

                    <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
                        <Link to="/about" className="auth-info__about-btn" style={{ display: 'inline-block' }}>
                            Discover TradeSphere →
                        </Link>
                    </div>

                    {/* About & Copyright */}
                    <div className="auth-info__footer">
                        <p className="auth-info__copyright">
                            © 2026 <strong>Sahil Yadav</strong>. All rights reserved.
                        </p>

                    </div>
                </div>

                {/* Mobile view — compact, just the CTA button */}
                <div className="auth-info--mobile">
                    <Link to="/about" className="auth-info__about-btn">
                        Discover TradeSphere →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AuthInfo;
