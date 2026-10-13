import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Coins, BarChart2, TrendingUp, Triangle, Info, 
  ArrowLeft, ChevronDown 
} from 'lucide-react';
import TS2Logo from '../../assets/TS2.png';
import Profitability from '../../components/dashboard/Profitability';

const sampleSummary = {
  totalClients: 14,
  totalTrades: 156,
  totalCapital: 12500000,
  totalPnl: 845000,
  wins: 106,
  losses: 50,
  winRate: 68,
  avgWin: 42500,
  avgLoss: 18200,
  profitFactor: 2.33,
};

const sampleMonthlyPerformance = [
  {
    month: 'Apr',
    returnPercentage: -1.7,
    stocks: [
      { stock_name: 'HDFCBANK', returnPercentage: -1.2 },
      { stock_name: 'RELIANCE', returnPercentage: -0.5 },
    ],
    averageCapital: 850000,
  },
  {
    month: 'May',
    returnPercentage: 13.1,
    stocks: [
      { stock_name: 'MARKSANS', returnPercentage: 7.4 },
      { stock_name: 'CGCL', returnPercentage: 3.8 },
      { stock_name: 'ADANIENT', returnPercentage: 3.5 },
      { stock_name: 'DRREDDY', returnPercentage: -1.6 },
    ],
    averageCapital: 970044,
  },
  {
    month: 'Jun',
    returnPercentage: 2.5,
    stocks: [
      { stock_name: 'TCS', returnPercentage: 1.8 },
      { stock_name: 'INFY', returnPercentage: 0.7 },
    ],
    averageCapital: 1020000,
  },
  {
    month: 'Jul',
    returnPercentage: 4.5,
    stocks: [
      { stock_name: 'BAJFINANCE', returnPercentage: 3.2 },
      { stock_name: 'SBIN', returnPercentage: 1.3 },
    ],
    averageCapital: 1100000,
  },
  {
    month: 'Aug',
    returnPercentage: 2.8,
    stocks: [
      { stock_name: 'ICICIBANK', returnPercentage: 2.1 },
      { stock_name: 'LT', returnPercentage: 0.7 },
    ],
    averageCapital: 1180000,
  },
  {
    month: 'Sep',
    returnPercentage: 5.2,
    stocks: [
      { stock_name: 'TATAMOTORS', returnPercentage: 3.4 },
      { stock_name: 'BHARTIARTL', returnPercentage: 1.8 },
    ],
    averageCapital: 1250000,
  },
];

export default function ExplorePlatform() {
  const navigate = useNavigate();
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const maxAbs = Math.max(...sampleMonthlyPerformance.map(m => Math.abs(m.returnPercentage || 0)), 1);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg, #0B0B0D)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header className="explore-header" style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 5%',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(11, 11, 13, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 1000,
        borderBottom: '1px solid var(--color-border)',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button 
            className="explore-back-btn"
            onClick={() => navigate('/')} 
            title="Back to Home"
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'var(--color-surface)', 
              color: 'var(--color-text)', 
              border: '1px solid var(--color-border)', 
              borderRadius: 'var(--radius-full)',
              padding: '0.42rem 0.9rem',
              cursor: 'pointer', 
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-gold)';
              e.currentTarget.style.color = 'var(--color-gold)';
              e.currentTarget.style.background = 'var(--color-gold-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text)';
              e.currentTarget.style.background = 'var(--color-surface)';
            }}
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          <div 
            onClick={() => navigate('/')} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
          >
            <img src={TS2Logo} alt="TradeSphere Logo" style={{ width: '28px', height: '28px' }} />
            <span className="hide-mobile" style={{ fontWeight: 700, fontSize: '1.15rem', fontFamily: 'var(--font-heading)' }}>
              Trade<span style={{ color: 'var(--color-gold)' }}>Sphere</span>
            </span>
          </div>

          <span className="hide-mobile" style={{ 
            padding: '3px 9px', 
            background: 'rgba(212,175,55,0.1)', 
            color: 'var(--color-gold)', 
            borderRadius: '12px', 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            letterSpacing: '0.04em',
            border: '1px solid rgba(212,175,55,0.25)' 
          }}>
            INTERACTIVE PREVIEW
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="landing-btn landing-btn--primary"
            onClick={() => navigate('/register')} 
            style={{ 
              padding: '0.5rem 1.15rem', 
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)'
            }}
          >
            Start Free Trial
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem 5%', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Title Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.45rem', color: '#fff', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
            Dashboard Overview
          </h1>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.95rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.5 }}>
            Interactive preview of TradeSphere's performance engine, analytics, and metrics.
          </p>
        </div>

        {/* Dashboard Grid Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* ── Stat Cards (Same 2x2 UI as Dashboard) ── */}
          <div className="stats-grid market-overview-grid dashboard-kpi-grid">
            {/* Total Clients */}
            <div className="card stat-card dashboard-kpi-card dashboard-kpi-card--clients">
              <div className="dashboard-kpi-card__top">
                <div className="dashboard-kpi-card__icon-box" style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)' }}>
                  <Users size={18} />
                </div>
                <span className="dashboard-kpi-card__badge" style={{ background: 'var(--color-gold-soft)', color: 'var(--color-gold)' }}>
                  MANAGED
                </span>
              </div>
              <div className="dashboard-kpi-card__body">
                <span className="dashboard-kpi-card__label">Total Clients</span>
                <div className="dashboard-kpi-card__value text-gold">
                  14
                </div>
              </div>
              <div className="dashboard-kpi-card__footer">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-gold)' }} />
                <span>Active portfolios</span>
              </div>
            </div>

            {/* Total Trades */}
            <div className="card stat-card dashboard-kpi-card dashboard-kpi-card--trades">
              <div className="dashboard-kpi-card__top">
                <div className="dashboard-kpi-card__icon-box" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8' }}>
                  <TrendingUp size={18} />
                </div>
                <span className="dashboard-kpi-card__badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8' }}>
                  VOLUME
                </span>
              </div>
              <div className="dashboard-kpi-card__body">
                <span className="dashboard-kpi-card__label">Total Trades</span>
                <div className="dashboard-kpi-card__value" style={{ color: '#60A5FA' }}>
                  156
                </div>
              </div>
              <div className="dashboard-kpi-card__footer">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60A5FA' }} />
                <span>Lifetime trades</span>
              </div>
            </div>

            {/* Total Capital */}
            <div className="card stat-card dashboard-kpi-card dashboard-kpi-card--capital">
              <div className="dashboard-kpi-card__top">
                <div className="dashboard-kpi-card__icon-box" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
                  <Coins size={18} />
                </div>
                <span className="dashboard-kpi-card__badge" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
                  POOLED AUM
                </span>
              </div>
              <div className="dashboard-kpi-card__body">
                <span className="dashboard-kpi-card__label">Total Capital</span>
                <div className="dashboard-kpi-card__value text-success">
                  ₹1.25Cr
                </div>
              </div>
              <div className="dashboard-kpi-card__footer">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }} />
                <span>Pooled investor funds</span>
              </div>
            </div>

            {/* Realised P&L */}
            <div className="card stat-card dashboard-kpi-card dashboard-kpi-card--pnl-pos">
              <div className="dashboard-kpi-card__top">
                <div className="dashboard-kpi-card__icon-box" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
                  <BarChart2 size={18} />
                </div>
                <span className="dashboard-kpi-card__badge" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
                  NET PROFIT
                </span>
              </div>
              <div className="dashboard-kpi-card__body">
                <span className="dashboard-kpi-card__label">
                  Realised P&L
                  <span className="custom-tooltip custom-tooltip--right" data-tooltip="* Realised P&L is gross (without tax and interest). Operating costs will be added in the future.">
                    <Info size={12} color="var(--color-text-muted)" style={{ marginLeft: 4 }} />
                  </span>
                </span>
                <div className="dashboard-kpi-card__value" style={{ color: '#34d399' }}>
                  +₹8.45L
                </div>
              </div>
              <div className="dashboard-kpi-card__footer" style={{ color: 'var(--color-success)' }}>
                <Triangle size={8} fill="currentColor" />
                <span>Closed net profit</span>
              </div>
            </div>
          </div>

          {/* ── Trade Profitability Gauge & 4 Ratio Cards (Same 2x2 UI as Dashboard) ── */}
          <Profitability summary={sampleSummary} />

          {/* ── Monthly Performance Chart (Same UI as Dashboard) ── */}
          <div className="card" style={{ padding: 'var(--space-lg)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} className="text-gold" />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                  Monthly Return Performance
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.72rem', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>▲ Net Gain</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>▼ Net Drawdown</span>
                </div>
                <div style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                  2026
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', height: '175px', position: 'relative', gap: '8px', padding: '24px 0 20px 0' }}>
                {/* Zero Line */}
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--color-border)', zIndex: 0 }} />

                {sampleMonthlyPerformance.map(m => {
                  const val = m.returnPercentage || 0;
                  const isPositive = val >= 0;
                  const heightPct = (Math.abs(val) / maxAbs) * 38; // 38% keeps bars and percentage tags well within bounds

                  return (
                    <div
                      key={m.month}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: hoveredMonth === m.month ? 10 : 1 }}
                      onMouseEnter={() => setHoveredMonth(m.month)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {/* Tooltip */}
                      {hoveredMonth === m.month && m.stocks && m.stocks.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginBottom: '15px',
                          background: 'var(--color-surface-alt)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                          width: 'max-content',
                          minWidth: '160px',
                          maxWidth: '220px',
                          pointerEvents: 'none',
                          animation: 'fadeInUp 0.2s ease-out',
                          zIndex: 20
                        }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                            {m.month} Contributions
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {m.stocks.map((stk, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--color-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px', paddingRight: '12px' }}>
                                  {stk.stock_name}
                                </span>
                                <span style={{
                                  color: stk.returnPercentage >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                  fontWeight: 600
                                }}>
                                  {stk.returnPercentage > 0 ? '+' : ''}{stk.returnPercentage.toFixed(1)}%
                                </span>
                              </div>
                            ))}
                            {m.averageCapital > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--color-border)' }}>
                                <span style={{ color: 'var(--color-text-dim)' }}>Avg Capital:</span>
                                <span style={{ fontWeight: 600 }}>₹{m.averageCapital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Top Half (Positive) */}
                      <div style={{ height: '50%', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        {isPositive && val > 0 && (
                          <div style={{
                            width: '100%', maxWidth: '32px', height: `${heightPct * 2}%`,
                            background: 'var(--color-success)',
                            borderRadius: '4px 4px 0 0',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'filter 0.2s',
                            filter: hoveredMonth === m.month ? 'brightness(1.2)' : 'none'
                          }}>
                            <span style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                              +{val.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Half (Negative) */}
                      <div style={{ height: '50%', width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                        {!isPositive && val < 0 && (
                          <div style={{
                            width: '100%', maxWidth: '32px', height: `${heightPct * 2}%`,
                            background: 'var(--color-danger)',
                            borderRadius: '0 0 4px 4px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'filter 0.2s',
                            filter: hoveredMonth === m.month ? 'brightness(1.2)' : 'none'
                          }}>
                            <span style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-danger)', whiteSpace: 'nowrap' }}>
                              {val.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dedicated Month Labels Axis Row */}
              <div style={{
                display: 'flex',
                gap: '8px',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '8px',
                marginTop: '4px'
              }}>
                {sampleMonthlyPerformance.map(m => (
                  <div
                    key={m.month}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '0.72rem',
                      color: hoveredMonth === m.month ? 'var(--color-gold)' : 'var(--color-text-dim)',
                      fontWeight: hoveredMonth === m.month ? 700 : 600,
                      transition: 'color 0.15s'
                    }}
                  >
                    {m.month}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
