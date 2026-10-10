import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, Coins, Activity, BarChart2, PieChart, Target, ChevronDown } from 'lucide-react';
import TS2Logo from '../../assets/TS2.png';

const TooltipCard = ({ title, value, subtitle, icon, tooltipText, color = 'var(--color-gold)' }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      style={{ 
        position: 'relative', 
        background: 'var(--color-surface)', 
        border: `1px solid ${isHovered ? color : 'var(--color-border)'}`, 
        borderRadius: '12px', 
        padding: '1.5rem', 
        cursor: 'help', 
        transition: 'all 0.2s',
        boxShadow: isHovered ? `0 0 15px ${color}20` : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>{title}</div>
        <div style={{ color: color, background: `${color}15`, padding: '8px', borderRadius: '8px' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.25rem' }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{subtitle}</div>

      {isHovered && (
        <div style={{ 
          position: 'absolute', 
          bottom: 'calc(100% + 10px)', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          background: '#1A1A1D', 
          color: '#E0E0E0', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          fontSize: '0.85rem', 
          width: '260px', 
          zIndex: 50, 
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)', 
          border: '1px solid #333',
          lineHeight: 1.5,
          pointerEvents: 'none'
        }}>
           <div style={{ fontWeight: 600, marginBottom: '6px', color: color }}>About {title}</div>
           {tooltipText}
           <div style={{ 
             position: 'absolute', 
             bottom: '-6px', 
             left: '50%', 
             transform: 'translateX(-50%) rotate(45deg)', 
             width: '12px', 
             height: '12px', 
             background: '#1A1A1D', 
             borderRight: '1px solid #333', 
             borderBottom: '1px solid #333' 
           }}></div>
        </div>
      )}
    </div>
  );
};

const MonthBar = ({ month, value, isPositive, height, tooltipData }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '40px', cursor: 'help' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && tooltipData && (
        <div style={{ 
          position: 'absolute', 
          bottom: '100%', 
          left: '50%', 
          transform: 'translateX(-50%) translateY(-10px)', 
          background: '#1A1A1D', 
          color: '#E0E0E0', 
          padding: '16px', 
          borderRadius: '8px', 
          fontSize: '0.85rem', 
          width: '220px', 
          zIndex: 50, 
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)', 
          border: '1px solid #333',
          pointerEvents: 'none'
        }}>
           <div style={{ fontWeight: 700, marginBottom: '12px', color: '#fff', fontSize: '0.9rem' }}>{tooltipData.title}</div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
             {tooltipData.items.map((item, i) => (
               <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ color: 'var(--color-text-dim)' }}>{item.name}</span>
                 <span style={{ color: item.isPositive ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>{item.val}</span>
               </div>
             ))}
           </div>
           
           <div style={{ borderTop: '1px solid #333', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
             Avg Capital: <span style={{ color: '#fff', fontWeight: 600 }}>{tooltipData.avgCapital}</span>
           </div>
           
           <div style={{ 
             position: 'absolute', 
             bottom: '-6px', 
             left: '50%', 
             transform: 'translateX(-50%) rotate(45deg)', 
             width: '12px', 
             height: '12px', 
             background: '#1A1A1D', 
             borderRight: '1px solid #333', 
             borderBottom: '1px solid #333' 
           }}></div>
        </div>
      )}

      {/* Bar Area (fixed height container to align baseline) */}
      <div style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginBottom: '8px', width: '100%' }}>
        {isPositive && (
          <div style={{ 
            height: height, 
            width: '100%', 
            background: 'var(--color-success)', 
            borderRadius: '2px 2px 0 0',
            opacity: isHovered ? 1 : 0.85,
            transition: 'opacity 0.2s'
          }}></div>
        )}
      </div>

      {/* Label & Value */}
      <div style={{ height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: isPositive ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600, marginBottom: '4px' }}>
          {isPositive ? `+${value}` : `-${value}`}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{month}</span>
      </div>

      {/* Negative Bar Area */}
      <div style={{ height: '60px', width: '100%' }}>
        {!isPositive && (
          <div style={{ 
            height: height, 
            width: '100%', 
            background: 'var(--color-danger)', 
            borderRadius: '0 0 2px 2px',
            opacity: isHovered ? 1 : 0.85,
            transition: 'opacity 0.2s',
            marginTop: '20px'
          }}></div>
        )}
      </div>
    </div>
  );
};

export default function ExplorePlatform() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', color: 'var(--color-text)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.5rem 5%',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(11, 11, 13, 0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={TS2Logo} alt="TradeSphere Logo" style={{ width: '32px', height: '32px' }} />
          <span style={{ fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>Trade<span style={{ color: 'var(--color-gold)' }}>Sphere</span></span>
          <span style={{ padding: '4px 10px', background: 'rgba(255,215,0,0.1)', color: 'var(--color-gold)', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '1.5rem', fontWeight: 600 }}>INTERACTIVE PREVIEW</span>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ 
              background: 'transparent', 
              color: 'var(--color-text)', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '0.95rem',
              fontWeight: 500
            }}
          >
            ← Back to Home
          </button>
          <button 
            onClick={() => navigate('/register')} 
            style={{ 
              background: 'var(--color-gold)', 
              color: 'var(--color-bg)', 
              border: 'none', 
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              cursor: 'pointer', 
              fontSize: '0.95rem',
              fontWeight: 600
            }}
          >
            Start Free Trial
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '3rem 5%', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Hover over any card or chart below to see how TradeSphere calculates and visualizes your trading performance.
          </p>
        </div>

        {/* Dashboard Grid Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Row 1: Top KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <TooltipCard 
              title="Total Clients" 
              value="14" 
              subtitle="Active managed accounts" 
              icon={<Users size={20} />} 
              color="#3b82f6"
              tooltipText="Manage multiple client portfolios from a single master account. Benefit: Streamlines operations for trading consultants and advisors."
            />
            <TooltipCard 
              title="Total Trades" 
              value="156" 
              subtitle="Total active & past trades" 
              icon={<Activity size={20} />} 
              color="#a855f7"
              tooltipText="Every trade is automatically logged and linked to its respective client. Benefit: Replaces manual spreadsheets with an automated, error-free journal."
            />
            <TooltipCard 
              title="Total Capital" 
              value="₹1.25Cr" 
              subtitle="Aggregate managed funds" 
              icon={<Coins size={20} />} 
              color="#22c55e"
              tooltipText="The sum of all active capital across your accounts. Benefit: Gives you a bird's eye view of your total market exposure."
            />
            <TooltipCard 
              title="Realised P&L" 
              value="+₹8.45L" 
              subtitle="Aggregate gross closed P&L" 
              icon={<TrendingUp size={20} />} 
              color="#22c55e"
              tooltipText="Your actual realized profits after closing positions. Benefit: Accurately tracks your net growth over time with precision."
            />
          </div>

          {/* Row 2: Profitability & Averages */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {/* Profitability Gauge */}
            <div style={{ gridColumn: 'span 2', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '2rem', position: 'relative' }} className="mockup-hover-card">
               <div style={{ color: 'var(--color-text)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Profitability</span>
                  <PieChart size={20} color="var(--color-gold)" />
               </div>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
                  <div style={{ width: '240px', height: '120px', borderTopLeftRadius: '120px', borderTopRightRadius: '120px', border: '20px solid var(--color-success)', borderBottom: '0', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderTopRightRadius: '120px', border: '20px solid var(--color-danger)', borderBottom: '0', borderLeft: '0', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 100%)' }}></div>
                    <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', textAlign: 'center', transform: 'translateY(25px)' }}>
                       <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Total Trades</div>
                       <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>156</div>
                    </div>
                  </div>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '3rem' }}>
                 <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '1.3rem' }}>68%</div><div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>Wins: 106</div></div>
                 <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '1.3rem' }}>32%</div><div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginTop: '4px' }}>Losses: 50</div></div>
               </div>

               {/* Hover Info */}
               <div className="hover-info-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(11,11,13,0.95)', borderRadius: '12px', opacity: 0, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                  <Target size={36} color="var(--color-gold)" style={{ marginBottom: '1rem' }} />
                  <div style={{ fontWeight: 600, color: 'var(--color-gold)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Profitability Gauge</div>
                  <div style={{ fontSize: '1rem', color: '#ccc', lineHeight: 1.6, maxWidth: '80%' }}>
                    Visually separates your winning trades from losing trades.<br/><br/>
                    <strong>Benefit:</strong> Quickly assess if your strategy yields a positive win rate at a single glance.
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <TooltipCard 
                title="Average Win" 
                value="+₹42,500" 
                subtitle="Per winning trade" 
                icon={<TrendingUp size={20} />} 
                color="#22c55e"
                tooltipText="The average amount you make when a trade is successful. Benefit: Helps you calculate your risk-to-reward metrics."
              />
              <TooltipCard 
                title="Average Loss" 
                value="-₹18,200" 
                subtitle="Per losing trade" 
                icon={<TrendingUp size={20} style={{ transform: 'scaleY(-1)' }} />} 
                color="#ef4444"
                tooltipText="The average amount you lose on unsuccessful trades. Benefit: Highlights if you are cutting your losses fast enough."
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <TooltipCard 
                title="Win Ratio" 
                value="68%" 
                subtitle="Success frequency" 
                icon={<Target size={20} />} 
                color="var(--color-gold)"
                tooltipText="Percentage of trades that resulted in a profit. Benefit: A critical metric to determine the consistency of your edge."
              />
              <TooltipCard 
                title="Profit Factor" 
                value="2.33" 
                subtitle="(Gross Wins / Gross Losses)" 
                icon={<BarChart2 size={20} />} 
                color="var(--color-gold)"
                tooltipText="Calculated as your gross profits divided by gross losses. A value > 1 means you are profitable. Benefit: The ultimate indicator of a strategy's viability."
              />
            </div>
          </div>

          {/* Row 3: Monthly P&L Chart */}
          <div style={{ background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '2rem', position: 'relative' }} className="mockup-hover-card">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>Monthly P&L</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                2026 <ChevronDown size={14} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingBottom: '2rem' }}>
              <MonthBar month="Apr" value="1.7%" isPositive={false} height="15px" />
              <MonthBar 
                month="May" 
                value="13.1%" 
                isPositive={true} 
                height="80px" 
                tooltipData={{
                  title: 'May Contributions',
                  items: [
                    { name: 'MARKSANS', val: '+7.4%', isPositive: true },
                    { name: 'CGCL', val: '+3.8%', isPositive: true },
                    { name: 'ADANIENT', val: '+3.5%', isPositive: true },
                    { name: 'DRREDDY', val: '-1.6%', isPositive: false }
                  ],
                  avgCapital: '₹9,70,044'
                }}
              />
              <MonthBar month="Jun" value="2.5%" isPositive={true} height="20px" />
              <MonthBar month="Jul" value="4.5%" isPositive={true} height="35px" />
              <MonthBar month="Aug" value="2.8%" isPositive={true} height="25px" />
            </div>

            {/* Hover Info */}
            <div className="hover-info-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(11,11,13,0.95)', borderRadius: '12px', opacity: 0, transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
               <BarChart2 size={36} color="var(--color-gold)" style={{ marginBottom: '1rem' }} />
               <div style={{ fontWeight: 600, color: 'var(--color-gold)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Monthly Performance</div>
               <div style={{ fontSize: '1rem', color: '#ccc', lineHeight: 1.6, maxWidth: '80%' }}>
                 Track your returns on a month-by-month basis to identify seasonal trends and consistency.<br/><br/>
                 <strong>Benefit:</strong> Helps you evaluate long-term strategy performance and manage drawdowns effectively.
               </div>
            </div>
          </div>

        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .mockup-hover-card:hover > .hover-info-layer {
            opacity: 1 !important;
          }
        `}} />
      </main>
    </div>
  );
}
