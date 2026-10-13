import { ArrowUpRight, ArrowDownRight, Target, Scale, Award } from 'lucide-react';

export default function Profitability({ summary }) {
    if (!summary) return null;

    const { totalTrades, wins, losses, winRate, avgWin, avgLoss, profitFactor } = summary;
    const safeWins = Number(wins) || 0;
    const safeLosses = Number(losses) || 0;
    const totalClosed = safeWins + safeLosses;

    // Semi-circle gauge calculations
    const winPct = totalClosed > 0 ? (safeWins / totalClosed) * 100 : 0;
    const lossPct = totalClosed > 0 ? (safeLosses / totalClosed) * 100 : 0;

    // SVG arc for the semi-circle gauge
    const radius = 80;
    const strokeWidth = 14;
    const centerX = 100;
    const centerY = 95;
    const circumference = Math.PI * radius; // half circle

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

    // Factor rating
    const pfNum = Number(profitFactor);
    let pfRating = { label: 'Modest', color: 'var(--color-text-dim)' };
    if (!isNaN(pfNum)) {
        if (pfNum >= 2.0) pfRating = { label: 'Exceptional', color: '#10b981' };
        else if (pfNum >= 1.5) pfRating = { label: 'Healthy', color: '#34d399' };
        else if (pfNum >= 1.0) pfRating = { label: 'Profitable', color: 'var(--color-gold)' };
        else pfRating = { label: 'Needs Focus', color: '#f87171' };
    }

    return (
        <div className="profitability-grid">
            {/* Gauge Card */}
            <div className="card profitability-gauge-card">
                <div className="profitability-gauge-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={18} className="text-gold" />
                        <h3 className="profitability-gauge-title">Trade Profitability</h3>
                    </div>
                    <span className="profitability-gauge-badge">
                        {totalClosed} Closed Positions
                    </span>
                </div>

                <div className="profitability-svg-wrapper">
                    <svg width="220" height="120" viewBox="0 0 200 110" style={{ overflow: 'visible' }}>
                        <defs>
                            <linearGradient id="winGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#34D399" />
                            </linearGradient>
                            <linearGradient id="lossGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#EF4444" />
                                <stop offset="100%" stopColor="#F87171" />
                            </linearGradient>
                        </defs>

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
                                stroke="url(#winGaugeGrad)"
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                style={{
                                    transition: 'all 1s ease-out',
                                    filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.45))'
                                }}
                            />
                        )}
                        {/* Loss arc (red, from right) */}
                        {lossPct > 0 && (
                            <path
                                d={describeArc(Math.max(lossStartAngle, 180), 360)}
                                fill="none"
                                stroke="url(#lossGaugeGrad)"
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                style={{
                                    transition: 'all 1s ease-out',
                                    filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.45))'
                                }}
                            />
                        )}
                        {/* Center text: Win Rate is the hero metric */}
                        <text x={centerX} y={centerY - 22} textAnchor="middle" fill="var(--color-text-dim)" fontSize="10" fontWeight="600" letterSpacing="0.06em" fontFamily="var(--font-heading)">
                            WIN RATIO
                        </text>
                        <text x={centerX} y={centerY + 6} textAnchor="middle" fill="var(--color-text)" fontSize="28" fontWeight="800" fontFamily="var(--font-heading)">
                            {totalClosed > 0 ? `${winPct.toFixed(0)}%` : '0%'}
                        </text>
                    </svg>
                </div>

                {/* Bottom stats pill badges */}
                <div className="profitability-legend-pills">
                    <div className="profitability-legend-pill profitability-legend-pill--win">
                        <span className="legend-indicator-dot" />
                        <span>Wins: <strong>{safeWins}</strong> ({winPct.toFixed(0)}%)</span>
                    </div>
                    <div className="profitability-legend-pill profitability-legend-pill--loss">
                        <span className="legend-indicator-dot" />
                        <span>Losses: <strong>{safeLosses}</strong> ({lossPct.toFixed(0)}%)</span>
                    </div>
                </div>
            </div>

            {/* Ratio Cards Grid */}
            <div className="ratio-cards-grid">
                {/* Average Win */}
                <div className="card ratio-metric-card ratio-metric-card--win">
                    <div className="ratio-metric-card__header">
                        <div className="ratio-metric-icon ratio-metric-icon--win">
                            <ArrowUpRight size={18} strokeWidth={2.5} />
                        </div>
                        <span className="ratio-metric-tag ratio-metric-tag--win">Profit Setup</span>
                    </div>
                    <div className="ratio-metric-card__body">
                        <span className="ratio-metric-label">Average Win</span>
                        <div className="ratio-metric-value text-success">
                            +₹{Number(avgWin || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <span className="ratio-metric-sub">Average profit per win trade</span>
                    </div>
                </div>

                {/* Win Ratio */}
                <div className="card ratio-metric-card ratio-metric-card--ratio">
                    <div className="ratio-metric-card__header">
                        <div className="ratio-metric-icon ratio-metric-icon--ratio">
                            <Target size={18} strokeWidth={2.5} />
                        </div>
                        <span className="ratio-metric-tag ratio-metric-tag--ratio">Efficiency</span>
                    </div>
                    <div className="ratio-metric-card__body">
                        <span className="ratio-metric-label">Win Ratio</span>
                        <div className="ratio-metric-value text-gold">
                            {winRate != null ? `${winRate}%` : '0%'}
                        </div>
                        <span className="ratio-metric-sub">Success frequency on closed trades</span>
                    </div>
                </div>

                {/* Average Loss */}
                <div className="card ratio-metric-card ratio-metric-card--loss">
                    <div className="ratio-metric-card__header">
                        <div className="ratio-metric-icon ratio-metric-icon--loss">
                            <ArrowDownRight size={18} strokeWidth={2.5} />
                        </div>
                        <span className="ratio-metric-tag ratio-metric-tag--loss">Risk Controlled</span>
                    </div>
                    <div className="ratio-metric-card__body">
                        <span className="ratio-metric-label">Average Loss</span>
                        <div className="ratio-metric-value text-danger">
                            -₹{Number(Math.abs(avgLoss || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <span className="ratio-metric-sub">Average drawdown per stopped trade</span>
                    </div>
                </div>

                {/* Profit Factor */}
                <div className="card ratio-metric-card ratio-metric-card--pf">
                    <div className="ratio-metric-card__header">
                        <div className="ratio-metric-icon ratio-metric-icon--pf">
                            <Scale size={18} strokeWidth={2.5} />
                        </div>
                        <span className="ratio-metric-tag" style={{ color: pfRating.color, borderColor: pfRating.color }}>
                            {pfRating.label}
                        </span>
                    </div>
                    <div className="ratio-metric-card__body">
                        <span className="ratio-metric-label">Profit Factor</span>
                        <div className="ratio-metric-value" style={{ color: (profitFactor ?? 0) >= 1 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {profitFactor == null ? '—' : profitFactor === Infinity ? '∞' : profitFactor}
                        </div>
                        <span className="ratio-metric-sub">Gross profit / Gross loss ratio</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
