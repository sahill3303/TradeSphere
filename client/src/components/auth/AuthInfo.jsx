import React from 'react';

const AuthInfo = () => {
    return (
        <div className="auth-info">
            <div className="auth-info__content">
                <div className="auth-info__badge">v2.4.0 Live</div>
                <h1 className="auth-info__title">
                    Master Your Trades with <span className="text-gold">TradeSphere</span>
                </h1>
                <p className="auth-info__description">
                    The ultimate all-in-one ecosystem designed for modern traders. Stop juggling spreadsheets and start making data-driven decisions.
                </p>

                <div className="auth-info__features">
                    <div className="auth-info__feature">
                        <div className="auth-info__feature-icon">🚀</div>
                        <div className="auth-info__feature-text">
                            <h3>All-in-One Dashboard</h3>
                            <p>Track stocks, crypto, and commodities in a single unified view with real-time P&L.</p>
                        </div>
                    </div>
                    <div className="auth-info__feature">
                        <div className="auth-info__feature-icon">🧠</div>
                        <div className="auth-info__feature-text">
                            <h3>AI-Powered Insights</h3>
                            <p>Advanced algorithms analyze your trading patterns to provide personalized performance tips.</p>
                        </div>
                    </div>
                    <div className="auth-info__feature">
                        <div className="auth-info__feature-icon">🔒</div>
                        <div className="auth-info__feature-text">
                            <h3>Secure & Private</h3>
                            <p>Your data is encrypted and stored securely. We prioritize your privacy above all else.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthInfo;
