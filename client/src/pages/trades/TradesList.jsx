import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import {
    TrendingUp, Zap, Target, Scale, Eye, Trash2, RotateCcw,
    Shield, ScrollText, Globe, Rocket, Plus, RefreshCw, X,
    LayoutGrid, Table as TableIcon, Layers, Pencil, Check,
    MoreVertical, Tag, CheckSquare, PieChart, Split, Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Skeleton, KpiSkeleton, CardSkeleton, TableSkeleton, LoadingBanner } from '../../components/common/Skeleton';
import CorporateActionModal, { detectPotentialSplit } from '../../components/common/CorporateActionModal';
import './PaperTrade.css';
import './TradesList.css';

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
    if (trade.holding_type === 'INVESTMENT') return true;
    const normMode = normalizeType(trade.mode);
    const normType = normalizeType(trade.trade_type);
    return normMode === 'LONG TERM' || normMode === 'INVESTMENT' || normType === 'LONG TERM' || normType === 'INVESTMENT';
}

function isPartialTrade(trade) {
    if (!trade) return false;
    const r = String(trade.exit_reason || '').toUpperCase();
    const n = String(trade.exit_notes || '').toUpperCase();
    return r.includes('PARTIAL') || r.includes('TARGET_1') || r.includes('TARGET_2') || n.includes('PARTIAL');
}

function formatExitReason(reason) {
    if (!reason) return 'Manual closure';
    const map = {
        'TARGET_HIT': 'Target Hit / Profit Booked',
        'PARTIAL_PROFIT': 'Partial Profit Booking',
        'TARGET_1': 'Target 1 Hit (Partial)',
        'TARGET_2': 'Target 2 Hit (Partial)',
        'PARTIAL_SL': 'Partial Stop Loss / Trimming',
        'TRAILING_SL': 'Trailing Stop Hit',
        'RISK_REDUCTION': 'Risk Reduction',
        'SL_HIT': 'Stop Loss Hit',
        'MANUAL': 'Manual Early Exit',
        'EOD': 'End of Day (Intraday)',
        'NEWS': 'News / Fundamental',
        'OTHER': 'Other Reason'
    };
    return map[reason] || reason;
}

function isTrading(trade) {
    return !isInvestment(trade);
}

function matchTradeType(mode, target) {
    if (!target) return true;
    return normalizeType(mode) === normalizeType(target);
}

function matchesSetupType(trade, filterKey) {
    if (!filterKey) return true;
    if (filterKey === 'LONG TERM') return isInvestment(trade) || matchTradeType(trade.mode, 'LONG TERM');
    if (filterKey === 'SWING') return !isInvestment(trade) && matchTradeType(trade.mode, 'SWING');
    if (filterKey === 'INTRADAY') return !isInvestment(trade) && matchTradeType(trade.mode, 'INTRADAY');
    if (filterKey === 'MTF') return !isInvestment(trade) && matchTradeType(trade.mode, 'MTF');
    return matchTradeType(trade.mode, filterKey);
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

export default function TradesList() {
    const navigate = useNavigate();
    const confirmAction = useConfirm();

    // Active Section Tab: 'TRADING' | 'INVESTMENT' | 'CLOSED' | 'ALL' | 'DELETED'
    const [activeTab, setActiveTab] = useState('TRADING');
    const [portfolioViewMode, setPortfolioViewMode] = useState('cards'); // 'cards' | 'table'

    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── Lists (Tags) & Bulk Selection State ──────────────────────────────────
    const [tradeLists, setTradeLists] = useState([]);
    const [selectedListId, setSelectedListId] = useState(null); // null = all trades
    const [selectedTradeIds, setSelectedTradeIds] = useState(new Set());
    const [showAddToListModal, setShowAddToListModal] = useState(false);
    const [showCreateListModal, setShowCreateListModal] = useState(false);
    const [newListForm, setNewListForm] = useState({ name: '', description: '', color: '#d4af37' });
    const [creatingList, setCreatingList] = useState(false);
    const [addingToList, setAddingToList] = useState(false);

    // Selection Mode, Three Dots Dropdown, and Clean Details Modal
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [openMenuTradeId, setOpenMenuTradeId] = useState(null);
    const [viewTradeModal, setViewTradeModal] = useState(null);
    const [corporateActionModal, setCorporateActionModal] = useState(null);

    // Modal Trade Notes state
    const [modalTradeNotes, setModalTradeNotes] = useState([]);
    const [loadingModalNotes, setLoadingModalNotes] = useState(false);
    const [newModalNoteText, setNewModalNoteText] = useState('');
    const [addingModalNote, setAddingModalNote] = useState(false);
    const [modalNoteError, setModalNoteError] = useState('');

    // Fetch notes whenever viewTradeModal opens
    useEffect(() => {
        if (!viewTradeModal) {
            setModalTradeNotes([]);
            setNewModalNoteText('');
            setModalNoteError('');
            return;
        }
        setLoadingModalNotes(true);
        setModalNoteError('');
        api.get(`/trades/${viewTradeModal.trade_id}`)
            .then(({ data }) => {
                if (data?.notes) {
                    setModalTradeNotes(data.notes);
                }
                if (data?.clients && (!viewTradeModal.clients || viewTradeModal.clients.length === 0)) {
                    setViewTradeModal(prev => prev ? ({ ...prev, clients: data.clients }) : null);
                }
            })
            .catch(err => {
                console.error('Failed to load trade notes:', err);
            })
            .finally(() => {
                setLoadingModalNotes(false);
            });
    }, [viewTradeModal?.trade_id]);

    const handleAddModalNote = async (e) => {
        e.preventDefault();
        if (!newModalNoteText.trim() || !viewTradeModal) return;
        setAddingModalNote(true);
        setModalNoteError('');
        try {
            await api.post(`/trades/${viewTradeModal.trade_id}/notes`, {
                note_text: newModalNoteText.trim()
            });
            const newNote = {
                note_id: Date.now(),
                trade_id: viewTradeModal.trade_id,
                note_text: newModalNoteText.trim(),
                created_at: new Date().toISOString()
            };
            setModalTradeNotes(prev => [...prev, newNote]);
            setNewModalNoteText('');
        } catch (err) {
            setModalNoteError(err.response?.data?.message || 'Failed to add note.');
        } finally {
            setAddingModalNote(false);
        }
    };

    // Close 3-dots menu on outside click
    useEffect(() => {
        if (!openMenuTradeId) return;
        const handleDocClick = (e) => {
            if (e.target && e.target.closest && e.target.closest('.trade-dots-container')) return;
            setOpenMenuTradeId(null);
        };
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, [openMenuTradeId]);

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
        quantity: '',
        exit_notes: ''
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

    // Fetch trade lists (tags) — scoped to TRADES
    const fetchTradeLists = useCallback(async () => {
        try {
            const { data } = await api.get('/trades/lists?type=TRADES');
            if (data.success) {
                setTradeLists(data.lists || []);
            }
        } catch (err) {
            console.error('Failed to load trade lists:', err);
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
        fetchTradeLists();
    }, [fetchTrades, fetchTradeLists]);

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
                    const detailsFlat = {};
                    for (const [k, v] of Object.entries(data.data)) {
                        if (typeof v === 'object' && v !== null) {
                            pricesFlat[k] = Number(v.price);
                            detailsFlat[k] = v;
                        } else {
                            pricesFlat[k] = Number(v);
                            detailsFlat[k] = { price: Number(v) };
                        }
                    }
                    setPrices(pricesFlat);
                    setPriceDetails(detailsFlat);
                }
            } catch (err) {
                console.error('Failed to poll live trade prices', err);
            } finally {
                setPricesLoading(false);
            }
        };

        fetchLivePrices();
        const interval = setInterval(fetchLivePrices, 15000); // 15 sec polling
        return () => clearInterval(interval);
    }, [trades]);

    // Base trades scoped by active list (excluding Long-Term / Investment trades from Trades section)
    const scopedBaseTrades = useMemo(() => {
        const tradingOnly = trades.filter(t => !isInvestment(t));
        if (!selectedListId) return tradingOnly;
        return tradingOnly.filter(t => t.lists?.some(l => l.list_id === selectedListId));
    }, [trades, selectedListId]);

    // Active List metadata & dynamic live metrics
    const activeListData = useMemo(() => {
        if (!selectedListId) return null;
        const baseList = tradeLists.find(l => l.list_id === selectedListId) || null;
        if (!baseList) return null;

        const listTrades = scopedBaseTrades;
        let openCount = 0;
        let closedCount = 0;
        let openCost = 0;
        let closedCost = 0;
        let totalRealizedPnl = 0;
        let totalUnrealizedPnl = 0;
        let wins = 0;
        let losses = 0;

        listTrades.forEach(t => {
            const lev = t.leverage || 1;
            const invested = (Number(t.entry_price || 0) * Number(t.quantity || 0)) / lev;

            if (t.status === 'OPEN') {
                openCount++;
                openCost += invested;

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
                closedCount++;
                closedCost += invested;
                const pnl = Number(t.total_pnl || 0);
                totalRealizedPnl += pnl;

                if (pnl > 0) wins++;
                else if (pnl < 0) losses++;
            }
        });

        const realizedPct = closedCost > 0 ? (totalRealizedPnl / closedCost) * 100 : 0;
        const unrealizedPct = openCost > 0 ? (totalUnrealizedPnl / openCost) * 100 : 0;
        const closedTotal = wins + losses;
        const winRate = closedTotal > 0
            ? Math.round((wins / closedTotal) * 100)
            : (baseList.closed_count > 0 ? Math.round((baseList.win_count / baseList.closed_count) * 100) : 0);

        return {
            ...baseList,
            trade_count: listTrades.length,
            open_count: openCount,
            closed_count: closedCount,
            open_cost: openCost,
            closed_cost: closedCost,
            total_pnl: totalRealizedPnl,
            realized_pct: realizedPct,
            unrealized_pnl: totalUnrealizedPnl,
            unrealized_pct: unrealizedPct,
            wins,
            losses,
            win_rate: winRate,
        };
    }, [tradeLists, selectedListId, scopedBaseTrades, prices]);

    // Tab counts
    const tabCounts = useMemo(() => {
        const trading = scopedBaseTrades.filter(t => t.status === 'OPEN').length;
        const closed = scopedBaseTrades.filter(t => t.status === 'CLOSED').length;
        const all = scopedBaseTrades.filter(t => t.status === 'OPEN').length;
        const del = deleted.filter(t => !isInvestment(t)).length;
        return { trading, closed, all, deleted: del };
    }, [scopedBaseTrades, deleted]);

    // Setup Type counts across current view (Swing, Intraday, MTF)
    const setupCounts = useMemo(() => {
        let base = scopedBaseTrades;
        if (activeTab === 'TRADING' || activeTab === 'ALL') {
            base = scopedBaseTrades.filter(t => t.status === 'OPEN');
        } else if (activeTab === 'CLOSED') {
            base = scopedBaseTrades.filter(t => t.status === 'CLOSED');
        }

        return {
            '': base.length,
            'SWING': base.filter(t => matchesSetupType(t, 'SWING')).length,
            'INTRADAY': base.filter(t => matchesSetupType(t, 'INTRADAY')).length,
            'MTF': base.filter(t => matchesSetupType(t, 'MTF')).length,
        };
    }, [scopedBaseTrades, activeTab]);

    // Live Metrics
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

        let scopedTrades = scopedBaseTrades;
        if (activeTab === 'TRADING') {
            scopedTrades = scopedBaseTrades.filter(t => {
                if (t.status !== 'OPEN') return false;
                if (activeSubFilter) return matchesSetupType(t, activeSubFilter);
                return true;
            });
        } else if (activeTab === 'CLOSED') {
            scopedTrades = scopedBaseTrades.filter(t => {
                if (t.status !== 'CLOSED') return false;
                if (activeSubFilter) return matchesSetupType(t, activeSubFilter);
                return true;
            });
        } else if (activeTab === 'ALL') {
            scopedTrades = scopedBaseTrades.filter(t => {
                if (t.status !== 'OPEN') return false;
                if (activeSubFilter) return matchesSetupType(t, activeSubFilter);
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
    }, [scopedBaseTrades, prices, activeTab, activeSubFilter, closedSubFilter]);

    // Sorting Handler
    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    // Filtered Trades for display
    const filteredTrades = useMemo(() => {
        if (activeTab === 'DELETED') return deleted;
        if (activeTab === 'TRADING') {
            return scopedBaseTrades.filter(t => {
                if (t.status !== 'OPEN') return false;
                if (activeSubFilter) return matchesSetupType(t, activeSubFilter);
                return isTrading(t);
            });
        }
        if (activeTab === 'INVESTMENT') {
            return scopedBaseTrades.filter(t => {
                if (!isInvestment(t) || t.status !== 'OPEN') return false;
                if (activeSubFilter && activeSubFilter !== 'LONG TERM') return false;
                return true;
            });
        }
        if (activeTab === 'CLOSED') {
            return scopedBaseTrades.filter(t => {
                if (t.status !== 'CLOSED') return false;
                if (activeSubFilter) return matchesSetupType(t, activeSubFilter);
                if (closedSubFilter === 'TRADING') return isTrading(t);
                if (closedSubFilter === 'INVESTMENT') return isInvestment(t);
                return true;
            });
        }
        if (activeTab === 'ALL') {
            return scopedBaseTrades.filter(t => {
                if (t.status !== 'OPEN') return false;
                if (activeSubFilter) return matchesSetupType(t, activeSubFilter);
                return true;
            });
        }
        return scopedBaseTrades.filter(t => {
            if (activeSubFilter) return matchesSetupType(t, activeSubFilter);
            return true;
        });
    }, [scopedBaseTrades, deleted, activeTab, activeSubFilter, closedSubFilter]);

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
                                const p = t.trade_type === 'LONG' ? (cmp - Number(t.entry_price)) * Number(t.quantity) : (Number(t.entry_price) - cmp) * Number(t.quantity);
                                return (p / invested) * 100;
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
                    valA = a.created_at || '';
                    valB = b.created_at || '';
            }

            if (typeof valA === 'string') {
                return sortConfig.direction === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });

        return result;
    }, [filteredTrades, sortConfig, prices]);

    // Metrics for clean Trade Details modal
    const detailsMetrics = useMemo(() => {
        if (!viewTradeModal) return { pnl: 0, pnlPct: 0, invested: 0 };
        const lev = viewTradeModal.leverage || 1;
        const invested = (Number(viewTradeModal.entry_price) * Number(viewTradeModal.quantity)) / lev;
        if (viewTradeModal.status === 'CLOSED') {
            const pnl = Number(viewTradeModal.total_pnl || 0);
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
            return { pnl, pnlPct, invested };
        }
        const rawCmp = prices[viewTradeModal.stock_name];
        const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
        const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : Number(viewTradeModal.entry_price);
        const pnl = viewTradeModal.trade_type === 'LONG'
            ? (cmp - Number(viewTradeModal.entry_price)) * Number(viewTradeModal.quantity)
            : (Number(viewTradeModal.entry_price) - cmp) * Number(viewTradeModal.quantity);
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
        return { pnl, pnlPct, invested };
    }, [viewTradeModal, prices]);

    // ── Selection Handlers ───────────────────────────────────────────────────
    const toggleSelectTrade = (tradeId) => {
        setSelectedTradeIds(prev => {
            const next = new Set(prev);
            if (next.has(tradeId)) next.delete(tradeId);
            else next.add(tradeId);
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (sortedTrades.length === 0) return;
        const allSelected = sortedTrades.every(t => selectedTradeIds.has(t.trade_id));
        if (allSelected) {
            setSelectedTradeIds(new Set());
        } else {
            setSelectedTradeIds(new Set(sortedTrades.map(t => t.trade_id)));
        }
    };

    // ── List (Tag) Actions ───────────────────────────────────────────────────
    const handleAddSelectedToList = async (listId) => {
        if (selectedTradeIds.size === 0) return;
        setAddingToList(true);
        try {
            await api.post(`/trades/lists/${listId}/trades`, {
                trade_ids: Array.from(selectedTradeIds)
            });
            setShowAddToListModal(false);
            setSelectedTradeIds(new Set());
            await Promise.all([fetchTrades(), fetchTradeLists()]);
        } catch (err) {
            console.error('Failed to add to list', err);
        } finally {
            setAddingToList(false);
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        if (!newListForm.name.trim()) return;
        setCreatingList(true);
        try {
            const { data } = await api.post('/trades/lists', {
                ...newListForm,
                type: 'TRADES'
            });
            if (data.success && data.list) {
                const newListId = data.list.list_id;
                if (selectedTradeIds.size > 0) {
                    await api.post(`/trades/lists/${newListId}/trades`, {
                        trade_ids: Array.from(selectedTradeIds)
                    });
                    setSelectedTradeIds(new Set());
                }
                setShowCreateListModal(false);
                setNewListForm({ name: '', description: '', color: '#d4af37' });
                await Promise.all([fetchTrades(), fetchTradeLists()]);
                setSelectedListId(newListId);
            }
        } catch (err) {
            console.error('Failed to create list', err);
        } finally {
            setCreatingList(false);
        }
    };

    const handleRemoveSelectedFromCurrentList = async () => {
        if (!selectedListId || selectedTradeIds.size === 0) return;
        try {
            await api.delete(`/trades/lists/${selectedListId}/trades`, {
                data: { trade_ids: Array.from(selectedTradeIds) }
            });
            setSelectedTradeIds(new Set());
            await Promise.all([fetchTrades(), fetchTradeLists()]);
        } catch (err) {
            console.error('Failed to remove from list', err);
        }
    };

    const handleRemoveSingleTradeFromList = async (tradeId) => {
        try {
            await api.delete(`/trades/${tradeId}/list`);
            await Promise.all([fetchTrades(), fetchTradeLists()]);
        } catch (err) {
            console.error('Failed to remove trade from list', err);
        }
    };

    const handleDeleteList = async (listId, listName) => {
        const ok = await confirmAction({
            title: `Delete List "${listName}"?`,
            message: 'This will remove the list tag. The trades will remain in your journal.',
            variant: 'danger',
            confirmText: 'Delete List'
        });
        if (!ok) return;

        try {
            await api.delete(`/trades/lists/${listId}`);
            if (selectedListId === listId) setSelectedListId(null);
            await Promise.all([fetchTrades(), fetchTradeLists()]);
        } catch (err) {
            console.error('Failed to delete list', err);
        }
    };

    // Move trade to dedicated Investment Portfolio
    const handleMoveToPortfolio = async (trade) => {
        const ok = await confirmAction({
            title: 'Move to Portfolio',
            message: `Move "${trade.stock_name}" from active trades to your Long-Term Portfolio? It will be managed under the Portfolio section.`,
            confirmLabel: 'Move to Portfolio',
            variant: 'primary',
        });
        if (!ok) return;

        try {
            await api.patch(`/trades/${trade.trade_id}/to-portfolio`);
            // Optimistically update local state so it immediately transitions out of active trades
            setTrades(prev => prev.map(t => t.trade_id === trade.trade_id ? { ...t, mode: 'LONG TERM', holding_type: 'INVESTMENT' } : t));
            await Promise.all([fetchTrades(), fetchTradeLists()]);
            await confirmAction({
                title: 'Moved to Portfolio',
                message: `"${trade.stock_name}" has been successfully moved to your Long-Term Portfolio! It will now be tracked under the Portfolio section.`,
                variant: 'primary',
                alertOnly: true,
                confirmLabel: 'Got it'
            });
        } catch (err) {
            confirmAction({
                title: 'Error',
                message: err.response?.data?.message || 'Failed to move trade to portfolio.',
                variant: 'danger',
                alertOnly: true
            });
        }
    };

    const handleCategorySwitch = async (trade) => {
        return handleMoveToPortfolio(trade);
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
            quantity: trade.quantity,
            exit_notes: ''
        });
        setExitTradeModal(trade);
    };

    // Exit Trade submission
    const handleExitSubmit = async (e) => {
        e.preventDefault();
        if (!exitForm.exit_price || !exitTradeModal) return;

        const dateMatch = String(exitForm.exit_date).match(/^(\d+)-(\d{2})-(\d{2})/);
        if (!dateMatch || dateMatch[1].length !== 4 || +dateMatch[1] < 2000 || +dateMatch[1] > 2099) {
            confirmAction({
                title: 'Invalid Exit Date',
                message: 'Exit date year must be a 4-digit year between 2000 and 2099.',
                variant: 'danger',
                alertOnly: true
            });
            return;
        }

        const qty = exitForm.quantity ? Number(exitForm.quantity) : exitTradeModal.quantity;
        if (isNaN(qty) || qty <= 0 || qty > exitTradeModal.quantity) {
            confirmAction({
                title: 'Invalid Quantity',
                message: `Exit quantity must be between 1 and ${exitTradeModal.quantity}.`,
                variant: 'danger',
                alertOnly: true
            });
            return;
        }

        const isPartial = qty < exitTradeModal.quantity;
        if (isPartial && (!exitForm.exit_notes || !exitForm.exit_notes.trim())) {
            confirmAction({
                title: 'Notes Required for Partial Booking',
                message: 'Please provide a note/reason explaining this partial booking (e.g. why partial booking, Target 1 achieved, risk management) so it is recorded in your trade journal history.',
                variant: 'warning',
                alertOnly: true
            });
            return;
        }

        setExitSubmitting(true);
        try {
            await api.patch(`/trades/${exitTradeModal.trade_id}/exit`, {
                exit_price: Number(exitForm.exit_price),
                exit_reason: isPartial ? (exitForm.exit_reason || 'PARTIAL_PROFIT') : exitForm.exit_reason,
                exit_date: exitForm.exit_date,
                exit_notes: exitForm.exit_notes ? exitForm.exit_notes.trim() : null,
                quantity: qty
            });
            setExitTradeModal(null);
            await fetchTrades();
            await fetchTradeLists();
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
                    setSelectedTradeIds(prev => {
                        const next = new Set(prev);
                        next.delete(tradeId);
                        return next;
                    });
                    await fetchTradeLists();
                } catch {
                    confirmAction({
                        title: 'Delete Failed',
                        message: 'Could not delete trade. Please try again.',
                        variant: 'danger',
                        alertOnly: true
                    });
                } finally {
                    setDeletingId(null);
                }
            }
        });
    };

    // Restore Trade
    const handleRestore = async (tradeId) => {
        setRestoringId(tradeId);
        try {
            await api.patch(`/trades/${tradeId}/restore`);
            setDeleted(prev => prev.filter(t => t.trade_id !== tradeId));
            await fetchTrades();
        } catch {
            confirmAction({
                title: 'Restore Failed',
                message: 'Could not restore trade.',
                variant: 'danger',
                alertOnly: true
            });
        } finally {
            setRestoringId(null);
        }
    };

    // Permanent Hard Delete
    const handleHardDelete = async (tradeId, stockName) => {
        confirmAction({
            title: 'Permanently Delete Trade?',
            message: `"${stockName}" will be deleted forever. This action CANNOT be undone.`,
            variant: 'danger',
            confirmText: 'Delete Permanently',
            onConfirm: async () => {
                setHardDeletingId(tradeId);
                try {
                    await api.delete(`/trades/${tradeId}/permanent`);
                    setDeleted(prev => prev.filter(t => t.trade_id !== tradeId));
                } catch {
                    confirmAction({
                        title: 'Delete Failed',
                        message: 'Could not permanently delete trade.',
                        variant: 'danger',
                        alertOnly: true
                    });
                } finally {
                    setHardDeletingId(null);
                }
            }
        });
    };

    return (
        <div className="page paper-trade-container">
            {/* Top Workspace Header */}
            <div className="paper-trade-header">
                <div>
                    <h2>Trades & Journal</h2>
                    <p>
                        Track active intraday, swing & MTF setups, manage lists, and record exit execution.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn-paper-action btn-new-trade"
                        onClick={() => navigate('/trades/open')}
                    >
                        <span><Rocket size={16} style={{ marginRight: '6px' }} /> + Open Trade</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert--error" style={{ marginBottom: '1.5rem' }}>
                    {error}
                </div>
            )}

            {/* Top Summary KPI Cards - Dynamically reflects selected section */}
            {activeTab !== 'DELETED' && (
                loading ? (
                    <KpiSkeleton count={4} />
                ) : (
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
                                <div className="kpi-value">
                                    {formatCurrency(activeTab === 'CLOSED' ? liveMetrics.totalClosedCost : liveMetrics.activeInvested)}
                                </div>
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
                )
            )}

            {/* ── Trade Lists / Tags Bar (Organize by Lists) ──────────────── */}
            <div className="trade-lists-bar">
                <div className="trade-lists-label">
                    <Layers size={14} color="var(--color-gold)" /> Lists:
                </div>
                <button
                    type="button"
                    className={`trade-list-tab ${selectedListId === null ? 'trade-list-tab--active' : ''}`}
                    onClick={() => setSelectedListId(null)}
                >
                    All Trades <span className="trade-list-badge-count">{loading ? '…' : scopedBaseTrades.length}</span>
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
                        <span className="trade-list-badge-count">{loading ? '…' : list.trade_count}</span>
                    </button>
                ))}
                <button
                    type="button"
                    className="btn-new-list"
                    onClick={() => setShowCreateListModal(true)}
                >
                    <Plus size={14} /> New List
                </button>
                <button
                    type="button"
                    className={`btn-new-list ${isSelectMode ? 'active' : ''}`}
                    style={isSelectMode ? { borderColor: 'var(--color-primary)', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--color-primary)' } : undefined}
                    onClick={() => {
                        setIsSelectMode(prev => !prev);
                        if (isSelectMode) setSelectedTradeIds(new Set());
                    }}
                    title="Toggle bulk selection mode"
                >
                    <CheckSquare size={14} /> {isSelectMode ? 'Exit Selection' : 'Select Multiple'}
                </button>
            </div>

            {/* Active List Stats Banner */}
            {activeListData && (
                <div className="active-list-banner">
                    <div className="active-list-info">
                        <h4 className="active-list-title">
                            <span className="trade-list-color-dot" style={{ background: activeListData.color, width: 12, height: 12 }} />
                            {activeListData.name}
                        </h4>
                        {activeListData.description && (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {activeListData.description}
                            </p>
                        )}
                    </div>
                    <div className="active-list-stats">
                        <div className="active-list-stat-item">
                            <span className="active-list-stat-label">Total Trades</span>
                            <span className="active-list-stat-value">
                                {activeListData.trade_count} <span className="active-list-subvalue">({activeListData.open_count} Open, {activeListData.closed_count} Closed)</span>
                            </span>
                        </div>
                        <div className="active-list-stat-item">
                            <span className="active-list-stat-label">Realized P&L</span>
                            <span className="active-list-stat-value" style={{ color: activeListData.total_pnl >= 0 ? '#34d399' : '#f87171' }}>
                                {activeListData.total_pnl >= 0 ? '+' : ''}{formatCurrency(activeListData.total_pnl)}
                                <span className="active-list-subvalue" style={{ color: activeListData.total_pnl >= 0 ? '#34d399' : '#f87171', marginLeft: '6px' }}>
                                    ({activeListData.total_pnl >= 0 ? '+' : ''}{activeListData.realized_pct.toFixed(2)}%)
                                </span>
                            </span>
                        </div>
                        <div className="active-list-stat-item">
                            <span className="active-list-stat-label">Unrealized P&L</span>
                            <span className="active-list-stat-value" style={{ color: activeListData.unrealized_pnl >= 0 ? '#34d399' : '#f87171' }}>
                                {activeListData.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(activeListData.unrealized_pnl)}
                                <span className="active-list-subvalue" style={{ color: activeListData.unrealized_pnl >= 0 ? '#34d399' : '#f87171', marginLeft: '6px' }}>
                                    ({activeListData.unrealized_pnl >= 0 ? '+' : ''}{activeListData.unrealized_pct.toFixed(2)}%)
                                </span>
                            </span>
                        </div>
                        <div className="active-list-stat-item">
                            <span className="active-list-stat-label">Win Ratio</span>
                            <span className="active-list-stat-value" style={{ color: activeListData.win_rate >= 50 ? '#34d399' : (activeListData.win_rate > 0 ? '#f87171' : 'inherit') }}>
                                {activeListData.closed_count > 0 ? `${activeListData.win_rate}%` : '—'}
                                {activeListData.closed_count > 0 && (
                                    <span className="active-list-subvalue" style={{ marginLeft: '6px' }}>
                                        ({activeListData.wins}W - {activeListData.losses}L)
                                    </span>
                                )}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="btn-paper-action"
                            onClick={() => handleDeleteList(activeListData.list_id, activeListData.name)}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.78rem', padding: '0.35rem 0.75rem', cursor: 'pointer', borderRadius: '6px', marginLeft: 'auto' }}
                        >
                            <Trash2 size={13} style={{ marginRight: '4px' }} /> Delete List
                        </button>
                    </div>
                </div>
            )}

            {/* Main Workspace Navigation Bar & Section Tabs */}
            <div className="workspace-section">
                <div className="workspace-nav-bar">
                    <div className="tab-group">
                        <button
                            className={`paper-tab-btn ${activeTab === 'TRADING' ? 'active' : ''}`}
                            onClick={() => setActiveTab('TRADING')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} /> Active Trades</span>
                            <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>
                                ({loading ? '…' : tabCounts.trading})
                            </span>
                        </button>
                        <button
                            className={`paper-tab-btn ${activeTab === 'CLOSED' ? 'active' : ''}`}
                            onClick={() => setActiveTab('CLOSED')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ScrollText size={16} /> Historical Journal Log</span>
                            <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>
                                ({loading ? '…' : tabCounts.closed})
                            </span>
                        </button>
                        <button
                            className={`paper-tab-btn ${activeTab === 'DELETED' ? 'active' : ''}`}
                            onClick={() => setActiveTab('DELETED')}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={16} /> Deleted</span>
                            <span style={{ opacity: 0.75, fontSize: '0.8rem' }}>
                                ({loading ? '…' : tabCounts.deleted})
                            </span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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

                        <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                            <span className="live-indicator-dot"></span>
                            {pricesLoading ? 'Fetching quotes…' : 'Live quotes syncing'}
                        </div>
                    </div>
                </div>

                {/* Setup Type Filter: Swing | Intraday | MTF */}
                {activeTab !== 'DELETED' && (
                    <div className="trade-filter-container">
                        <span className="trade-filter-label">
                            Setup Type:
                        </span>
                        {[
                            { key: '', label: activeTab === 'CLOSED' ? 'All Closed' : 'All Trades' },
                            { key: 'SWING', label: 'Swing' },
                            { key: 'INTRADAY', label: 'Intraday' },
                            { key: 'MTF', label: 'MTF' },
                        ].map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                className={`trade-filter-pill ${activeSubFilter === opt.key ? 'active' : ''}`}
                                onClick={() => setActiveSubFilter(opt.key)}
                            >
                                {opt.label}
                                <span className="trade-filter-count">{loading ? '…' : (setupCounts[opt.key] || 0)}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Content Rendering */}
                {loading ? (
                    portfolioViewMode === 'cards' ? (
                        <CardSkeleton
                            count={6}
                            caption={
                                activeTab === 'CLOSED'
                                    ? "Loading historical journal & realized trade records..."
                                    : activeTab === 'DELETED'
                                        ? "Loading trash bin & archived setups..."
                                        : "Loading active trading positions & synchronizing market quotes..."
                            }
                            subcaption="Fetching live CMP, calculated P&L, stop-loss and targets from NSE market feed"
                        />
                    ) : (
                        <TableSkeleton
                            rows={6}
                            cols={activeTab === 'CLOSED' ? 8 : 9}
                            caption={
                                activeTab === 'CLOSED'
                                    ? "Loading historical trade journal & realized executions..."
                                    : activeTab === 'DELETED'
                                        ? "Loading trash bin entries..."
                                        : "Loading active trading ledger & live quote matrix..."
                            }
                            subcaption="Synchronizing live CMP, P&L, stop-loss and target triggers"
                        />
                    )
                ) : filteredTrades.length === 0 ? (
                    <div className="empty-state-box">
                        <div className="empty-state-icon">
                            {activeTab === 'CLOSED' ? <ScrollText size={42} /> : activeTab === 'DELETED' ? <Trash2 size={42} /> : <Target size={42} />}
                        </div>
                        <h4>
                            {activeTab === 'CLOSED'
                                ? 'No Historical Closed Trades Logged'
                                : activeTab === 'DELETED'
                                    ? 'Trash is Empty'
                                    : 'No Active Trading Setups Found'}
                        </h4>
                        <p>
                            {activeTab === 'CLOSED'
                                ? 'When you exit trading positions, they will be archived here in your historical trade log with final realized return.'
                                : activeTab === 'DELETED'
                                    ? 'Deleted trades will appear here for restoration or permanent removal.'
                                    : 'Track intraday, swing, or MTF setups. Click "+ Open Trade" above to log a new position.'}
                        </p>
                        {activeTab !== 'CLOSED' && activeTab !== 'DELETED' && (
                            <button className="btn-primary" onClick={() => navigate('/trades/open')}>
                                <Plus size={16} /> Open Your First Trade
                            </button>
                        )}
                    </div>
                ) : portfolioViewMode === 'cards' ? (
                    /* Cards Breakdown View across all sections */
                    <div className="portfolio-grid">
                        {sortedTrades.map(t => {
                            const lev = t.leverage || 1;
                            const cost = (Number(t.entry_price || 0) * Number(t.quantity || 0)) / lev;
                            const rawCmp = prices[t.stock_name];
                            const cmpVal = rawCmp ? parseFloat(String(rawCmp).replace(/,/g, '')) : null;
                            const cmp = (cmpVal !== null && !isNaN(cmpVal)) ? cmpVal : Number(t.entry_price || 0);

                            let pnl = 0;
                            let pnlPct = 0;
                            if (t.status === 'CLOSED') {
                                pnl = Number(t.total_pnl || 0);
                                pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                            } else {
                                if (t.trade_type === 'LONG') {
                                    pnl = (cmp - Number(t.entry_price || 0)) * Number(t.quantity || 0);
                                } else {
                                    pnl = (Number(t.entry_price || 0) - cmp) * Number(t.quantity || 0);
                                }
                                pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                            }
                            const isPos = pnl >= 0;
                            const isInvest = isInvestment(t);
                            const isSelected = selectedTradeIds.has(t.trade_id);
                            const detectedSplit = t.status === 'OPEN' ? detectPotentialSplit(t.entry_price, cmp) : null;

                            return (
                                <div key={t.trade_id} className={`portfolio-asset-card ${openMenuTradeId === t.trade_id ? 'has-menu-open' : ''}`} style={{ border: isSelected ? '1.5px solid var(--color-primary)' : undefined }}>
                                    <div>
                                        <div className="asset-card-top">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {isSelectMode && activeTab !== 'DELETED' && (
                                                    <button
                                                        type="button"
                                                        className={`trade-select-btn ${isSelected ? 'trade-select-btn--selected' : ''}`}
                                                        onClick={(e) => { e.stopPropagation(); toggleSelectTrade(t.trade_id); }}
                                                        title="Select trade"
                                                    >
                                                        {isSelected && <span className="trade-select-inner-dot" />}
                                                    </button>
                                                )}
                                                <div className="symbol-badge-cell" onClick={() => activeTab !== 'DELETED' && setViewTradeModal(t)} style={{ cursor: activeTab !== 'DELETED' ? 'pointer' : 'default' }} title="Click to view details">
                                                    <span className="symbol-ticker">{t.stock_name}</span>
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                                        <span style={{ color: MODE_COLOR[t.trade_type] || 'inherit', fontWeight: 700, fontSize: '0.72rem' }}>
                                                            {t.trade_type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                                                        </span>
                                                        <span
                                                            className={`symbol-type-tag ${isInvest ? 'tag-investment' : 'tag-trading'}`}
                                                            style={{ cursor: t.status === 'OPEN' ? 'pointer' : 'default', fontSize: '0.7rem', padding: '1px 6px' }}
                                                            onClick={(e) => {
                                                                if (t.status === 'OPEN') {
                                                                    e.stopPropagation();
                                                                    handleCategorySwitch(t);
                                                                }
                                                            }}
                                                            title={t.status === 'OPEN' ? `Click to Switch Category` : ''}
                                                        >
                                                            {isInvest ? <><Shield size={10} style={{ marginRight: '2px' }} /> Long-Term</> : <><Zap size={10} style={{ marginRight: '2px' }} /> {formatTradeType(t.mode)}</>}
                                                            {t.status === 'OPEN' && <span style={{ marginLeft: '3px', opacity: 0.8 }}>⇄</span>}
                                                        </span>
                                                        {detectedSplit && (
                                                            <button
                                                                type="button"
                                                                className="watchdog-split-pill"
                                                                title={detectedSplit.desc}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCorporateActionModal({ trade: t, action: detectedSplit.action, ratio: detectedSplit.ratio });
                                                                }}
                                                            >
                                                                <Sparkles size={11} /> {detectedSplit.label}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className="asset-pnl-figure" style={{ color: isPos ? '#34d399' : '#f87171' }}>
                                                    {fmtLakhs(pnl)}
                                                </div>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isPos ? '#34d399' : '#f87171' }}>
                                                    {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>

                                        {/* List Tags on Card */}
                                        {t.lists && t.lists.length > 0 && (
                                            <div className="trade-list-tags" style={{ marginBottom: '0.75rem' }}>
                                                {t.lists.map(l => (
                                                    <span key={l.list_id} className="trade-tag-pill" style={{ borderColor: l.color, color: l.color }}>
                                                        {l.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="asset-metrics">
                                            {t.status === 'CLOSED' ? (
                                                <>
                                                    <div>
                                                        <div className="metric-item-label">Exit Price</div>
                                                        <div className="metric-item-val" style={{ color: '#38bdf8' }}>
                                                            ₹{Number(t.exit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="metric-item-label">Realized Return</div>
                                                        <div className="metric-item-val" style={{ color: isPos ? '#34d399' : '#f87171', fontWeight: 700 }}>
                                                            {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="metric-item-label">Entry Price</div>
                                                        <div className="metric-item-val">₹{Number(t.entry_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                    </div>
                                                    <div>
                                                        <div className="metric-item-label">Position Cost</div>
                                                        <div className="metric-item-val">{t.quantity} qty ({fmtLakhs(cost)})</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div>
                                                        <div className="metric-item-label">Current Price</div>
                                                        <div className="metric-item-val" style={{ color: cmpVal !== null ? '#38bdf8' : '#e2e8f0' }}>
                                                            ₹{cmp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            {priceDetails[t.stock_name]?.percentChange !== undefined && (
                                                                <span style={{ fontSize: '0.75rem', marginLeft: '4px', fontWeight: 600, color: Number(priceDetails[t.stock_name].change) >= 0 ? '#10b981' : '#ef4444' }}>
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
                                                        <div className="metric-item-val">₹{Number(t.entry_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                    </div>
                                                    <div>
                                                        <div className="metric-item-label">Holding Size</div>
                                                        <div className="metric-item-val">{t.quantity} qty ({fmtLakhs(cost)})</div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {t.status === 'CLOSED' ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.45rem 0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {isPartialTrade(t) && (
                                                        <span style={{ background: 'rgba(212, 175, 55, 0.2)', color: 'var(--color-primary)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid rgba(212, 175, 55, 0.4)' }}>
                                                            ⚡ Partial Booking
                                                        </span>
                                                    )}
                                                    <span>Exit: {formatExitReason(t.exit_reason)}</span>
                                                </span>
                                                <span style={{ color: '#94a3b8' }}>{fmtDate(t.exit_date)}</span>
                                            </div>
                                        ) : (t.target || t.stop_loss) ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.45rem 0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                {t.target ? <span style={{ color: '#34d399' }}>Target: ₹{Number(t.target).toLocaleString('en-IN')}</span> : <span />}
                                                {t.stop_loss ? <span style={{ color: '#f87171' }}>SL: ₹{Number(t.stop_loss).toLocaleString('en-IN')}</span> : <span />}
                                            </div>
                                        ) : null}

                                        {t.status === 'CLOSED' ? (
                                            t.exit_notes ? (
                                                <div style={{ fontSize: '0.82rem', color: '#e2e8f0', background: 'rgba(212, 175, 55, 0.05)', padding: '0.65rem 0.8rem', borderRadius: '8px', marginBottom: '1.25rem', borderLeft: '3px solid var(--color-primary)' }}>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                                                        {isPartialTrade(t) ? '⚡ Partial Booking Note & Reason:' : 'Exit Notes:'}
                                                    </div>
                                                    <div style={{ fontStyle: 'italic' }}>"{t.exit_notes}"</div>
                                                </div>
                                            ) : t.entry_notes ? (
                                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', background: 'rgba(0,0,0,0.18)', padding: '0.65rem 0.8rem', borderRadius: '8px', marginBottom: '1.25rem', borderLeft: '3px solid #38bdf8', fontStyle: 'italic' }}>
                                                    "{t.entry_notes}"
                                                </div>
                                            ) : null
                                        ) : (
                                            t.entry_notes && (
                                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', background: 'rgba(0,0,0,0.18)', padding: '0.65rem 0.8rem', borderRadius: '8px', marginBottom: '1.25rem', borderLeft: '3px solid #10b981', fontStyle: 'italic' }}>
                                                    "{t.entry_notes}"
                                                </div>
                                            )
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: 'auto', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            {t.status === 'CLOSED' ? `Exited: ${fmtDate(t.exit_date)}` : `Added: ${fmtDate(t.trade_date || t.created_at)}`}
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {activeTab === 'DELETED' ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn-paper-action"
                                                        style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                        onClick={() => handleRestore(t.trade_id)}
                                                        disabled={restoringId === t.trade_id}
                                                    >
                                                        <RotateCcw size={13} style={{ marginRight: '4px' }} /> Restore
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-paper-action"
                                                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                        onClick={() => handleHardDelete(t.trade_id, t.stock_name)}
                                                        disabled={hardDeletingId === t.trade_id}
                                                    >
                                                        <Trash2 size={13} style={{ marginRight: '4px' }} /> Delete Permanently
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    {t.status === 'OPEN' && (
                                                        <button
                                                            className="table-btn-action btn-exit-trade"
                                                            onClick={() => handleOpenExitModal(t)}
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                        >
                                                            Exit
                                                        </button>
                                                    )}
                                                    {/* Three Dots Dropdown Menu */}
                                                    <div className="trade-dots-container" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            className={`trade-dots-btn ${openMenuTradeId === t.trade_id ? 'active' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuTradeId(prev => prev === t.trade_id ? null : t.trade_id);
                                                            }}
                                                            title="Trade Options"
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
                                                                    <Eye size={15} /> View Trade Details
                                                                </button>
                                                                {t.status === 'OPEN' && (
                                                                    <button
                                                                        type="button"
                                                                        className="trade-dropdown-item item-exit"
                                                                        onClick={() => {
                                                                            setOpenMenuTradeId(null);
                                                                            handleOpenExitModal(t);
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
                                                                    <Tag size={15} /> {(t.lists && t.lists.length > 0) ? 'Change List' : 'Add to List'}
                                                                </button>
                                                                {((t.lists && t.lists.length > 0) || selectedListId) && (
                                                                    <button
                                                                        type="button"
                                                                        className="trade-dropdown-item"
                                                                        style={{ color: '#f59e0b' }}
                                                                        onClick={() => {
                                                                            setOpenMenuTradeId(null);
                                                                            handleRemoveSingleTradeFromList(t.trade_id);
                                                                        }}
                                                                    >
                                                                        <Tag size={15} /> Remove from List
                                                                    </button>
                                                                )}
                                                                <Link
                                                                    to={`/trades/${t.trade_id}?edit=true`}
                                                                    className="trade-dropdown-item item-primary"
                                                                    onClick={() => setOpenMenuTradeId(null)}
                                                                >
                                                                    <Pencil size={15} /> Edit Trade
                                                                </Link>
                                                                {t.status === 'OPEN' && (
                                                                    <button
                                                                        type="button"
                                                                        className="trade-dropdown-item"
                                                                        onClick={() => {
                                                                            setOpenMenuTradeId(null);
                                                                            handleMoveToPortfolio(t);
                                                                        }}
                                                                    >
                                                                        <PieChart size={15} /> Move to Portfolio
                                                                    </button>
                                                                )}
                                                                {t.status === 'OPEN' && (
                                                                    <button
                                                                        type="button"
                                                                        className="trade-dropdown-item"
                                                                        onClick={() => {
                                                                            setOpenMenuTradeId(null);
                                                                            setCorporateActionModal({ trade: t });
                                                                        }}
                                                                    >
                                                                        <Split size={15} /> Corporate Action / Split
                                                                    </button>
                                                                )}
                                                                <div className="trade-dropdown-divider" />
                                                                <button
                                                                    type="button"
                                                                    className="trade-dropdown-item item-danger"
                                                                    onClick={() => {
                                                                        setOpenMenuTradeId(null);
                                                                        handleDelete(t.trade_id, t.stock_name);
                                                                    }}
                                                                >
                                                                    <Trash2 size={15} /> Delete Trade
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
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
                                    {isSelectMode && activeTab !== 'DELETED' && (
                                        <th style={{ width: '36px', textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className={`trade-select-btn ${sortedTrades.length > 0 && sortedTrades.every(t => selectedTradeIds.has(t.trade_id)) ? 'trade-select-btn--selected' : ''}`}
                                                onClick={handleToggleSelectAll}
                                                title="Select all on this view"
                                            >
                                                {sortedTrades.length > 0 && sortedTrades.every(t => selectedTradeIds.has(t.trade_id)) && <span className="trade-select-inner-dot" />}
                                            </button>
                                        </th>
                                    )}
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
                                    const isSelected = selectedTradeIds.has(t.trade_id);
                                    const detectedSplit = t.status === 'OPEN' ? detectPotentialSplit(t.entry_price, cmp) : null;

                                    return (
                                        <tr key={t.trade_id} style={{ background: isSelected ? 'rgba(212, 175, 55, 0.05)' : undefined }}>
                                            {isSelectMode && activeTab !== 'DELETED' && (
                                                <td style={{ width: '36px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className={`trade-select-btn ${isSelected ? 'trade-select-btn--selected' : ''}`}
                                                        onClick={() => toggleSelectTrade(t.trade_id)}
                                                        title="Select trade"
                                                    >
                                                        {isSelected && <span className="trade-select-inner-dot" />}
                                                    </button>
                                                </td>
                                            )}
                                            <td data-label="Stock Symbol" onClick={() => setViewTradeModal(t)} style={{ cursor: 'pointer' }} title="Click to view details">
                                                <div className="symbol-badge-cell">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span className="symbol-ticker">{t.stock_name}</span>
                                                        {detectedSplit && (
                                                            <button
                                                                type="button"
                                                                className="watchdog-split-pill"
                                                                title={detectedSplit.desc}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCorporateActionModal({ trade: t, action: detectedSplit.action, ratio: detectedSplit.ratio });
                                                                }}
                                                            >
                                                                <Sparkles size={11} /> {detectedSplit.label}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {fmtDate(t.trade_date || t.created_at)}
                                                    </span>
                                                    {/* List Tags on Table row */}
                                                    {t.lists && t.lists.length > 0 && (
                                                        <div className="trade-list-tags">
                                                            {t.lists.map(l => (
                                                                <span key={l.list_id} className="trade-tag-pill" style={{ borderColor: l.color, color: l.color }}>
                                                                    {l.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
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
                                                    onClick={(e) => {
                                                        if (t.status === 'OPEN') {
                                                            e.stopPropagation();
                                                            handleCategorySwitch(t);
                                                        }
                                                    }}
                                                    title={t.status === 'OPEN' ? `Click to switch to ${isInvest ? 'Active Trading (Swing)' : 'Long-Term Portfolio'}` : 'Closed trade'}
                                                >
                                                    <span>{isInvest ? <><Shield size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} /> Long-Term</> : <><Zap size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} /> {formatTradeType(t.mode)}</>}</span>
                                                    {t.status === 'OPEN' && <span style={{ fontSize: '0.75rem', opacity: 0.8 }} title="Click to Switch Category">⇄</span>}
                                                </div>
                                            </td>
                                            <td data-label="Entry Price" style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                                ₹{Number(t.entry_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td data-label="Qty & Capital">
                                                <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{t.quantity} qty</div>
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
                                                    <td data-label="Exit Reason" style={{ fontSize: '0.85rem', color: '#cbd5e1', maxWidth: '240px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            {isPartialTrade(t) && (
                                                                <span style={{ background: 'rgba(212, 175, 55, 0.2)', color: 'var(--color-primary)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid rgba(212, 175, 55, 0.4)' }}>
                                                                    ⚡ Partial Booking
                                                                </span>
                                                            )}
                                                            <span style={{ fontWeight: 600 }}>{formatExitReason(t.exit_reason)}</span>
                                                        </div>
                                                        {t.exit_notes && (
                                                            <div style={{ fontSize: '0.75rem', color: '#fef08a', fontStyle: 'italic', marginTop: '3px', background: 'rgba(212, 175, 55, 0.08)', padding: '3px 6px', borderRadius: '4px', borderLeft: '2px solid var(--color-primary)' }}>
                                                                "{t.exit_notes}"
                                                            </div>
                                                        )}
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
                                                        <button
                                                            className="table-btn-action btn-exit-trade"
                                                            onClick={() => handleOpenExitModal(t)}
                                                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                                            title="Book Profits / Exit Position"
                                                        >
                                                            Exit
                                                        </button>
                                                    )}
                                                    {/* Three Dots Action Menu */}
                                                    <div className="trade-dots-container" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            className={`trade-dots-btn ${openMenuTradeId === t.trade_id ? 'active' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuTradeId(prev => prev === t.trade_id ? null : t.trade_id);
                                                            }}
                                                            title="Trade Options"
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
                                                                    <Eye size={15} /> View Trade Details
                                                                </button>
                                                                {t.status === 'OPEN' && (
                                                                    <button
                                                                        type="button"
                                                                        className="trade-dropdown-item item-exit"
                                                                        onClick={() => {
                                                                            setOpenMenuTradeId(null);
                                                                            handleOpenExitModal(t);
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
                                                                    <Tag size={15} /> {(t.lists && t.lists.length > 0) ? 'Change List' : 'Add to List'}
                                                                </button>
                                                                {((t.lists && t.lists.length > 0) || selectedListId) && (
                                                                    <button
                                                                        type="button"
                                                                        className="trade-dropdown-item"
                                                                        style={{ color: '#f59e0b' }}
                                                                        onClick={() => {
                                                                            setOpenMenuTradeId(null);
                                                                            handleRemoveSingleTradeFromList(t.trade_id);
                                                                        }}
                                                                    >
                                                                        <Tag size={15} /> Remove from List
                                                                    </button>
                                                                )}
                                                                <Link
                                                                    to={`/trades/${t.trade_id}?edit=true`}
                                                                    className="trade-dropdown-item item-primary"
                                                                    onClick={() => setOpenMenuTradeId(null)}
                                                                >
                                                                    <Pencil size={15} /> Edit Trade
                                                                </Link>
                                                                {t.status === 'OPEN' && (
                                                                    <button
                                                                        type="button"
                                                                        className="trade-dropdown-item"
                                                                        onClick={() => {
                                                                            setOpenMenuTradeId(null);
                                                                            handleMoveToPortfolio(t);
                                                                        }}
                                                                    >
                                                                        <PieChart size={15} /> Move to Portfolio
                                                                    </button>
                                                                )}
                                                                {t.status === 'OPEN' && (
                                                                    <button
                                                                        type="button"
                                                                        className="trade-dropdown-item"
                                                                        onClick={() => {
                                                                            setOpenMenuTradeId(null);
                                                                            setCorporateActionModal({ trade: t });
                                                                        }}
                                                                    >
                                                                        <Split size={15} /> Corporate Action / Split
                                                                    </button>
                                                                )}
                                                                <div className="trade-dropdown-divider" />
                                                                <button
                                                                    type="button"
                                                                    className="trade-dropdown-item item-danger"
                                                                    onClick={() => {
                                                                        setOpenMenuTradeId(null);
                                                                        handleDelete(t.trade_id, t.stock_name);
                                                                    }}
                                                                >
                                                                    <Trash2 size={15} /> Delete Trade
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
            </div>

            {/* ── Floating Bulk Action Bar ─────────────────────────────────── */}
            {selectedTradeIds.size > 0 && (
                <div className="bulk-action-bar">
                    <span className="bulk-count-badge">
                        <span style={{ color: 'var(--color-gold)' }}>●</span> {selectedTradeIds.size} trade(s) selected
                    </span>
                    <button
                        type="button"
                        className="bulk-btn bulk-btn--primary"
                        onClick={() => setShowAddToListModal(true)}
                    >
                        <Plus size={14} /> Add to List
                    </button>
                    {selectedListId && (
                        <button
                            type="button"
                            className="bulk-btn bulk-btn--danger"
                            onClick={handleRemoveSelectedFromCurrentList}
                        >
                            Remove from this List
                        </button>
                    )}
                    <button
                        type="button"
                        className="bulk-btn bulk-btn--secondary"
                        onClick={() => setSelectedTradeIds(new Set())}
                    >
                        Clear selection
                    </button>
                </div>
            )}

            {/* ── Add to List Modal ────────────────────────────────────────── */}
            {showAddToListModal && (
                <div className="paper-modal-overlay" onClick={() => setShowAddToListModal(false)}>
                    <div className="paper-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                                <Layers size={18} color="var(--color-gold)" /> Add {selectedTradeIds.size} Trade(s) to List
                            </h3>
                            <button className="btn-close-pad" onClick={() => setShowAddToListModal(false)}><X size={16} /></button>
                        </div>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Note: Each trade belongs to at most one list at a time. Selecting a list will assign or move the trade.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '0.5rem 0 1rem 0' }}>
                            {tradeLists.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: '1rem 0' }}>
                                    No custom lists created yet. Create your first list below!
                                </p>
                            ) : (
                                tradeLists.map(list => {
                                    const singleTrade = selectedTradeIds.size === 1 ? trades.find(t => selectedTradeIds.has(t.trade_id)) : null;
                                    const isCurrent = singleTrade?.lists?.some(l => l.list_id === list.list_id);
                                    return (
                                        <button
                                            key={list.list_id}
                                            type="button"
                                            className="trade-list-tab"
                                            onClick={() => handleAddSelectedToList(list.list_id)}
                                            style={{ justifyContent: 'space-between', padding: '0.65rem 1rem', width: '100%', borderRadius: 'var(--radius-sm)' }}
                                            disabled={addingToList}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="trade-list-color-dot" style={{ background: list.color }} />
                                                <strong style={{ color: 'var(--color-text)' }}>{list.name}</strong>
                                                {isCurrent && (
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-gold)', fontWeight: 600, background: 'rgba(212,175,55,0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                                                        Current List
                                                    </span>
                                                )}
                                            </span>
                                            <span className="trade-list-badge-count">{list.trade_count} trades</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                            <button
                                type="button"
                                className="btn-paper-action btn-secondary"
                                onClick={() => { setShowAddToListModal(false); setShowCreateListModal(true); }}
                            >
                                + Create New List
                            </button>
                            <button
                                type="button"
                                className="btn-paper-action btn-secondary"
                                onClick={() => setShowAddToListModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create New List Modal ────────────────────────────────────── */}
            {showCreateListModal && (
                <div className="paper-modal-overlay" onClick={() => setShowCreateListModal(false)}>
                    <div className="paper-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
                                <Plus size={18} color="var(--color-gold)" /> Create New Trade List
                            </h3>
                            <button className="btn-close-pad" onClick={() => setShowCreateListModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreateList}>
                            <div className="form-field-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">List Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Breakout Radar, Tech Bets, High Conviction..."
                                    value={newListForm.name}
                                    onChange={(e) => setNewListForm(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-field-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Description (Optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Brief note about this list thesis..."
                                    value={newListForm.description}
                                    onChange={(e) => setNewListForm(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>
                            <div className="form-field-group" style={{ marginBottom: '1.25rem' }}>
                                <label className="form-label">Color Tag</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                                    {['#d4af37', '#22c55e', '#38bdf8', '#a855f7', '#f97316', '#ef4444', '#ec4899'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setNewListForm(prev => ({ ...prev, color: c }))}
                                            style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: '50%',
                                                background: c,
                                                border: newListForm.color === c ? '2.5px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                                cursor: 'pointer',
                                                boxShadow: newListForm.color === c ? `0 0 10px ${c}` : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                                <button type="button" className="btn-paper-action btn-secondary" onClick={() => setShowCreateListModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-paper-action btn-add-funds" disabled={creatingList}>
                                    {creatingList ? 'Creating...' : selectedTradeIds.size > 0 ? `Create & Add ${selectedTradeIds.size} Trade(s)` : 'Create List'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Compact & Clean Exit Trade Modal (100% visible on all viewports) ── */}
            {exitTradeModal && (
                <div className="paper-modal-overlay" onClick={() => setExitTradeModal(null)}>
                    <div className="paper-modal-box compact-exit-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ marginBottom: '0.85rem', paddingBottom: '0.65rem' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', margin: 0 }}>
                                <TrendingUp size={18} color="var(--color-primary)" /> Exit Position ({exitTradeModal.stock_name})
                            </h3>
                            <button className="btn-close-pad" onClick={() => setExitTradeModal(null)}><X size={15} /></button>
                        </div>

                        <form onSubmit={handleExitSubmit}>
                            <div className="exit-summary-strip">
                                <div>
                                    <span style={{ color: '#94a3b8' }}>Entry: </span>
                                    <strong style={{ color: 'var(--color-text)' }}>₹{Number(exitTradeModal.entry_price).toFixed(2)}</strong> × {exitTradeModal.quantity} qty
                                </div>
                                <div>
                                    <span style={{ color: '#94a3b8' }}>CMP: </span>
                                    <strong style={{ color: '#38bdf8' }}>
                                        ₹{prices[exitTradeModal.stock_name] ? Number(prices[exitTradeModal.stock_name]).toFixed(2) : Number(exitTradeModal.entry_price).toFixed(2)}
                                    </strong>
                                </div>
                            </div>

                            {Number(exitForm.quantity) > 0 && Number(exitForm.quantity) < exitTradeModal.quantity && (
                                <div style={{
                                    background: 'rgba(212, 175, 55, 0.12)',
                                    border: '1px solid rgba(212, 175, 55, 0.35)',
                                    borderRadius: '8px',
                                    padding: '0.65rem 0.85rem',
                                    marginBottom: '0.85rem',
                                    fontSize: '0.82rem',
                                    color: '#fef08a'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '3px' }}>
                                        <Zap size={14} /> Partial Profit / Loss Booking Detected
                                    </div>
                                    <div>
                                        You are booking <strong>{exitForm.quantity} qty</strong> of <strong>{exitTradeModal.quantity} qty</strong>.
                                        The remaining <strong>{exitTradeModal.quantity - Number(exitForm.quantity)} qty</strong> will remain active in your open trades.
                                    </div>
                                    <div style={{ marginTop: '3px', color: 'var(--color-text-dim)', fontSize: '0.78rem' }}>
                                        * A journal note & reason is required below so this partial profit/loss booking is recorded in your history.
                                    </div>
                                </div>
                            )}

                            <div className="exit-form-grid">
                                <div className="form-field-group">
                                    <label className="form-label">Exit Price ₹ *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="form-input"
                                        value={exitForm.exit_price}
                                        onChange={(e) => setExitForm(prev => ({ ...prev, exit_price: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="form-field-group">
                                    <label className="form-label">Exit Quantity *</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={exitForm.quantity}
                                        onChange={(e) => setExitForm(prev => ({ ...prev, quantity: e.target.value }))}
                                        max={exitTradeModal.quantity}
                                        min="1"
                                        required
                                    />
                                    {Number(exitForm.quantity) > 0 && Number(exitForm.quantity) < exitTradeModal.quantity && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '4px', display: 'block' }}>
                                            Partial Exit: {exitTradeModal.quantity - Number(exitForm.quantity)} qty will remain open
                                        </span>
                                    )}
                                </div>

                                <div className="form-field-group">
                                    <label className="form-label">Exit Date *</label>
                                    <input
                                        type="date"
                                        min="2000-01-01"
                                        max="2099-12-31"
                                        className="form-input"
                                        value={exitForm.exit_date}
                                        onChange={(e) => setExitForm(prev => ({ ...prev, exit_date: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="form-field-group">
                                    <label className="form-label">Exit Reason</label>
                                    <select
                                        className="form-select"
                                        value={exitForm.exit_reason}
                                        onChange={(e) => setExitForm(prev => ({ ...prev, exit_reason: e.target.value }))}
                                    >
                                        <option value="PARTIAL_PROFIT">Partial Profit Booking</option>
                                        <option value="TARGET_1">Target 1 Hit (Partial Exit)</option>
                                        <option value="TARGET_2">Target 2 Hit (Partial Exit)</option>
                                        <option value="PARTIAL_SL">Partial Stop Loss / Trimming</option>
                                        <option value="TRAILING_SL">Trailing Stop Hit</option>
                                        <option value="RISK_REDUCTION">Risk Reduction / Reversal</option>
                                        <option value="TARGET_HIT">Target Hit / Profit Booked</option>
                                        <option value="SL_HIT">Stop Loss Hit</option>
                                        <option value="MANUAL">Manual Early Exit</option>
                                        <option value="EOD">End of Day (Intraday Close)</option>
                                        <option value="NEWS">News / Fundamental Change</option>
                                        <option value="OTHER">Other Reason</option>
                                    </select>
                                </div>
                            </div>

                            {/* Exit Notes */}
                            <div className="form-field-group" style={{ marginBottom: '0.85rem' }}>
                                <label className="form-label">
                                    {Number(exitForm.quantity) > 0 && Number(exitForm.quantity) < exitTradeModal.quantity
                                        ? 'Partial Booking Reason & Journal Notes * (Required)'
                                        : 'Exit Notes / Learnings (Optional)'}
                                </label>
                                <textarea
                                    className="exit-notes-input"
                                    value={exitForm.exit_notes || ''}
                                    onChange={(e) => setExitForm(prev => ({ ...prev, exit_notes: e.target.value }))}
                                    placeholder={Number(exitForm.quantity) > 0 && Number(exitForm.quantity) < exitTradeModal.quantity
                                        ? 'Why partial booking? (e.g. Target 1 reached (+12%), locking partial profits and holding rest for T2 with trailing SL at entry...)'
                                        : 'Remarks on trade execution, psychology, or rationale...'}
                                    required={Number(exitForm.quantity) > 0 && Number(exitForm.quantity) < exitTradeModal.quantity}
                                />
                            </div>

                            <div className="modal-footer" style={{ marginTop: '0.85rem', gap: '0.75rem' }}>
                                <button type="button" className="btn-paper-action btn-secondary" onClick={() => setExitTradeModal(null)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-paper-action btn-exit-trade"
                                    disabled={exitSubmitting}
                                    style={{ padding: '0.65rem 1.25rem' }}
                                >
                                    {exitSubmitting ? 'Closing...' : 'Confirm Exit & Lock P&L'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Clean Trade Details Modal (New Clean UI - No Edit Button, With Book Profits/Exit) ── */}
            {viewTradeModal && (
                <div className="paper-modal-overlay" onClick={() => setViewTradeModal(null)}>
                    <div className="paper-modal-box clean-trade-details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="clean-details-header">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                                        {viewTradeModal.stock_name}
                                    </h2>
                                    <span style={{
                                        color: MODE_COLOR[viewTradeModal.trade_type] || '#10b981',
                                        background: viewTradeModal.trade_type === 'LONG' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700
                                    }}>
                                        {viewTradeModal.trade_type === 'LONG' ? '▲ LONG' : '▼ SHORT'}
                                    </span>
                                    <span className={`symbol-type-tag ${isInvestment(viewTradeModal) ? 'tag-investment' : 'tag-trading'}`}>
                                        {isInvestment(viewTradeModal) ? 'Long-Term Conviction' : formatTradeType(viewTradeModal.mode)}
                                    </span>
                                    <span className={`badge ${STATUS_BADGE[viewTradeModal.status] || 'badge--yellow'}`}>
                                        {viewTradeModal.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    Opened: {fmtDate(viewTradeModal.trade_date || viewTradeModal.created_at)}
                                    {viewTradeModal.exit_date && ` • Closed: ${fmtDate(viewTradeModal.exit_date)}`}
                                </div>
                            </div>
                            <button className="btn-close-pad" onClick={() => setViewTradeModal(null)}><X size={16} /></button>
                        </div>

                        {/* Metric Highlights Grid */}
                        <div className="clean-details-metrics-grid">
                            <div className="clean-metric-card">
                                <span className="clean-metric-label">Entry Price</span>
                                <span className="clean-metric-val">₹{Number(viewTradeModal.entry_price).toFixed(2)}</span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{viewTradeModal.quantity} qty</span>
                            </div>
                            <div className="clean-metric-card">
                                <span className="clean-metric-label">{viewTradeModal.status === 'CLOSED' ? 'Exit Price' : 'Live Quote / CMP'}</span>
                                <span className="clean-metric-val" style={{ color: '#38bdf8' }}>
                                    ₹{viewTradeModal.status === 'CLOSED'
                                        ? Number(viewTradeModal.exit_price || 0).toFixed(2)
                                        : (prices[viewTradeModal.stock_name] ? Number(prices[viewTradeModal.stock_name]).toFixed(2) : Number(viewTradeModal.entry_price).toFixed(2))}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Capital: {fmtLakhs(detailsMetrics.invested)}
                                </span>
                            </div>
                            <div className="clean-metric-card">
                                <span className="clean-metric-label">{viewTradeModal.status === 'CLOSED' ? 'Realized P&L' : 'Unrealized P&L'}</span>
                                <span className="clean-metric-val" style={{ color: detailsMetrics.pnl >= 0 ? '#34d399' : '#f87171' }}>
                                    {detailsMetrics.pnl >= 0 ? '+' : ''}{fmtLakhs(detailsMetrics.pnl)}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: detailsMetrics.pnl >= 0 ? '#34d399' : '#f87171' }}>
                                    {detailsMetrics.pnl >= 0 ? '+' : ''}{detailsMetrics.pnlPct.toFixed(2)}%
                                </span>
                            </div>
                            <div className="clean-metric-card">
                                <span className="clean-metric-label">Target & SL</span>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#34d399' }}>
                                    Tgt: {viewTradeModal.target ? `₹${Number(viewTradeModal.target).toLocaleString('en-IN')}` : '—'}
                                </div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f87171' }}>
                                    SL: {viewTradeModal.stop_loss ? `₹${Number(viewTradeModal.stop_loss).toLocaleString('en-IN')}` : '—'}
                                </div>
                            </div>
                        </div>

                        {/* Strategy & Conviction */}
                        <div className="clean-section-box">
                            <div className="clean-section-title">Strategy & Psychology</div>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.84rem' }}>
                                <div><span style={{ color: '#94a3b8' }}>Setup: </span><strong style={{ color: 'var(--color-text)' }}>{viewTradeModal.strategy_tag || 'Discretionary'}</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Conviction: </span><strong style={{ color: 'var(--color-primary)' }}>{viewTradeModal.conviction_score || 5}/10</strong></div>
                                <div><span style={{ color: '#94a3b8' }}>Market Mood: </span><strong style={{ color: '#38bdf8' }}>{viewTradeModal.market_mood || 'NEUTRAL'}</strong></div>
                            </div>
                            {viewTradeModal.entry_notes && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.85rem', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)', fontSize: '0.85rem', color: '#e2e8f0', fontStyle: 'italic' }}>
                                    "{viewTradeModal.entry_notes}"
                                </div>
                            )}
                            {viewTradeModal.exit_notes && (
                                <div style={{ marginTop: '0.5rem', background: 'rgba(239,68,68,0.06)', padding: '0.65rem 0.85rem', borderRadius: '8px', borderLeft: '3px solid #ef4444', fontSize: '0.85rem', color: '#f87171' }}>
                                    <strong>Exit Notes:</strong> "{viewTradeModal.exit_notes}"
                                </div>
                            )}
                        </div>

                        {/* Clients Allocated */}
                        {viewTradeModal.clients && viewTradeModal.clients.length > 0 && (
                            <div className="clean-section-box">
                                <div className="clean-section-title">Client Allocations ({viewTradeModal.clients.length})</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                    {viewTradeModal.clients.map(c => (
                                        <span key={c.client_id || c.id} className="clean-client-chip">
                                            {c.name || `Account #${c.client_id}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* List Tags */}
                        {viewTradeModal.lists && viewTradeModal.lists.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <div className="clean-section-title">Assigned Lists</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {viewTradeModal.lists.map(l => (
                                        <span key={l.list_id} className="trade-tag-pill" style={{ borderColor: l.color, color: l.color, padding: '3px 8px', fontSize: '0.75rem' }}>
                                            {l.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Trade Notes & Journal */}
                        <div className="clean-section-box" style={{ marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                                <div className="clean-section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ScrollText size={14} /> Trade Notes & Journal {modalTradeNotes.length > 0 && `(${modalTradeNotes.length})`}
                                </div>
                            </div>

                            {/* Notes Timeline / List */}
                            {loadingModalNotes ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                                    <span className="ts-spinner-ring" style={{ width: 14, height: 14 }} />
                                    <span>Loading trade notes & journal entries…</span>
                                </div>
                            ) : modalTradeNotes.length > 0 ? (
                                <div className="clean-notes-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.85rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {modalTradeNotes.map((n, i) => (
                                        <div key={n.note_id || i} style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            borderLeft: '3px solid var(--color-primary)',
                                            borderRadius: '6px',
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.84rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                <div style={{ color: '#e2e8f0', flex: 1, wordBreak: 'break-word', lineHeight: 1.4 }}>
                                                    {n.note_text}
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    {n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {/* Add Note Form */}
                            {modalNoteError && (
                                <div style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: '0.4rem' }}>
                                    {modalNoteError}
                                </div>
                            )}
                            <form onSubmit={handleAddModalNote} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                <textarea
                                    className="form-input"
                                    rows={2}
                                    value={newModalNoteText}
                                    onChange={(e) => { setNewModalNoteText(e.target.value); setModalNoteError(''); }}
                                    placeholder="Add a new update, thesis review, or journal note…"
                                    style={{ flex: 1, fontSize: '0.84rem', resize: 'vertical', minHeight: '44px', padding: '0.5rem 0.65rem' }}
                                />
                                <button
                                    type="submit"
                                    className="btn-paper-action"
                                    disabled={addingModalNote || !newModalNoteText.trim()}
                                    style={{
                                        background: 'var(--color-primary)',
                                        color: '#000',
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        padding: '0.55rem 0.95rem',
                                        borderRadius: '8px',
                                        height: '42px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap',
                                        opacity: (!newModalNoteText.trim() || addingModalNote) ? 0.5 : 1,
                                        cursor: (!newModalNoteText.trim() || addingModalNote) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Plus size={14} /> {addingModalNote ? 'Adding…' : 'Add Note'}
                                </button>
                            </form>
                        </div>

                        {/* Modal Actions Footer: Clean UI with NO edit button, but Book Profits/Exit if open */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            {viewTradeModal.status === 'OPEN' && (
                                <>
                                    <button
                                        type="button"
                                        className="btn-paper-action"
                                        style={{ padding: '0.65rem 1.15rem', fontSize: '0.88rem', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', border: '1px solid rgba(212, 175, 55, 0.35)' }}
                                        onClick={() => {
                                            const t = viewTradeModal;
                                            setViewTradeModal(null);
                                            setCorporateActionModal({ trade: t });
                                        }}
                                        title="Apply Stock Split, Bonus Issue or Reverse Split"
                                    >
                                        <Split size={16} style={{ marginRight: '6px' }} /> Corporate Action
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-paper-action"
                                        style={{ padding: '0.65rem 1.15rem', fontSize: '0.88rem', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--color-primary)', border: '1px solid rgba(212, 175, 55, 0.4)' }}
                                        onClick={() => {
                                            const t = viewTradeModal;
                                            setViewTradeModal(null);
                                            handleMoveToPortfolio(t);
                                        }}
                                    >
                                        <PieChart size={16} style={{ marginRight: '6px' }} /> Move to Portfolio
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-paper-action btn-exit-trade"
                                        style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                                        onClick={() => {
                                            const t = viewTradeModal;
                                            setViewTradeModal(null);
                                            handleOpenExitModal(t);
                                        }}
                                    >
                                        <TrendingUp size={16} style={{ marginRight: '6px' }} /> Book Profits / Exit
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                className="btn-paper-action btn-secondary"
                                onClick={() => setViewTradeModal(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: Corporate Action & Position Adjustment Wizard ── */}
            {corporateActionModal && (
                <CorporateActionModal
                    trade={corporateActionModal.trade}
                    initialAction={corporateActionModal.action || 'STOCK_SPLIT'}
                    initialRatio={corporateActionModal.ratio || { from: 1, to: 10 }}
                    onClose={() => setCorporateActionModal(null)}
                    onSuccess={() => {
                        setCorporateActionModal(null);
                        fetchTrades();
                    }}
                />
            )}
        </div>
    );
}
