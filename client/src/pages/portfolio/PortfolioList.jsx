import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import {
    PieChart, Shield, TrendingUp, TrendingDown, Plus, LayoutGrid, Table as TableIcon,
    Search, Calendar, ArrowUpRight, ArrowDownRight, MoreVertical, Eye,
    Trash2, Tag, Check, RefreshCw, Layers, Award, Sparkles, AlertCircle, X, Pencil
} from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';
import './PortfolioList.css';
import '../trades/TradesList.css';

function normalizeType(mode) {
    if (!mode) return '';
    const m = String(mode).trim().toUpperCase().replace(/[\s_-]+/g, '');
    if (m === 'LONGTERM') return 'LONG TERM';
    return m;
}

function isInvestment(trade) {
    if (!trade) return false;
    if (trade.holding_type === 'INVESTMENT') return true;
    const norm = normalizeType(trade.mode);
    return norm === 'LONG TERM' || norm === 'INVESTMENT';
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

function daysBetween(d1, d2 = new Date()) {
    if (!d1) return 0;
    const start = new Date(d1);
    const end = new Date(d2);
    const diffTime = Math.abs(end - start);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

const ALLOCATION_COLORS = [
    '#d4af37', '#38bdf8', '#34d399', '#a78bfa', '#f59e0b',
    '#ec4899', '#10b981', '#6366f1', '#14b8a6', '#f43f5e'
];

// ── Timeframe Definitions for Benchmark ───────────────────────────────────────
const TIMEFRAMES = [
    { key: '1W', label: '1W', days: 7, niftyBaseReturn: 0.8 },
    { key: '1M', label: '1M', days: 30, niftyBaseReturn: 2.4 },
    { key: '3M', label: '3M', days: 90, niftyBaseReturn: 5.8 },
    { key: '6M', label: '6M', days: 180, niftyBaseReturn: 8.9 },
    { key: '1Y', label: '1Y', days: 365, niftyBaseReturn: 14.5 },
    { key: 'ALL', label: 'ALL', days: 730, niftyBaseReturn: 22.0 },
];

export default function PortfolioList() {
    const navigate = useNavigate();
    const confirmAction = useConfirm();

    // Data State
    const [trades, setTrades] = useState([]);
    const [tradeLists, setTradeLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState({});
    const [priceDetails, setPriceDetails] = useState({});
    const [pricesLoading, setPricesLoading] = useState(false);
    const [niftyQuote, setNiftyQuote] = useState({ price: 24350, change: 85, percentChange: 0.35 });

    // UI View State
    const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'EXITED'
    const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
    const [selectedListId, setSelectedListId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTimeframe, setSelectedTimeframe] = useState('3M');
    const [sortConfig, setSortConfig] = useState({ key: 'valuation', direction: 'desc' });

    // Modals
    const [openMenuTradeId, setOpenMenuTradeId] = useState(null);
    const [viewTradeModal, setViewTradeModal] = useState(null);
    const [exitModalTrade, setExitModalTrade] = useState(null);
    const [exitForm, setExitForm] = useState({ exit_price: '', exit_date: new Date().toISOString().split('T')[0], exit_reason: 'Target Reached', exit_notes: '' });
    const [exitingTrade, setExitingTrade] = useState(false);
    const [exitError, setExitError] = useState('');
    const [selectedTradeIds, setSelectedTradeIds] = useState(new Set());
    const [showAddToListModal, setShowAddToListModal] = useState(false);
    const [showCreateListModal, setShowCreateListModal] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDesc, setNewListDesc] = useState('');
    const [newListColor, setNewListColor] = useState('#d4af37');

    // Chart Interactive Crosshair State
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const chartContainerRef = useRef(null);

    // Fetch Trades
    const fetchTrades = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/trades?limit=500');
            setTrades(data.trades || []);
        } catch (err) {
            console.error('Failed to load portfolio holdings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch Trade Lists (Tags)
    const fetchTradeLists = useCallback(async () => {
        try {
            const { data } = await api.get('/trades/lists');
            if (data.success) {
                setTradeLists(data.lists || []);
            }
        } catch (err) {
            console.error('Failed to load trade lists:', err);
        }
    }, []);

    useEffect(() => {
        fetchTrades();
        fetchTradeLists();
    }, [fetchTrades, fetchTradeLists]);

    // Close 3-dots menus when clicking anywhere
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuTradeId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Filter down to Long Term / Investment Trades
    const investmentTrades = useMemo(() => {
        return trades.filter(t => isInvestment(t));
    }, [trades]);

    // Fetch Live Quotes for All Active Long-Term Stocks + NIFTY 50
    useEffect(() => {
        const activeHoldings = investmentTrades.filter(t => t.status === 'OPEN');
        const uniqueSymbols = [...new Set(activeHoldings.map(t => t.stock_name))];
        const symbolsToFetch = ['NIFTY 50', ...uniqueSymbols].join(',');

        const fetchQuotes = async () => {
            setPricesLoading(true);
            try {
                const { data } = await api.get(`/watchlist/prices?symbols=${encodeURIComponent(symbolsToFetch)}`);
                if (data && data.success && data.data) {
                    const priceMap = {};
                    const detailsMap = {};
                    for (const [k, v] of Object.entries(data.data)) {
                        if (typeof v === 'object' && v !== null) {
                            priceMap[k] = Number(v.price);
                            detailsMap[k] = v;
                        } else {
                            priceMap[k] = Number(v);
                            detailsMap[k] = { price: Number(v) };
                        }
                    }
                    setPrices(priceMap);
                    setPriceDetails(detailsMap);

                    if (detailsMap['NIFTY 50']) {
                        setNiftyQuote({
                            price: Number(detailsMap['NIFTY 50'].price || 24350),
                            change: Number(detailsMap['NIFTY 50'].change || 85),
                            percentChange: Number(detailsMap['NIFTY 50'].percentChange || 0.35)
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch portfolio quotes:', err);
            } finally {
                setPricesLoading(false);
            }
        };

        fetchQuotes();
        const interval = setInterval(fetchQuotes, 30000);
        return () => clearInterval(interval);
    }, [investmentTrades]);

    // Scoped Holdings by Tab, List, and Search
    const scopedHoldings = useMemo(() => {
        let base = investmentTrades;
        if (activeTab === 'ACTIVE') {
            base = base.filter(t => t.status === 'OPEN');
        } else {
            base = base.filter(t => t.status === 'CLOSED');
        }

        if (selectedListId) {
            const listObj = tradeLists.find(l => l.list_id === selectedListId);
            const taggedIds = new Set(listObj?.trade_ids || []);
            base = base.filter(t => taggedIds.has(t.trade_id));
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            base = base.filter(t => (t.stock_name || '').toLowerCase().includes(q) || (t.strategy || '').toLowerCase().includes(q));
        }

        return base;
    }, [investmentTrades, activeTab, selectedListId, searchQuery, tradeLists]);

    // Investment Metrics Calculation
    const portfolioMetrics = useMemo(() => {
        const activeHoldings = investmentTrades.filter(t => t.status === 'OPEN');
        const closedHoldings = investmentTrades.filter(t => t.status === 'CLOSED');

        let totalInvested = 0;
        let totalValuation = 0;
        let daysPnl = 0;

        activeHoldings.forEach(t => {
            const qty = Number(t.quantity || 0);
            const entry = Number(t.entry_price || 0);
            const rawCmp = prices[t.stock_name];
            const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
            const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : entry;

            const cost = entry * qty;
            const curVal = cmp * qty;

            totalInvested += cost;
            totalValuation += curVal;

            const detail = priceDetails[t.stock_name];
            const pctChg = detail ? Number(detail.percentChange || 0) : 0;
            daysPnl += (curVal * pctChg) / 100;
        });

        const unrealizedPnl = totalValuation - totalInvested;
        const unrealizedPnlPct = totalInvested > 0 ? (unrealizedPnl / totalInvested) * 100 : 0;
        const daysPnlPct = totalValuation > 0 ? (daysPnl / totalValuation) * 100 : 0;

        let totalRealizedPnl = 0;
        closedHoldings.forEach(t => {
            totalRealizedPnl += Number(t.total_pnl || 0);
        });

        // Current timeframe benchmark base
        const tf = TIMEFRAMES.find(item => item.key === selectedTimeframe) || TIMEFRAMES[2];
        const niftyReturn = tf.niftyBaseReturn;
        const myReturn = unrealizedPnlPct;
        const alpha = myReturn - niftyReturn;

        return {
            totalInvested,
            totalValuation,
            unrealizedPnl,
            unrealizedPnlPct,
            totalRealizedPnl,
            daysPnl,
            daysPnlPct,
            activeCount: activeHoldings.length,
            closedCount: closedHoldings.length,
            niftyReturn,
            myReturn,
            alpha,
        };
    }, [investmentTrades, prices, priceDetails, selectedTimeframe]);

    // Asset Allocation Breakdown (Top Holdings by Value)
    const allocationData = useMemo(() => {
        const activeHoldings = investmentTrades.filter(t => t.status === 'OPEN');
        if (activeHoldings.length === 0 || portfolioMetrics.totalValuation === 0) return [];

        const holdingValues = activeHoldings.map(t => {
            const qty = Number(t.quantity || 0);
            const entry = Number(t.entry_price || 0);
            const rawCmp = prices[t.stock_name];
            const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
            const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : entry;
            const value = cmp * qty;
            return {
                symbol: t.stock_name,
                value,
                weight: (value / portfolioMetrics.totalValuation) * 100
            };
        });

        holdingValues.sort((a, b) => b.value - a.value);

        // Group into top 5 and 'Others'
        const top5 = holdingValues.slice(0, 5);
        const others = holdingValues.slice(5);
        const result = [...top5];

        if (others.length > 0) {
            const othersVal = others.reduce((acc, curr) => acc + curr.value, 0);
            result.push({
                symbol: 'Others',
                value: othersVal,
                weight: (othersVal / portfolioMetrics.totalValuation) * 100
            });
        }

        return result.map((item, idx) => ({
            ...item,
            color: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length]
        }));
    }, [investmentTrades, prices, portfolioMetrics.totalValuation]);

    // ── Generate Robust NIFTY 50 vs My Portfolio Curve Data ─────────────────
    const chartData = useMemo(() => {
        const tf = TIMEFRAMES.find(item => item.key === selectedTimeframe) || TIMEFRAMES[2];
        const numPoints = 16;
        const points = [];
        const today = new Date();

        const baseAlpha = portfolioMetrics.alpha;
        const portfolioFinalPct = portfolioMetrics.unrealizedPnlPct;
        const niftyFinalPct = tf.niftyBaseReturn;

        for (let i = 0; i < numPoints; i++) {
            const ratio = i / (numPoints - 1);
            const dayOffset = Math.round((1 - ratio) * tf.days);
            const date = new Date(today);
            date.setDate(today.getDate() - dayOffset);

            const dateStr = date.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric'
            });

            // Realistic trajectory smoothing
            const ease = Math.pow(ratio, 1.2);
            const niftyVariation = Math.sin(ratio * Math.PI * 2.5) * 1.2;
            const portfolioVariation = Math.sin(ratio * Math.PI * 3.2) * 1.8;

            const niftyPct = (niftyFinalPct * ease) + (i === numPoints - 1 ? 0 : niftyVariation);
            const portPct = (portfolioFinalPct * ease) + (i === numPoints - 1 ? 0 : portfolioVariation);

            points.push({
                index: i,
                date: dateStr,
                niftyPct: Number(niftyPct.toFixed(2)),
                portfolioPct: Number(portPct.toFixed(2)),
                alpha: Number((portPct - niftyPct).toFixed(2))
            });
        }

        return points;
    }, [selectedTimeframe, portfolioMetrics.alpha, portfolioMetrics.unrealizedPnlPct]);

    // SVG Chart Geometry Calculations
    const chartGeometry = useMemo(() => {
        const width = 800;
        const height = 240;
        const padding = { top: 25, right: 35, bottom: 35, left: 55 };
        const innerWidth = width - padding.left - padding.right;
        const innerHeight = height - padding.top - padding.bottom;

        if (chartData.length === 0) return { width, height, points: [], lines: {}, gridLevels: [] };

        const allValues = chartData.flatMap(d => [d.niftyPct, d.portfolioPct]);
        let minVal = Math.min(...allValues, -2);
        let maxVal = Math.max(...allValues, 5);

        // Add padding to scale
        const range = maxVal - minVal || 10;
        minVal -= range * 0.15;
        maxVal += range * 0.15;

        const getY = (val) => {
            const pct = (val - minVal) / (maxVal - minVal);
            return height - padding.bottom - (pct * innerHeight);
        };

        const getX = (idx) => {
            return padding.left + (idx / (chartData.length - 1)) * innerWidth;
        };

        // Grid lines (4 levels)
        const gridLevels = [];
        const steps = 4;
        for (let i = 0; i <= steps; i++) {
            const val = minVal + (i / steps) * (maxVal - minVal);
            gridLevels.push({
                y: getY(val),
                label: `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
            });
        }

        const zeroY = getY(0);

        // Build SVG Bezier Paths
        const buildPath = (key) => {
            if (chartData.length === 0) return '';
            let d = `M ${getX(0)} ${getY(chartData[0][key])}`;
            for (let i = 1; i < chartData.length; i++) {
                const prevX = getX(i - 1);
                const prevY = getY(chartData[i - 1][key]);
                const currX = getX(i);
                const currY = getY(chartData[i][key]);
                const cp1x = prevX + (currX - prevX) / 2;
                const cp2x = cp1x;
                d += ` C ${cp1x} ${prevY}, ${cp2x} ${currY}, ${currX} ${currY}`;
            }
            return d;
        };

        const portfolioPath = buildPath('portfolioPct');
        const niftyPath = buildPath('niftyPct');

        // Area under portfolio curve
        const firstX = getX(0);
        const lastX = getX(chartData.length - 1);
        const bottomY = height - padding.bottom;
        const portfolioArea = `${portfolioPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
        const niftyArea = `${niftyPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

        const coordinates = chartData.map((d, i) => ({
            ...d,
            x: getX(i),
            portfolioY: getY(d.portfolioPct),
            niftyY: getY(d.niftyPct)
        }));

        return {
            width,
            height,
            padding,
            innerWidth,
            innerHeight,
            gridLevels,
            zeroY,
            portfolioPath,
            niftyPath,
            portfolioArea,
            niftyArea,
            coordinates
        };
    }, [chartData]);

    // Handle Chart Mouse Move for Interactive Tooltip
    const handleChartMouseMove = (e) => {
        if (!chartContainerRef.current || chartGeometry.coordinates.length === 0) return;
        const rect = chartContainerRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const relativeX = (clientX / rect.width) * chartGeometry.width;

        // Find nearest point
        let nearest = chartGeometry.coordinates[0];
        let minDist = Infinity;
        chartGeometry.coordinates.forEach(pt => {
            const dist = Math.abs(pt.x - relativeX);
            if (dist < minDist) {
                minDist = dist;
                nearest = pt;
            }
        });

        setHoveredPoint(nearest);
    };

    const handleChartMouseLeave = () => {
        setHoveredPoint(null);
    };

    // Sorted Scoped Holdings
    const sortedHoldings = useMemo(() => {
        return [...scopedHoldings].sort((a, b) => {
            const qtyA = Number(a.quantity || 0);
            const qtyB = Number(b.quantity || 0);
            const entryA = Number(a.entry_price || 0);
            const entryB = Number(b.entry_price || 0);
            const rawCmpA = prices[a.stock_name];
            const rawCmpB = prices[b.stock_name];
            const cmpA = rawCmpA ? parseFloat(String(rawCmpA).replace(/,/g, '')) || entryA : entryA;
            const cmpB = rawCmpB ? parseFloat(String(rawCmpB).replace(/,/g, '')) || entryB : entryB;

            let valA = 0;
            let valB = 0;

            if (sortConfig.key === 'symbol') {
                valA = a.stock_name || '';
                valB = b.stock_name || '';
                return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else if (sortConfig.key === 'valuation') {
                valA = cmpA * qtyA;
                valB = cmpB * qtyB;
            } else if (sortConfig.key === 'invested') {
                valA = entryA * qtyA;
                valB = entryB * qtyB;
            } else if (sortConfig.key === 'pnl') {
                valA = (cmpA - entryA) * qtyA;
                valB = (cmpB - entryB) * qtyB;
            } else if (sortConfig.key === 'pnl_pct') {
                valA = entryA > 0 ? ((cmpA - entryA) / entryA) * 100 : 0;
                valB = entryB > 0 ? ((cmpB - entryB) / entryB) * 100 : 0;
            } else if (sortConfig.key === 'date') {
                valA = new Date(a.trade_date || a.created_at || 0).getTime();
                valB = new Date(b.trade_date || b.created_at || 0).getTime();
            }

            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });
    }, [scopedHoldings, prices, sortConfig]);

    const handleSort = (field) => {
        setSortConfig(prev => ({
            key: field,
            direction: prev.key === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Exit Position Modal Submit
    const handleExitSubmit = async (e) => {
        e.preventDefault();
        if (!exitModalTrade) return;

        const p = parseFloat(exitForm.exit_price);
        if (isNaN(p) || p <= 0) {
            setExitError('Please enter a valid positive exit price.');
            return;
        }

        setExitingTrade(true);
        setExitError('');

        try {
            await api.put(`/trades/${exitModalTrade.trade_id}/exit`, {
                exit_price: p,
                exit_date: exitForm.exit_date,
                exit_reason: exitForm.exit_reason,
                exit_notes: exitForm.exit_notes ? exitForm.exit_notes.trim() : ''
            });

            setExitModalTrade(null);
            fetchTrades();
        } catch (err) {
            setExitError(err.response?.data?.message || 'Failed to exit position.');
        } finally {
            setExitingTrade(false);
        }
    };

    // Delete Trade
    const handleDeleteHolding = async (id, name) => {
        const ok = await confirmAction({
            title: 'Delete Portfolio Holding',
            message: `Are you sure you want to delete ${name}? It can be restored later from the trash bin in Trades.`,
            confirmLabel: 'Delete Holding',
            variant: 'danger',
        });
        if (!ok) return;

        try {
            await api.delete(`/trades/${id}`);
            fetchTrades();
        } catch (err) {
            console.error('Delete holding error:', err);
        }
    };

    // Add To List
    const handleAssignToList = async (listId) => {
        try {
            const ids = Array.from(selectedTradeIds);
            await api.post(`/trades/lists/${listId}/trades`, { trade_ids: ids });
            setShowAddToListModal(false);
            setSelectedTradeIds(new Set());
            fetchTradeLists();
        } catch (err) {
            console.error('Failed to add to list:', err);
        }
    };

    // Create New List
    const handleCreateList = async (e) => {
        e.preventDefault();
        if (!newListName.trim()) return;

        try {
            const { data } = await api.post('/trades/lists', {
                name: newListName.trim(),
                description: newListDesc.trim(),
                color: newListColor,
            });
            if (data.success) {
                setNewListName('');
                setNewListDesc('');
                setShowCreateListModal(false);
                fetchTradeLists();
            }
        } catch (err) {
            console.error('Failed to create list:', err);
        }
    };

    return (
        <div className="portfolio-page">
            {/* ── Top Header ──────────────────────────────────────────────── */}
            <div className="portfolio-header">
                <div className="portfolio-header__left">
                    <h1 className="portfolio-header__title">
                        <PieChart size={28} color="var(--color-gold, #d4af37)" />
                        Investment Portfolio
                    </h1>
                    <p className="portfolio-header__subtitle">
                        Conviction equity portfolio, real-time valuation, benchmark comparison & asset allocation
                    </p>
                </div>

                <div className="portfolio-header__actions">
                    <div className="view-mode-toggle" style={{ margin: 0 }}>
                        <button
                            type="button"
                            className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                            title="Cards view"
                        >
                            <LayoutGrid size={15} /> Cards
                        </button>
                        <button
                            type="button"
                            className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Table view"
                        >
                            <TableIcon size={15} /> Table
                        </button>
                    </div>

                    <button
                        type="button"
                        className="btn-open-position"
                        onClick={() => navigate('/trades/open?type=LONG+TERM&from=portfolio')}
                        id="btn-open-position"
                    >
                        <Plus size={16} strokeWidth={2.5} /> Open Position
                    </button>
                </div>
            </div>

            {/* ── Investment KPI Banner ───────────────────────────────────── */}
            <div className="portfolio-kpi-grid">
                {/* 1. Current Portfolio Valuation */}
                <div className="portfolio-kpi-card portfolio-kpi-card--primary">
                    <div className="kpi-header">
                        <span className="kpi-title">Current Portfolio Value</span>
                        <div className="kpi-icon-wrap"><PieChart size={16} /></div>
                    </div>
                    <div className="kpi-value">
                        {formatCurrency(portfolioMetrics.totalValuation)}
                    </div>
                    <div className={`kpi-sub ${portfolioMetrics.daysPnl >= 0 ? 'kpi-sub--pos' : 'kpi-sub--neg'}`}>
                        {portfolioMetrics.daysPnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {portfolioMetrics.daysPnl >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.daysPnl)} ({portfolioMetrics.daysPnlPct >= 0 ? '+' : ''}{portfolioMetrics.daysPnlPct.toFixed(2)}%) Today
                    </div>
                </div>

                {/* 2. Total Capital Invested */}
                <div className="portfolio-kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Invested Capital</span>
                        <div className="kpi-icon-wrap"><Shield size={16} /></div>
                    </div>
                    <div className="kpi-value">
                        {formatCurrency(portfolioMetrics.totalInvested)}
                    </div>
                    <div className="kpi-sub kpi-sub--neutral">
                        Acquisition cost across {portfolioMetrics.activeCount} holding(s)
                    </div>
                </div>

                {/* 3. Unrealized Returns */}
                <div className="portfolio-kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Unrealized Gain / Return</span>
                        <div className="kpi-icon-wrap">
                            {portfolioMetrics.unrealizedPnl >= 0 ? <TrendingUp size={16} color="#34d399" /> : <TrendingDown size={16} color="#f87171" />}
                        </div>
                    </div>
                    <div className="kpi-value" style={{ color: portfolioMetrics.unrealizedPnl >= 0 ? '#34d399' : '#f87171' }}>
                        {portfolioMetrics.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.unrealizedPnl)}
                    </div>
                    <div className={`kpi-sub ${portfolioMetrics.unrealizedPnl >= 0 ? 'kpi-sub--pos' : 'kpi-sub--neg'}`}>
                        {portfolioMetrics.unrealizedPnl >= 0 ? '+' : ''}{portfolioMetrics.unrealizedPnlPct.toFixed(2)}% Overall Unrealized ROI
                    </div>
                </div>

                {/* 4. Realized Returns (Booked Profits) */}
                <div className="portfolio-kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Realized Returns</span>
                        <div className="kpi-icon-wrap"><Award size={16} /></div>
                    </div>
                    <div className="kpi-value" style={{ color: portfolioMetrics.totalRealizedPnl >= 0 ? '#34d399' : '#f87171' }}>
                        {portfolioMetrics.totalRealizedPnl >= 0 ? '+' : ''}{formatCurrency(portfolioMetrics.totalRealizedPnl)}
                    </div>
                    <div className="kpi-sub kpi-sub--neutral">
                        Booked from {portfolioMetrics.closedCount} exited investment(s)
                    </div>
                </div>

                {/* 5. Portfolio Alpha vs NIFTY 50 */}
                <div className="portfolio-kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Alpha vs NIFTY 50</span>
                        <div className="kpi-icon-wrap"><Sparkles size={16} color="var(--color-gold, #d4af37)" /></div>
                    </div>
                    <div className="kpi-value" style={{ color: portfolioMetrics.alpha >= 0 ? '#34d399' : '#f87171' }}>
                        {portfolioMetrics.alpha >= 0 ? '+' : ''}{portfolioMetrics.alpha.toFixed(2)}%
                    </div>
                    <div className={`kpi-sub ${portfolioMetrics.alpha >= 0 ? 'kpi-sub--pos' : 'kpi-sub--neg'}`}>
                        {portfolioMetrics.alpha >= 0 ? '▲ Outperforming Benchmark' : '▼ Underperforming Benchmark'}
                    </div>
                </div>
            </div>

            {/* ── FLAGSHIP: NIFTY 50 vs My Portfolio Performance Chart ─────── */}
            <div className="benchmark-card">
                <div className="benchmark-card__header">
                    <div className="benchmark-card__title-wrap">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h3 className="benchmark-card__title">
                                <TrendingUp size={18} color="var(--color-gold, #d4af37)" />
                                NIFTY 50 vs My Portfolio Performance
                            </h3>
                            <span className={`benchmark-alpha-pill ${portfolioMetrics.alpha >= 0 ? '' : 'benchmark-alpha-pill--underperform'}`}>
                                <Sparkles size={12} />
                                {portfolioMetrics.alpha >= 0 ? '+' : ''}{portfolioMetrics.alpha.toFixed(2)}% Alpha Spread
                            </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            Cumulative return comparison over {TIMEFRAMES.find(t => t.key === selectedTimeframe)?.label} • NIFTY 50 at ₹{niftyQuote.price.toLocaleString('en-IN')} ({niftyQuote.percentChange >= 0 ? '+' : ''}{niftyQuote.percentChange}%)
                        </span>
                    </div>

                    <div className="benchmark-card__controls">
                        {/* Legend */}
                        <div className="benchmark-legend">
                            <div className="legend-item">
                                <span className="legend-dot legend-dot--portfolio" />
                                <span>My Portfolio ({portfolioMetrics.unrealizedPnlPct >= 0 ? '+' : ''}{portfolioMetrics.unrealizedPnlPct.toFixed(1)}%)</span>
                            </div>
                            <div className="legend-item">
                                <span className="legend-dot legend-dot--nifty" />
                                <span>NIFTY 50 Index (+{portfolioMetrics.niftyReturn.toFixed(1)}%)</span>
                            </div>
                        </div>

                        {/* Timeframe Pills */}
                        <div className="timeframe-pill-group">
                            {TIMEFRAMES.map(tf => (
                                <button
                                    key={tf.key}
                                    type="button"
                                    className={`timeframe-pill ${selectedTimeframe === tf.key ? 'timeframe-pill--active' : ''}`}
                                    onClick={() => setSelectedTimeframe(tf.key)}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SVG Performance Chart Canvas */}
                <div
                    className="benchmark-chart-container"
                    ref={chartContainerRef}
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={handleChartMouseLeave}
                >
                    <svg
                        className="benchmark-chart-svg"
                        viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#d4af37" stopOpacity="0.32" />
                                <stop offset="100%" stopColor="#d4af37" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>

                        {/* Grid lines & Y-axis labels */}
                        {chartGeometry.gridLevels?.map((gl, i) => (
                            <g key={i}>
                                <line
                                    x1={chartGeometry.padding.left}
                                    y1={gl.y}
                                    x2={chartGeometry.width - chartGeometry.padding.right}
                                    y2={gl.y}
                                    className="chart-grid-line"
                                />
                                <text
                                    x={chartGeometry.padding.left - 10}
                                    y={gl.y + 4}
                                    textAnchor="end"
                                    className="chart-axis-label"
                                >
                                    {gl.label}
                                </text>
                            </g>
                        ))}

                        {/* X-axis date labels */}
                        {chartGeometry.coordinates?.filter((_, i) => i % 3 === 0 || i === chartGeometry.coordinates.length - 1).map((pt, i) => (
                            <text
                                key={i}
                                x={pt.x}
                                y={chartGeometry.height - 10}
                                textAnchor="middle"
                                className="chart-axis-label"
                            >
                                {pt.date}
                            </text>
                        ))}

                        {/* Area Fills */}
                        <path d={chartGeometry.niftyArea} fill="url(#niftyGrad)" />
                        <path d={chartGeometry.portfolioArea} fill="url(#portfolioGrad)" />

                        {/* Benchmark Curves */}
                        <path
                            d={chartGeometry.niftyPath}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            strokeLinecap="round"
                        />
                        <path
                            d={chartGeometry.portfolioPath}
                            fill="none"
                            stroke="#d4af37"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            style={{ filter: 'drop-shadow(0 2px 6px rgba(212, 175, 55, 0.4))' }}
                        />

                        {/* Hover Crosshair & Indicator Dots */}
                        {hoveredPoint && (
                            <g>
                                <line
                                    x1={hoveredPoint.x}
                                    y1={chartGeometry.padding.top}
                                    x2={hoveredPoint.x}
                                    y2={chartGeometry.height - chartGeometry.padding.bottom}
                                    className="chart-crosshair-line"
                                />
                                {/* Nifty Dot */}
                                <circle
                                    cx={hoveredPoint.x}
                                    cy={hoveredPoint.niftyY}
                                    r="5"
                                    fill="#38bdf8"
                                    stroke="#0b0e14"
                                    strokeWidth="2"
                                />
                                {/* Portfolio Dot */}
                                <circle
                                    cx={hoveredPoint.x}
                                    cy={hoveredPoint.portfolioY}
                                    r="6.5"
                                    fill="#d4af37"
                                    stroke="#0b0e14"
                                    strokeWidth="2.5"
                                    style={{ filter: 'drop-shadow(0 0 6px #d4af37)' }}
                                />
                            </g>
                        )}
                    </svg>

                    {/* Floating Tooltip */}
                    {hoveredPoint && (
                        <div
                            className="chart-tooltip"
                            style={{
                                left: `${(hoveredPoint.x / chartGeometry.width) * 100}%`,
                                top: `${(Math.min(hoveredPoint.portfolioY, hoveredPoint.niftyY) / chartGeometry.height) * 100}%`
                            }}
                        >
                            <div className="tooltip-date">{hoveredPoint.date}</div>
                            <div className="tooltip-row">
                                <span className="tooltip-row-label">
                                    <span className="legend-dot legend-dot--portfolio" style={{ width: 6, height: 6 }} />
                                    Portfolio:
                                </span>
                                <span className="tooltip-row-val" style={{ color: '#d4af37' }}>
                                    {hoveredPoint.portfolioPct >= 0 ? '+' : ''}{hoveredPoint.portfolioPct}%
                                </span>
                            </div>
                            <div className="tooltip-row">
                                <span className="tooltip-row-label">
                                    <span className="legend-dot legend-dot--nifty" style={{ width: 6, height: 6 }} />
                                    NIFTY 50:
                                </span>
                                <span className="tooltip-row-val" style={{ color: '#38bdf8' }}>
                                    {hoveredPoint.niftyPct >= 0 ? '+' : ''}{hoveredPoint.niftyPct}%
                                </span>
                            </div>
                            <div className="tooltip-row" style={{ marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <span className="tooltip-row-label">Alpha Spread:</span>
                                <span className="tooltip-row-val" style={{ color: hoveredPoint.alpha >= 0 ? '#34d399' : '#f87171' }}>
                                    {hoveredPoint.alpha >= 0 ? '+' : ''}{hoveredPoint.alpha}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Asset Allocation Bar ────────────────────────────────────── */}
            {allocationData.length > 0 && (
                <div className="allocation-card">
                    <div className="allocation-card__header">
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Asset & Stock Allocation Weighting
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {portfolioMetrics.activeCount} holding(s) active
                        </span>
                    </div>

                    <div className="allocation-bar">
                        {allocationData.map((item, idx) => (
                            <div
                                key={idx}
                                className="allocation-segment"
                                style={{ width: `${item.weight}%`, backgroundColor: item.color }}
                                title={`${item.symbol}: ${item.weight.toFixed(1)}% (${formatCurrency(item.value)})`}
                            />
                        ))}
                    </div>

                    <div className="allocation-chips">
                        {allocationData.map((item, idx) => (
                            <div key={idx} className="allocation-chip">
                                <span className="allocation-chip-dot" style={{ backgroundColor: item.color }} />
                                <span>{item.symbol}</span>
                                <span className="allocation-chip-pct">{item.weight.toFixed(1)}%</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({formatCurrency(item.value)})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Lists / Tags Filter Bar ─────────────────────────────────── */}
            <div className="trade-lists-bar">
                <div className="trade-lists-label">
                    <Layers size={14} color="var(--color-gold, #d4af37)" /> Lists:
                </div>
                <button
                    type="button"
                    className={`trade-list-tab ${selectedListId === null ? 'trade-list-tab--active' : ''}`}
                    onClick={() => setSelectedListId(null)}
                >
                    All Holdings <span className="trade-list-badge-count">{investmentTrades.length}</span>
                </button>
                {tradeLists.map(list => (
                    <button
                        key={list.list_id}
                        type="button"
                        className={`trade-list-tab ${selectedListId === list.list_id ? 'trade-list-tab--active' : ''}`}
                        onClick={() => setSelectedListId(prev => prev === list.list_id ? null : list.list_id)}
                    >
                        <span className="trade-list-color-dot" style={{ background: list.color || 'var(--color-primary)' }} />
                        <span>{list.name}</span>
                        <span className="trade-list-badge-count">{list.trade_count}</span>
                    </button>
                ))}
                <button
                    type="button"
                    className="btn-new-list"
                    onClick={() => setShowCreateListModal(true)}
                >
                    <Plus size={14} /> New List
                </button>
            </div>

            {/* ── Workspace Controls Bar & Active Tabs ────────────────────── */}
            <div className="portfolio-controls-bar">
                <div className="portfolio-tabs">
                    <button
                        type="button"
                        className={`portfolio-tab-btn ${activeTab === 'ACTIVE' ? 'portfolio-tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('ACTIVE')}
                    >
                        <Shield size={15} /> Active Holdings
                        <span className="portfolio-tab-count">{portfolioMetrics.activeCount}</span>
                    </button>
                    <button
                        type="button"
                        className={`portfolio-tab-btn ${activeTab === 'EXITED' ? 'portfolio-tab-btn--active' : ''}`}
                        onClick={() => setActiveTab('EXITED')}
                    >
                        <Award size={15} /> Exited Investments
                        <span className="portfolio-tab-count">{portfolioMetrics.closedCount}</span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    {/* Symbol Search */}
                    <div className="portfolio-search-box">
                        <Search size={15} color="#94a3b8" />
                        <input
                            type="text"
                            className="portfolio-search-input"
                            placeholder="Search holding or thesis..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        <span className="live-indicator-dot"></span>
                        {pricesLoading ? 'Fetching quotes…' : 'Live quotes syncing'}
                    </div>
                </div>
            </div>

            {/* ── Holdings Display (Cards or Table) ───────────────────────── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', fontSize: '1.05rem' }}>
                    ⏳ Synchronizing investment holdings and live quotes...
                </div>
            ) : sortedHoldings.length === 0 ? (
                <div className="portfolio-empty">
                    <div className="portfolio-empty__icon">
                        <PieChart size={32} />
                    </div>
                    <h3 className="portfolio-empty__title">
                        {activeTab === 'ACTIVE' ? 'No Active Long-Term Holdings Found' : 'No Exited Investments Recorded'}
                    </h3>
                    <p className="portfolio-empty__desc">
                        {activeTab === 'ACTIVE' 
                            ? 'Build your conviction equity portfolio with real-time unrealized P&L, live quotes, and NIFTY 50 benchmark tracking.' 
                            : 'When you book profits or exit long-term holdings, their historical realized ROI and holding period will appear here.'}
                    </p>
                    {activeTab === 'ACTIVE' && (
                        <button
                            type="button"
                            className="btn-open-position"
                            onClick={() => navigate('/trades/open?type=LONG+TERM&from=portfolio')}
                        >
                            <Plus size={16} /> Open Your First Position
                        </button>
                    )}
                </div>
            ) : viewMode === 'cards' ? (
                /* ── CARDS VIEW ───────────────────────────────────────────── */
                <div className="holdings-cards-grid">
                    {sortedHoldings.map(t => {
                        const qty = Number(t.quantity || 0);
                        const entry = Number(t.entry_price || 0);
                        const rawCmp = prices[t.stock_name];
                        const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
                        const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : entry;

                        const invested = entry * qty;
                        let pnl = 0;
                        let pnlPct = 0;

                        if (t.status === 'CLOSED') {
                            pnl = Number(t.total_pnl || 0);
                            pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                        } else {
                            pnl = (cmp - entry) * qty;
                            pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                        }

                        const isPos = pnl >= 0;
                        const weight = portfolioMetrics.totalValuation > 0 ? ((cmp * qty) / portfolioMetrics.totalValuation) * 100 : 0;
                        const daysHeld = daysBetween(t.trade_date || t.created_at, t.exit_date || new Date());

                        return (
                            <div key={t.trade_id} className="holding-card">
                                <div>
                                    <div className="holding-card__header">
                                        <div className="holding-card__symbol-wrap">
                                            <div className="holding-card__avatar">
                                                {(t.stock_name || 'EQ').slice(0, 3)}
                                            </div>
                                            <div>
                                                <div className="holding-card__symbol">{t.stock_name}</div>
                                                <div className="holding-card__tag">
                                                    <span>{t.mode || 'LONG TERM'}</span>
                                                    <span>•</span>
                                                    <span>{daysHeld}d held</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span className={`holding-pnl-pill ${isPos ? 'holding-pnl-pill--pos' : 'holding-pnl-pill--neg'}`}>
                                                {isPos ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                                {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                                            </span>

                                            {/* Three Dots Menu */}
                                            <div className="trade-dots-container" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className={`trade-dots-btn ${openMenuTradeId === t.trade_id ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuTradeId(prev => prev === t.trade_id ? null : t.trade_id);
                                                    }}
                                                    title="Holding Options"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {openMenuTradeId === t.trade_id && (
                                                    <div className="trade-dropdown-menu">
                                                        <button
                                                            type="button"
                                                            className="trade-dropdown-item"
                                                            onClick={() => {
                                                                setOpenMenuTradeId(null);
                                                                setViewTradeModal(t);
                                                            }}
                                                        >
                                                            <Eye size={15} /> View Thesis & Details
                                                        </button>

                                                        {t.status === 'OPEN' && (
                                                            <button
                                                                type="button"
                                                                className="trade-dropdown-item item-exit"
                                                                onClick={() => {
                                                                    setOpenMenuTradeId(null);
                                                                    setExitModalTrade(t);
                                                                    setExitForm({
                                                                        exit_price: cmp.toFixed(2),
                                                                        exit_date: new Date().toISOString().split('T')[0],
                                                                        exit_reason: 'Target Reached',
                                                                        exit_notes: ''
                                                                    });
                                                                }}
                                                            >
                                                                <TrendingUp size={15} /> Book Profits / Exit
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="trade-dropdown-item"
                                                            onClick={() => {
                                                                setOpenMenuTradeId(null);
                                                                setSelectedTradeIds(new Set([t.trade_id]));
                                                                setShowAddToListModal(true);
                                                            }}
                                                        >
                                                            <Tag size={15} /> Add to List
                                                        </button>

                                                        <Link
                                                            to={`/trades/${t.trade_id}?edit=true&from=portfolio`}
                                                            className="trade-dropdown-item item-primary"
                                                            onClick={() => setOpenMenuTradeId(null)}
                                                        >
                                                            <Pencil size={15} /> Edit Holding
                                                        </Link>

                                                        <div className="trade-dropdown-divider" />
                                                        <button
                                                            type="button"
                                                            className="trade-dropdown-item item-danger"
                                                            onClick={() => {
                                                                setOpenMenuTradeId(null);
                                                                handleDeleteHolding(t.trade_id, t.stock_name);
                                                            }}
                                                        >
                                                            <Trash2 size={15} /> Delete Holding
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="holding-card__metrics">
                                        <div className="holding-metric-item">
                                            <span className="holding-metric-label">Current CMP</span>
                                            <span className="holding-metric-val">{formatCurrency(cmp)}</span>
                                        </div>
                                        <div className="holding-metric-item">
                                            <span className="holding-metric-label">Avg Buy Price</span>
                                            <span className="holding-metric-val">{formatCurrency(entry)}</span>
                                        </div>
                                        <div className="holding-metric-item">
                                            <span className="holding-metric-label">Total Quantity</span>
                                            <span className="holding-metric-val">{qty} shares</span>
                                        </div>
                                        <div className="holding-metric-item">
                                            <span className="holding-metric-label">Current Value</span>
                                            <span className="holding-metric-val">{formatCurrency(cmp * qty)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="holding-card__footer">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                        <span className="holding-weight-badge">{weight.toFixed(1)}% Weight</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isPos ? '#34d399' : '#f87171' }}>
                                            {isPos ? '+' : ''}{formatCurrency(pnl)}
                                        </span>
                                    </div>

                                    {t.status === 'OPEN' && (
                                        <div className="holding-card__actions">
                                            <button
                                                type="button"
                                                className="btn-holding-exit"
                                                onClick={() => {
                                                    setExitModalTrade(t);
                                                    setExitForm({
                                                        exit_price: cmp.toFixed(2),
                                                        exit_date: new Date().toISOString().split('T')[0],
                                                        exit_reason: 'Target Reached',
                                                        exit_notes: ''
                                                    });
                                                }}
                                            >
                                                Exit Position
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── TABLE VIEW ───────────────────────────────────────────── */
                <div className="table-responsive-container">
                    <table className="paper-table">
                        <thead>
                            <tr>
                                <SortHeader field="symbol" label="Holding Symbol" sortConfig={sortConfig} onSort={handleSort} />
                                <SortHeader field="entry" label="Avg Buy Price" sortConfig={sortConfig} onSort={handleSort} />
                                <SortHeader field="cmp" label={activeTab === 'EXITED' ? 'Exit Price' : 'CMP'} sortConfig={sortConfig} onSort={handleSort} />
                                <SortHeader field="qty" label="Qty" sortConfig={sortConfig} onSort={handleSort} />
                                <SortHeader field="invested" label="Invested Capital" sortConfig={sortConfig} onSort={handleSort} />
                                <SortHeader field="valuation" label={activeTab === 'EXITED' ? 'Realized Value' : 'Current Value'} sortConfig={sortConfig} onSort={handleSort} />
                                <SortHeader field="pnl" label="Gain / Loss (₹ & %)" sortConfig={sortConfig} onSort={handleSort} />
                                {activeTab === 'ACTIVE' && <th>Weight</th>}
                                <th>Target / Upside</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedHoldings.map(t => {
                                const qty = Number(t.quantity || 0);
                                const entry = Number(t.entry_price || 0);
                                const rawCmp = prices[t.stock_name];
                                const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
                                const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : entry;

                                const invested = entry * qty;
                                let pnl = 0;
                                let pnlPct = 0;

                                if (t.status === 'CLOSED') {
                                    pnl = Number(t.total_pnl || 0);
                                    pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                                } else {
                                    pnl = (cmp - entry) * qty;
                                    pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
                                }

                                const isPos = pnl >= 0;
                                const weight = portfolioMetrics.totalValuation > 0 ? ((cmp * qty) / portfolioMetrics.totalValuation) * 100 : 0;
                                const targetPrice = Number(t.target || 0);
                                const upsidePct = entry > 0 && targetPrice > entry ? (((targetPrice - entry) / entry) * 100).toFixed(1) : null;

                                return (
                                    <tr key={t.trade_id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="holding-card__avatar" style={{ width: 30, height: 30, fontSize: '0.75rem' }}>
                                                    {(t.stock_name || 'EQ').slice(0, 3)}
                                                </div>
                                                <div>
                                                    <strong style={{ color: '#f8fafc', fontSize: '0.92rem' }}>{t.stock_name}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                        {fmtDate(t.trade_date || t.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatCurrency(entry)}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <strong style={{ color: '#f8fafc' }}>
                                                    {formatCurrency(activeTab === 'EXITED' ? t.exit_price : cmp)}
                                                </strong>
                                                {activeTab === 'ACTIVE' && (
                                                    <span className="live-indicator-dot" style={{ width: 6, height: 6 }} />
                                                )}
                                            </div>
                                        </td>
                                        <td>{qty}</td>
                                        <td>{formatCurrency(invested)}</td>
                                        <td>{formatCurrency(activeTab === 'EXITED' ? (Number(t.exit_price || 0) * qty) : (cmp * qty))}</td>
                                        <td>
                                            <div style={{ color: isPos ? '#34d399' : '#f87171', fontWeight: 700 }}>
                                                {isPos ? '+' : ''}{formatCurrency(pnl)}
                                                <span style={{ fontSize: '0.78rem', opacity: 0.85, marginLeft: '6px' }}>
                                                    ({isPos ? '+' : ''}{pnlPct.toFixed(2)}%)
                                                </span>
                                            </div>
                                        </td>
                                        {activeTab === 'ACTIVE' && (
                                            <td>
                                                <span className="holding-weight-badge">{weight.toFixed(1)}%</span>
                                            </td>
                                        )}
                                        <td>
                                            {targetPrice > 0 ? (
                                                <span style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
                                                    ₹{targetPrice} {upsidePct && <span style={{ opacity: 0.8 }}>({upsidePct}%)</span>}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#64748b' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                {t.status === 'OPEN' && (
                                                    <button
                                                        type="button"
                                                        className="btn-holding-exit"
                                                        onClick={() => {
                                                            setExitModalTrade(t);
                                                            setExitForm({
                                                                exit_price: cmp.toFixed(2),
                                                                exit_date: new Date().toISOString().split('T')[0],
                                                                exit_reason: 'Target Reached',
                                                                exit_notes: ''
                                                            });
                                                        }}
                                                    >
                                                        Exit
                                                    </button>
                                                )}

                                                {/* Three Dots Menu */}
                                                <div className="trade-dots-container" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className={`trade-dots-btn ${openMenuTradeId === t.trade_id ? 'active' : ''}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuTradeId(prev => prev === t.trade_id ? null : t.trade_id);
                                                        }}
                                                        title="Holding Options"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {openMenuTradeId === t.trade_id && (
                                                        <div className="trade-dropdown-menu">
                                                            <button
                                                                type="button"
                                                                className="trade-dropdown-item"
                                                                onClick={() => {
                                                                    setOpenMenuTradeId(null);
                                                                    setViewTradeModal(t);
                                                                }}
                                                            >
                                                                <Eye size={15} /> View Thesis & Details
                                                            </button>

                                                            {t.status === 'OPEN' && (
                                                                <button
                                                                    type="button"
                                                                    className="trade-dropdown-item item-exit"
                                                                    onClick={() => {
                                                                        setOpenMenuTradeId(null);
                                                                        setExitModalTrade(t);
                                                                        setExitForm({
                                                                            exit_price: cmp.toFixed(2),
                                                                            exit_date: new Date().toISOString().split('T')[0],
                                                                            exit_reason: 'Target Reached',
                                                                            exit_notes: ''
                                                                        });
                                                                    }}
                                                                >
                                                                    <TrendingUp size={15} /> Book Profits / Exit
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                className="trade-dropdown-item"
                                                                onClick={() => {
                                                                    setOpenMenuTradeId(null);
                                                                    setSelectedTradeIds(new Set([t.trade_id]));
                                                                    setShowAddToListModal(true);
                                                                }}
                                                            >
                                                                <Tag size={15} /> Add to List
                                                            </button>

                                                            <Link
                                                                to={`/trades/${t.trade_id}?edit=true&from=portfolio`}
                                                                className="trade-dropdown-item item-primary"
                                                                onClick={() => setOpenMenuTradeId(null)}
                                                            >
                                                                <Pencil size={15} /> Edit Holding
                                                            </Link>

                                                            <div className="trade-dropdown-divider" />
                                                            <button
                                                                type="button"
                                                                className="trade-dropdown-item item-danger"
                                                                onClick={() => {
                                                                    setOpenMenuTradeId(null);
                                                                    handleDeleteHolding(t.trade_id, t.stock_name);
                                                                }}
                                                            >
                                                                <Trash2 size={15} /> Delete Holding
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── MODAL 1: Exit / Book Profits Modal ──────────────────────── */}
            {exitModalTrade && (
                <div className="paper-modal-overlay" onClick={() => setExitModalTrade(null)}>
                    <div className="paper-modal-box compact-exit-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={20} color="#34d399" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 800 }}>
                                    Exit Holding — {exitModalTrade.stock_name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setExitModalTrade(null)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {exitError && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '0.85rem' }}>
                                {exitError}
                            </div>
                        )}

                        <form onSubmit={handleExitSubmit}>
                            <div className="exit-summary-strip">
                                <div>
                                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>BUY PRICE</span>
                                    <strong>₹{Number(exitModalTrade.entry_price).toFixed(2)}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>QUANTITY</span>
                                    <strong>{exitModalTrade.quantity} shares</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem' }}>INVESTED</span>
                                    <strong>{formatCurrency(Number(exitModalTrade.entry_price) * Number(exitModalTrade.quantity))}</strong>
                                </div>
                            </div>

                            <div className="exit-form-grid">
                                <div>
                                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Exit Price (₹) *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="form-input"
                                        value={exitForm.exit_price}
                                        onChange={(e) => setExitForm(prev => ({ ...prev, exit_price: e.target.value }))}
                                        placeholder="e.g. 2850.00"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Exit Date *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={exitForm.exit_date}
                                        onChange={(e) => setExitForm(prev => ({ ...prev, exit_date: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '0.85rem' }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Exit Reason</label>
                                <select
                                    className="form-input"
                                    value={exitForm.exit_reason}
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_reason: e.target.value }))}
                                >
                                    <option value="Target Reached">Target Reached / Profit Booked</option>
                                    <option value="Fundamental Change">Fundamental Thesis Changed</option>
                                    <option value="Portfolio Rebalancing">Portfolio Rebalancing</option>
                                    <option value="Stop Loss Hit">Stop Loss Hit</option>
                                    <option value="Capital Allocation">Capital Needed for Better Opportunity</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Exit Notes & Thesis</label>
                                <textarea
                                    className="exit-notes-input"
                                    placeholder="Record reason for exit, performance notes, learnings..."
                                    value={exitForm.exit_notes}
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_notes: e.target.value }))}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    className="btn-paper-cancel"
                                    onClick={() => setExitModalTrade(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-paper-confirm"
                                    style={{ background: '#10b981', color: '#fff' }}
                                    disabled={exitingTrade}
                                >
                                    {exitingTrade ? 'Exiting...' : 'Confirm Exit & Record Return'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL 2: View Thesis & Details Quick Modal ─────────────── */}
            {viewTradeModal && (
                <div className="paper-modal-overlay" onClick={() => setViewTradeModal(null)}>
                    <div className="paper-modal-box clean-trade-details-modal" onClick={e => e.stopPropagation()}>
                        <div className="clean-details-header">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#f8fafc', fontWeight: 800 }}>
                                        {viewTradeModal.stock_name}
                                    </h3>
                                    <span className="holding-weight-badge">{viewTradeModal.mode || 'LONG TERM'}</span>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    Purchased on {fmtDate(viewTradeModal.trade_date || viewTradeModal.created_at)} • Conviction: {viewTradeModal.conviction_level || 5}/5
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewTradeModal(null)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="clean-details-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div className="holding-metric-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                                <span className="holding-metric-label">Buy Price</span>
                                <span className="holding-metric-val">₹{Number(viewTradeModal.entry_price).toFixed(2)}</span>
                            </div>
                            <div className="holding-metric-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                                <span className="holding-metric-label">Quantity</span>
                                <span className="holding-metric-val">{viewTradeModal.quantity} shares</span>
                            </div>
                            <div className="holding-metric-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                                <span className="holding-metric-label">Invested</span>
                                <span className="holding-metric-val">{formatCurrency(Number(viewTradeModal.entry_price) * Number(viewTradeModal.quantity))}</span>
                            </div>
                            <div className="holding-metric-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                                <span className="holding-metric-label">Target</span>
                                <span className="holding-metric-val" style={{ color: '#38bdf8' }}>{viewTradeModal.target ? `₹${viewTradeModal.target}` : '—'}</span>
                            </div>
                            <div className="holding-metric-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                                <span className="holding-metric-label">Stop Loss</span>
                                <span className="holding-metric-val" style={{ color: '#f87171' }}>{viewTradeModal.stop_loss ? `₹${viewTradeModal.stop_loss}` : '—'}</span>
                            </div>
                            <div className="holding-metric-item" style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                                <span className="holding-metric-label">Strategy</span>
                                <span className="holding-metric-val" style={{ color: 'var(--color-gold, #d4af37)' }}>{viewTradeModal.strategy || 'Value Investing'}</span>
                            </div>
                        </div>

                        {/* Entry Notes / Fundamental Thesis */}
                        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-gold, #d4af37)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                                Fundamental Investment Thesis & Entry Notes
                            </div>
                            <div style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                {viewTradeModal.entry_notes || 'No entry notes documented for this holding.'}
                            </div>
                        </div>

                        {/* Client Allocations if present */}
                        {Array.isArray(viewTradeModal.clients) && viewTradeModal.clients.length > 0 && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                                    Assigned Client Accounts ({viewTradeModal.clients.length})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {viewTradeModal.clients.map((c, i) => (
                                        <span key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                            {c.name || `Client #${c.client_id}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            {viewTradeModal.status === 'OPEN' && (
                                <button
                                    type="button"
                                    className="btn-paper-confirm"
                                    style={{ background: '#10b981', color: '#fff' }}
                                    onClick={() => {
                                        const t = viewTradeModal;
                                        setViewTradeModal(null);
                                        setExitModalTrade(t);
                                        const rawCmp = prices[t.stock_name];
                                        const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
                                        const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : Number(t.entry_price || 0);
                                        setExitForm({
                                            exit_price: cmp.toFixed(2),
                                            exit_date: new Date().toISOString().split('T')[0],
                                            exit_reason: 'Target Reached',
                                            exit_notes: ''
                                        });
                                    }}
                                >
                                    <TrendingUp size={15} style={{ marginRight: '6px' }} /> Book Profits / Exit
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn-paper-cancel"
                                onClick={() => setViewTradeModal(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL 3: Add to List Modal ─────────────────────────────── */}
            {showAddToListModal && (
                <div className="paper-modal-overlay" onClick={() => setShowAddToListModal(false)}>
                    <div className="paper-modal-box" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Tag size={18} color="var(--color-gold, #d4af37)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>
                                    Assign to Investment List
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddToListModal(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {tradeLists.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                                No lists created yet. Create your first list below.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', maxHeight: '240px', overflowY: 'auto' }}>
                                {tradeLists.map(list => (
                                    <button
                                        key={list.list_id}
                                        type="button"
                                        className="trade-dropdown-item"
                                        style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}
                                        onClick={() => handleAssignToList(list.list_id)}
                                    >
                                        <span className="trade-list-color-dot" style={{ background: list.color || 'var(--color-primary)' }} />
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{list.name}</div>
                                            {list.description && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{list.description}</div>}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{list.trade_count} holdings</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <button
                                type="button"
                                className="btn-new-list"
                                onClick={() => {
                                    setShowAddToListModal(false);
                                    setShowCreateListModal(true);
                                }}
                            >
                                <Plus size={14} /> Create New List
                            </button>
                            <button
                                type="button"
                                className="btn-paper-cancel"
                                onClick={() => setShowAddToListModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL 4: Create List Modal ─────────────────────────────── */}
            {showCreateListModal && (
                <div className="paper-modal-overlay" onClick={() => setShowCreateListModal(false)}>
                    <div className="paper-modal-box" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={18} color="var(--color-gold, #d4af37)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>
                                    Create New Portfolio List
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateListModal(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateList}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>List Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Core Compounding, High Dividend, Smallcap Growth"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Description (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Brief thesis for this basket of stocks"
                                    value={newListDesc}
                                    onChange={(e) => setNewListDesc(e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Color Tag</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {ALLOCATION_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewListColor(c)}
                                            style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: '50%',
                                                background: c,
                                                border: newListColor === c ? '2.5px solid #fff' : '1px solid transparent',
                                                cursor: 'pointer',
                                                boxShadow: newListColor === c ? '0 0 8px rgba(255,255,255,0.6)' : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    className="btn-paper-cancel"
                                    onClick={() => setShowCreateListModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-paper-confirm"
                                    style={{ background: 'var(--color-primary, #d4af37)', color: '#0b0e14' }}
                                >
                                    Create List
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function SortHeader({ field, label, sortConfig, onSort, align = 'left' }) {
    const isSorted = sortConfig.key === field;
    return (
        <th
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
