import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Lock, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const NIFTY_MOODS = ['BULLISH', 'BEARISH', 'SIDEWAYS', 'VOLATILE', 'NEUTRAL'];
const EXIT_REASONS = ['TARGET_HIT', 'SL_HIT', 'MANUAL', 'EOD', 'NEWS', 'OTHER'];
const EMOTIONS = ['CALM', 'GREEDY', 'FEARFUL', 'CONFIDENT', 'IMPULSIVE', 'DISCIPLINED'];

/**
 * Safe date formatter — extracts YYYY-MM-DD from any value (string, Date object,
 * or ISO timestamp) and returns DD/MM/YYYY without any timezone conversion.
 */
function fmtDate(val) {
    if (!val) return '—';
    // Convert to string representation — handles Date objects and ISO strings
    const s = val instanceof Date ? val.toISOString() : String(val);
    // Match YYYY-MM-DD anywhere in the string
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

export default function TradeDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [trade, setTrade] = useState(null);
    const [notes, setNotes] = useState([]);
    const [clients, setClients] = useState([]);
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
        exit_reason: '',
        exit_emotion: '',
        conclusion: '',
        exit_date: new Date().toISOString().split('T')[0],
    });
    const [exitSubmitting, setExitSubmitting] = useState(false);
    const [exitError, setExitError] = useState('');

    // ── Edit form state ───────────────────────────────────────────────────────
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
            .then(({ data }) => { setTrade(data.trade); setNotes(data.notes || []); setClients(data.clients || []); })
            .catch(() => setError('Trade not found or could not be loaded.'))
            .finally(() => setLoading(false));
    }, [id]);

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

        // Comprehensive validation
        const errs = [];
        if (!exitForm.exit_price) errs.push('Exit price');
        if (!actualExitDate) errs.push('Exit date');
        if (!exitForm.exit_reason) errs.push('Exit reason');
        if (!exitForm.exit_emotion) errs.push('Exit emotion');
        if (!exitForm.exit_nifty_mood) errs.push('Nifty mood');
        if (!exitForm.conclusion.trim()) errs.push('Conclusion/Lesson');

        if (errs.length > 0) {
            setExitError(`Required fields missing: ${errs.join(', ')}`);
            return;
        }

        setExitSubmitting(true);
        try {
            const { data } = await api.patch(`/trades/${id}/exit`, {
                exit_price: Number(exitForm.exit_price),
                quantity: Number(exitForm.quantity) || trade.quantity,
                exit_nifty_mood: exitForm.exit_nifty_mood,
                exit_reason: exitForm.exit_reason,
                exit_emotion: exitForm.exit_emotion,
                conclusion: exitForm.conclusion.trim(),
                exit_date: actualExitDate,
            });
            // Refresh trade data
            setTrade(prev => ({ ...prev, status: 'CLOSED', total_pnl: data.total_pnl, quantity: data.quantity || prev.quantity, ...exitForm, exit_date: actualExitDate, exit_price: Number(exitForm.exit_price) }));
            setShowExitForm(false);
        } catch (err) { setExitError(err.response?.data?.message || 'Failed to exit trade.'); }
        finally { setExitSubmitting(false); }
    }

    // ── Edit trade ────────────────────────────────────────────────────────────
    function openEditForm() {
        setEditForm({
            stock_name: trade.stock_name || '',
            entry_price: trade.entry_price,
            quantity: trade.quantity,
            target: trade.target || '',
            stop_loss: trade.stop_loss || '',
            ...(trade.status === 'CLOSED' ? { exit_price: trade.exit_price } : {})
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
        }, 400);
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
        setEditSubmitting(true);
        try {
            await api.patch(`/trades/${id}`, {
                ...(editForm.stock_name ? { stock_name: editForm.stock_name.trim().toUpperCase() } : {}),
                entry_price: Number(editForm.entry_price),
                quantity: Number(editForm.quantity),
                target: editForm.target ? Number(editForm.target) : null,
                stop_loss: editForm.stop_loss ? Number(editForm.stop_loss) : null,
                ...(trade.status === 'CLOSED' && editForm.exit_price ? { exit_price: Number(editForm.exit_price) } : {})
            });
            const { data } = await api.get(`/trades/${id}`);
            setTrade(data.trade);
            setShowEditForm(false);
        } catch (err) { setEditError(err.response?.data?.message || 'Failed to update trade.'); }
        finally { setEditSubmitting(false); }
    }

    if (loading) return <div className="page"><p className="status-text">Loading trade…</p></div>;
    if (error) return <div className="page"><div className="alert alert--error">{error}</div></div>;

    return (
        <div className="page">
            <div className="page__header">
                <Button variant="secondary" onClick={() => navigate('/trades')}>← Back</Button>
                <h2 className="page__title">{trade.stock_name}</h2>
                <span className={`badge ${trade.status === 'OPEN' ? 'badge--yellow' : 'badge--green'}`} style={{ fontSize: '0.8rem' }}>
                    {trade.status}
                </span>
                <Button variant="secondary" onClick={() => showEditForm ? setShowEditForm(false) : openEditForm()}>
                    {showEditForm ? 'Cancel Edit' : <><Pencil size={14} style={{marginRight: '6px'}} /> Edit</>}
                </Button>
                {trade.status === 'OPEN' && (
                    <Button variant="danger" onClick={() => { 
                        setShowExitForm(s => {
                            if (!s) setExitForm(prev => ({ ...prev, quantity: trade.quantity }));
                            return !s;
                        }); 
                        setShowEditForm(false); 
                    }}>
                        {showExitForm ? 'Cancel Exit' : <><Lock size={14} style={{marginRight: '6px'}} /> Exit Trade</>}
                    </Button>
                )}
            </div>

            {/* ── Edit form ────────────────────────────────────────────────── */}
            {showEditForm && (
                <Card style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-soft)', marginBottom: 'var(--space-md)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--color-primary)' }}>Edit Trade Details</h3>
                    {editError && <div className="alert alert--error">{editError}</div>}
                    <form onSubmit={handleEditSubmit} noValidate>
                        <div className="form-grid">
                            {/* Stock Name with Autocomplete */}
                            <div className="form-group stock-autocomplete-wrapper" style={{ position: 'relative', gridColumn: '1 / -1' }}>
                                <label className="form-label">Stock Symbol</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        ref={editStockInputRef}
                                        type="text"
                                        value={editForm.stock_name || ''}
                                        onChange={handleEditStockInput}
                                        onFocus={() => editStockSuggestions.length > 0 && setEditShowSuggestions(true)}
                                        placeholder="Search or type symbol..."
                                        autoComplete="off"
                                        className="form-input"
                                        style={{ paddingRight: editIsSearchingStock ? '2.5rem' : undefined }}
                                    />
                                    {editIsSearchingStock && (
                                        <div className="stock-search-spinner" />
                                    )}
                                </div>
                                {/* Suggestions Dropdown */}
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
                            <Input id="entry_price" label="Entry Price ₹" type="number"
                                value={editForm.entry_price} onChange={handleEditChange} required />
                            <Input id="quantity" label="Quantity" type="number"
                                value={editForm.quantity} onChange={handleEditChange} required />
                            <Input id="target" label="Target ₹" type="number"
                                value={editForm.target} onChange={handleEditChange} />
                            <Input id="stop_loss" label="Stop Loss ₹" type="number"
                                value={editForm.stop_loss} onChange={handleEditChange} />
                            {trade.status === 'CLOSED' && (
                                <Input id="exit_price" label="Exit Price ₹" type="number"
                                    value={editForm.exit_price} onChange={handleEditChange} required />
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                            <Button type="button" variant="secondary" onClick={() => setShowEditForm(false)} disabled={editSubmitting}>Cancel</Button>
                            <Button type="submit" variant="primary" disabled={editSubmitting}>{editSubmitting ? 'Saving…' : 'Save Changes'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* ── Exit form ────────────────────────────────────────────────── */}
            {showExitForm && (
                <Card style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-soft)' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--color-danger)' }}>Exit Trade</h3>
                    {exitError && <div className="alert alert--error">{exitError}</div>}
                    <form onSubmit={handleExit} noValidate>
                        <div className="form-grid">
                            <Input id="exit_price" label="Exit Price ₹" type="number"
                                value={exitForm.exit_price} onChange={handleExitChange}
                                placeholder="0.00" required />
                            <Input id="quantity" label="Exit Quantity" type="number"
                                value={exitForm.quantity} onChange={handleExitChange}
                                placeholder="Full quantity by default" required />
                            <Input id="exit_date" label="Exit Date" type="date"
                                value={trade.mode === 'INTRADAY' && trade.trade_date ? new Date(trade.trade_date).toISOString().split('T')[0] : exitForm.exit_date} 
                                onChange={handleExitChange} required 
                                disabled={trade.mode === 'INTRADAY'} />
                            <div className="form-group">
                                <label className="form-label">Exit Reason <span className="required-mark">*</span></label>
                                <select id="exit_reason" className="form-input" value={exitForm.exit_reason} onChange={handleExitChange}>
                                    <option value="">Select…</option>
                                    {EXIT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Emotion at Exit <span className="required-mark">*</span></label>
                                <select id="exit_emotion" className="form-input" value={exitForm.exit_emotion} onChange={handleExitChange}>
                                    <option value="">Select…</option>
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
                            <label htmlFor="conclusion" className="form-label">Conclusion / Lesson <span className="required-mark">*</span></label>
                            <textarea id="conclusion" className="form-input"
                                value={exitForm.conclusion} onChange={handleExitChange}
                                placeholder="What did you learn from this trade?" rows={2} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                            <Button type="button" variant="secondary" onClick={() => setShowExitForm(false)} disabled={exitSubmitting}>Cancel</Button>
                            <Button type="submit" variant="danger" disabled={exitSubmitting}>{exitSubmitting ? 'Closing…' : 'Confirm Exit'}</Button>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>

                {/* Entry details */}
                <Card>
                    <h3 className="detail-card__title">Entry Details</h3>
                    <dl className="detail-list">
                        <dt>Symbol</dt>      <dd style={{ fontWeight: 700 }}>{trade.stock_name}</dd>
                        <dt>Clients</dt>     <dd>{clients.length > 0 ? clients.map(c => <span key={c.client_id} className="badge badge--blue" style={{marginRight: '4px', marginBottom: '4px'}}>{c.name}</span>) : '—'}</dd>
                        <dt>Direction</dt>   <dd style={{ color: trade.trade_type === 'LONG' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>{trade.trade_type === 'LONG' ? '▲' : '▼'} {trade.trade_type}</dd>
                        <dt>Mode</dt>        <dd><span className="badge badge--yellow">{trade.mode}</span></dd>
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
                                <dt>Conclusion</dt>    <dd style={{ gridColumn: '1/-1', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{trade.conclusion || '—'}</dd>
                            </dl>
                        </>
                    )}
                </Card>
            </div>

            {/* ── Trade Notes — always visible for reference & learnings ─────── */}
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
