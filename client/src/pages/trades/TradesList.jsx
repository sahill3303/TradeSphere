import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_BADGE = { OPEN: 'badge--yellow', CLOSED: 'badge--green' };
const MODE_COLOR = { LONG: 'var(--color-success)', SHORT: 'var(--color-danger)' };

function fmt(n) {
    if (n === null || n === undefined) return '—';
    const num = Number(n);
    return (num >= 0 ? '+' : '') + '₹' + Math.abs(num).toLocaleString();
}

// Safe date: extracts DD/MM/YYYY from any date value without timezone issues
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

// Inline action button
function ActionBtn({ onClick, disabled, color, children }) {
    return (
        <button onClick={onClick} disabled={disabled} style={{
            background: 'none', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color, fontSize: 'var(--font-size-sm)', fontWeight: 500, padding: 0,
            opacity: disabled ? 0.5 : 1,
        }}>{children}</button>
    );
}

export default function TradesList() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('active');

    // ── Active trades ─────────────────────────────────────────────────────────
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // ── Deleted trades ────────────────────────────────────────────────────────
    const [deleted, setDeleted] = useState([]);
    const [deletedLoading, setDeletedLoading] = useState(false);
    const [deletedError, setDeletedError] = useState('');
    const [restoringId, setRestoringId] = useState(null);
    const [hardDeletingId, setHardDeletingId] = useState(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchTrades = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = statusFilter ? `?status=${statusFilter}&limit=50` : '?limit=50';
            const { data } = await api.get(`/api/trades${params}`);
            setTrades(data.trades);
        } catch { setError('Failed to load trades.'); }
        finally { setLoading(false); }
    }, [statusFilter]);

    const fetchDeleted = useCallback(async () => {
        setDeletedLoading(true); setDeletedError('');
        try {
            const { data } = await api.get('/api/trades/deleted');
            setDeleted(data);
        } catch { setDeletedError('Failed to load deleted trades.'); }
        finally { setDeletedLoading(false); }
    }, []);

    useEffect(() => { fetchTrades(); }, [fetchTrades]);
    useEffect(() => { if (activeTab === 'deleted') fetchDeleted(); }, [activeTab, fetchDeleted]);

    // ── Soft delete ───────────────────────────────────────────────────────────
    async function handleDelete(tradeId, stockName) {
        if (!window.confirm(`Move "${stockName}" to Deleted Trades?`)) return;
        setDeletingId(tradeId);
        try {
            await api.delete(`/api/trades/${tradeId}`);
            setTrades(prev => prev.filter(t => t.trade_id !== tradeId));
        } catch (err) { alert(err.response?.data?.message || 'Delete failed.'); }
        finally { setDeletingId(null); }
    }

    // ── Restore ───────────────────────────────────────────────────────────────
    async function handleRestore(tradeId, stockName) {
        if (!window.confirm(`Restore "${stockName}"?`)) return;
        setRestoringId(tradeId);
        try {
            await api.patch(`/api/trades/${tradeId}/restore`);
            setDeleted(prev => prev.filter(t => t.trade_id !== tradeId));
            fetchTrades();
        } catch (err) { alert(err.response?.data?.message || 'Restore failed.'); }
        finally { setRestoringId(null); }
    }

    // ── Hard delete ───────────────────────────────────────────────────────────
    async function handleHardDelete(tradeId, stockName) {
        if (!window.confirm(`⚠️ Permanently delete "${stockName}"? This CANNOT be undone.`)) return;
        setHardDeletingId(tradeId);
        try {
            await api.delete(`/api/trades/${tradeId}/permanent`);
            setDeleted(prev => prev.filter(t => t.trade_id !== tradeId));
        } catch (err) { alert(err.response?.data?.message || 'Hard delete failed.'); }
        finally { setHardDeletingId(null); }
    }

    return (
        <div className="page">
            <div className="page__header">
                <h2 className="page__title">Trades</h2>
                {activeTab === 'active' && (
                    <Button variant="primary" onClick={() => navigate('/trades/open')}>+ Open Trade</Button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-sm)' }}>
                <TabBtn active={activeTab === 'active'} onClick={() => setActiveTab('active')}>Active Trades</TabBtn>
                <TabBtn active={activeTab === 'deleted'} onClick={() => setActiveTab('deleted')}>Deleted Trades</TabBtn>
            </div>

            {/* ── ACTIVE TRADES ─────────────────────────────────────────────── */}
            {activeTab === 'active' && (
                <>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
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
                            <p>No trades found. <Link to="/trades/open" style={{ color: 'var(--color-primary)' }}>Open your first trade →</Link></p>
                        </Card>
                    )}

                    {!loading && !error && trades.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Direction</th>
                                        <th>Mode</th>
                                        <th>Entry ₹</th>
                                        <th>Qty</th>
                                        <th>P&L</th>
                                        <th>Status</th>
                                        <th>Open Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trades.map(t => (
                                        <tr key={t.trade_id}>
                                            <td style={{ fontWeight: 700 }}>{t.stock_name}</td>
                                            <td>
                                                <span style={{ color: MODE_COLOR[t.trade_type] || 'inherit', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                    {t.trade_type === 'LONG' ? '▲' : '▼'} {t.trade_type}
                                                </span>
                                            </td>
                                            <td><span className="badge badge--yellow" style={{ fontSize: '0.7rem' }}>{t.mode}</span></td>
                                            <td>₹{Number(t.entry_price).toLocaleString()}</td>
                                            <td>{t.quantity}</td>
                                            <td style={{
                                                fontWeight: 600,
                                                color: t.total_pnl > 0 ? 'var(--color-success)'
                                                    : t.total_pnl < 0 ? 'var(--color-danger)' : 'inherit'
                                            }}>
                                                {t.status === 'OPEN' ? '—' : fmt(t.total_pnl)}
                                            </td>
                                            <td><span className={`badge ${STATUS_BADGE[t.status] ?? ''}`}>{t.status}</span></td>
                                            {/* Show user-entered trade_date; fallback to created_at */}
                                            <td>{fmtDate(t.trade_date) ?? fmtDate(t.created_at) ?? '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <Link to={`/trades/${t.trade_id}`} className="table-link">View</Link>
                                                    <span style={{ color: 'var(--color-border)' }}>|</span>
                                                    <ActionBtn onClick={() => handleDelete(t.trade_id, t.stock_name)}
                                                        disabled={deletingId === t.trade_id} color="var(--color-danger)">
                                                        {deletingId === t.trade_id ? 'Deleting…' : 'Delete'}
                                                    </ActionBtn>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </>
            )}

            {/* ── DELETED TRADES ────────────────────────────────────────────── */}
            {activeTab === 'deleted' && (
                <>
                    {deletedLoading && <p className="status-text">Loading deleted trades…</p>}
                    {deletedError && <div className="alert alert--error">{deletedError}</div>}

                    {!deletedLoading && !deletedError && deleted.length === 0 && (
                        <Card className="empty-state"><p>No deleted trades.</p></Card>
                    )}

                    {!deletedLoading && !deletedError && deleted.length > 0 && (
                        <Card style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Status</th>
                                        <th>P&L</th>
                                        <th>Deleted On</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deleted.map(t => (
                                        <tr key={t.trade_id} style={{ opacity: 0.8 }}>
                                            <td style={{ fontWeight: 700 }}>{t.stock_name}</td>
                                            <td><span className={`badge ${STATUS_BADGE[t.status] ?? ''}`}>{t.status}</span></td>
                                            <td style={{ fontWeight: 600, color: t.total_pnl > 0 ? 'var(--color-success)' : t.total_pnl < 0 ? 'var(--color-danger)' : 'inherit' }}>
                                                {fmt(t.total_pnl)}
                                            </td>
                                            <td>{fmtDate(t.deleted_at) ?? '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                    <ActionBtn onClick={() => handleRestore(t.trade_id, t.stock_name)}
                                                        disabled={restoringId === t.trade_id} color="var(--color-success)">
                                                        {restoringId === t.trade_id ? 'Restoring…' : '↩ Restore'}
                                                    </ActionBtn>
                                                    <span style={{ color: 'var(--color-border)' }}>|</span>
                                                    <ActionBtn onClick={() => handleHardDelete(t.trade_id, t.stock_name)}
                                                        disabled={hardDeletingId === t.trade_id} color="var(--color-danger)">
                                                        {hardDeletingId === t.trade_id ? 'Deleting…' : '🗑 Delete Forever'}
                                                    </ActionBtn>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
