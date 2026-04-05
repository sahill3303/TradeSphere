import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, CrosshairMode } from 'lightweight-charts';
import api from '../../api/axios';

/**
 * MarketChart — renders a live candlestick/area chart using TradingView Lightweight Charts.
 * Data is fetched through our own backend proxy (avoids CORS).
 *
 * Props:
 *  symbol      - Yahoo Finance symbol, e.g. "%5ENSEI" (Nifty50) or "%5ENSEBANK" (BankNifty)
 *  label       - Display name, e.g. "NIFTY 50"
 *  accentColor - CSS color string for the price line
 *  height      - Chart height in pixels (default 260)
 */
const TIMEFRAMES = [
    { label: '1D / 5m', interval: '5m', range: '1d' },
    { label: '5D / 15m', interval: '15m', range: '5d' },
    { label: '1M / 1h', interval: '1h', range: '1mo' },
    { label: '1Y / 1d', interval: '1d', range: '1y' },
];

export default function MarketChart({ symbol, label, accentColor = '#D4AF37', height = 260 }) {
    const containerRef = useRef(null);
    const chartRef     = useRef(null);
    const seriesRef    = useRef(null);

    const [meta, setMeta]   = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTF, setActiveTF] = useState(TIMEFRAMES[0]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        setLoading(true);

        // ── Create chart ─────────────────────────────────────────────────────
        const chart = createChart(container, {
            width:  container.clientWidth,
            height,
            layout: {
                background: { color: '#17171A' },
                textColor:  '#9CA3AF',
            },
            localization: {
                timeZone: 'Asia/Kolkata',   // display all times in IST (UTC+5:30)
            },
            grid: {
                vertLines: { color: '#26262B' },
                horzLines: { color: '#26262B' },
            },
            crosshair: { mode: CrosshairMode.Normal },
            rightPriceScale: {
                borderColor: '#26262B',
                textColor:   '#9CA3AF',
            },
            timeScale: {
                borderColor:     '#26262B',
                timeVisible:     true,
                secondsVisible:  false,
                fixLeftEdge:     true,
                fixRightEdge:    true,
            },
            handleScroll:   true,
            handleScale:    true,
        });
        chartRef.current = chart;

        // ── Add candlestick series ────────────────────────────────────────────
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor:          '#22C55E',
            downColor:        '#EF4444',
            borderUpColor:    '#22C55E',
            borderDownColor:  '#EF4444',
            wickUpColor:      '#22C55E',
            wickDownColor:    '#EF4444',
        });
        seriesRef.current = candleSeries;

        // ── Resize observer ───────────────────────────────────────────────────
        const ro = new ResizeObserver(entries => {
            const { width } = entries[0].contentRect;
            chart.applyOptions({ width });
        });
        ro.observe(container);

        // ── Fetch data from backend proxy ─────────────────────────────────────
        api.get(`/api/dashboard/market-chart/${symbol}?interval=${activeTF.interval}&range=${activeTF.range}`)
            .then(({ data }) => {
                setMeta({ price: data.currentPrice, prev: data.previousClose });

                const formatted = (data.candles || []).map(c => ({
                    time:  c.time,
                    open:  c.open,
                    high:  c.high,
                    low:   c.low,
                    close: c.close,
                }));

                if (formatted.length > 0) {
                    candleSeries.setData(formatted);
                    chart.timeScale().fitContent();
                }
            })
            .catch(err => {
                console.error(`Chart fetch error for ${symbol}:`, err);
                setError('Failed to load market data.');
            })
            .finally(() => setLoading(false));

        return () => {
            ro.disconnect();
            chart.remove();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, activeTF]);

    const change     = meta ? (meta.price - meta.prev) : 0;
    const changePct  = meta?.prev ? (change / meta.prev) * 100 : 0;
    const isPositive = change >= 0;

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '0.6rem 1rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--color-surface)',
            }}>
                <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: accentColor,
                    display: 'inline-block', flexShrink: 0,
                    boxShadow: `0 0 6px ${accentColor}`,
                }} />
                <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700, fontSize: '0.85rem',
                    color: 'var(--color-text)',
                    letterSpacing: '0.03em',
                }}>{label}</span>

                {meta && (
                    <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                        ₹{Number(meta.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        &nbsp;
                        <span style={{ fontWeight: 500 }}>
                            ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
                        </span>
                    </span>
                )}

                <select 
                    value={activeTF.label}
                    onChange={e => setActiveTF(TIMEFRAMES.find(t => t.label === e.target.value))}
                    style={{
                        fontSize: '0.68rem',
                        color: 'var(--color-text-dim)',
                        background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-border)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        marginLeft: meta ? 'var(--space-sm)' : 'auto',
                        cursor: 'pointer',
                        outline: 'none',
                    }}
                >
                    {TIMEFRAMES.map(t => (
                        <option key={t.label} value={t.label}>NSE · {t.label}</option>
                    ))}
                </select>
            </div>

            {/* Chart area */}
            {loading && (
                <div style={{
                    height, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '0.5rem',
                    color: 'var(--color-text-dim)', fontSize: 'var(--font-size-sm)',
                    background: '#17171A',
                }}>
                    <span style={{
                        width: 16, height: 16,
                        border: `2px solid ${accentColor}`,
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    Loading chart…
                </div>
            )}

            {error && (
                <div style={{
                    height, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexDirection: 'column', gap: '0.35rem',
                    color: 'var(--color-text-dim)', fontSize: 'var(--font-size-sm)',
                    background: '#17171A',
                }}>
                    <span style={{ fontSize: '1.4rem' }}>📡</span>
                    {error}
                </div>
            )}

            <div
                ref={containerRef}
                style={{ display: loading || error ? 'none' : 'block', width: '100%' }}
            />
        </div>
    );
}
