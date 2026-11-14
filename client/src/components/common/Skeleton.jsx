import React from 'react';
import './Skeleton.css';

/**
 * Base Shimmer Skeleton
 */
export function Skeleton({
    width,
    height,
    variant = 'rect', // 'rect' | 'circle' | 'pill' | 'text'
    borderRadius,
    className = '',
    style = {},
    ...rest
}) {
    const computedStyle = {
        width: width ?? (variant === 'circle' ? height : '100%'),
        height: height ?? (variant === 'text' ? '1rem' : '1.5rem'),
        borderRadius: borderRadius ?? (variant === 'circle' ? '50%' : variant === 'pill' ? '999px' : undefined),
        ...style
    };

    const variantClass = variant === 'circle' ? 'ts-skeleton--circle' : variant === 'pill' ? 'ts-skeleton--pill' : '';

    return (
        <span
            className={`ts-skeleton ${variantClass} ${className}`.trim()}
            style={computedStyle}
            aria-hidden="true"
            {...rest}
        />
    );
}

/**
 * Top Loading Banner with Spinning Ring and Captions
 */
export function LoadingBanner({ caption, subcaption, className = '' }) {
    if (!caption) return null;
    return (
        <div className={`ts-loading-banner ${className}`.trim()}>
            <div className="ts-loading-spinner-ring" />
            <div className="ts-loading-banner__text">
                <span className="ts-loading-banner__caption">
                    <span className="ts-loading-pulse-dot" />
                    {caption}
                </span>
                {subcaption && (
                    <span className="ts-loading-banner__subcaption">{subcaption}</span>
                )}
            </div>
        </div>
    );
}

/**
 * Standalone Central Loading State
 */
export function LoadingState({
    caption = 'Loading data...',
    subcaption = 'Synchronizing real-time information with market servers...',
    compact = false,
    className = ''
}) {
    return (
        <div className={`ts-loading-state ${compact ? 'ts-loading-state--compact' : ''} ${className}`.trim()}>
            <div className="ts-spinner-dual">
                <div className="ts-spinner-dual__outer" />
                <div className="ts-spinner-dual__inner" />
            </div>
            <div className="ts-loading-state__caption">{caption}</div>
            {subcaption && <div className="ts-loading-state__subcaption">{subcaption}</div>}
        </div>
    );
}

/**
 * KPI Metric Cards Skeleton Grid
 */
export function KpiSkeleton({ count = 4, className = '' }) {
    const items = Array.from({ length: count });
    return (
        <div className={`ts-kpi-skeleton-grid ${className}`.trim()}>
            {items.map((_, i) => (
                <div key={i} className="ts-kpi-skeleton-card">
                    <div>
                        <div className="ts-kpi-skeleton-top">
                            <Skeleton width="45%" height="13px" />
                            <Skeleton width="28px" height="28px" variant="circle" />
                        </div>
                        <Skeleton width="65%" height="32px" style={{ marginBottom: '0.65rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Skeleton width="35%" height="12px" />
                        <Skeleton width="25%" height="12px" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Asset Cards Skeleton Grid (Trades, Portfolio, Paper Trading)
 */
export function CardSkeleton({
    count = 6,
    caption = 'Loading active positions & market quotes...',
    subcaption,
    showBanner = true,
    className = ''
}) {
    const items = Array.from({ length: count });
    return (
        <div>
            {showBanner && caption && (
                <LoadingBanner caption={caption} subcaption={subcaption} />
            )}
            <div className={`ts-card-skeleton-grid ${className}`.trim()}>
                {items.map((_, i) => (
                    <div key={i} className="ts-card-skeleton">
                        <div>
                            {/* Card Top: Ticker & Badges on left, PNL on right */}
                            <div className="ts-card-skeleton__top">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <Skeleton width="110px" height="22px" />
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <Skeleton width="55px" height="16px" variant="pill" />
                                        <Skeleton width="65px" height="16px" variant="pill" />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <Skeleton width="80px" height="22px" />
                                    <Skeleton width="50px" height="14px" />
                                </div>
                            </div>

                            {/* Tags row */}
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '0.85rem' }}>
                                <Skeleton width="60px" height="18px" variant="pill" />
                                <Skeleton width="75px" height="18px" variant="pill" />
                            </div>

                            {/* 4-Cell Metrics Box */}
                            <div className="ts-card-skeleton__metrics">
                                <div>
                                    <Skeleton width="60%" height="11px" style={{ marginBottom: '4px' }} />
                                    <Skeleton width="85%" height="17px" />
                                </div>
                                <div>
                                    <Skeleton width="60%" height="11px" style={{ marginBottom: '4px' }} />
                                    <Skeleton width="85%" height="17px" />
                                </div>
                                <div>
                                    <Skeleton width="60%" height="11px" style={{ marginBottom: '4px' }} />
                                    <Skeleton width="85%" height="17px" />
                                </div>
                                <div>
                                    <Skeleton width="60%" height="11px" style={{ marginBottom: '4px' }} />
                                    <Skeleton width="85%" height="17px" />
                                </div>
                            </div>

                            {/* Target & SL Strip */}
                            <div style={{ marginBottom: '0.85rem' }}>
                                <Skeleton width="100%" height="26px" borderRadius="6px" />
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="ts-card-skeleton__footer">
                            <Skeleton width="90px" height="12px" />
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <Skeleton width="55px" height="28px" borderRadius="6px" />
                                <Skeleton width="28px" height="28px" variant="circle" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Table Skeleton (Table view across Trades, Portfolio, Watchlist)
 */
export function TableSkeleton({
    rows = 6,
    cols = 8,
    caption = 'Loading ledger data...',
    subcaption,
    showBanner = true,
    className = ''
}) {
    const rowList = Array.from({ length: rows });
    const colList = Array.from({ length: cols });

    return (
        <div>
            {showBanner && caption && (
                <LoadingBanner caption={caption} subcaption={subcaption} />
            )}
            <div className={`ts-table-skeleton-wrap ${className}`.trim()}>
                <table className="ts-table-skeleton">
                    <thead>
                        <tr>
                            {colList.map((_, ci) => (
                                <th key={ci}>
                                    <Skeleton width={`${Math.floor(40 + (ci % 3) * 20)}%`} height="13px" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rowList.map((_, ri) => (
                            <tr key={ri}>
                                {colList.map((_, ci) => (
                                    <td key={ci}>
                                        <Skeleton
                                            width={ci === 0 ? '110px' : `${Math.floor(50 + ((ci + ri) % 4) * 15)}%`}
                                            height={ci === 0 ? '20px' : '15px'}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * Chart Skeleton
 */
export function ChartSkeleton({
    height = 280,
    caption = 'Calculating performance & benchmark returns...',
    subcaption = 'Syncing historical equity curves with NIFTY 50 index data',
    className = ''
}) {
    return (
        <div className={`ts-chart-skeleton ${className}`.trim()}>
            <div className="ts-chart-skeleton__header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Skeleton width="180px" height="20px" />
                    <Skeleton width="260px" height="13px" />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Skeleton width="70px" height="28px" variant="pill" />
                    <Skeleton width="70px" height="28px" variant="pill" />
                    <Skeleton width="70px" height="28px" variant="pill" />
                </div>
            </div>

            <div className="ts-chart-skeleton__body" style={{ height: `${height}px` }}>
                <div className="ts-chart-grid-line" />
                <div className="ts-chart-grid-line" />
                <div className="ts-chart-grid-line" />
                <div className="ts-chart-grid-line" />
                <div className="ts-chart-grid-line" />

                <div className="ts-chart-skeleton__overlay">
                    <div className="ts-loading-spinner-ring" style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>
                        {caption}
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * Live Ticker Skeleton (Replaces raw text in TickerBar)
 */
export function TickerSkeleton({ count = 8 }) {
    const items = Array.from({ length: count });
    return (
        <div className="ts-ticker-skeleton-list">
            {items.map((_, i) => (
                <div key={i} className="ts-ticker-skeleton-item">
                    <Skeleton width="34px" height="15px" variant="pill" />
                    <Skeleton width="60px" height="13px" />
                    <Skeleton width="48px" height="13px" />
                    <Skeleton width="40px" height="13px" />
                </div>
            ))}
        </div>
    );
}

export default Skeleton;

