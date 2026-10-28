import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Pencil, Lock, CheckCircle, XCircle, ArrowLeft, Target, Shield, Zap, Sparkles, Check } from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const NIFTY_MOODS = ['BULLISH', 'BEARISH', 'SIDEWAYS', 'VOLATILE', 'NEUTRAL'];
const EXIT_REASONS = ['TARGET_HIT', 'SL_HIT', 'MANUAL', 'EOD', 'NEWS', 'OTHER'];
const EMOTIONS = ['CALM', 'GREEDY', 'FEARFUL', 'CONFIDENT', 'IMPULSIVE', 'DISCIPLINED'];
const STRATEGIES = ['BREAKOUT', 'REVERSAL', 'TREND_FOLLOW', 'SCALP', 'SWING', 'NEWS_PLAY', 'VALUE_INVESTING', 'GROWTH', 'OTHER'];
const TRADE_TYPES = ['INTRADAY', 'SWING', 'MTF', 'LONG TERM'];

function fmtDate(val) {
    if (!val) return '—';
    const s = val instanceof Date ? val.toISOString() : String(val);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

function normalizeType(mode) {
    if (!mode) return 'INTRADAY';
    const m = String(mode).trim().toUpperCase().replace(/[\s_-]+/g, '');
    if (m === 'LONGTERM') return 'LONG TERM';
    if (m === 'SWING') return 'SWING';
    if (m === 'MTF') return 'MTF';
    return 'INTRADAY';
}

export default function TradeDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [trade, setTrade] = useState(null);
    const [notes, setNotes] = useState([]);
    const [clients, setClients] = useState([]);
    const [availableClients, setAvailableClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ── Note state ────────────────────────────────────────────────────────────
    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [noteError, setNoteError] = useState('');

    // ── Exit form state ───────────────────────────────────────────────────────
    const [showExitForm, setShowExitForm] = useState(false);
    const [exitForm, setExitForm] = useState({
        exit_price: '',
        quantity: '',
        exit_nifty_mood: 'NEUTRAL',
        exit_reason: 'TARGET_HIT',
        exit_emotion: 'DISCIPLINED',
        conclusion: '',
        exit_notes: '',
        exit_date: new Date().toISOString().split('T')[0],
    });
    const [exitSubmitting, setExitSubmitting] = useState(false);
    const [exitError, setExitError] = useState('');

    // ── Edit form state (Everything Editable) ──────────────────────────────────
    const [showEditForm, setShowEditForm] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState('');

    // ── Stock autocomplete for edit form ──────────────────────────────────────
    const [editStockSuggestions, setEditStockSuggestions] = useState([]);
    const [editIsSearchingStock, setEditIsSearchingStock] = useState(false);
    const [editShowSuggestions, setEditShowSuggestions] = useState(false);
    const editStockSearchTimeout = useRef(null);
    const editStockInputRef = useRef(null);
    const editSuggestionsRef = useRef(null);

    // Close edit suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (
                editStockInputRef.current && !editStockInputRef.current.contains(e.target) &&
                editSuggestionsRef.current && !editSuggestionsRef.current.contains(e.target)
            ) {
                setEditShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        api.get(`/trades/${id}`)
            .then(({ data }) => {
                setTrade(data.trade);
                setNotes(data.notes || []);
                setClients(data.clients || []);
            })
            .catch(() => setError('Trade not found or could not be loaded.'))
            .finally(() => setLoading(false));

        api.get('/clients')
            .then(res => {
                if (res.data?.data) {
                    setAvailableClients(res.data.data.filter(c => c.status === 'ACTIVE'));
                }
            })
            .catch(err => console.error('Failed to load clients', err));
    }, [id]);

    useEffect(() => {
        if (searchParams.get('edit') === 'true' && trade) {
            openEditForm();
        }
    }, [searchParams, trade]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const pnlColor = !trade ? 'inherit'
        : trade.total_pnl > 0 ? 'var(--color-success)'
            : trade.total_pnl < 0 ? 'var(--color-danger)'
                : 'inherit';

    // ── Add note ──────────────────────────────────────────────────────────────
    async function handleAddNote(e) {
        e.preventDefault();
        if (!noteText.trim()) { setNoteError('Note cannot be empty.'); return; }
        setAddingNote(true); setNoteError('');
        try {
            await api.post(`/trades/${id}/notes`, { note_text: noteText.trim() });
            setNotes(prev => [...prev, { note_id: Date.now(), note_text: noteText.trim(), created_at: new Date().toISOString() }]);
            setNoteText('');
        } catch (err) { setNoteError(err.response?.data?.message || 'Failed to add note.'); }
        finally { setAddingNote(false); }
    }

    // ── Exit trade ────────────────────────────────────────────────────────────
    function handleExitChange(e) { const { id: fid, value } = e.target; setExitForm(prev => ({ ...prev, [fid]: value })); }

    async function handleExit(e) {
        e.preventDefault();
        setExitError('');
        
        const actualExitDate = trade.mode === 'INTRADAY' && trade.trade_date
            ? new Date(trade.trade_date).toISOString().split('T')[0] 
            : exitForm.exit_date;

        if (!exitForm.exit_price || isNaN(exitForm.exit_price) || +exitForm.exit_price <= 0) {
            setExitError('Valid exit price is required.');
            return;
        }

        const dateMatch = String(actualExitDate).match(/^(\d+)-(\d{2})-(\d{2})/);
        if (!dateMatch || dateMatch[1].length !== 4 || +dateMatch[1] < 2000 || +dateMatch[1] > 2099) {
            setExitError('Exit date year must be a 4-digit year between 2000 and 2099.');
            return;
        }

        setExitSubmitting(true);
        try {
            const finalNotes = exitForm.exit_notes || exitForm.conclusion || '';
            const { data } = await api.patch(`/trades/${id}/exit`, {
                exit_price: Number(exitForm.exit_price),
                quantity: Number(exitForm.quantity) || trade.quantity,
                exit_nifty_mood: exitForm.exit_nifty_mood,
                exit_reason: exitForm.exit_reason || 'TARGET_HIT',
                exit_emotion: exitForm.exit_emotion || 'DISCIPLINED',
                conclusion: finalNotes,
                exit_notes: finalNotes,
                exit_date: actualExitDate,
            });
            setTrade(prev => ({ 
                ...prev, 
                status: 'CLOSED', 
                total_pnl: data.total_pnl, 
                quantity: data.quantity || prev.quantity, 
                ...exitForm, 
                conclusion: finalNotes,
                exit_notes: finalNotes,
                exit_date: actualExitDate, 
                exit_price: Number(exitForm.exit_price) 
            }));
            setShowExitForm(false);
        } catch (err) { setExitError(err.response?.data?.message || 'Failed to exit trade.'); }
        finally { setExitSubmitting(false); }
    }

    // ── Open Edit Form — populate EVERYTHING ──────────────────────────────────
    function openEditForm() {
        if (!trade) return;
        const normMode = normalizeType(trade.mode);
        const tradeDateStr = trade.trade_date 
            ? new Date(trade.trade_date).toISOString().split('T')[0] 
            : (trade.created_at ? new Date(trade.created_at).toISOString().split('T')[0] : '');

        const exitDateStr = trade.exit_date 
            ? new Date(trade.exit_date).toISOString().split('T')[0] 
            : '';

        setEditForm({
            stock_name: trade.stock_name || '',
            mode: trade.trade_type === 'SHORT' ? 'SELL' : 'BUY',
            trade_type: normMode,
            leverage: trade.leverage ?? '1',
            entry_price: trade.entry_price ?? '',
            quantity: trade.quantity ?? '',
            target: trade.target ?? '',
            stop_loss: trade.stop_loss ?? '',
            trade_date: tradeDateStr,
            strategy: trade.strategy || '',
            conviction_level: trade.conviction_level ? String(trade.conviction_level) : '5',
            entry_nifty_mood: trade.entry_nifty_mood || 'NEUTRAL',
            entry_notes: trade.entry_notes || '',
            client_ids: clients.map(c => c.client_id),
            ...(trade.status === 'CLOSED' ? {
                exit_price: trade.exit_price ?? '',
                exit_date: exitDateStr,
                exit_reason: trade.exit_reason || 'TARGET_HIT',
                exit_emotion: trade.exit_emotion || 'DISCIPLINED',
                exit_nifty_mood: trade.exit_nifty_mood || 'NEUTRAL',
                exit_notes: trade.exit_notes || trade.conclusion || '',
            } : {})
        });
        setEditStockSuggestions([]);
        setEditShowSuggestions(false);
        setShowEditForm(true);
        setShowExitForm(false);
    }

    function handleEditStockInput(e) {
        const value = e.target.value;
        setEditForm(prev => ({ ...prev, stock_name: value }));

        if (editStockSearchTimeout.current) clearTimeout(editStockSearchTimeout.current);

        if (value.length < 2) {
            setEditStockSuggestions([]);
            setEditShowSuggestions(false);
            return;
        }

        editStockSearchTimeout.current = setTimeout(async () => {
            try {
                setEditIsSearchingStock(true);
                const { data } = await api.get(`/watchlist/search?q=${encodeURIComponent(value)}`);
                if (data.success && data.data.length > 0) {
                    setEditStockSuggestions(data.data);
                    setEditShowSuggestions(true);
                } else {
                    setEditStockSuggestions([]);
                    setEditShowSuggestions(false);
                }
            } catch (err) {
                console.error('Stock search failed', err);
            } finally {
                setEditIsSearchingStock(false);
            }
        }, 350);
    }

    function handleEditSelectStock(suggestion) {
        const cleanSymbol = suggestion.symbol ? suggestion.symbol.replace(/^[A-Z]+:/, '') : suggestion.symbol;
        setEditForm(prev => ({ ...prev, stock_name: cleanSymbol }));
        setEditStockSuggestions([]);
        setEditShowSuggestions(false);
    }

    function handleEditChange(e) {
        const { id: fid, value } = e.target;
        setEditForm(prev => ({ ...prev, [fid]: value }));
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        setEditError('');

        if (!editForm.stock_name?.trim()) { setEditError('Stock symbol is required.'); return; }
        if (!editForm.entry_price || isNaN(editForm.entry_price) || +editForm.entry_price <= 0) { setEditError('Valid entry price is required.'); return; }
        if (!editForm.quantity || isNaN(editForm.quantity) || +editForm.quantity <= 0) { setEditError('Valid quantity is required.'); return; }
        if (!editForm.trade_date) { setEditError('Entry date is required.'); return; }

        const entryDateMatch = String(editForm.trade_date).match(/^(\d+)-(\d{2})-(\d{2})/);
        if (!entryDateMatch || entryDateMatch[1].length !== 4 || +entryDateMatch[1] < 2000 || +entryDateMatch[1] > 2099) {
            setEditError('Entry date year must be a 4-digit year between 2000 and 2099.');
            return;
        }

        if (trade.status === 'CLOSED') {
            if (editForm.exit_date) {
                const exitDateMatch = String(editForm.exit_date).match(/^(\d+)-(\d{2})-(\d{2})/);
                if (!exitDateMatch || exitDateMatch[1].length !== 4 || +exitDateMatch[1] < 2000 || +exitDateMatch[1] > 2099) {
                    setEditError('Exit date year must be a 4-digit year between 2000 and 2099.');
                    return;
                }
            }
            if (editForm.exit_price && (isNaN(editForm.exit_price) || +editForm.exit_price <= 0)) {
                setEditError('Valid exit price required for closed trade.');
                return;
            }
        }

        setEditSubmitting(true);
        try {
            await api.patch(`/trades/${id}`, {
                stock_name: editForm.stock_name.trim().toUpperCase(),
                trade_type: editForm.mode === 'SELL' ? 'SHORT' : 'LONG',
                mode: editForm.trade_type,
                leverage: (editForm.trade_type === 'SWING' || editForm.trade_type === 'LONG TERM') ? 1 : Number(editForm.leverage || 1),
                entry_price: Number(editForm.entry_price),
                quantity: Number(editForm.quantity),
                target: editForm.target ? Number(editForm.target) : null,
                stop_loss: editForm.stop_loss ? Number(editForm.stop_loss) : null,
                trade_date: editForm.trade_date || null,
                strategy: editForm.strategy || null,
                conviction_level: editForm.conviction_level ? Number(editForm.conviction_level) : null,
                entry_nifty_mood: editForm.entry_nifty_mood || null,
                entry_notes: editForm.entry_notes ? editForm.entry_notes.trim() : null,
                client_ids: editForm.client_ids,
                ...(trade.status === 'CLOSED' ? {
                    exit_price: editForm.exit_price ? Number(editForm.exit_price) : null,
                    exit_date: editForm.exit_date || null,
                    exit_reason: editForm.exit_reason || null,
                    exit_emotion: editForm.exit_emotion || null,
                    exit_nifty_mood: editForm.exit_nifty_mood || null,
                    exit_notes: editForm.exit_notes ? editForm.exit_notes.trim() : null,
                    conclusion: editForm.exit_notes ? editForm.exit_notes.trim() : null,
                } : {})
            });

            // Reload full trade
            const { data } = await api.get(`/trades/${id}`);
            setTrade(data.trade);
            setClients(data.clients || []);
            setShowEditForm(false);
        } catch (err) {
            setEditError(err.response?.data?.message || 'Failed to update trade.');
        } finally {
            setEditSubmitting(false);
        }
    }

    if (loading) return <div className="page"><p className="status-text">Loading trade…</p></div>;
    if (error) return <div className="page"><div className="alert alert--error">{error}</div></div>;

    const isLongTermEdit = editForm.trade_type === 'LONG TERM';

    return (
        <div className="page" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div className="page__header" style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <Button variant="secondary" onClick={() => navigate('/trades')}>
                        <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back
                    </Button>
                    <h2 className="page__title" style={{ margin: 0 }}>{trade.stock_name}</h2>
                    <span className={`badge ${trade.status === 'OPEN' ? 'badge--yellow' : 'badge--green'}`} style={{ fontSize: '0.8rem' }}>
                        {trade.status}
                    </span>
                    <span className="badge badge--gold" style={{ fontSize: '0.8rem' }}>
                        {trade.mode}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {showEditForm && (
                        <Button variant="secondary" onClick={() => setShowEditForm(false)}>
                            Cancel Edit
                        </Button>
                    )}
                    {trade.status === 'OPEN' && (
                        <Button variant="danger" onClick={() => { 
                            setShowExitForm(s => {
                                if (!s) setExitForm(prev => ({ ...prev, quantity: trade.quantity }));
                                return !s;
                            }); 
                            setShowEditForm(false); 
                        }}>
                            {showExitForm ? 'Cancel Exit' : <><Lock size={14} style={{ marginRight: '6px' }} /> Book Profits / Exit</>}
                        </Button>
                    )}
                </div>
            </div>

            {/* ── FULL EDIT FORM (EVERYTHING EDITABLE) ────────────────────── */}
            {showEditForm && (
                <Card style={{ borderColor: 'var(--color-primary)', background: 'var(--color-surface)', marginBottom: 'var(--space-lg)', border: '1.5px solid var(--color-gold)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Pencil size={18} /> Edit Complete Trade Parameters
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            All fields are fully customizable
                        </span>
                    </div>

                    {editError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>{editError}</div>}

                    <form onSubmit={handleEditSubmit} noValidate>
                        {/* Section 1: Instrument, Direction & Type */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-sm)' }}>
                                1. Position Setup
                            </h4>
                            <div className="form-grid">
                                {/* Stock Symbol Autocomplete */}
                                <div className="form-group stock-autocomplete-wrapper" style={{ position: 'relative' }}>
                                    <label className="form-label">Stock Symbol *</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            ref={editStockInputRef}
                                            type="text"
                                            value={editForm.stock_name || ''}
                                            onChange={handleEditStockInput}
                                            onFocus={() => editStockSuggestions.length > 0 && setEditShowSuggestions(true)}
                                            placeholder="Search symbol..."
                                            autoComplete="off"
                                            className="form-input"
                                            style={{ paddingRight: editIsSearchingStock ? '2.5rem' : undefined, textTransform: 'uppercase' }}
                                        />
                                        {editIsSearchingStock && <div className="stock-search-spinner" />}
                                    </div>
                                    {editShowSuggestions && editStockSuggestions.length > 0 && (
                                        <div ref={editSuggestionsRef} className="stock-suggestions-dropdown">
                                            {editStockSuggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className="stock-suggestion-item"
                                                    onMouseDown={(e) => { e.preventDefault(); handleEditSelectStock(s); }}
                                                >
                                                    <span className="stock-suggestion-name">{s.name}</span>
                                                    <span className="stock-suggestion-symbol">{s.symbol}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Mode (BUY / SELL) — If Long Term, only BUY */}
                                <div className="form-group">
                                    <label className="form-label">Action / Direction</label>
                                    {isLongTermEdit ? (
                                        <div style={{
                                            padding: '0.62rem 1rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--color-success-soft)',
                                            border: '1.5px solid var(--color-success)',
                                            color: 'var(--color-success)',
                                            fontWeight: 700,
                                            fontSize: '0.85rem'
                                        }}>
                                            ▲ BUY (Long Term Delivery Only)
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            {['BUY', 'SELL'].map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, mode: m }))}
                                                    style={{
                                                        padding: '0.6rem 0.5rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        border: `1.5px solid ${editForm.mode === m ? (m === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)'}`,
                                                        background: editForm.mode === m ? (m === 'BUY' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)') : 'transparent',
                                                        color: editForm.mode === m ? (m === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-text-muted)',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {m === 'BUY' ? '▲ BUY' : '▼ SELL'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-grid" style={{ marginTop: 'var(--space-sm)' }}>
                                <div className="form-group">
                                    <label className="form-label">Trade Type</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'var(--color-surface-alt)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
                                        {TRADE_TYPES.map(tt => (
                                            <button
                                                key={tt}
                                                type="button"
                                                onClick={() => setEditForm(prev => ({
                                                    ...prev,
                                                    trade_type: tt,
                                                    mode: tt === 'LONG TERM' ? 'BUY' : prev.mode,
                                                    leverage: (tt === 'SWING' || tt === 'LONG TERM') ? '0' : (prev.leverage === '0' ? '1' : prev.leverage)
                                                }))}
                                                style={{
                                                    padding: '0.45rem 0.2rem',
                                                    borderRadius: '4px',
                                                    border: 'none',
                                                    background: editForm.trade_type === tt ? 'var(--color-primary)' : 'transparent',
                                                    color: editForm.trade_type === tt ? '#000' : 'var(--color-text-muted)',
                                                    fontWeight: editForm.trade_type === tt ? 700 : 500,
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {tt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Input
                                    id="leverage"
                                    label="Leverage"
                                    type="number"
                                    value={editForm.leverage}
                                    onChange={handleEditChange}
                                    disabled={editForm.trade_type === 'SWING' || editForm.trade_type === 'LONG TERM'}
                                    placeholder="1"
                                />
                            </div>
                        </div>

                        {/* Section 2: Execution & Price */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-sm)' }}>
                                2. Execution & Risk Parameters
                            </h4>
                            <div className="form-grid">
                                <Input id="entry_price" label="Entry Price ₹ *" type="number" step="any"
                                    value={editForm.entry_price} onChange={handleEditChange} required />
                                <Input id="quantity" label="Quantity *" type="number"
                                    value={editForm.quantity} onChange={handleEditChange} required />
                                <Input id="target" label="Target Price ₹" type="number" step="any"
                                    value={editForm.target} onChange={handleEditChange} placeholder="Optional" />
                                <Input id="stop_loss" label="Stop Loss ₹" type="number" step="any"
                                    value={editForm.stop_loss} onChange={handleEditChange} placeholder="Optional" />
                                <Input id="trade_date" label="Entry Date *" type="date" min="2000-01-01" max="2099-12-31"
                                    value={editForm.trade_date} onChange={handleEditChange} required />
                            </div>
                        </div>

                        {/* Section 3: Client Allocation */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Client Allocation</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditForm(prev => ({ ...prev, client_ids: availableClients.map(c => c.client_id) }))}
                                        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--color-text-muted)', padding: '2px 8px', cursor: 'pointer' }}
                                    >
                                        Select All ({availableClients.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditForm(prev => ({ ...prev, client_ids: [] }))}
                                        style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--color-text-muted)', padding: '2px 8px', cursor: 'pointer' }}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {availableClients.map(c => {
                                    const isSel = editForm.client_ids?.includes(c.client_id);
                                    return (
                                        <button
                                            key={c.client_id}
                                            type="button"
                                            onClick={() => setEditForm(prev => {
                                                const newIds = isSel 
                                                    ? prev.client_ids.filter(id => id !== c.client_id)
                                                    : [...(prev.client_ids || []), c.client_id];
                                                return { ...prev, client_ids: newIds };
                                            })}
                                            style={{
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1.5px solid ${isSel ? 'var(--color-gold)' : 'var(--color-border)'}`,
                                                background: isSel ? 'var(--color-gold-soft)' : 'var(--color-surface-alt)',
                                                color: isSel ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                                fontWeight: isSel ? 700 : 500,
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {isSel && <Check size={12} />}
                                            {c.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section 4: Strategy & Psychology */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-sm)' }}>
                                3. Strategy & Psychology
                            </h4>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Strategy (Optional)</label>
                                    <select id="strategy" className="form-input" value={editForm.strategy || ''} onChange={handleEditChange}>
                                        <option value="">No Strategy Tag</option>
                                        {STRATEGIES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Entry Nifty Mood (Optional)</label>
                                    <select id="entry_nifty_mood" className="form-input" value={editForm.entry_nifty_mood || 'NEUTRAL'} onChange={handleEditChange}>
                                        {NIFTY_MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                <label className="form-label">Conviction Level: {editForm.conviction_level || 5}/10</label>
                                <input
                                    id="conviction_level"
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={editForm.conviction_level || 5}
                                    onChange={handleEditChange}
                                    style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Entry Notes / Thesis</label>
                                <textarea
                                    id="entry_notes"
                                    className="form-input"
                                    rows={2}
                                    value={editForm.entry_notes || ''}
                                    onChange={handleEditChange}
                                    placeholder="Trade thesis or rationale..."
                                />
                            </div>
                        </div>

                        {/* Section 5: Closed Trade Exit Parameters (Only if trade is CLOSED) */}
                        {trade.status === 'CLOSED' && (
                            <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-sm)' }}>
                                    4. Closed Trade Exit Details
                                </h4>
                                <div className="form-grid">
                                    <Input id="exit_price" label="Exit Price ₹ *" type="number" step="any"
                                        value={editForm.exit_price || ''} onChange={handleEditChange} required />
                                    <Input id="exit_date" label="Exit Date" type="date" min="2000-01-01" max="2099-12-31"
                                        value={editForm.exit_date || ''} onChange={handleEditChange} />
                                    <div className="form-group">
                                        <label className="form-label">Exit Reason</label>
                                        <select id="exit_reason" className="form-input" value={editForm.exit_reason || 'TARGET_HIT'} onChange={handleEditChange}>
                                            {EXIT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Exit Mood</label>
                                        <select id="exit_nifty_mood" className="form-input" value={editForm.exit_nifty_mood || 'NEUTRAL'} onChange={handleEditChange}>
                                            {NIFTY_MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-xs)' }}>
                                    <label className="form-label">Exit Notes / Takeaways</label>
                                    <textarea
                                        id="exit_notes"
                                        className="form-input"
                                        rows={2}
                                        value={editForm.exit_notes || ''}
                                        onChange={handleEditChange}
                                        placeholder="Key exit takeaways, conclusion, lessons..."
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                            <Button type="button" variant="secondary" onClick={() => setShowEditForm(false)} disabled={editSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={editSubmitting}>
                                {editSubmitting ? 'Saving All Changes…' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* ── Exit form modal / card ───────────────────────────────────── */}
            {showExitForm && (
                <Card style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-soft)', marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--color-danger)' }}>
                        Exit Trade Position ({trade.stock_name})
                    </h3>
                    {exitError && <div className="alert alert--error" style={{ marginBottom: 'var(--space-sm)' }}>{exitError}</div>}
                    <form onSubmit={handleExit} noValidate>
                        <div className="form-grid">
                            <Input id="exit_price" label="Exit Price ₹ *" type="number" step="any"
                                value={exitForm.exit_price} onChange={handleExitChange}
                                placeholder="0.00" required />
                            <Input id="quantity" label="Exit Quantity *" type="number"
                                value={exitForm.quantity} onChange={handleExitChange}
                                placeholder="Full quantity by default" required />
                            <Input id="exit_date" label="Exit Date *" type="date" min="2000-01-01" max="2099-12-31"
                                value={trade.mode === 'INTRADAY' && trade.trade_date ? new Date(trade.trade_date).toISOString().split('T')[0] : exitForm.exit_date} 
                                onChange={handleExitChange} required 
                                disabled={trade.mode === 'INTRADAY'} />
                            <div className="form-group">
                                <label className="form-label">Exit Reason <span className="required-mark">*</span></label>
                                <select id="exit_reason" className="form-input" value={exitForm.exit_reason} onChange={handleExitChange}>
                                    {EXIT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Emotion at Exit <span className="required-mark">*</span></label>
                                <select id="exit_emotion" className="form-input" value={exitForm.exit_emotion} onChange={handleExitChange}>
                                    {EMOTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nifty Mood at Exit <span className="required-mark">*</span></label>
                                <select id="exit_nifty_mood" className="form-input" value={exitForm.exit_nifty_mood} onChange={handleExitChange}>
                                    {NIFTY_MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group" style={{ marginTop: 'var(--space-sm)' }}>
                            <label htmlFor="exit_notes" className="form-label">Exit Notes / Learnings (Optional)</label>
                            <textarea id="exit_notes" className="form-input"
                                value={exitForm.exit_notes} onChange={handleExitChange}
                                placeholder="What did you learn from this trade? Key exit remarks..." rows={2} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                            <Button type="button" variant="secondary" onClick={() => setShowExitForm(false)} disabled={exitSubmitting}>Cancel</Button>
                            <Button type="submit" variant="danger" disabled={exitSubmitting}>{exitSubmitting ? 'Closing…' : 'Confirm Exit & Lock P&L'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* ── P&L banner for closed trades ─────────────────────────────── */}
            {trade.status === 'CLOSED' && (
                <div style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderRadius: 'var(--radius-md)',
                    background: trade.total_pnl >= 0 ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                    border: `1px solid ${trade.total_pnl >= 0 ? '#86efac' : '#fca5a5'}`,
                    display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                    marginBottom: 'var(--space-lg)'
                }}>
                    {trade.total_pnl >= 0 ? <CheckCircle size={28} color="var(--color-success)" /> : <XCircle size={28} color="var(--color-danger)" />}
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Realised P&L</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: pnlColor }}>
                            {trade.total_pnl >= 0 ? '+' : ''}₹{Number(trade.total_pnl).toLocaleString()}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Trade info grid ───────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>

                {/* Entry details */}
                <Card>
                    <h3 className="detail-card__title">Entry Details</h3>
                    <dl className="detail-list">
                        <dt>Symbol</dt>      <dd style={{ fontWeight: 700 }}>{trade.stock_name}</dd>
                        <dt>Clients</dt>     <dd>{clients.length > 0 ? clients.map(c => <span key={c.client_id} className="badge badge--blue" style={{ marginRight: '4px', marginBottom: '4px' }}>{c.name}</span>) : '—'}</dd>
                        <dt>Direction</dt>   <dd style={{ color: trade.trade_type === 'LONG' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>{trade.trade_type === 'LONG' ? '▲' : '▼'} {trade.trade_type}</dd>
                        <dt>Trade Type</dt>  <dd><span className="badge badge--yellow">{trade.mode}</span></dd>
                        <dt>Entry Price</dt> <dd>₹{Number(trade.entry_price).toLocaleString()}</dd>
                        <dt>Quantity</dt>    <dd>{trade.quantity}</dd>
                        <dt>Entry Date</dt>  <dd>{fmtDate(trade.trade_date) !== '—' ? fmtDate(trade.trade_date) : fmtDate(trade.created_at)}</dd>
                        <dt>Target</dt>      <dd style={{ color: 'var(--color-success)' }}>{trade.target ? `₹${Number(trade.target).toLocaleString()}` : '—'}</dd>
                        <dt>Stop Loss</dt>   <dd style={{ color: 'var(--color-danger)' }}>{trade.stop_loss ? `₹${Number(trade.stop_loss).toLocaleString()}` : '—'}</dd>
                        <dt>Leverage</dt>    <dd>{trade.leverage || 1}x</dd>
                    </dl>
                </Card>

                {/* Strategy */}
                <Card>
                    <h3 className="detail-card__title">Strategy & Psychology</h3>
                    <dl className="detail-list">
                        <dt>Strategy</dt>
                        <dd>{trade.strategy ? <span className="badge badge--yellow">{trade.strategy}</span> : '—'}</dd>

                        <dt>Conviction</dt>
                        <dd>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${((trade.conviction_level || 0) / 10) * 100}%`, background: 'var(--color-primary)', borderRadius: 4 }} />
                                </div>
                                <span style={{ fontWeight: 700 }}>{trade.conviction_level || '—'}/10</span>
                            </div>
                        </dd>

                        <dt>Nifty Mood</dt>
                        <dd>{trade.entry_nifty_mood ? <span className="badge badge--yellow">{trade.entry_nifty_mood}</span> : '—'}</dd>

                        <dt>Entry Notes</dt>
                        <dd style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', gridColumn: '1/-1', marginTop: 'var(--space-xs)' }}>
                            {trade.entry_notes || '—'}
                        </dd>
                    </dl>

                    {trade.status === 'CLOSED' && (
                        <>
                            <div style={{ borderTop: '1px solid var(--color-border)', margin: 'var(--space-md) 0' }} />
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>Exit Info</h4>
                            <dl className="detail-list">
                                <dt>Exit Price</dt>   <dd>₹{Number(trade.exit_price).toLocaleString()}</dd>
                                <dt>Exit Date</dt>    <dd>{fmtDate(trade.exit_date)}</dd>
                                <dt>Reason</dt>        <dd>{trade.exit_reason || '—'}</dd>
                                <dt>Emotion</dt>       <dd>{trade.exit_emotion || '—'}</dd>
                                <dt>Nifty Mood</dt>    <dd>{trade.exit_nifty_mood || '—'}</dd>
                                <dt>Exit Notes</dt>    <dd style={{ gridColumn: '1/-1', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{trade.exit_notes || trade.conclusion || '—'}</dd>
                            </dl>
                        </>
                    )}
                </Card>
            </div>

            {/* ── Trade Notes ────────────────────────────────────────────────── */}
            <Card>
                <h3 className="detail-card__title">
                    Trade Notes
                    {notes.length > 0 && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 600 }}>
                            {notes.length}
                        </span>
                    )}
                </h3>

                {notes.length === 0 && (
                    <p className="placeholder-text" style={{ marginBottom: trade.status === 'OPEN' ? 'var(--space-md)' : 0 }}>
                        No notes recorded for this trade.
                    </p>
                )}

                {notes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: trade.status === 'OPEN' ? 'var(--space-md)' : 0 }}>
                        {notes.map((n, i) => (
                            <div key={n.note_id} style={{
                                padding: 'var(--space-sm) var(--space-md)',
                                background: 'var(--color-surface-alt)',
                                borderRadius: 'var(--radius-sm)',
                                borderLeft: '3px solid var(--color-primary)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <p style={{ fontSize: 'var(--font-size-sm)', margin: 0, flex: 1 }}>{n.note_text}</p>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                        #{i + 1} · {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Note — only for OPEN trades */}
                {trade.status === 'OPEN' && (
                    <>
                        {noteError && <p className="form-error" style={{ marginBottom: 'var(--space-sm)' }}>{noteError}</p>}
                        <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: notes.length > 0 ? 'var(--space-md)' : 0 }}>
                            <textarea
                                className="form-input"
                                value={noteText}
                                onChange={e => { setNoteText(e.target.value); setNoteError(''); }}
                                placeholder="Add a note to this trade…"
                                rows={2}
                                style={{ flex: 1, resize: 'none' }}
                            />
                            <Button type="submit" variant="primary" disabled={addingNote} style={{ alignSelf: 'flex-end' }}>
                                {addingNote ? 'Adding…' : 'Add Note'}
                            </Button>
                        </form>
                    </>
                )}
            </Card>
        </div>
    );
}
