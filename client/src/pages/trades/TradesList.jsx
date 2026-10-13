import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { TrendingUp, Zap, Target, Scale, Eye, Trash2, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import './PaperTrade.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_BADGE = { OPEN: 'badge--yellow', CLOSED: 'badge--green' };
const MODE_COLOR = { LONG: 'var(--color-success)', SHORT: 'var(--color-danger)' };

const TYPE_BADGE_MAP = {
    'INTRADAY': 'badge--cyan',
    'SWING': 'badge--purple',
    'MTF': 'badge--gold',
    'LONG TERM': 'badge--green',
};

function normalizeType(mode) {
    if (!mode) return '';
    const m = String(mode).trim().toUpperCase().replace(/[\s_-]+/g, '');
    if (m === 'LONGTERM') return 'LONG TERM';
    return m;
}

function formatTradeType(mode) {
    const norm = normalizeType(mode);
    if (norm === 'LONG TERM') return 'LONG TERM';
    if (norm === 'INTRADAY') return 'INTRADAY';
    if (norm === 'SWING') return 'SWING';
    if (norm === 'MTF') return 'MTF';
    return norm || 'SWING';
}

function matchTradeType(mode, target) {
    if (!target) return true;
    return normalizeType(mode) === normalizeType(target);
}

function fmtLakhs(val) {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    const abs = Math.abs(num);
    const sign = num >= 0 ? '+' : '-';
    if (abs < 1000) {
        return sign + '₹' + abs;
    }
    if (abs < 100000) {
        return sign + '₹' + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return sign + '₹' + (abs / 100000).toFixed(2) + 'L';
}

function fmtDate(val) {
    if (!val) return null;
    const s = val instanceof Date ? val.toISOString() : String(val);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

function TabBtn({ active, onClick, children }) {
    return (
        <button onClick={onClick} style={{
            background: 'none', border: 'none',
            borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontFamily: 'var(--font-family)', fontWeight: active ? 600 : 500,
            fontSize: 'var(--font-size-sm)', padding: '0.5rem 1rem',
            cursor: 'pointer', transition: 'color var(--transition), border-color var(--transition)',
            whiteSpace: 'nowrap',
        }}>{children}</button>
    );
}

function ActionBtn({ onClick, disabled, color, children }) {
    return (
        <button onClick={onClick} disabled={disabled} style={{
            background: 'none', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color, fontSize: '0.9rem', padding: 0,
            opacity: disabled ? 0.5 : 1,
        }}>{children}</button>
    );
}

function SortHeader({ field, label, sortConfig, onSort, className, align = 'left' }) {
    const isSorted = sortConfig.key === field;
    return (
        <th
            className={className}
            onClick={() => onSort(field)}
            style={{ cursor: 'pointer', userSelect: 'none', textAlign: align }}
            title={`Sort by ${label}`}
        >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
                <span>{label}</span>
                <span style={{ fontSize: '0.65rem', opacity: isSorted ? 1 : 0.35, color: isSorted ? 'var(--color-primary)' : 'inherit' }}>
                    {isSorted ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </span>
            </div>
        </th>
    );
}

export default function TradesList() {
    const navigate = useNavigate();
    const confirmAction = useConfirm();

    const [activeTab, setActiveTab] = useState('active');

    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters and Sorting
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    const [deletingId, setDeletingId] = useState(null);
    const [clientTotalCapital, setClientTotalCapital] = useState(0);

    const [deleted, setDeleted] = useState([]);
    const [deletedLoading, setDeletedLoading] = useState(false);
    const [deletedError, setDeletedError] = useState('');
    const [restoringId, setRestoringId] = useState(null);
    const [hardDeletingId, setHardDeletingId] = useState(null);

    const [prices, setPrices] = useState({});
    const [pricesLoading, setPricesLoading] = useState(false);

    useEffect(() => {
        const openTrades = trades.filter(t => t.status === 'OPEN');
        if (openTrades.length > 0) {
            const uniqueSymbols = [...new Set(openTrades.map(t => t.stock_name))];
            const fetchPrices = async () => {
                setPricesLoading(true);
                try {
                    const symbolString = uniqueSymbols.join(',');
                    const { data } = await api.get(`/watchlist/prices?symbols=${symbolString}`);
                    if (data.success) {
                        const pricesFlat = {};
                        for (const [k, v] of Object.entries(data.data)) {
                            pricesFlat[k] = typeof v === 'object' ? v.price : v;
                        }
                        setPrices(pricesFlat);
                    }
                } catch (err) {
                    console.error('Failed to fetch prices for trades:', err);
                } finally {
                    setPricesLoading(false);
                }
            };
            fetchPrices();
        } else {
            setPrices({});
        }
    }, [trades]);

    // Live Metrics calculated on scopedTrades (scoped to selected typeFilter) so all stats update dynamically!
    const liveMetrics = useMemo(() => {
        let activeInvested = 0;
        let totalUnrealizedPnl = 0;
        let totalRealizedPnl = 0;
        let totalClosedCost = 0;
        let openTradesCount = 0;
        let closedTradesCount = 0;
        let wins = 0;
        let losses = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;

        const scopedTrades = typeFilter 
            ? trades.filter(t => matchTradeType(t.mode, typeFilter))
            : trades;

        scopedTrades.forEach(t => {
            const lev = t.leverage || 1;
            const invested = (t.entry_price * t.quantity) / lev;
            
            if (t.status === 'OPEN') {
                openTradesCount++;
                activeInvested += invested;
                
                const rawCmp = prices[t.stock_name];
                const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
                
                if (cmpVal !== null && !isNaN(cmpVal)) {
                    let pnl = 0;
                    if (t.trade_type === 'LONG') {
                        pnl = (cmpVal - t.entry_price) * t.quantity;
                    } else {
                        pnl = (t.entry_price - cmpVal) * t.quantity;
                    }
                    totalUnrealizedPnl += pnl;
                }
            } else if (t.status === 'CLOSED') {
                closedTradesCount++;
                totalClosedCost += invested;
                const pnl = Number(t.total_pnl || 0);
                totalRealizedPnl += pnl;

                if (pnl > 0) {
                    wins++;
                    totalWinAmount += pnl;
                } else if (pnl < 0) {
                    losses++;
                    totalLossAmount += Math.abs(pnl);
                }
            }
        });

        const unrealizedPnlPct = activeInvested > 0 ? (totalUnrealizedPnl / activeInvested) * 100 : 0;
        const realizedPnlPct = totalClosedCost > 0 ? (totalRealizedPnl / totalClosedCost) * 100 : 0;

        const closedTotal = wins + losses;
        const winRate = closedTotal > 0 ? Math.round((wins / closedTotal) * 100) : 0;
        const avgWin = wins > 0 ? (totalWinAmount / wins) : 0;
        const avgLoss = losses > 0 ? -(totalLossAmount / losses) : 0;
        const avgRRRatio = losses > 0 && avgWin > 0 
            ? `1 : ${(avgWin / (totalLossAmount / losses)).toFixed(2)}` 
            : (avgWin > 0 ? 'Infinity' : '1 : 0.00');

        return {
            activeInvested,
            totalUnrealizedPnl,
            unrealizedPnlPct,
            totalRealizedPnl,
            realizedPnlPct,
            openTradesCount,
            closedTradesCount,
            totalClosedCost,
            wins,
            losses,
            winRate,
            avgWin,
            avgLoss,
            avgRRRatio,
        };
    }, [trades, prices, typeFilter]);

    const formatCurrency = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '₹0';
        return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };

    const fetchTrades = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [{ data: tradesData }, { data: summaryData }] = await Promise.all([
                api.get('/trades?limit=200'),
                api.get('/dashboard/summary').catch(() => ({ data: { totalCapital: 0 } }))
            ]);
            setTrades(tradesData.trades || []);
            if (summaryData) {
                setClientTotalCapital(Number(summaryData.totalCapital || 0));
            }
        } catch { setError('Failed to load trades.'); }
        finally { setLoading(false); }
    }, []);

    const fetchDeleted = useCallback(async () => {
        setDeletedLoading(true); setDeletedError('');
        try {
            const { data } = await api.get('/trades/deleted');
            setDeleted(data || []);
        } catch { setDeletedError('Failed to load deleted trades.'); }
        finally { setDeletedLoading(false); }
    }, []);

    useEffect(() => { fetchTrades(); }, [fetchTrades]);
    useEffect(() => { if (activeTab === 'deleted') fetchDeleted(); }, [activeTab, fetchDeleted]);

    // Trade Type Counts
    const typeCounts = useMemo(() => {
        const counts = { '': 0, 'INTRADAY': 0, 'SWING': 0, 'MTF': 0, 'LONG TERM': 0 };
        trades.forEach(t => {
            counts['']++;
            const norm = normalizeType(t.mode);
            if (counts[norm] !== undefined) {
                counts[norm]++;
            }
        });
        return counts;
    }, [trades]);

    // Status Counts (scoped to selected trade type)
    const statusCounts = useMemo(() => {
        const counts = { '': 0, 'OPEN': 0, 'CLOSED': 0 };
        const base = typeFilter ? trades.filter(t => matchTradeType(t.mode, typeFilter)) : trades;
        base.forEach(t => {
            counts['']++;
            if (t.status === 'OPEN') counts.OPEN++;
            if (t.status === 'CLOSED') counts.CLOSED++;
        });
        return counts;
    }, [trades, typeFilter]);

    // Sorting Handler
    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    // Filtered trades based on statusFilter and typeFilter
    const filteredTrades = useMemo(() => {
        return trades.filter(t => {
            if (statusFilter && t.status !== statusFilter) return false;
            if (typeFilter && !matchTradeType(t.mode, typeFilter)) return false;
            return true;
        });
    }, [trades, statusFilter, typeFilter]);

    // Sorted trades
    const sortedTrades = useMemo(() => {
        let result = [...filteredTrades];
        if (!sortConfig.key) return result;

        result.sort((a, b) => {
            let valA, valB;

            switch (sortConfig.key) {
                case 'stock_name':
                    valA = a.stock_name || '';
                    valB = b.stock_name || '';
                    break;
                case 'trade_type':
                    valA = a.trade_type || '';
                    valB = b.trade_type || '';
                    break;
                case 'mode':
                    valA = formatTradeType(a.mode);
                    valB = formatTradeType(b.mode);
                    break;
                case 'status':
                    valA = a.status || '';
                    valB = b.status || '';
                    break;
                case 'entry_price':
                    valA = Number(a.entry_price || 0);
                    valB = Number(b.entry_price || 0);
                    break;
                case 'quantity':
                    valA = Number(a.quantity || 0);
                    valB = Number(b.quantity || 0);
                    break;
                case 'capital':
                    valA = (Number(a.entry_price || 0) * Number(a.quantity || 0)) / (a.leverage || 1);
                    valB = (Number(b.entry_price || 0) * Number(b.quantity || 0)) / (b.leverage || 1);
                    break;
                case 'cmp': {
                    const rawA = prices[a.stock_name];
                    const rawB = prices[b.stock_name];
                    valA = rawA ? parseFloat(String(rawA).replace(/,/g, '')) || 0 : 0;
                    valB = rawB ? parseFloat(String(rawB).replace(/,/g, '')) || 0 : 0;
                    break;
                }
                case 'unrealized_pnl': {
                    const getUnreal = (t) => {
                        if (t.status !== 'OPEN') return -999999;
                        const raw = prices[t.stock_name];
                        const cmp = raw ? parseFloat(String(raw).replace(/,/g, '')) : null;
                        if (cmp !== null && !isNaN(cmp)) {
                            return t.trade_type === 'LONG' ? (cmp - t.entry_price) * t.quantity : (t.entry_price - cmp) * t.quantity;
                        }
                        return 0;
                    };
                    valA = getUnreal(a);
                    valB = getUnreal(b);
                    break;
                }
                case 'date':
                    valA = new Date(a.trade_date || a.created_at).getTime() || 0;
                    valB = new Date(b.trade_date || b.created_at).getTime() || 0;
                    break;
                case 'pnl_pct': {
                    const getPct = (t) => {
                        const invested = (Number(t.entry_price || 0) * Number(t.quantity || 0)) / (t.leverage || 1);
                        if (t.status === 'OPEN') {
                            const raw = prices[t.stock_name];
                            const cmp = raw ? parseFloat(String(raw).replace(/,/g, '')) : null;
                            if (cmp !== null && !isNaN(cmp) && invested > 0) {
                                const pnl = t.trade_type === 'LONG' ? (cmp - t.entry_price) * t.quantity : (t.entry_price - cmp) * t.quantity;
                                return (pnl / invested) * 100;
                            }
                            return 0;
                        }
                        return invested > 0 ? (Number(t.total_pnl || 0) / invested) * 100 : 0;
                    };
                    valA = getPct(a);
                    valB = getPct(b);
                    break;
                }
                default:
                    valA = a[sortConfig.key] || '';
                    valB = b[sortConfig.key] || '';
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                const comp = valA.localeCompare(valB);
                return sortConfig.direction === 'asc' ? comp : -comp;
            }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [filteredTrades, sortConfig, prices]);

    async function handleDelete(tradeId, stockName) {
        confirmAction({
            title: 'Delete Trade',
            message: `Move "${stockName}" to Deleted Trades?`,
            variant: 'warning',
            onConfirm: async () => {
                setDeletingId(tradeId);
                try {
                    await api.delete(`/trades/${tradeId}`);
                    setTrades(prev => prev.filter(t => t.trade_id !== tradeId));
                } catch (err) { confirmAction({ title: 'Error', message: err.response?.data?.message || 'Delete failed.', variant: 'danger', alertOnly: true }); }
                finally { setDeletingId(null); }
            }
        });
    }

    async function handleRestore(tradeId, stockName) {
        confirmAction({
            title: 'Restore Trade',
            message: `Restore "${stockName}"?`,
            variant: 'primary',
            onConfirm: async () => {
                setRestoringId(tradeId);
                try {
                    await api.patch(`/trades/${tradeId}/restore`);
                    setDeleted(prev => prev.filter(t => t.trade_id !== tradeId));
                    fetchTrades();
                } catch (err) { confirmAction({ title: 'Error', message: err.response?.data?.message || 'Restore failed.', variant: 'danger', alertOnly: true }); }
                finally { setRestoringId(null); }
            }
        });
    }

    async function handleHardDelete(tradeId, stockName) {
        confirmAction({
            title: 'Permanent Delete',
            message: `Permanently delete "${stockName}"? This CANNOT be undone.`,
            variant: 'danger',
            onConfirm: async () => {
                setHardDeletingId(tradeId);
                try {
                    await api.delete(`/trades/${tradeId}/permanent`);
                    setDeleted(prev => prev.filter(t => t.trade_id !== tradeId));
                } catch (err) { confirmAction({ title: 'Error', message: err.response?.data?.message || 'Hard delete failed.', variant: 'danger', alertOnly: true }); }
                finally { setHardDeletingId(null); }
            }
        });
    }

    return (
        <div className="page">
            <div className="page__header">
                <h2 className="page__title">Trades</h2>
                {activeTab === 'active' && (
                    <Button variant="primary" onClick={() => navigate('/trades/open')} className="hide-mobile">+ Open Trade</Button>
                )}
            </div>

            <button className="fab show-mobile" onClick={() => navigate('/trades/open')} title="Open Trade">+</button>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-sm)', flexWrap: 'nowrap', overflowX: 'auto' }}>
                <TabBtn active={activeTab === 'active'} onClick={() => setActiveTab('active')}>Active Trades</TabBtn>
                <TabBtn active={activeTab === 'deleted'} onClick={() => setActiveTab('deleted')}>Deleted Trades</TabBtn>
            </div>

            {/* Top Summary KPI Cards - Dynamically reflects selected typeFilter */}
            {activeTab === 'active' && !loading && trades.length > 0 && (
                <div className="kpi-grid" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                    {/* Card 1: Invested Capital */}
                    <div className="kpi-card">
                        <div>
                            <div className="kpi-header">
                                <span className="kpi-label">Deployed Capital (Open)</span>
                                <span className="kpi-icon"><TrendingUp size={18} /></span>
                            </div>
                            <div className="kpi-value">{formatCurrency(liveMetrics.activeInvested)}</div>
                        </div>
                        <div className="kpi-subtext">
                            <span>{liveMetrics.openTradesCount} Active Open Positions</span>
                        </div>
                    </div>

                    {/* Card 2: Live Unrealized Performance */}
                    <div className="kpi-card">
                        <div>
                            <div className="kpi-header">
                                <span className="kpi-label">Live Unrealized P&L</span>
                                <span className="kpi-icon"><Zap size={18} /></span>
                            </div>
                            <div 
                                className="kpi-value" 
                                style={{ color: liveMetrics.totalUnrealizedPnl > 0 ? '#34d399' : liveMetrics.totalUnrealizedPnl < 0 ? '#f87171' : '#cbd5e1', display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}
                            >
                                <span>{liveMetrics.totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(liveMetrics.totalUnrealizedPnl)}</span>
                                {liveMetrics.activeInvested > 0 && (
                                    <span style={{ fontSize: '1.15rem', fontWeight: 700, background: liveMetrics.totalUnrealizedPnl >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', padding: '0.15rem 0.6rem', borderRadius: '8px', border: `1px solid ${liveMetrics.totalUnrealizedPnl >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
                                        {liveMetrics.totalUnrealizedPnl >= 0 ? '+' : ''}{liveMetrics.unrealizedPnlPct.toFixed(2)}%
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="kpi-subtext" style={{ marginTop: '0.4rem', flexWrap: 'wrap' }}>
                            <span className="pnl-badge" style={{ fontWeight: 700, color: liveMetrics.totalRealizedPnl >= 0 ? '#34d399' : '#f87171' }}>
                                Realized: {liveMetrics.totalRealizedPnl >= 0 ? '+' : ''}{formatCurrency(liveMetrics.totalRealizedPnl)} {liveMetrics.totalClosedCost > 0 ? `(${liveMetrics.totalRealizedPnl >= 0 ? '+' : ''}${liveMetrics.realizedPnlPct.toFixed(2)}%)` : ''}
                            </span>
                            <span style={{ marginLeft: '0.5rem' }}>({liveMetrics.closedTradesCount} Closed)</span>
                        </div>
                    </div>

                    {/* Card 3: Win Ratio */}
                    <div className="kpi-card">
                        <div>
                            <div className="kpi-header">
                                <span className="kpi-label">Win Ratio</span>
                                <span className="kpi-icon"><Target size={18} /></span>
                            </div>
                            <div className="kpi-value" style={{ color: liveMetrics.winRate >= 50 ? '#34d399' : (liveMetrics.winRate > 0 ? '#f87171' : 'inherit') }}>
                                {liveMetrics.winRate}%
                            </div>
                        </div>
                        <div className="kpi-subtext">
                            <span>{liveMetrics.wins}W - {liveMetrics.losses}L ({liveMetrics.closedTradesCount} Closed)</span>
                        </div>
                    </div>

                    {/* Card 4: Average R:R */}
                    <div className="kpi-card">
                        <div>
                            <div className="kpi-header">
                                <span className="kpi-label">Average R:R</span>
                                <span className="kpi-icon"><Scale size={18} /></span>
                            </div>
                            <div className="kpi-value">
                                {liveMetrics.avgRRRatio}
                            </div>
                        </div>
                        <div className="kpi-subtext">
                            <span style={{ color: '#34d399' }}>Avg Win: {formatCurrency(liveMetrics.avgWin)}</span>
                            <span style={{ margin: '0 4px', opacity: 0.5 }}>|</span>
                            <span style={{ color: '#f87171' }}>Avg Loss: {formatCurrency(liveMetrics.avgLoss)}</span>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'active' && (
                <>
                    {/* Dual Filter Pills: Trade Type and Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem', marginBottom: 'var(--space-md)' }}>
                        {/* Trade Type Filter Pills */}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.2rem' }}>
                                Trade Type:
                            </span>
                            {[
                                { key: '', label: 'All' },
                                { key: 'INTRADAY', label: 'Intraday' },
                                { key: 'SWING', label: 'Swing' },
                                { key: 'MTF', label: 'MTF' },
                                { key: 'LONG TERM', label: 'Long Term' },
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    className={`trade-filter-pill ${typeFilter === opt.key ? 'active' : ''}`}
                                    onClick={() => setTypeFilter(opt.key)}
                                >
                                    {opt.label}
                                    <span className="trade-filter-count">{typeCounts[opt.key] || 0}</span>
                                </button>
                            ))}
                        </div>

                        {/* Status Filter Pills */}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.2rem' }}>
                                Status:
                            </span>
                            {[
                                { key: '', label: 'All' },
                                { key: 'OPEN', label: 'OPEN' },
                                { key: 'CLOSED', label: 'CLOSED' },
                            ].map(s => (
                                <button
                                    key={s.key}
                                    type="button"
                                    className={`trade-filter-pill ${statusFilter === s.key ? 'active' : ''}`}
                                    onClick={() => setStatusFilter(s.key)}
                                >
                                    {s.label}
                                    <span className="trade-filter-count">{statusCounts[s.key] || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading && <p className="status-text">Loading trades…</p>}
                    {error && <div className="alert alert--error">{error}</div>}

                    {!loading && !error && filteredTrades.length === 0 && (
                        <Card className="empty-state">
                            <p>No trades found for selected filter.</p>
                        </Card>
                    )}

                    {!loading && !error && filteredTrades.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <SortHeader field="stock_name" label="Symbol" sortConfig={sortConfig} onSort={handleSort} />
                                            <SortHeader field="trade_type" label="Dir" sortConfig={sortConfig} onSort={handleSort} />
                                            <SortHeader field="entry_price" label="Entry" sortConfig={sortConfig} onSort={handleSort} className="hide-col-mobile" />
                                            <SortHeader field="quantity" label="Qty" sortConfig={sortConfig} onSort={handleSort} className="hide-col-mobile" />
                                            <SortHeader field="capital" label="Capital" sortConfig={sortConfig} onSort={handleSort} className="hide-col-mobile" />
                                            <SortHeader field="cmp" label="CMP" sortConfig={sortConfig} onSort={handleSort} className="hide-col-mobile" />
                                            <SortHeader field="unrealized_pnl" label="Unrealized P&L" sortConfig={sortConfig} onSort={handleSort} className="hide-col-mobile" />
                                            <SortHeader field="status" label="Status" sortConfig={sortConfig} onSort={handleSort} className="hide-col-mobile" />
                                            <SortHeader field="date" label="Entry Date" sortConfig={sortConfig} onSort={handleSort} className="hide-col-mobile" />
                                            <SortHeader field="mode" label="Trade Type" sortConfig={sortConfig} onSort={handleSort} />
                                            <SortHeader field="pnl_pct" label="P&L %" sortConfig={sortConfig} onSort={handleSort} />
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTrades.map(t => {
                                            const rawCmp = prices[t.stock_name];
                                            const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
                                            let unrealizedPnl = null;
                                            let unrealizedPnlPct = null;
                                            let realizedPnlPct = null;

                                            const lev = t.leverage || 1;
                                            const invested = (t.entry_price * t.quantity) / lev;

                                            if (t.status === 'OPEN' && cmpVal !== null && !isNaN(cmpVal)) {
                                                if (t.trade_type === 'LONG') {
                                                    unrealizedPnl = (cmpVal - t.entry_price) * t.quantity;
                                                } else {
                                                    unrealizedPnl = (t.entry_price - cmpVal) * t.quantity;
                                                }
                                                unrealizedPnl = Number(unrealizedPnl.toFixed(2));
                                                unrealizedPnlPct = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;
                                            }

                                            if (t.status === 'CLOSED') {
                                                realizedPnlPct = invested > 0 ? (t.total_pnl / invested) * 100 : 0;
                                            }

                                            const tradeModeDisp = formatTradeType(t.mode);
                                            const tradeModeBadge = TYPE_BADGE_MAP[tradeModeDisp] || 'badge--yellow';

                                            return (
                                                <tr key={t.trade_id}>
                                                    <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.stock_name}</td>
                                                    <td>
                                                        <span style={{ color: MODE_COLOR[t.trade_type] || 'inherit', fontWeight: 600, fontSize: '0.7rem' }}>
                                                            {t.trade_type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                                                        </span>
                                                    </td>
                                                    <td className="hide-col-mobile">₹{t.entry_price}</td>
                                                    <td className="hide-col-mobile">{t.quantity}</td>
                                                    <td className="hide-col-mobile">₹{((t.entry_price * t.quantity) / (t.leverage || 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                                    
                                                    {/* CMP Column */}
                                                    <td className="hide-col-mobile">
                                                        {t.status === 'OPEN' ? (
                                                            pricesLoading ? (
                                                                <span className="pulsing-text">Fetching...</span>
                                                            ) : cmpVal !== null && !isNaN(cmpVal) ? (
                                                                `₹${cmpVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                            ) : rawCmp ? (
                                                                `₹${rawCmp}`
                                                            ) : (
                                                                <span className="opacity-50">—</span>
                                                            )
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    
                                                    {/* Unrealized P&L Column */}
                                                    <td className="hide-col-mobile" style={{
                                                        fontWeight: 600,
                                                        fontSize: '0.8rem',
                                                        color: unrealizedPnl > 0 ? 'var(--color-success)'
                                                            : unrealizedPnl < 0 ? 'var(--color-danger)' : 'inherit'
                                                    }}>
                                                        {t.status === 'OPEN' ? (
                                                            pricesLoading ? (
                                                                <span className="pulsing-text">Fetching...</span>
                                                            ) : unrealizedPnl !== null ? (
                                                                fmtLakhs(unrealizedPnl)
                                                            ) : (
                                                                <span className="opacity-50">—</span>
                                                            )
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>

                                                    <td className="hide-col-mobile">
                                                        <span className={`badge ${t.status === 'OPEN' ? 'badge--yellow' : 'badge--green'}`}>
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                    <td className="hide-col-mobile" style={{ color: 'var(--color-text-muted)' }}>
                                                        {fmtDate(t.trade_date || t.created_at)}
                                                    </td>

                                                    {/* Trade Type Column (replaces old P&L column) */}
                                                    <td>
                                                        <span className={`badge ${tradeModeBadge}`} style={{ fontWeight: 600 }}>
                                                            {tradeModeDisp}
                                                        </span>
                                                    </td>

                                                    {/* P&L % Column (with monetary P&L amount subtitle) */}
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span style={{
                                                                fontWeight: 700,
                                                                fontSize: '0.82rem',
                                                                color: t.status === 'OPEN' 
                                                                    ? (unrealizedPnlPct > 0 ? 'var(--color-success)' : unrealizedPnlPct < 0 ? 'var(--color-danger)' : 'inherit')
                                                                    : (realizedPnlPct > 0 ? 'var(--color-success)' : realizedPnlPct < 0 ? 'var(--color-danger)' : 'inherit')
                                                            }}>
                                                                {t.status === 'OPEN' 
                                                                    ? (unrealizedPnlPct !== null ? `${unrealizedPnlPct > 0 ? '+' : ''}${unrealizedPnlPct.toFixed(2)}%` : '—')
                                                                    : (realizedPnlPct !== null ? `${realizedPnlPct > 0 ? '+' : ''}${realizedPnlPct.toFixed(2)}%` : '—')
                                                                }
                                                            </span>
                                                            <span style={{
                                                                fontSize: '0.72rem',
                                                                fontWeight: 500,
                                                                color: t.status === 'OPEN'
                                                                    ? (unrealizedPnl > 0 ? 'var(--color-success)' : unrealizedPnl < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)')
                                                                    : (t.total_pnl > 0 ? 'var(--color-success)' : t.total_pnl < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)')
                                                            }}>
                                                                {t.status === 'OPEN'
                                                                    ? (unrealizedPnl !== null ? fmtLakhs(unrealizedPnl) : '—')
                                                                    : (t.total_pnl !== undefined && t.total_pnl !== null ? fmtLakhs(t.total_pnl) : '—')
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                            <Link to={`/trades/${t.trade_id}`} className="table-btn-icon" title="View">
                                                                <Eye size={16} />
                                                            </Link>
                                                            <button onClick={() => handleDelete(t.trade_id, t.stock_name)}
                                                                disabled={deletingId === t.trade_id} className="table-btn-icon danger" title="Delete">
                                                                {deletingId === t.trade_id ? '⏳' : <Trash2 size={16} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {activeTab === 'deleted' && (
                <>
                    {deletedLoading && <p className="status-text">Loading deleted trades…</p>}
                    {deletedError && <div className="alert alert--error">{deletedError}</div>}
                    {!deletedLoading && !deletedError && deleted.length === 0 && (
                        <Card className="empty-state"><p>No deleted trades.</p></Card>
                    )}
                    {!deletedLoading && !deletedError && deleted.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Symbol</th>
                                            <th>Dir</th>
                                            <th className="hide-col-mobile">Entry Date</th>
                                            <th>Trade Type</th>
                                            <th>P&L %</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deleted.map(t => {
                                            const tradeModeDisp = formatTradeType(t.mode);
                                            const tradeModeBadge = TYPE_BADGE_MAP[tradeModeDisp] || 'badge--yellow';
                                            return (
                                                <tr key={t.trade_id} style={{ opacity: 0.8 }}>
                                                    <td style={{ fontWeight: 700 }}>{t.stock_name}</td>
                                                    <td>
                                                        <span style={{ color: MODE_COLOR[t.trade_type] || 'inherit', fontWeight: 600, fontSize: '0.7rem' }}>
                                                            {t.trade_type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                                                        </span>
                                                    </td>
                                                    <td className="hide-col-mobile" style={{ color: 'var(--color-text-muted)' }}>
                                                        {fmtDate(t.trade_date || t.created_at)}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${tradeModeBadge}`} style={{ fontWeight: 600 }}>
                                                            {tradeModeDisp}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 600, color: t.total_pnl > 0 ? 'var(--color-success)' : t.total_pnl < 0 ? 'var(--color-danger)' : 'inherit' }}>
                                                        {fmtLakhs(t.total_pnl)}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                            <ActionBtn onClick={() => handleRestore(t.trade_id, t.stock_name)}
                                                                disabled={restoringId === t.trade_id} color="var(--color-success)">
                                                                {restoringId === t.trade_id ? '⏳' : <><RotateCcw size={14} style={{marginRight: '4px'}} /> Restore</>}
                                                            </ActionBtn>
                                                            <ActionBtn onClick={() => handleHardDelete(t.trade_id, t.stock_name)}
                                                                disabled={hardDeletingId === t.trade_id} color="var(--color-danger)">
                                                                {hardDeletingId === t.trade_id ? '⏳' : <><Trash2 size={14} style={{marginRight: '4px'}} /> Delete</>}
                                                            </ActionBtn>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
