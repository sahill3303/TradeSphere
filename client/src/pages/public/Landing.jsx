import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Zap, Briefcase, FileText, BarChart2, Activity, Menu, X, Shield, Users, Coins } from 'lucide-react';
import TS2Logo from '../../assets/TS2.png';
import './Landing.css';

const DashboardMockup = () => (
  <div id="product" className="hero-dashboard-mockup">
    <div className="hero-mockup-header">
      <div className="hero-mockup-dot"></div>
      <div className="hero-mockup-dot"></div>
      <div className="hero-mockup-dot"></div>
    </div>
    
    <div className="hero-mockup-body">
      <div className="hero-mockup-sidebar hide-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
          <img src={TS2Logo} alt="Logo" style={{ width: '20px', height: '20px' }} />
          <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text)' }}>Trade<span className="text-gold">Sphere</span></span>
        </div>
        <div className="mockup-sidebar-item"></div>
        <div className="mockup-sidebar-item" style={{ width: '60%' }}></div>
        <div className="mockup-sidebar-item" style={{ width: '70%' }}></div>
        <div style={{ marginTop: '2rem' }}>
          <div className="mockup-sidebar-item"></div>
          <div className="mockup-sidebar-item" style={{ width: '60%' }}></div>
        </div>
      </div>
      
      <div className="hero-mockup-content">
        <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.2rem', color: '#fff' }}>Good Morning, Trader</div>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: '1.25rem' }}>Discipline today. A better tomorrow.</p>
        
        <div className="mockup-kpi-grid">
          {[
            { label: 'Total Capital', value: '₹25.00L', color: 'var(--color-success)', icon: <Coins size={12} /> },
            { label: 'Realised P&L', value: '+₹2.14L', color: 'var(--color-success)', icon: <TrendingUp size={12} /> },
            { label: 'Win Ratio', value: '68%', color: 'var(--color-gold)', icon: <Activity size={12} /> }
          ].map(stat => (
            <div key={stat.label} className="mockup-kpi-card">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)', padding: '6px', borderRadius: '6px' }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginBottom: '2px' }}>{stat.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mockup-chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ height: '14px', width: '80px', background: 'var(--color-surface-alt)', borderRadius: '4px' }}></div>
              <div style={{ height: '14px', width: '40px', background: 'var(--color-surface-alt)', borderRadius: '4px' }}></div>
            </div>
            <div style={{ height: '100px', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 0, left: '10%', width: '12%', height: '60%', background: 'var(--color-success)', borderRadius: '2px 2px 0 0' }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: '30%', width: '12%', height: '40%', background: 'var(--color-danger)', borderRadius: '2px 2px 0 0' }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: '50%', width: '12%', height: '80%', background: 'var(--color-success)', borderRadius: '2px 2px 0 0' }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: '70%', width: '12%', height: '50%', background: 'var(--color-success)', borderRadius: '2px 2px 0 0' }}></div>
            </div>
        </div>
      </div>
    </div>
    
    <div className="hero-security-signal">
        <div style={{ color: 'var(--color-gold)', marginTop: '2px' }}>
            <Shield size={18} />
        </div>
        <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>Your Data. Your Control.</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', lineHeight: 1.4 }}>Built with privacy and security at its core. Your trading information is protected with secure data practices and encryption.</div>
        </div>
    </div>
  </div>
);

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <div className="landing-page">
      {/* 1. NAVIGATION */}
      <nav className="landing-nav">
        <div className="landing-nav__left">
          <div className="landing-nav__brand">
            <img src={TS2Logo} alt="TradeSphere" style={{ width: '32px', height: '32px' }} />
            <span>Trade<span className="text-gold">Sphere</span></span>
          </div>
          <div className="landing-nav__links">
            <a href="#product" className="landing-nav__link">Product</a>
            <a href="#features" className="landing-nav__link">Features</a>
            <Link to="/" className="landing-nav__link">How It Works</Link>
          </div>
        </div>
        
        <div className="landing-nav__right">
          <button className="landing-btn landing-btn--ghost" onClick={() => navigate('/login')}>Login</button>
          <button className="landing-btn landing-btn--primary" onClick={() => navigate('/register')}>Sign Up</button>
        </div>

        <button className="hamburger" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div style={{ background: 'var(--color-surface)', padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <a href="#product" className="landing-nav__link" onClick={toggleMobileMenu}>Product</a>
          <a href="#features" className="landing-nav__link" onClick={toggleMobileMenu}>Features</a>
          <Link to="/" className="landing-nav__link" onClick={toggleMobileMenu}>How It Works</Link>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="landing-btn landing-btn--ghost" onClick={() => navigate('/login')} style={{flex: 1}}>Login</button>
            <button className="landing-btn landing-btn--primary" onClick={() => navigate('/register')} style={{flex: 1}}>Sign Up</button>
          </div>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-eyebrow">Trading Research & Trade Management Platform</div>
        <h1 className="hero-title">Your Trading.<br/><span className="text-gold">One Intelligent Workspace.</span></h1>
        <p className="hero-subtitle">
          Research markets, manage trades, track performance and build a disciplined trading process — all in one place.
        </p>
        <div className="hero-actions" style={{ marginBottom: '0.75rem' }}>
          <button className="landing-btn landing-btn--primary" onClick={() => navigate('/register')}>Free Trial</button>
          <a href="#features" className="landing-btn landing-btn--outline" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>Explore the Platform</a>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: '3.25rem' }}>
          No credit card required
        </div>
        
        <div className="hero-capabilities">
          <span>Research</span> <span className="dot">•</span> <span>Trade</span> <span className="dot">•</span> <span>Analyze</span> <span className="dot">•</span> <span>Improve</span>
        </div>

        <DashboardMockup />
      </section>

      {/* 5. CORE PRODUCT FEATURES */}
      <section id="features" className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><TrendingUp size={24} /></div>
            <h3 className="feature-title">Trading Research</h3>
            <p className="feature-desc">Research opportunities and organize market insights effortlessly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Zap size={24} /></div>
            <h3 className="feature-title">Intelligent Market Insights</h3>
            <p className="feature-desc">Turn market information into useful trading context.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Activity size={24} /></div>
            <h3 className="feature-title">Trade Management</h3>
            <p className="feature-desc">Track and manage your trades systematically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FileText size={24} /></div>
            <h3 className="feature-title">Trading Journal</h3>
            <p className="feature-desc">Review your decisions and understand your trading behaviour.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><BarChart2 size={24} /></div>
            <h3 className="feature-title">Performance Analytics</h3>
            <p className="feature-desc">Track P&L, win rate, profit factor and other meaningful metrics.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Briefcase size={24} /></div>
            <h3 className="feature-title">Paper Trading</h3>
            <p className="feature-desc">Test ideas and strategies before putting capital at risk.</p>
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Trade with a process.<br/>Improve with data.</h2>
        <p className="section-subtitle">Bring your research, trades and performance into one disciplined workflow.</p>
        <div className="cta-actions" style={{ marginBottom: '0.75rem' }}>
          <button className="landing-btn landing-btn--primary" style={{padding: '1rem 2rem', fontSize: '1.1rem'}} onClick={() => navigate('/register')}>Free Trial</button>
          <button className="landing-btn landing-btn--outline" style={{padding: '1rem 2rem', fontSize: '1.1rem'}} onClick={() => navigate('/login')}>Log In</button>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
          No credit card required
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="landing-nav__brand" style={{marginBottom: '1rem'}}>
              <img src={TS2Logo} alt="TradeSphere" style={{ width: '32px', height: '32px' }} />
              <span>Trade<span className="text-gold">Sphere</span></span>
            </div>
            <p className="footer-desc">Trading research and trade management platform for disciplined market participants.</p>
          </div>
          <div className="footer-links">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Account</h4>
            <ul>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Sign Up</Link></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/support">Contact Support</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} TradeSphere. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
