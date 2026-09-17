import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useConfirm } from '../../context/ConfirmContext';
import { Dices, Briefcase, Coins, Rocket, Landmark, TrendingUp, Zap, Target, Shield, Flame, Scale, Microscope, ScrollText, Globe, Plus, RefreshCw, X, Trash2 } from 'lucide-react';
import './PaperTrade.css';

const STRATEGY_OPTIONS = [
    'Breakout Trading',
    'Reversal / Bottom Fishing',
    'Momentum / Trend Following',
    'Value Investing',
    'Growth Stock Conviction',
    'Swing Swing / EMA Bounce',
    'Experimental / Thesis Testing'
];

export default function PaperTrade() {
    const confirm = useConfirm();
    const navigate = useNavigate();
    
    // Core state
    const [summary, setSummary] = useState({
        available_cash: 0,
        total_added_capital: 0,
        invested_capital: 0,
        open_trades_count: 0,
        closed_trades_count: 0,
        realized_pnl: 0,
        total_portfolio_value: 0
    });
    const [trades, setTrades] = useState([]);
    const [prices, setPrices] = useState({});
    const [priceDetails, setPriceDetails] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('TRADING'); // 'TRADING' | 'INVESTMENT' | 'CLOSED' | 'ALL'

    // UI Toggle state
    const [showFundsModal, setShowFundsModal] = useState(false);
    const [exitTradeModal, setExitTradeModal] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Fund Management form
    const [fundForm, setFundForm] = useState({ amount: 500000, action: 'ADD' });
    const [fundMessage, setFundMessage] = useState('');

    // Exit Trade form
    const [exitForm, setExitForm] = useState({
        exit_price: '',
        exit_reason: 'Profit Target Reached / Thesis Played Out',
        exit_date: new Date().toISOString().split('T')[0]
    });

    // Fetch account summary and trades
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [summaryRes, tradesRes] = await Promise.all([
                api.get('/paper-trades/summary'),
                api.get('/paper-trades')
            ]);
            if (summaryRes.data.success) {
                setSummary(summaryRes.data.data);
            }
            if (tradesRes.data.success) {
                setTrades(tradesRes.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load paper trading data:', err);
            setError('Could not load Paper Trading dashboard. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Live Prices & Unrealized PnL polling for OPEN trades
    useEffect(() => {
        const openTrades = trades.filter(t => t.status === 'OPEN');
        if (openTrades.length === 0) {
            setPrices({});
            return;
        }
        const uniqueSymbols = [...new Set(openTrades.map(t => t.stock_name))];

        const fetchLivePrices = async () => {
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
                console.error('Failed to fetch live quotes for paper trades:', err);
            }
        };
        
        fetchLivePrices();
        const intervalId = setInterval(fetchLivePrices, 20000); // refresh every 20s
        return () => clearInterval(intervalId);
    }, [trades]);

    // Compute live unrealized metrics
    const liveMetrics = useMemo(() => {
        let totalUnrealizedPnl = 0;
        let activeInvested = 0;
        let totalClosedCost = 0;

        trades.filter(t => t.status === 'OPEN').forEach(t => {
            const invested = Number(t.entry_price) * Number(t.quantity);
            activeInvested += invested;
            const currentPrice = prices[t.stock_name];
            if (currentPrice !== undefined && !isNaN(currentPrice)) {
                // Buy side only P&L: (Current Price - Entry Price) * Quantity
                const pnl = (currentPrice - Number(t.entry_price)) * Number(t.quantity);
                totalUnrealizedPnl += pnl;
            }
        });

        trades.filter(t => t.status === 'CLOSED').forEach(t => {
            totalClosedCost += Number(t.entry_price) * Number(t.quantity);
        });

        const liveNetWorth = Number(summary.available_cash) + activeInvested + totalUnrealizedPnl;
        const unrealizedPnlPct = activeInvested > 0 ? (totalUnrealizedPnl / activeInvested) * 100 : 0;
        const totalReturnPct = Number(summary.total_added_capital) > 0 ? ((liveNetWorth - Number(summary.total_added_capital)) / Number(summary.total_added_capital)) * 100 : 0;
        const realizedPnlPct = totalClosedCost > 0 ? (Number(summary.realized_pnl) / totalClosedCost) * 100 : 0;

        return {
            unrealizedPnl: totalUnrealizedPnl,
            unrealizedPnlPct,
            activeInvested,
            liveNetWorth,
            totalReturnPct,
            totalClosedCost,
            realizedPnlPct
        };
    }, [trades, prices, summary]);

    // Fund management submission
    const handleFundsSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFundMessage('');
        try {
            const { data } = await api.post('/paper-trades/funds', fundForm);
            if (data.success) {
                setFundMessage(data.message || 'Funds updated successfully!');
                fetchData();
                setTimeout(() => {
                    setShowFundsModal(false);
                    setFundMessage('');
                }, 1500);
            }
        } catch (err) {
            setFundMessage(err.response?.data?.message || 'Error managing funds');
        } finally {
            setSubmitting(false);
        }
    };


    // Exit Trade submission
    const handleExitSubmit = async (e) => {
        e.preventDefault();
        if (!exitForm.exit_price) return;
        setSubmitting(true);
        try {
            const { data } = await api.patch(`/paper-trades/${exitTradeModal.trade_id}/exit`, exitForm);
            if (data.success) {
                setExitTradeModal(null);
                fetchData();
            }
        } catch (err) {
            confirm({ title: 'Error', message: err.response?.data?.message || 'Failed to close paper trade', variant: 'danger', alertOnly: true });
        } finally {
            setSubmitting(false);
        }
    };

    // Delete trade helper
    const handleDeleteTrade = (t) => {
        confirm({
            title: 'Delete Simulated Trade?',
            message: `Are you sure you want to completely remove this practice record for ${t.stock_name}? Any simulated cash consumed will be refunded to your virtual wallet.`,
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.delete(`/paper-trades/${t.trade_id}`);
                    fetchData();
                } catch {
                    confirm({ title: 'Error', message: 'Failed to delete paper trade', variant: 'danger', alertOnly: true });
                }
            }
        });
    };

    // Convert position category between Active Trading and Long-Term Conviction
    const handleCategorySwitch = async (trade) => {
        const newType = trade.holding_type === 'INVESTMENT' ? 'TRADING' : 'INVESTMENT';
        try {
            await api.patch(`/paper-trades/${trade.trade_id}/category`, { holding_type: newType });
            setTrades(prev => prev.map(t => t.trade_id === trade.trade_id ? { ...t, holding_type: newType } : t));
        } catch (err) {
            confirm({ title: 'Error', message: err.response?.data?.message || 'Failed to switch position category', variant: 'danger', alertOnly: true });
        }
    };

    // Filter trades based on active tab
    const filteredTrades = useMemo(() => {
        if (activeTab === 'TRADING') return trades.filter(t => t.status === 'OPEN' && t.holding_type === 'TRADING');
        if (activeTab === 'INVESTMENT') return trades.filter(t => t.status === 'OPEN' && t.holding_type === 'INVESTMENT');
        if (activeTab === 'CLOSED') return trades.filter(t => t.status === 'CLOSED');
        return trades.filter(t => t.status === 'OPEN');
    }, [trades, activeTab]);

    const formatCurrency = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '₹0';
        return `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };

    const formatPct = (pnl, cost) => {
        if (!cost || cost <= 0 || isNaN(pnl)) return '0.00%';
        const pct = (pnl / cost) * 100;
        return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
    };

    return (
        <div className="page paper-trade-container">
            {/* Hero & Title Banner */}
            <header className="page__header" style={{ alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                <div>
                    <h1 className="page__title" style={{ marginBottom: '0.4rem' }}>
                        Paper Trading & Conviction Portfolio
                    </h1>
                    <p className="page__subtitle" style={{ lineHeight: '1.6', maxWidth: '800px' }}>
                        Test high-conviction trade ideas, fine-tune strategies without capital risk, and manage your long-term practice portfolio with real-time unrealized P&L tracking.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="btn-paper-action btn-add-funds" onClick={() => setShowFundsModal(true)}>
                        <span><Coins size={18} /></span> + Manage Virtual Funds
                    </button>
                    <button 
                        className="btn-paper-action btn-new-trade" 
                        onClick={() => navigate('/paper-trade/open')}
                    >
                        <span><Rocket size={16} style={{marginRight: '6px'}}/> Open Buy Position</span>
                    </button>
                </div>
            </header>

            {error && (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            {/* Top Summary KPI Cards */}
            <div className="kpi-grid">
                {/* Card 1: Total Net Worth */}
                <div className="kpi-card kpi-card--networth">
                    <div>
                        <div className="kpi-header">
                            <span className="kpi-label">Simulated Net Worth</span>
                            <span className="kpi-icon"><Landmark size={24} /></span>
                        </div>
                        <div className="kpi-value" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span>{formatCurrency(liveMetrics.liveNetWorth)}</span>
                            {Number(summary.total_added_capital) > 0 && (
                                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: liveMetrics.totalReturnPct >= 0 ? '#34d399' : '#f87171', background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                                    {liveMetrics.totalReturnPct >= 0 ? '+' : ''}{liveMetrics.totalReturnPct.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="kpi-subtext">
                        <span>Total Available Cash + Open Positions Value</span>
                    </div>
                </div>

                {/* Card 2: Available Virtual Cash */}
                <div className="kpi-card kpi-card--cash">
                    <div>
                        <div className="kpi-header">
                            <span className="kpi-label">Available Virtual Cash</span>
                            <span className="kpi-icon"><Coins size={24} /></span>
                        </div>
                        <div className="kpi-value" style={{ color: '#34d399' }}>{formatCurrency(summary.available_cash)}</div>
                    </div>
                    <div className="kpi-subtext">
                        <span>Total Seeded: {formatCurrency(summary.total_added_capital)}</span>
                    </div>
                </div>

                {/* Card 3: Invested Capital */}
                <div className="kpi-card">
                    <div>
                        <div className="kpi-header">
                            <span className="kpi-label">Deployed Capital (Open)</span>
                            <span className="kpi-icon"><TrendingUp size={24} /></span>
                        </div>
                        <div className="kpi-value">{formatCurrency(liveMetrics.activeInvested)}</div>
                    </div>
                    <div className="kpi-subtext">
                        <span>{summary.open_trades_count} Active Open Positions</span>
                    </div>
                </div>

                {/* Card 4: Live & Realized Performance */}
                <div className="kpi-card">
                    <div>
                        <div className="kpi-header">
                            <span className="kpi-label">Live Unrealized P&L</span>
                            <span className="kpi-icon"><Zap size={24} /></span>
                        </div>
                        <div 
                            className="kpi-value" 
                            style={{ color: liveMetrics.unrealizedPnl > 0 ? '#34d399' : liveMetrics.unrealizedPnl < 0 ? '#f87171' : '#cbd5e1', display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}
                        >
                            <span>{liveMetrics.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(liveMetrics.unrealizedPnl)}</span>
                            {liveMetrics.activeInvested > 0 && (
                                <span style={{ fontSize: '1.15rem', fontWeight: 700, background: liveMetrics.unrealizedPnl >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', padding: '0.15rem 0.6rem', borderRadius: '8px', border: `1px solid ${liveMetrics.unrealizedPnl >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
                                    {liveMetrics.unrealizedPnl >= 0 ? '+' : ''}{liveMetrics.unrealizedPnlPct.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="kpi-subtext" style={{ marginTop: '0.4rem', flexWrap: 'wrap' }}>
                        <span className={`pnl-badge ${summary.realized_pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`} style={{ fontWeight: 700 }}>
                            Realized: {summary.realized_pnl >= 0 ? '+' : ''}{formatCurrency(summary.realized_pnl)} {liveMetrics.totalClosedCost > 0 ? `(${summary.realized_pnl >= 0 ? '+' : ''}${liveMetrics.realizedPnlPct.toFixed(2)}%)` : ''}
                        </span>
                        <span>({summary.closed_trades_count} Closed)</span>
                    </div>
                </div>
            </div>



            {/* Main Workspace Navigation Bar */}
            <div className="workspace-section">
                <div className="workspace-nav-bar">
                    <div className="tab-group">
                        <button 
                            className={`paper-tab-btn ${activeTab === 'TRADING' ? 'active' : ''}`}
                            onClick={() => setActiveTab('TRADING')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} /> Active Trading</span>
                            <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                                ({trades.filter(t => t.status === 'OPEN' && t.holding_type === 'TRADING').length})
                            </span>
                        </button>
                        <button 
                            className={`paper-tab-btn ${activeTab === 'INVESTMENT' ? 'active-green' : ''}`}
                            onClick={() => setActiveTab('INVESTMENT')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} /> Long-Term Portfolio</span>
                            <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                                ({trades.filter(t => t.status === 'OPEN' && t.holding_type === 'INVESTMENT').length})
                            </span>
                        </button>
                        <button 
                            className={`paper-tab-btn ${activeTab === 'CLOSED' ? 'active' : ''}`}
                            onClick={() => setActiveTab('CLOSED')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ScrollText size={16} /> Historical Journal Log</span>
                            <span style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                                ({trades.filter(t => t.status === 'CLOSED').length})
                            </span>
                        </button>
                        <button 
                            className={`paper-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ALL')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={16} /> All Open Positions</span>
                        </button>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        <span className="live-indicator-dot"></span>
                        Live prices syncing via Watchlist API
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8', fontSize: '1.1rem' }}>
                        ⏳ Synchronizing simulated positions & fetching live market quotes...
                    </div>
                ) : filteredTrades.length === 0 ? (
                    <div className="empty-state-box">
                        <div className="empty-state-icon">
                            {activeTab === 'INVESTMENT' ? <Shield size={16} /> : activeTab === 'CLOSED' ? <ScrollText size={16} /> : <Target size={16} />}
                        </div>
                        <h4>No {activeTab === 'INVESTMENT' ? 'Long-Term Investments' : activeTab === 'CLOSED' ? 'Closed Practice Trades' : 'Active Practice Trades'} Yet</h4>
                        <p>
                            {activeTab === 'INVESTMENT' 
                                ? 'Build your simulated dream conviction portfolio without taking capital risk. Click "+ Open Buy Position" above and choose "Long-Term Conviction Investment".'
                                : activeTab === 'CLOSED'
                                ? 'When you exit or lock in profits on your practice trades, they will be preserved here in your professional simulated trading log.'
                                : 'Take advantage of simulated capital! Practice breakout setups, test your market timing, and watch your unrealized profit & loss live.'}
                        </p>
                        {activeTab !== 'CLOSED' && (
                            <button className="btn-paper-action btn-new-trade" onClick={() => setShowOrderPad(true)}>
                                + Place First Simulated Order
                            </button>
                        )}
                    </div>
                ) : (
                    /* Display Positions */
                    activeTab === 'INVESTMENT' && filteredTrades.length > 0 ? (
                        /* Dedicated Portfolio Cards Breakdown View */
                        <div className="portfolio-grid">
                            {filteredTrades.map(t => {
                                const cost = Number(t.entry_price) * Number(t.quantity);
                                const cmp = prices[t.stock_name] ?? Number(t.entry_price);
                                const pnl = (cmp - Number(t.entry_price)) * Number(t.quantity);
                                const pnlPct = (pnl / cost) * 100;
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
                                                        title="Click to switch to Active Trading (Intraday/Swing)"
                                                    >
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} /> Long-Term Conviction</span>
                                                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>⇄</span>
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: isPos ? '#34d399' : '#f87171' }}>
                                                    {isPos ? '+' : ''}{formatCurrency(pnl)}
                                                </span>
                                            </div>

                                            <div className="asset-metrics">
                                                <div>
                                                    <div className="metric-item-label">Current Price</div>
                                                    <div className="metric-item-val" style={{ color: prices[t.stock_name] ? '#38bdf8' : '#e2e8f0' }}>
                                                        ₹{cmp.toFixed(2)}
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
                                                    <div className="metric-item-val">₹{Number(t.entry_price).toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div className="metric-item-label">Holding Size</div>
                                                    <div className="metric-item-val">{t.quantity} Shares ({formatCurrency(cost)})</div>
                                                </div>
                                            </div>

                                            {t.notes && (
                                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', background: 'rgba(0,0,0,0.15)', padding: '0.65rem 0.8rem', borderRadius: '8px', marginBottom: '1.25rem', borderLeft: '3px solid #10b981', fontStyle: 'italic' }}>
                                                    "{t.notes}"
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: 'auto' }}>
                                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                                Added: {new Date(t.trade_date || t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                <button 
                                                    className="table-btn-action"
                                                    style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '0.35rem 0.6rem', cursor: 'pointer' }}
                                                    onClick={() => handleCategorySwitch(t)}
                                                    title="Convert to Active Trading (Intraday/Swing)"
                                                >
                                                    Convert to Swing
                                                </button>
                                                <button 
                                                    className="table-btn-action btn-exit-trade"
                                                    onClick={() => {
                                                        setExitForm(prev => ({ ...prev, exit_price: prices[t.stock_name]?.toFixed(2) || Number(t.entry_price).toFixed(2) }));
                                                        setExitTradeModal(t);
                                                    }}
                                                >
                                                    Book Profits / Exit
                                                </button>
                                                <button className="btn-delete-icon" onClick={() => handleDeleteTrade(t)} title="Delete Record">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Table View for Active Trades, Closed Log, or All */
                        <div className="table-responsive-container">
                            <table className="paper-table">
                                <thead>
                                    <tr>
                                        <th>Stock Symbol</th>
                                        <th>Category</th>
                                        <th>Entry Price</th>
                                        <th>Qty & Cost</th>
                                        {activeTab === 'CLOSED' ? (
                                            <>
                                                <th>Exit Price</th>
                                                <th>Exit Date</th>
                                                <th>Realized P&L</th>
                                                <th>Exit Reason</th>
                                            </>
                                        ) : (
                                            <>
                                                <th>Current Price (CMP)</th>
                                                <th>Live Unrealized P&L</th>
                                                <th>Target & Stop</th>
                                                <th>Strategy / Conviction</th>
                                            </>
                                        )}
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTrades.map(t => {
                                        const cost = Number(t.entry_price) * Number(t.quantity);
                                        const cmp = prices[t.stock_name] ?? (t.status === 'CLOSED' ? Number(t.exit_price) : Number(t.entry_price));
                                        const pnl = t.status === 'CLOSED' ? Number(t.realized_pnl) : (cmp - Number(t.entry_price)) * Number(t.quantity);
                                        const pnlPct = (pnl / cost) * 100;
                                        const isPos = pnl >= 0;

                                        return (
                                            <tr key={t.trade_id}>
                                                <td data-label="Stock Symbol">
                                                    <div className="symbol-badge-cell">
                                                        <span className="symbol-ticker">{t.stock_name}</span>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                            {new Date(t.trade_date || t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td data-label="Category">
                                                    <div 
                                                        className={`symbol-type-tag ${t.holding_type === 'INVESTMENT' ? 'tag-investment' : 'tag-trading'}`}
                                                        style={{ cursor: t.status === 'OPEN' ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                                        onClick={() => t.status === 'OPEN' && handleCategorySwitch(t)}
                                                        title={t.status === 'OPEN' ? `Click to switch to ${t.holding_type === 'INVESTMENT' ? 'Active Trading (Intraday/Swing)' : 'Long-Term Conviction'}` : 'Closed trade'}
                                                    >
                                                        <span>{t.holding_type === 'INVESTMENT' ? <><Shield size={14} style={{marginRight: '4px', verticalAlign: 'middle'}}/> Investment</> : <><Zap size={14} style={{marginRight: '4px', verticalAlign: 'middle'}}/> Swing/Trading</>}</span>
                                                        {t.status === 'OPEN' && <span style={{ fontSize: '0.8rem', opacity: 0.8 }} title="Click to Switch Category">⇄</span>}
                                                    </div>
                                                </td>
                                                <td data-label="Entry Price" style={{ fontWeight: 600, color: '#f8fafc' }}>
                                                    ₹{Number(t.entry_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td data-label="Qty & Cost">
                                                    <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{t.quantity} qty</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{formatCurrency(cost)}</div>
                                                </td>

                                                {activeTab === 'CLOSED' || t.status === 'CLOSED' ? (
                                                    <>
                                                        <td data-label="Exit Price" style={{ fontWeight: 700, color: '#38bdf8' }}>
                                                            ₹{Number(t.exit_price || 0).toFixed(2)}
                                                        </td>
                                                        <td data-label="Exit Date" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                                            {t.exit_date ? new Date(t.exit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                        </td>
                                                        <td data-label="Realized P&L">
                                                            <span className={`pnl-badge ${isPos ? 'pnl-positive' : 'pnl-negative'}`} style={{ display: 'inline-block', fontSize: '0.9rem', fontWeight: 700 }}>
                                                                {isPos ? '+' : ''}{formatCurrency(pnl)} ({isPos ? '+' : ''}{pnlPct.toFixed(2)}%)
                                                            </span>
                                                        </td>
                                                        <td data-label="Exit Reason" style={{ fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '200px' }}>
                                                            {t.exit_reason || 'Manual closure'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td data-label="Current Price (CMP)">
                                                            <div style={{ fontWeight: 700, color: prices[t.stock_name] ? '#38bdf8' : '#e2e8f0' }}>
                                                                ₹{cmp.toFixed(2)}
                                                            </div>
                                                            {priceDetails[t.stock_name] && typeof priceDetails[t.stock_name] === 'object' && priceDetails[t.stock_name].percentChange !== undefined && (
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: Number(priceDetails[t.stock_name].change) >= 0 ? '#10b981' : '#ef4444' }}>
                                                                    {Number(priceDetails[t.stock_name].change) >= 0 ? '▲' : '▼'} {Math.abs(priceDetails[t.stock_name].percentChange)}%
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td data-label="Live Unrealized P&L">
                                                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: isPos ? '#34d399' : '#f87171' }}>
                                                                {isPos ? '+' : ''}{formatCurrency(pnl)}
                                                            </div>
                                                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isPos ? '#34d399' : '#f87171' }}>
                                                                ({isPos ? '+' : ''}{pnlPct.toFixed(2)}%)
                                                            </div>
                                                        </td>
                                                        <td data-label="Target & Stop">
                                                            <div style={{ fontSize: '0.82rem', color: '#34d399' }}>Tgt: {t.target ? `₹${Number(t.target).toFixed(2)}` : '—'}</div>
                                                            <div style={{ fontSize: '0.82rem', color: '#f87171' }}>SL: {t.stop_loss ? `₹${Number(t.stop_loss).toFixed(2)}` : '—'}</div>
                                                        </td>
                                                        <td data-label="Strategy / Conviction">
                                                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>{t.strategy || 'Conviction'}</div>
                                                            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{t.conviction_level || 'Normal'} Conviction</div>
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
                                                                    title={`Convert position to ${t.holding_type === 'INVESTMENT' ? 'Active Trading (Intraday/Swing)' : 'Long-Term Conviction'}`}
                                                                >
                                                                    {t.holding_type === 'INVESTMENT' ? 'Move to Swing' : 'Move to Long-Term'}
                                                                </button>
                                                                <button 
                                                                    className="table-btn-action btn-exit-trade"
                                                                    onClick={() => {
                                                                        setExitForm(prev => ({ ...prev, exit_price: prices[t.stock_name]?.toFixed(2) || Number(t.entry_price).toFixed(2) }));
                                                                        setExitTradeModal(t);
                                                                    }}
                                                                >
                                                                    Book Profits / Exit
                                                                </button>
                                                            </>
                                                        )}
                                                        <button className="btn-delete-icon" onClick={() => handleDeleteTrade(t)} title="Delete Record">
                                                            <Trash2 size={16} />
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
            </div>

            {/* Fund Management Modal */}
            {showFundsModal && (
                <div className="paper-modal-overlay" onClick={() => setShowFundsModal(false)}>
                    <div className="paper-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><span><Coins size={18} /></span> Manage Virtual Wallet & Funds</h3>
                            <button className="btn-close-pad" onClick={() => setShowFundsModal(false)}><X size={16} /></button>
                        </div>

                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>Current Available Funds:</span>
                                <span style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(summary.available_cash)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>Total Deposited (History):</span>
                                <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{formatCurrency(summary.total_added_capital)}</span>
                            </div>
                        </div>

                        {fundMessage && (
                            <div style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', borderRadius: '10px', marginBottom: '1.25rem', fontWeight: 600 }}>
                                {fundMessage}
                            </div>
                        )}

                        <form onSubmit={handleFundsSubmit}>
                            <div className="form-field-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Action</label>
                                <select 
                                    className="form-select" 
                                    value={fundForm.action} 
                                    onChange={(e) => setFundForm(prev => ({ ...prev, action: e.target.value }))}
                                >
                                    <option value="ADD">Add Virtual Cash to Balance</option>
                                    <option value="RESET">Reset Account to Specific Starting Balance</option>
                                </select>
                            </div>

                            <div className="form-field-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Amount (₹) *</label>
                                <input 
                                    type="number"
                                    min="1000"
                                    step="1000"
                                    className="form-input" 
                                    value={fundForm.amount}
                                    onChange={(e) => setFundForm(prev => ({ ...prev, amount: e.target.value }))}
                                    required
                                />
                                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                    {fundForm.action === 'ADD' 
                                        ? 'This amount will be added to your current available virtual cash.'
                                        : 'Warning: This will set your available virtual cash and total seeded capital exactly to this number.'}
                                </span>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-paper-action btn-secondary" onClick={() => setShowFundsModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-paper-action btn-add-funds" disabled={submitting}>
                                    {submitting ? 'Updating...' : fundForm.action === 'ADD' ? 'Deposit Simulated Funds' : 'Reset Wallet Balance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Exit Trade Modal */}
            {exitTradeModal && (
                <div className="paper-modal-overlay" onClick={() => setExitTradeModal(null)}>
                    <div className="paper-modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} /> Exit Practice Position ({exitTradeModal.stock_name})</h3>
                            <button className="btn-close-pad" onClick={() => setExitTradeModal(null)}><X size={16} /></button>
                        </div>

                        <form onSubmit={handleExitSubmit}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#94a3b8' }}>Entry Price & Qty:</span>
                                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>₹{Number(exitTradeModal.entry_price).toFixed(2)} x {exitTradeModal.quantity}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#94a3b8' }}>Live Quote / CMP:</span>
                                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                                        ₹{(prices[exitTradeModal.stock_name] || Number(exitTradeModal.entry_price)).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="form-field-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Exit Price (₹) *</label>
                                <input 
                                    type="number"
                                    step="0.05"
                                    min="0.05"
                                    className="form-input"
                                    value={exitForm.exit_price}
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_price: e.target.value }))}
                                    required
                                />
                                {exitForm.exit_price && (
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px', color: (Number(exitForm.exit_price) - Number(exitTradeModal.entry_price)) >= 0 ? '#34d399' : '#f87171' }}>
                                        Estimated Realized P&L: {(Number(exitForm.exit_price) - Number(exitTradeModal.entry_price)) >= 0 ? '+' : ''}
                                        {formatCurrency((Number(exitForm.exit_price) - Number(exitTradeModal.entry_price)) * Number(exitTradeModal.quantity))}
                                    </span>
                                )}
                            </div>

                            <div className="form-field-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Exit Date</label>
                                <input 
                                    type="date"
                                    className="form-input"
                                    value={exitForm.exit_date}
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_date: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="form-field-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Exit Reason / Lessons Learned</label>
                                <textarea 
                                    rows="2"
                                    className="form-textarea"
                                    placeholder="Why are you closing this simulated trade? Target achieved, stop loss hit, or thesis changed?"
                                    value={exitForm.exit_reason}
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_reason: e.target.value }))}
                                ></textarea>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-paper-action btn-secondary" onClick={() => setExitTradeModal(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-paper-action btn-exit-trade" style={{ background: '#f59e0b', color: '#0f172a', fontWeight: 700 }} disabled={submitting}>
                                    {submitting ? 'Closing Trade...' : 'Lock In Profits & Settle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
