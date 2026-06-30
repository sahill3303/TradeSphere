import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Trash2, RotateCcw } from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_BADGE = { OPEN: 'badge--yellow', CLOSED: 'badge--green' };
const MODE_COLOR = { LONG: 'var(--color-success)', SHORT: 'var(--color-danger)' };

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

export default function TradesList() {
    const navigate = useNavigate();
    const confirmAction = useConfirm();

    const [activeTab, setActiveTab] = useState('active');

    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [deletingId, setDeletingId] = useState(null);

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

    const fetchTrades = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = statusFilter ? `?status=${statusFilter}&limit=50` : '?limit=50';
            const { data } = await api.get(`/trades${params}`);
            setTrades(data.trades);
        } catch { setError('Failed to load trades.'); }
        finally { setLoading(false); }
    }, [statusFilter]);

    const fetchDeleted = useCallback(async () => {
        setDeletedLoading(true); setDeletedError('');
        try {
            const { data } = await api.get('/trades/deleted');
            setDeleted(data);
        } catch { setDeletedError('Failed to load deleted trades.'); }
        finally { setDeletedLoading(false); }
    }, []);

    useEffect(() => { fetchTrades(); }, [fetchTrades]);
    useEffect(() => { if (activeTab === 'deleted') fetchDeleted(); }, [activeTab, fetchDeleted]);

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
                } catch (err) { alert(err.response?.data?.message || 'Delete failed.'); }
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
                } catch (err) { alert(err.response?.data?.message || 'Restore failed.'); }
                finally { setRestoringId(null); }
            }
        });
    }

    async function handleHardDelete(tradeId, stockName) {
        confirmAction({
            title: 'Permanent Delete',
            message: `⚠️ Permanently delete "${stockName}"? This CANNOT be undone.`,
            variant: 'danger',
            onConfirm: async () => {
                setHardDeletingId(tradeId);
                try {
                    await api.delete(`/trades/${tradeId}/permanent`);
                    setDeleted(prev => prev.filter(t => t.trade_id !== tradeId));
                } catch (err) { alert(err.response?.data?.message || 'Hard delete failed.'); }
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

            {activeTab === 'active' && (
                <>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
                        {['', 'OPEN', 'CLOSED'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)} style={{
                                padding: '0.3rem 0.9rem', borderRadius: '999px',
                                border: `1.5px solid ${statusFilter === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                background: statusFilter === s ? 'var(--color-primary-soft)' : 'transparent',
                                color: statusFilter === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontSize: 'var(--font-size-sm)', fontWeight: 500, cursor: 'pointer',
                                transition: 'all var(--transition)',
                            }}>{s === '' ? 'All' : s}</button>
                        ))}
                    </div>

                    {loading && <p className="status-text">Loading trades…</p>}
                    {error && <div className="alert alert--error">{error}</div>}

                    {!loading && !error && trades.length === 0 && (
                        <Card className="empty-state">
                            <p>No trades found.</p>
                        </Card>
                    )}

                    {!loading && !error && trades.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Symbol</th>
                                            <th>Dir</th>
                                            <th className="hide-col-mobile">Entry</th>
                                            <th className="hide-col-mobile">Qty</th>
                                            <th className="hide-col-mobile">Capital</th>
                                            <th className="hide-col-mobile">CMP</th>
                                            <th className="hide-col-mobile">Unrealized P&L</th>
                                            <th className="hide-col-mobile">Status</th>
                                            <th className="hide-col-mobile">Entry Date</th>
                                            <th>P&L</th>
                                            <th>P&L %</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map(t => {
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
                                                    <td style={{
                                                        fontWeight: 600,
                                                        fontSize: '0.8rem',
                                                        color: t.total_pnl > 0 ? 'var(--color-success)'
                                                            : t.total_pnl < 0 ? 'var(--color-danger)' : 'inherit'
                                                     }}>
                                                        {t.status === 'OPEN' ? '—' : fmtLakhs(t.total_pnl)}
                                                    </td>
                                                    <td style={{
                                                        fontWeight: 600,
                                                        fontSize: '0.8rem',
                                                        color: t.status === 'OPEN' 
                                                            ? (unrealizedPnlPct > 0 ? 'var(--color-success)' : unrealizedPnlPct < 0 ? 'var(--color-danger)' : 'inherit')
                                                            : (realizedPnlPct > 0 ? 'var(--color-success)' : realizedPnlPct < 0 ? 'var(--color-danger)' : 'inherit')
                                                     }}>
                                                        {t.status === 'OPEN' 
                                                            ? (unrealizedPnlPct !== null ? `${unrealizedPnlPct > 0 ? '+' : ''}${unrealizedPnlPct.toFixed(2)}%` : '—')
                                                            : (realizedPnlPct !== null ? `${realizedPnlPct > 0 ? '+' : ''}${realizedPnlPct.toFixed(2)}%` : '—')
                                                        }
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
                                        )})}
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
                                            <th>P&L</th>
                                            <th>P&L %</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deleted.map(t => (
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
                                                <td style={{ fontWeight: 600, color: t.total_pnl > 0 ? 'var(--color-success)' : t.total_pnl < 0 ? 'var(--color-danger)' : 'inherit' }}>
                                                    {fmtLakhs(t.total_pnl)}
                                                </td>
                                                <td style={{ fontWeight: 600, color: 'inherit' }}>
                                                    —
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
                                        ))}
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
