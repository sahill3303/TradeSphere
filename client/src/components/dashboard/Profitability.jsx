export default function Profitability({ summary }) {
    if (!summary) return null;

    const { totalTrades, wins, losses, winRate, avgWin, avgLoss, profitFactor } = summary;
    const totalClosed = (wins || 0) + (losses || 0);

    // Semi-circle gauge calculations
    const winPct = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
    const lossPct = totalClosed > 0 ? (losses / totalClosed) * 100 : 0;

    // SVG arc for the semi-circle gauge
    const radius = 80;
    const strokeWidth = 14;
    const centerX = 100;
    const centerY = 95;
    const circumference = Math.PI * radius; // half circle

    const winArc = (winPct / 100) * circumference;
    const lossArc = (lossPct / 100) * circumference;

    // Helper: create arc path for semi-circle (left to right)
    const describeArc = (startAngle, endAngle) => {
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);
        const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
    };

    // Angles: semi-circle from 180° (left) to 0° (right)
    // Win portion fills from left, loss from right
    const winEndAngle = 180 + (winPct / 100) * 180;
    const lossStartAngle = 360 - (lossPct / 100) * 180;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-lg)',
            marginTop: 'var(--space-xl)',
            marginBottom: 'var(--space-xl)'
        }} className="profitability-grid">

            {/* Gauge Card */}
            <div className="card" style={{
                padding: 'var(--space-lg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <h3 style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    margin: '0 0 var(--space-md) 0',
                    color: 'var(--color-text)',
                    alignSelf: 'flex-start'
                }}>Profitability</h3>

                <svg width="200" height="110" viewBox="0 0 200 110" style={{ overflow: 'visible' }}>
                    {/* Background track */}
                    <path
                        d={describeArc(180, 360)}
                        fill="none"
                        stroke="var(--color-surface-alt)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                    {/* Win arc (green, from left) */}
                    {winPct > 0 && (
                        <path
                            d={describeArc(180, Math.min(winEndAngle, 360))}
                            fill="none"
                            stroke="var(--color-success)"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            style={{
                                transition: 'all 1s ease-out',
                                filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.4))'
                            }}
                        />
                    )}
                    {/* Loss arc (red, from right) */}
                    {lossPct > 0 && (
                        <path
                            d={describeArc(Math.max(lossStartAngle, 180), 360)}
                            fill="none"
                            stroke="var(--color-danger)"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            style={{
                                transition: 'all 1s ease-out',
                                filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.4))'
                            }}
                        />
                    )}
                    {/* Center text */}
                    <text x={centerX} y={centerY - 18} textAnchor="middle" fill="var(--color-text-dim)" fontSize="11" fontFamily="var(--font-body)">Total Trades</text>
                    <text x={centerX} y={centerY + 5} textAnchor="middle" fill="var(--color-text)" fontSize="28" fontWeight="700" fontFamily="var(--font-heading)">{totalClosed}</text>
                </svg>

                {/* Bottom stats */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    maxWidth: '200px',
                    marginTop: 'var(--space-md)',
                    paddingTop: 'var(--space-md)',
                    borderTop: '1px solid var(--color-border)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-success)' }}>{winPct.toFixed(0)}%</span>
                        <br />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Wins: {wins || 0}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-danger)' }}>{lossPct.toFixed(0)}%</span>
                        <br />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Losses: {losses || 0}</span>
                    </div>
                </div>
            </div>

            {/* Ratio Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: 'var(--space-md)'
            }}>
                {/* Average Win */}
                <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>Average Win</span>
                    </div>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-success)' }}>
                        +₹{Number(avgWin || 0).toLocaleString('en-IN')}
                    </span>
                </div>

                {/* Win Ratio */}
                <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>Win Ratio</span>
                    </div>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        {winRate}%
                    </span>
                </div>

                {/* Average Loss */}
                <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                            <polyline points="17 18 23 18 23 12"></polyline>
                        </svg>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>Average Loss</span>
                    </div>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                        -₹{Number(Math.abs(avgLoss || 0)).toLocaleString('en-IN')}
                    </span>
                </div>

                {/* Profit Factor */}
                <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>Profit Factor</span>
                    </div>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: profitFactor >= 1 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {profitFactor === Infinity ? '∞' : profitFactor}
                    </span>
                </div>
            </div>
        </div>
    );
}
