import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { 
    TrendingUp, Zap, Target, Scale, Eye, Trash2, RotateCcw, 
    Shield, ScrollText, Globe, Rocket, Plus, RefreshCw, X, 
    LayoutGrid, Table as TableIcon 
} from 'lucide-react';
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

function isInvestment(trade) {
    if (!trade) return false;
    const norm = normalizeType(trade.mode);
    return norm === 'LONG TERM' || trade.holding_type === 'INVESTMENT';
}

function isTrading(trade) {
    return !isInvestment(trade);
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
        return sign + '₹' + abs.toFixed(2);
    }
    if (abs < 100000) {
        return sign + '₹' + (abs / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return sign + '₹' + (abs / 100000).toFixed(2) + 'L';
}

function formatCurrency(val) {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtDate(val) {
    if (!val) return '—';
    const s = val instanceof Date ? val.toISOString() : String(val);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
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

export default function TradesList() {
    const navigate = useNavigate();
    const confirmAction = useConfirm();

    // Active Section Tab: 'TRADING' | 'INVESTMENT' | 'CLOSED' | 'ALL' | 'DELETED'
    const [activeTab, setActiveTab] = useState('TRADING');
    const [portfolioViewMode, setPortfolioViewMode] = useState('cards'); // 'cards' | 'table'

    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Sub-filters for Active Trading tab
    const [activeSubFilter, setActiveSubFilter] = useState(''); // '' (All) | 'INTRADAY' | 'SWING' | 'MTF'
    const [closedSubFilter, setClosedSubFilter] = useState(''); // '' (All) | 'TRADING' | 'INVESTMENT'
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Actions state
    const [deletingId, setDeletingId] = useState(null);
    const [exitTradeModal, setExitTradeModal] = useState(null);
    const [exitSubmitting, setExitSubmitting] = useState(false);
    const [exitForm, setExitForm] = useState({
        exit_price: '',
        exit_reason: 'TARGET_HIT',
        exit_date: new Date().toISOString().split('T')[0],
        quantity: ''
    });

    // Soft deleted state
    const [deleted, setDeleted] = useState([]);
    const [deletedLoading, setDeletedLoading] = useState(false);
    const [deletedError, setDeletedError] = useState('');
    const [restoringId, setRestoringId] = useState(null);
    const [hardDeletingId, setHardDeletingId] = useState(null);

    // Live Prices & Market Sync
    const [prices, setPrices] = useState({});
    const [priceDetails, setPriceDetails] = useState({});
    const [pricesLoading, setPricesLoading] = useState(false);

    // Fetch trades data
    const fetchTrades = useCallback(async () => {
        setLoading(true); 
        setError('');
        try {
            const { data } = await api.get('/trades?limit=200');
            setTrades(data.trades || []);
        } catch { 
            setError('Failed to load trades. Please refresh.'); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    // Fetch deleted trades data
    const fetchDeleted = useCallback(async () => {
        setDeletedLoading(true); 
        setDeletedError('');
        try {
            const { data } = await api.get('/trades/deleted');
            setDeleted(data || []);
        } catch { 
            setDeletedError('Failed to load deleted trades.'); 
        } finally { 
            setDeletedLoading(false); 
        }
    }, []);

    useEffect(() => { 
        fetchTrades(); 
    }, [fetchTrades]);

    useEffect(() => { 
        if (activeTab === 'DELETED') fetchDeleted(); 
    }, [activeTab, fetchDeleted]);

    // Live Quotes Polling for Open Trades
    useEffect(() => {
        const openTrades = trades.filter(t => t.status === 'OPEN');
        if (openTrades.length === 0) {
            setPrices({});
            setPriceDetails({});
            return;
        }

        const uniqueSymbols = [...new Set(openTrades.map(t => t.stock_name))];

        const fetchLivePrices = async () => {
            setPricesLoading(true);
            try {
                const symbolString = uniqueSymbols.join(',');
                const { data } = await api.get(`/watchlist/prices?symbols=${symbolString}`);
                if (data.success && data.data) {
                    const pricesFlat = {};
                    for (const [k, v] of Object.entries(data.data)) {
                        pricesFlat[k] = typeof v === 'object' ? Number(v.price) : Number(v);
                    }
                    setPrices(pricesFlat);
                    setPriceDetails(data.data);
                }
            } catch (err) {
                console.error('Failed to fetch prices for trades:', err);
            } finally {
                setPricesLoading(false);
            }
        };

        fetchLivePrices();
        const intervalId = setInterval(fetchLivePrices, 25000);
        return () => clearInterval(intervalId);
    }, [trades]);

    // Section Tab Counts
    const tabCounts = useMemo(() => {
        const openTrades = trades.filter(t => t.status === 'OPEN');
        return {
            trading: openTrades.filter(isTrading).length,
            investment: openTrades.filter(isInvestment).length,
            closed: trades.filter(t => t.status === 'CLOSED').length,
            all: openTrades.length,
            deleted: deleted.length
        };
    }, [trades, deleted]);

    // Sub-type counts for Active Trading
    const activeSubCounts = useMemo(() => {
        const openActive = trades.filter(t => t.status === 'OPEN' && isTrading(t));
        const counts = { '': openActive.length, 'INTRADAY': 0, 'SWING': 0, 'MTF': 0 };
        openActive.forEach(t => {
            const norm = normalizeType(t.mode);
            if (counts[norm] !== undefined) counts[norm]++;
        });
        return counts;
    }, [trades]);

    // Scoped metrics dynamically reflecting the active tab
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

        // Determine which trades to scope based on current tab
        let scopedTrades = trades;
        if (activeTab === 'TRADING') {
            scopedTrades = trades.filter(t => {
                if (isInvestment(t)) return false;
                if (activeSubFilter && !matchTradeType(t.mode, activeSubFilter)) return false;
                return true;
            });
        } else if (activeTab === 'INVESTMENT') {
            scopedTrades = trades.filter(isInvestment);
        } else if (activeTab === 'CLOSED') {
            scopedTrades = trades.filter(t => {
                if (t.status !== 'CLOSED') return false;
                if (closedSubFilter === 'TRADING') return isTrading(t);
                if (closedSubFilter === 'INVESTMENT') return isInvestment(t);
                return true;
            });
        }

        scopedTrades.forEach(t => {
            const lev = t.leverage || 1;
            const invested = (Number(t.entry_price) * Number(t.quantity)) / lev;

            if (t.status === 'OPEN') {
                openTradesCount++;
                activeInvested += invested;

                const rawCmp = prices[t.stock_name];
                const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;

                if (cmpVal !== null && !isNaN(cmpVal)) {
                    let pnl = 0;
                    if (t.trade_type === 'LONG') {
                        pnl = (cmpVal - Number(t.entry_price)) * Number(t.quantity);
                    } else {
                        pnl = (Number(t.entry_price) - cmpVal) * Number(t.quantity);
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
    }, [trades, prices, activeTab, activeSubFilter, closedSubFilter]);

    // Sorting Handler
    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    // Filter trades based on active section
    const filteredTrades = useMemo(() => {
        if (activeTab === 'TRADING') {
            return trades.filter(t => {
                if (t.status !== 'OPEN') return false;
                if (!isTrading(t)) return false;
                if (activeSubFilter && !matchTradeType(t.mode, activeSubFilter)) return false;
                return true;
            });
        }
        if (activeTab === 'INVESTMENT') {
            return trades.filter(t => t.status === 'OPEN' && isInvestment(t));
        }
        if (activeTab === 'CLOSED') {
            return trades.filter(t => {
                if (t.status !== 'CLOSED') return false;
                if (closedSubFilter === 'TRADING') return isTrading(t);
                if (closedSubFilter === 'INVESTMENT') return isInvestment(t);
                return true;
            });
        }
        if (activeTab === 'ALL') {
            return trades.filter(t => t.status === 'OPEN');
        }
        if (activeTab === 'DELETED') {
            return deleted;
        }
        return trades;
    }, [trades, deleted, activeTab, activeSubFilter, closedSubFilter]);

    // Sorted Trades
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
                            return t.trade_type === 'LONG' ? (cmp - Number(t.entry_price)) * Number(t.quantity) : (Number(t.entry_price) - cmp) * Number(t.quantity);
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
                                const pnl = t.trade_type === 'LONG' ? (cmp - Number(t.entry_price)) * Number(t.quantity) : (Number(t.entry_price) - cmp) * Number(t.quantity);
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

    // Switch Category between Active Trading (Swing) and Long-Term Portfolio
    const handleCategorySwitch = (trade) => {
        const currentlyInvestment = isInvestment(trade);
        const newMode = currentlyInvestment ? 'SWING' : 'LONG TERM';
        const targetSection = currentlyInvestment ? 'Active Trading (Swing)' : 'Long-Term Portfolio';

        confirmAction({
            title: `Switch Position to ${targetSection}?`,
            message: `Do you want to reclassify "${trade.stock_name}" as ${targetSection}? This updates its mode from ${currentlyInvestment ? 'Long-Term' : 'Active Trading'} to ${newMode}.`,
            variant: 'primary',
            onConfirm: async () => {
                try {
                    await api.patch(`/trades/${trade.trade_id}`, { mode: newMode });
                    setTrades(prev => prev.map(t => (
                        t.trade_id === trade.trade_id 
                            ? { ...t, mode: newMode, holding_type: currentlyInvestment ? 'TRADING' : 'INVESTMENT' } 
                            : t
                    )));
                } catch (err) {
                    confirmAction({
                        title: 'Error',
                        message: err.response?.data?.message || 'Failed to switch position category.',
                        variant: 'danger',
                        alertOnly: true
                    });
                }
            }
        });
    };

    // Open Exit Modal
    const handleOpenExitModal = (trade) => {
        const rawCmp = prices[trade.stock_name];
        const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
        const defaultPrice = (cmpVal && !isNaN(cmpVal)) ? cmpVal.toFixed(2) : Number(trade.entry_price).toFixed(2);

        setExitForm({
            exit_price: defaultPrice,
            exit_reason: 'TARGET_HIT',
            exit_date: new Date().toISOString().split('T')[0],
            quantity: trade.quantity
        });
        setExitTradeModal(trade);
    };

    // Exit Trade submission
    const handleExitSubmit = async (e) => {
        e.preventDefault();
        if (!exitForm.exit_price || !exitTradeModal) return;
        setExitSubmitting(true);
        try {
            await api.patch(`/trades/${exitTradeModal.trade_id}/exit`, {
                exit_price: Number(exitForm.exit_price),
                exit_reason: exitForm.exit_reason,
                exit_date: exitForm.exit_date,
                quantity: exitForm.quantity ? Number(exitForm.quantity) : exitTradeModal.quantity
            });
            setExitTradeModal(null);
            await fetchTrades();
        } catch (err) {
            confirmAction({
                title: 'Exit Failed',
                message: err.response?.data?.message || 'Failed to close trade.',
                variant: 'danger',
                alertOnly: true
            });
        } finally {
            setExitSubmitting(false);
        }
    };

    // Delete Trade (Soft Delete)
    const handleDelete = async (tradeId, stockName) => {
        confirmAction({
            title: 'Delete Trade',
            message: `Move "${stockName}" to Deleted Trades?`,
            variant: 'warning',
            onConfirm: async () => {
                setDeletingId(tradeId);
                try {
                    await api.delete(`/trades/${tradeId}`);
                    setTrades(prev => prev.filter(t => t.trade_id !== tradeId));
                } catch (err) { 
                    confirmAction({ title: 'Error', message: err.response?.data?.message || 'Delete failed.', variant: 'danger', alertOnly: true }); 
                } finally { 
                    setDeletingId(null); 
                }
            }
        });
    };

    // Restore Deleted Trade
    const handleRestore = async (tradeId, stockName) => {
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
                } catch (err) { 
                    confirmAction({ title: 'Error', message: err.response?.data?.message || 'Restore failed.', variant: 'danger', alertOnly: true }); 
                } finally { 
                    setRestoringId(null); 
                }
            }
        });
    };

    // Hard Delete (Permanent)
    const handleHardDelete = async (tradeId, stockName) => {
        confirmAction({
            title: 'Permanent Delete',
            message: `Permanently delete "${stockName}"? This CANNOT be undone.`,
            variant: 'danger',
            onConfirm: async () => {
                setHardDeletingId(tradeId);
                try {
                    await api.delete(`/trades/${tradeId}/permanent`);
                    setDeleted(prev => prev.filter(t => t.trade_id !== tradeId));
                } catch (err) { 
                    confirmAction({ title: 'Error', message: err.response?.data?.message || 'Hard delete failed.', variant: 'danger', alertOnly: true }); 
                } finally { 
                    setHardDeletingId(null); 
                }
            }
        });
    };

    return (
        <div className="page paper-trade-container">
            {/* Header with Title, Subtitle, and Quick Action Button */}
            <header className="page__header" style={{ alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1 className="page__title" style={{ marginBottom: '0.4rem' }}>
                        Trades & Conviction Portfolio
                    </h1>
                    <p className="page__subtitle" style={{ lineHeight: '1.6', maxWidth: '800px' }}>
                        Track active intraday/swing setups, build and monitor your long-term equity portfolio with live unrealized P&L, and log historical exits.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {activeTab === 'INVESTMENT' ? (
                        <button 
                            className="btn-paper-action btn-new-trade" 
                            onClick={() => navigate('/trades/open?type=LONG+TERM')}
                        >
                            <span><Shield size={16} style={{ marginRight: '6px' }} /> + Open Long-Term Position</span>
                        </button>
                    ) : (
                        <button 
                            className="btn-paper-action btn-new-trade" 
                            onClick={() => navigate(activeTab === 'TRADING' ? '/trades/open?type=SWING' : '/trades/open')}
                        >
                            <span><Rocket size={16} style={{ marginRight: '6px' }} /> + Open Trade</span>
                        </button>
                    )}
                </div>
            </header>

            {error && (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            {/* Top Summary KPI Cards - Dynamically reflects selected section */}
            {!loading && activeTab !== 'DELETED' && (
                <div className="kpi-grid">
                    {/* Card 1: Deployed Capital */}
                    <div className="kpi-card">
                        <div>
                            <div className="kpi-header">
                                <span className="kpi-label">
                                    {activeTab === 'INVESTMENT' ? 'Long-Term Capital' : activeTab === 'CLOSED' ? 'Closed Cost Basis' : 'Deployed Capital (Open)'}
                                </span>
                                <span className="kpi-icon"><TrendingUp size={20} /></span>
                            </div>
                            <div className="kpi-value">{formatCurrency(liveMetrics.activeInvested)}</div>
                        </div>
                        <div className="kpi-subtext">
                            <span>
                                {activeTab === 'CLOSED' 
                                    ? `${liveMetrics.closedTradesCount} Closed Executions` 
                                    : `${liveMetrics.openTradesCount} Active Positions`}
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Live Unrealized Performance */}
                    <div className="kpi-card">
                        <div>
                            <div className="kpi-header">
                                <span className="kpi-label">
                                    {activeTab === 'CLOSED' ? 'Total Realized P&L' : 'Live Unrealized P&L'}
                                </span>
                                <span className="kpi-icon"><Zap size={20} /></span>
                            </div>
                            <div 
                                className="kpi-value" 
                                style={{ 
                                    color: activeTab === 'CLOSED' 
                                        ? (liveMetrics.totalRealizedPnl > 0 ? '#34d399' : liveMetrics.totalRealizedPnl < 0 ? '#f87171' : '#cbd5e1')
                                        : (liveMetrics.totalUnrealizedPnl > 0 ? '#34d399' : liveMetrics.totalUnrealizedPnl < 0 ? '#f87171' : '#cbd5e1'), 
                                    display: 'flex', 
                                    alignItems: 'baseline', 
                                    gap: '0.6rem', 
                                    flexWrap: 'wrap' 
                                }}
                            >
                                <span>
                                    {activeTab === 'CLOSED'
                                        ? `${liveMetrics.totalRealizedPnl >= 0 ? '+' : ''}${formatCurrency(liveMetrics.totalRealizedPnl)}`
                                        : `${liveMetrics.totalUnrealizedPnl >= 0 ? '+' : ''}${formatCurrency(liveMetrics.totalUnrealizedPnl)}`
                                    }
                                </span>
                                {activeTab !== 'CLOSED' && liveMetrics.activeInvested > 0 && (
                                    <span style={{ 
                                        fontSize: '1.1rem', 
                                        fontWeight: 700, 
                                        background: liveMetrics.totalUnrealizedPnl >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', 
                                        padding: '0.15rem 0.6rem', 
                                        borderRadius: '8px', 
                                        border: `1px solid ${liveMetrics.totalUnrealizedPnl >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` 
                                    }}>
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
                                <span className="kpi-icon"><Target size={20} /></span>
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
                                <span className="kpi-icon"><Scale size={20} /></span>
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

            {/* Main Workspace Navigation Bar & Section Tabs (Same Structure as Paper Trading) */}
            <div className="workspace-section">
                <div className="workspace-nav-bar">
                    <div className="tab-group">
                        <button 
                            className={`paper-tab-btn ${activeTab === 'TRADING' ? 'active' : ''}`}
                            onClick={() => setActiveTab('TRADING')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} /> Active Trading</span>
                            <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>
                                ({tabCounts.trading})
                            </span>
                        </button>
                        <button 
                            className={`paper-tab-btn ${activeTab === 'INVESTMENT' ? 'active-green' : ''}`}
                            onClick={() => setActiveTab('INVESTMENT')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} /> Long-Term Portfolio</span>
                            <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>
                                ({tabCounts.investment})
                            </span>
                        </button>
                        <button 
                            className={`paper-tab-btn ${activeTab === 'CLOSED' ? 'active' : ''}`}
                            onClick={() => setActiveTab('CLOSED')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ScrollText size={16} /> Historical Journal Log</span>
                            <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>
                                ({tabCounts.closed})
                            </span>
                        </button>
                        <button 
                            className={`paper-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ALL')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={16} /> All Open Positions</span>
                            <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>
                                ({tabCounts.all})
                            </span>
                        </button>
                        <button 
                            className={`paper-tab-btn ${activeTab === 'DELETED' ? 'active' : ''}`}
                            onClick={() => setActiveTab('DELETED')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={16} /> Deleted</span>
                            <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>
                                ({tabCounts.deleted})
                            </span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {activeTab === 'INVESTMENT' && (
                            <div className="view-mode-toggle">
                                <button 
                                    type="button"
                                    className={`view-mode-btn ${portfolioViewMode === 'cards' ? 'active' : ''}`}
                                    onClick={() => setPortfolioViewMode('cards')}
                                    title="Cards view"
                                >
                                    <LayoutGrid size={14} /> Cards
                                </button>
                                <button 
                                    type="button"
                                    className={`view-mode-btn ${portfolioViewMode === 'table' ? 'active' : ''}`}
                                    onClick={() => setPortfolioViewMode('table')}
                                    title="Table view"
                                >
                                    <TableIcon size={14} /> Table
                                </button>
                            </div>
                        )}

                        <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                            <span className="live-indicator-dot"></span>
                            {pricesLoading ? 'Fetching quotes…' : 'Live quotes syncing'}
                        </div>
                    </div>
                </div>

                {/* Sub-Filters for Active Trading */}
                {activeTab === 'TRADING' && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.2rem' }}>
                            Setup Type:
                        </span>
                        {[
                            { key: '', label: 'All Active' },
                            { key: 'INTRADAY', label: 'Intraday' },
                            { key: 'SWING', label: 'Swing' },
                            { key: 'MTF', label: 'MTF' },
                        ].map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                className={`trade-filter-pill ${activeSubFilter === opt.key ? 'active' : ''}`}
                                onClick={() => setActiveSubFilter(opt.key)}
                            >
                                {opt.label}
                                <span className="trade-filter-count">{activeSubCounts[opt.key] || 0}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Sub-Filters for Closed Log */}
                {activeTab === 'CLOSED' && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.2rem' }}>
                            Category:
                        </span>
                        {[
                            { key: '', label: 'All Closed' },
                            { key: 'TRADING', label: 'Active Trading' },
                            { key: 'INVESTMENT', label: 'Long-Term Portfolio' },
                        ].map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                className={`trade-filter-pill ${closedSubFilter === opt.key ? 'active' : ''}`}
                                onClick={() => setClosedSubFilter(opt.key)}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content Rendering */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', fontSize: '1.1rem' }}>
                        ⏳ Loading positions and synchronizing market quotes...
                    </div>
                ) : filteredTrades.length === 0 ? (
                    <div className="empty-state-box">
                        <div className="empty-state-icon">
                            {activeTab === 'INVESTMENT' ? <Shield size={42} /> : activeTab === 'CLOSED' ? <ScrollText size={42} /> : activeTab === 'DELETED' ? <Trash2 size={42} /> : <Target size={42} />}
                        </div>
                        <h4>
                            {activeTab === 'INVESTMENT' 
                                ? 'No Long-Term Portfolio Holdings Yet' 
                                : activeTab === 'CLOSED' 
                                ? 'No Historical Closed Trades Logged' 
                                : activeTab === 'DELETED'
                                ? 'Trash is Empty'
                                : 'No Active Trading Setups Found'}
                        </h4>
                        <p>
                            {activeTab === 'INVESTMENT' 
                                ? 'Build and track your conviction equity portfolio with real-time unrealized P&L. Open a trade and select "LONG TERM" trade type, or convert any active swing position to Long-Term.'
                                : activeTab === 'CLOSED'
                                ? 'When you exit positions, they will be archived here in your historical trade log with final realized return.'
                                : activeTab === 'DELETED'
                                ? 'Deleted trades will appear here for restoration or permanent removal.'
                                : 'Track intraday, swing, or MTF setups. Click "+ Open Trade" above to log a new position.'}
                        </p>
                        {activeTab !== 'CLOSED' && activeTab !== 'DELETED' && (
                            <button 
                                className="btn-paper-action btn-new-trade" 
                                onClick={() => navigate(activeTab === 'INVESTMENT' ? '/trades/open?type=LONG+TERM' : '/trades/open')}
                            >
                                + {activeTab === 'INVESTMENT' ? 'Add Long-Term Holding' : 'Open First Position'}
                            </button>
                        )}
                    </div>
                ) : (
                    /* Display Positions */
                    activeTab === 'INVESTMENT' && portfolioViewMode === 'cards' ? (
                        /* Dedicated Portfolio Cards Breakdown View (Matching Paper Trading) */
                        <div className="portfolio-grid">
                            {sortedTrades.map(t => {
                                const lev = t.leverage || 1;
                                const cost = (Number(t.entry_price) * Number(t.quantity)) / lev;
                                const rawCmp = prices[t.stock_name];
                                const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
                                const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : Number(t.entry_price);
                                
                                let pnl = 0;
                                if (t.trade_type === 'LONG') {
                                    pnl = (cmp - Number(t.entry_price)) * Number(t.quantity);
                                } else {
                                    pnl = (Number(t.entry_price) - cmp) * Number(t.quantity);
                                }
                                const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                                const isPos = pnl >= 0;

                                return (
                                    <div key={t.trade_id} className="portfolio-asset-card">
                                        <div>
                                            <div className="asset-card-top">
                                                <div className="symbol-badge-cell">
                                                    <span className="symbol-ticker">{t.stock_name}</span>
                                                    <span 
                                                        className="symbol-type-tag tag-investment"
                                                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                                        onClick={() => handleCategorySwitch(t)}
                                                        title="Click to switch to Active Trading (Swing)"
                                                    >
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Shield size={13} /> Long-Term Conviction</span>
                                                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>⇄</span>
                                                    </span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: isPos ? '#34d399' : '#f87171' }}>
                                                        {isPos ? '+' : ''}{fmtLakhs(pnl)}
                                                    </span>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isPos ? '#34d399' : '#f87171' }}>
                                                        {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="asset-metrics">
                                                <div>
                                                    <div className="metric-item-label">Current Price</div>
                                                    <div className="metric-item-val" style={{ color: cmpVal !== null ? '#38bdf8' : '#e2e8f0' }}>
                                                        ₹{cmp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        {priceDetails[t.stock_name]?.percentChange !== undefined && (
                                                            <span style={{ fontSize: '0.72rem', marginLeft: '6px', color: Number(priceDetails[t.stock_name].change) >= 0 ? '#10b981' : '#ef4444' }}>
                                                                {Number(priceDetails[t.stock_name].change) >= 0 ? '▲' : '▼'}{Math.abs(priceDetails[t.stock_name].percentChange)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="metric-item-label">Total Gain/Loss</div>
                                                    <div className="metric-item-val" style={{ color: isPos ? '#34d399' : '#f87171', fontWeight: 700 }}>
                                                        {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="metric-item-label">Avg Entry Price</div>
                                                    <div className="metric-item-val">₹{Number(t.entry_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                </div>
                                                <div>
                                                    <div className="metric-item-label">Holding Size</div>
                                                    <div className="metric-item-val">{t.quantity} qty ({fmtLakhs(cost)})</div>
                                                </div>
                                            </div>

                                            {(t.target || t.stop_loss) && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.45rem 0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                    {t.target ? <span style={{ color: '#34d399' }}>Target: ₹{Number(t.target).toLocaleString('en-IN')}</span> : <span />}
                                                    {t.stop_loss ? <span style={{ color: '#f87171' }}>SL: ₹{Number(t.stop_loss).toLocaleString('en-IN')}</span> : <span />}
                                                </div>
                                            )}

                                            {t.entry_notes && (
                                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', background: 'rgba(0,0,0,0.18)', padding: '0.65rem 0.8rem', borderRadius: '8px', marginBottom: '1.25rem', borderLeft: '3px solid #10b981', fontStyle: 'italic' }}>
                                                    "{t.entry_notes}"
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: 'auto', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                Added: {fmtDate(t.trade_date || t.created_at)}
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <button 
                                                    className="table-btn-action"
                                                    style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '0.35rem 0.6rem', cursor: 'pointer' }}
                                                    onClick={() => handleCategorySwitch(t)}
                                                    title="Convert to Active Trading (Swing)"
                                                >
                                                    Convert to Swing
                                                </button>
                                                <button 
                                                    className="table-btn-action btn-exit-trade"
                                                    onClick={() => handleOpenExitModal(t)}
                                                >
                                                    Book Profits / Exit
                                                </button>
                                                <Link to={`/trades/${t.trade_id}`} className="table-btn-icon" title="View Details">
                                                    <Eye size={16} />
                                                </Link>
                                                <button className="btn-delete-icon" onClick={() => handleDelete(t.trade_id, t.stock_name)} title="Delete Record">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Table View for Active Trades, Closed Log, All Open, or Table Mode of Portfolio */
                        <div className="table-responsive-container">
                            <table className="paper-table">
                                <thead>
                                    <tr>
                                        <SortHeader field="stock_name" label="Stock Symbol" sortConfig={sortConfig} onSort={handleSort} />
                                        <SortHeader field="trade_type" label="Dir" sortConfig={sortConfig} onSort={handleSort} />
                                        <SortHeader field="mode" label="Category" sortConfig={sortConfig} onSort={handleSort} />
                                        <SortHeader field="entry_price" label="Entry Price" sortConfig={sortConfig} onSort={handleSort} />
                                        <SortHeader field="quantity" label="Qty & Capital" sortConfig={sortConfig} onSort={handleSort} />

                                        {activeTab === 'CLOSED' ? (
                                            <>
                                                <SortHeader field="cmp" label="Exit Price" sortConfig={sortConfig} onSort={handleSort} />
                                                <SortHeader field="date" label="Exit Date" sortConfig={sortConfig} onSort={handleSort} />
                                                <SortHeader field="pnl_pct" label="Realized P&L" sortConfig={sortConfig} onSort={handleSort} />
                                                <th>Exit Reason</th>
                                            </>
                                        ) : (
                                            <>
                                                <SortHeader field="cmp" label="Current Price (CMP)" sortConfig={sortConfig} onSort={handleSort} />
                                                <SortHeader field="unrealized_pnl" label="Live Unrealized P&L" sortConfig={sortConfig} onSort={handleSort} />
                                                <SortHeader field="pnl_pct" label="Return %" sortConfig={sortConfig} onSort={handleSort} />
                                                <th>Target & SL</th>
                                            </>
                                        )}
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedTrades.map(t => {
                                        const lev = t.leverage || 1;
                                        const cost = (Number(t.entry_price) * Number(t.quantity)) / lev;
                                        const rawCmp = prices[t.stock_name];
                                        const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
                                        const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : Number(t.entry_price);

                                        let pnl = 0;
                                        let pnlPct = 0;
                                        if (t.status === 'CLOSED') {
                                            pnl = Number(t.total_pnl || 0);
                                            pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                                        } else {
                                            if (t.trade_type === 'LONG') {
                                                pnl = (cmp - Number(t.entry_price)) * Number(t.quantity);
                                            } else {
                                                pnl = (Number(t.entry_price) - cmp) * Number(t.quantity);
                                            }
                                            pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                                        }
                                        const isPos = pnl >= 0;
                                        const isInvest = isInvestment(t);

                                        return (
                                            <tr key={t.trade_id}>
                                                <td data-label="Stock Symbol">
                                                    <div className="symbol-badge-cell">
                                                        <span className="symbol-ticker">{t.stock_name}</span>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                            {fmtDate(t.trade_date || t.created_at)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td data-label="Direction">
                                                    <span style={{ color: MODE_COLOR[t.trade_type] || 'inherit', fontWeight: 700, fontSize: '0.78rem' }}>
                                                        {t.trade_type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                                                    </span>
                                                </td>
                                                <td data-label="Category">
                                                    <div 
                                                        className={`symbol-type-tag ${isInvest ? 'tag-investment' : 'tag-trading'}`}
                                                        style={{ cursor: t.status === 'OPEN' ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                                        onClick={() => t.status === 'OPEN' && handleCategorySwitch(t)}
                                                        title={t.status === 'OPEN' ? `Click to switch to ${isInvest ? 'Active Trading (Swing)' : 'Long-Term Portfolio'}` : 'Closed trade'}
                                                    >
                                                        <span>{isInvest ? <><Shield size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} /> Long-Term</> : <><Zap size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} /> {formatTradeType(t.mode)}</>}</span>
                                                        {t.status === 'OPEN' && <span style={{ fontSize: '0.75rem', opacity: 0.8 }} title="Click to Switch Category">⇄</span>}
                                                    </div>
                                                </td>
                                                <td data-label="Entry Price" style={{ fontWeight: 600, color: '#f8fafc' }}>
                                                    ₹{Number(t.entry_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td data-label="Qty & Capital">
                                                    <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{t.quantity} qty</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{fmtLakhs(cost)}</div>
                                                </td>

                                                {activeTab === 'CLOSED' ? (
                                                    <>
                                                        <td data-label="Exit Price" style={{ fontWeight: 700, color: '#38bdf8' }}>
                                                            ₹{Number(t.exit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td data-label="Exit Date" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                                            {fmtDate(t.exit_date)}
                                                        </td>
                                                        <td data-label="Realized P&L">
                                                            <span className={`pnl-badge ${isPos ? 'pnl-positive' : 'pnl-negative'}`} style={{ display: 'inline-block', fontSize: '0.9rem', fontWeight: 700 }}>
                                                                {isPos ? '+' : ''}{fmtLakhs(pnl)} ({isPos ? '+' : ''}{pnlPct.toFixed(2)}%)
                                                            </span>
                                                        </td>
                                                        <td data-label="Exit Reason" style={{ fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '180px' }}>
                                                            {t.exit_reason || 'Manual closure'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td data-label="Current Price (CMP)">
                                                            <div style={{ fontWeight: 700, color: cmpVal !== null ? '#38bdf8' : '#e2e8f0' }}>
                                                                ₹{cmp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </div>
                                                            {priceDetails[t.stock_name]?.percentChange !== undefined && (
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: Number(priceDetails[t.stock_name].change) >= 0 ? '#10b981' : '#ef4444' }}>
                                                                    {Number(priceDetails[t.stock_name].change) >= 0 ? '▲' : '▼'} {Math.abs(priceDetails[t.stock_name].percentChange)}%
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td data-label="Live Unrealized P&L">
                                                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: isPos ? '#34d399' : '#f87171' }}>
                                                                {isPos ? '+' : ''}{fmtLakhs(pnl)}
                                                            </div>
                                                        </td>
                                                        <td data-label="Return %">
                                                            <span className={`pnl-badge ${isPos ? 'pnl-positive' : 'pnl-negative'}`} style={{ display: 'inline-block', fontSize: '0.85rem', fontWeight: 700 }}>
                                                                {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                                                            </span>
                                                        </td>
                                                        <td data-label="Target & SL" style={{ fontSize: '0.8rem' }}>
                                                            <div style={{ color: '#34d399' }}>Tgt: {t.target ? `₹${Number(t.target).toLocaleString('en-IN')}` : '—'}</div>
                                                            <div style={{ color: '#f87171' }}>SL: {t.stop_loss ? `₹${Number(t.stop_loss).toLocaleString('en-IN')}` : '—'}</div>
                                                        </td>
                                                    </>
                                                )}

                                                <td data-label="Actions" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                                                        {t.status === 'OPEN' && (
                                                            <>
                                                                <button 
                                                                    className="table-btn-action"
                                                                    style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '0.35rem 0.6rem', cursor: 'pointer' }}
                                                                    onClick={() => handleCategorySwitch(t)}
                                                                    title={`Convert position to ${isInvest ? 'Active Trading (Swing)' : 'Long-Term Portfolio'}`}
                                                                >
                                                                    {isInvest ? 'Move to Swing' : 'Move to Long-Term'}
                                                                </button>
                                                                <button 
                                                                    className="table-btn-action btn-exit-trade"
                                                                    onClick={() => handleOpenExitModal(t)}
                                                                >
                                                                    Book Profits / Exit
                                                                </button>
                                                            </>
                                                        )}
                                                        <Link to={`/trades/${t.trade_id}`} className="table-btn-icon" title="View Details">
                                                            <Eye size={16} />
                                                        </Link>
                                                        <button 
                                                            className="btn-delete-icon" 
                                                            onClick={() => handleDelete(t.trade_id, t.stock_name)} 
                                                            disabled={deletingId === t.trade_id}
                                                            title="Move to Trash"
                                                        >
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
                    )
                )}

                {/* Soft-Deleted Trades Archive (When in DELETED tab) */}
                {activeTab === 'DELETED' && (
                    <>
                        {deletedLoading && <p className="status-text">Loading deleted trades…</p>}
                        {deletedError && <div className="alert alert--error">{deletedError}</div>}
                        {!deletedLoading && !deletedError && deleted.length === 0 && (
                            <div className="empty-state-box">
                                <Trash2 size={42} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                                <h4>No Deleted Trades</h4>
                                <p>Your trash is clean. Deleted trade records will be held here before permanent removal.</p>
                            </div>
                        )}
                        {!deletedLoading && !deletedError && deleted.length > 0 && (
                            <div className="table-responsive-container">
                                <table className="paper-table">
                                    <thead>
                                        <tr>
                                            <th>Symbol</th>
                                            <th>Dir</th>
                                            <th>Category</th>
                                            <th>Entry Price</th>
                                            <th>Entry Date</th>
                                            <th>P&L</th>
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
                                                        <span style={{ color: MODE_COLOR[t.trade_type] || 'inherit', fontWeight: 700, fontSize: '0.78rem' }}>
                                                            {t.trade_type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${tradeModeBadge}`} style={{ fontWeight: 600 }}>
                                                            {tradeModeDisp}
                                                        </span>
                                                    </td>
                                                    <td>₹{Number(t.entry_price).toLocaleString('en-IN')}</td>
                                                    <td style={{ color: 'var(--color-text-muted)' }}>
                                                        {fmtDate(t.trade_date || t.created_at)}
                                                    </td>
                                                    <td style={{ fontWeight: 600, color: t.total_pnl > 0 ? 'var(--color-success)' : t.total_pnl < 0 ? 'var(--color-danger)' : 'inherit' }}>
                                                        {fmtLakhs(t.total_pnl)}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                            <ActionBtn onClick={() => handleRestore(t.trade_id, t.stock_name)}
                                                                disabled={restoringId === t.trade_id} color="var(--color-success)">
                                                                {restoringId === t.trade_id ? '⏳' : <><RotateCcw size={14} style={{ marginRight: '4px' }} /> Restore</>}
                                                            </ActionBtn>
                                                            <ActionBtn onClick={() => handleHardDelete(t.trade_id, t.stock_name)}
                                                                disabled={hardDeletingId === t.trade_id} color="var(--color-danger)">
                                                                {hardDeletingId === t.trade_id ? '⏳' : <><Trash2 size={14} style={{ marginRight: '4px' }} /> Permanent Delete</>}
                                                            </ActionBtn>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Exit Trade Modal (Same as Paper Trading) */}
            {exitTradeModal && (
                <div className="paper-modal-overlay" onClick={() => setExitTradeModal(null)}>
                    <div className="paper-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={20} /> Exit Position ({exitTradeModal.stock_name})
                            </h3>
                            <button className="btn-close-pad" onClick={() => setExitTradeModal(null)}><X size={16} /></button>
                        </div>

                        <form onSubmit={handleExitSubmit}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#94a3b8' }}>Entry Price & Qty:</span>
                                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                                        ₹{Number(exitTradeModal.entry_price).toFixed(2)} x {exitTradeModal.quantity}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#94a3b8' }}>Live Quote / CMP:</span>
                                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                                        ₹{prices[exitTradeModal.stock_name] ? Number(prices[exitTradeModal.stock_name]).toFixed(2) : Number(exitTradeModal.entry_price).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="form-field-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Exit Price ₹ *</label>
                                <input 
                                    type="number" 
                                    step="0.05"
                                    className="form-input" 
                                    value={exitForm.exit_price} 
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_price: e.target.value }))}
                                    required 
                                />
                            </div>

                            <div className="form-field-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Exit Quantity</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={exitForm.quantity} 
                                    onChange={(e) => setExitForm(prev => ({ ...prev, quantity: e.target.value }))}
                                    max={exitTradeModal.quantity}
                                    min="1"
                                    required 
                                />
                            </div>

                            <div className="form-field-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Exit Date *</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={exitForm.exit_date} 
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_date: e.target.value }))}
                                    required 
                                />
                            </div>

                            <div className="form-field-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Exit Reason / Outcome</label>
                                <select 
                                    className="form-select" 
                                    value={exitForm.exit_reason} 
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_reason: e.target.value }))}
                                >
                                    <option value="TARGET_HIT">Target Hit / Profit Booked</option>
                                    <option value="SL_HIT">Stop Loss Hit</option>
                                    <option value="MANUAL">Manual Early Exit</option>
                                    <option value="EOD">End of Day (Intraday Close)</option>
                                    <option value="NEWS">News / Fundamental Change</option>
                                    <option value="OTHER">Other Reason</option>
                                </select>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-paper-action btn-secondary" onClick={() => setExitTradeModal(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-paper-action btn-add-funds" disabled={exitSubmitting}>
                                    {exitSubmitting ? 'Closing...' : 'Confirm Exit & Lock P&L'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
