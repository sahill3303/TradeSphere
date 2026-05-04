import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { Link, useNavigate } from 'react-router-dom';
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
    if (abs < 100000) {
        return sign + '₹' + Math.round(abs / 1000) + 'k';
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
                                            <th style={{ width: '35%' }}>Symbol</th>
                                            <th style={{ width: '15%' }}>Dir</th>
                                            <th style={{ width: '30%' }}>P&L</th>
                                            <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map(t => (
                                            <tr key={t.trade_id}>
                                                <td style={{ fontWeight: 600, fontSize: '0.8rem', width: '35%' }}>{t.stock_name}</td>
                                                <td style={{ width: '15%' }}>
                                                    <span style={{ color: MODE_COLOR[t.trade_type] || 'inherit', fontWeight: 600, fontSize: '0.7rem' }}>
                                                        {t.trade_type === 'LONG' ? '▲' : '▼'}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    width: '30%',
                                                    color: t.total_pnl > 0 ? 'var(--color-success)'
                                                        : t.total_pnl < 0 ? 'var(--color-danger)' : 'inherit'
                                                 }}>
                                                    {t.status === 'OPEN' ? '—' : fmtLakhs(t.total_pnl)}
                                                </td>
                                                <td style={{ width: '20%' }}>
                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                        <Link to={`/trades/${t.trade_id}`} className="table-link" title="View">👁️</Link>
                                                        <ActionBtn onClick={() => handleDelete(t.trade_id, t.stock_name)}
                                                            disabled={deletingId === t.trade_id} color="var(--color-danger)">
                                                            {deletingId === t.trade_id ? '⏳' : '🗑️'}
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
                                            <th>P&L</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deleted.map(t => (
                                            <tr key={t.trade_id} style={{ opacity: 0.8 }}>
                                                <td style={{ fontWeight: 700 }}>{t.stock_name}</td>
                                                <td style={{ fontWeight: 600, color: t.total_pnl > 0 ? 'var(--color-success)' : t.total_pnl < 0 ? 'var(--color-danger)' : 'inherit' }}>
                                                    {fmtLakhs(t.total_pnl)}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                        <ActionBtn onClick={() => handleRestore(t.trade_id, t.stock_name)}
                                                            disabled={restoringId === t.trade_id} color="var(--color-success)">
                                                            {restoringId === t.trade_id ? '⏳' : 'Restore'}
                                                        </ActionBtn>
                                                        <ActionBtn onClick={() => handleHardDelete(t.trade_id, t.stock_name)}
                                                            disabled={hardDeletingId === t.trade_id} color="var(--color-danger)">
                                                            {hardDeletingId === t.trade_id ? '⏳' : 'Delete'}
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
