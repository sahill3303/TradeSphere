import { Link } from 'react-router-dom';
import './AboutApp.css';

export default function AboutApp() {
    return (
        <div className="about-page">
            <div className="about-page__container">
                {/* Back button — top */}
                <Link to="/login" className="about-back-btn about-back-btn--top">
                    ← Back to Login
                </Link>

                {/* Hero */}
                <header className="about-hero">
                    <div className="about-hero__badge">TradeSphere v2.4</div>
                    <h1 className="about-hero__title">
                        Your Complete <span className="text-gold">Trading Ecosystem</span>
                    </h1>
                    <p className="about-hero__desc">
                        A premium, all-in-one platform designed for traders, consultants, and portfolio managers 
                        who demand precision, speed, and clarity.
                    </p>
                </header>

                {/* Features */}
                <section className="about-section">
                    <h2 className="about-section__title">✨ Key Features</h2>
                    <div className="about-features-grid">
                        <div className="about-feature-card">
                            <div className="about-feature-card__top">
                                <span className="about-feature-card__icon">📊</span>
                                <span className="about-elite-tag">✦ ELITE</span>
                            </div>
                            <h3>Live Market Dashboard</h3>
                            <p>Real-time CMP tracking for NIFTY 50, SENSEX, DOW JONES & NASDAQ with auto-refresh every 30 seconds.</p>
                        </div>
                        <div className="about-feature-card">
                            <div className="about-feature-card__top">
                                <span className="about-feature-card__icon">👥</span>
                                <span className="about-elite-tag">✦ ELITE</span>
                            </div>
                            <h3>Client Management</h3>
                            <p>Add, edit, and track multiple clients. Monitor capital invested, active status, and individual P&L per client.</p>
                        </div>
                        <div className="about-feature-card">
                            <div className="about-feature-card__top">
                                <span className="about-feature-card__icon">📈</span>
                                <span className="about-elite-tag">✦ ELITE</span>
                            </div>
                            <h3>Trade Tracking</h3>
                            <p>Log LONG/SHORT trades with entry & exit prices, quantities, and automated profit/loss calculations.</p>
                        </div>
                        <div className="about-feature-card">
                            <div className="about-feature-card__top">
                                <span className="about-feature-card__icon">📰</span>
                                <span className="about-elite-tag">✦ ELITE</span>
                            </div>
                            <h3>Market Intelligence</h3>
                            <p>AI-powered daily market news, sentiment analysis, and curated insights from top financial sources.</p>
                        </div>
                        <div className="about-feature-card">
                            <div className="about-feature-card__top">
                                <span className="about-feature-card__icon">📋</span>
                                <span className="about-elite-tag">✦ ELITE</span>
                            </div>
                            <h3>Watchlist</h3>
                            <p>Track your favourite stocks with live prices via Screener.in integration. Never miss a move.</p>
                        </div>
                        <div className="about-feature-card">
                            <div className="about-feature-card__top">
                                <span className="about-feature-card__icon">📝</span>
                                <span className="about-elite-tag">✦ ELITE</span>
                            </div>
                            <h3>Trading Journal</h3>
                            <p>Maintain personal notes, trade rationale, and strategy logs in a secure private journal.</p>
                        </div>
                    </div>
                </section>

                {/* How to Use */}
                <section className="about-section">
                    <h2 className="about-section__title">🚀 How to Use</h2>
                    <div className="about-steps">
                        <div className="about-step">
                            <div className="about-step__number">1</div>
                            <div>
                                <h4>Register & Set Up</h4>
                                <p>Create your account, choose your accent color, and pick which features you need.</p>
                            </div>
                        </div>
                        <div className="about-step">
                            <div className="about-step__number">2</div>
                            <div>
                                <h4>Add Your Clients</h4>
                                <p>Go to Clients → Add Client. Enter their name, broker, capital invested, and join date.</p>
                            </div>
                        </div>
                        <div className="about-step">
                            <div className="about-step__number">3</div>
                            <div>
                                <h4>Log Your Trades</h4>
                                <p>Open a trade with stock name, direction (Long/Short), entry price, and quantity. Close it when you exit.</p>
                            </div>
                        </div>
                        <div className="about-step">
                            <div className="about-step__number">4</div>
                            <div>
                                <h4>Monitor & Analyze</h4>
                                <p>Your dashboard auto-calculates P&L, win/loss ratios, and shows profitability gauges in real-time.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Built For */}
                <section className="about-section">
                    <h2 className="about-section__title">🎯 Built For</h2>
                    <div className="about-usecases">
                        <div className="about-usecase">
                            <div className="about-usecase__icon">📈</div>
                            <div>
                                <h4>Independent Traders</h4>
                                <p>Track your personal trades, monitor your win rate, and journal your strategy evolution.</p>
                            </div>
                        </div>
                        <div className="about-usecase">
                            <div className="about-usecase__icon">🤝</div>
                            <div>
                                <h4>Trading Consultants</h4>
                                <p>Manage multiple client portfolios, provide transparent P&L reports, and scale your advisory business.</p>
                            </div>
                        </div>
                        <div className="about-usecase">
                            <div className="about-usecase__icon">💼</div>
                            <div>
                                <h4>Portfolio Managers</h4>
                                <p>Get a bird's eye view of all client capital, aggregate performance, and market-level insights.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer / Credits */}
                <footer className="about-footer">
                    <div className="about-footer__divider" />
                    <p className="about-footer__copyright">© 2026 <strong>Sahil Yadav</strong>. All rights reserved.</p>

                </footer>
            </div>
        </div>
    );
}
