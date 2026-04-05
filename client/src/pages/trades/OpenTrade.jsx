import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

// ── Constants ─────────────────────────────────────────────────────────────────
const NIFTY_MOODS = ['BULLISH', 'BEARISH', 'SIDEWAYS', 'VOLATILE', 'NEUTRAL'];
const STRATEGIES = ['BREAKOUT', 'REVERSAL', 'TREND_FOLLOW', 'SCALP', 'SWING', 'NEWS_PLAY', 'OTHER'];

function today() { return new Date().toISOString().split('T')[0]; }

const BLANK = {
    stock_name: '',
    mode: 'BUY',
    trade_type: 'INTRADAY',
    entry_price: '',
    quantity: '',
    target: '',
    stop_loss: '',
    trade_date: today(),
    strategy: '',
    conviction_level: '5',
    entry_nifty_mood: 'NEUTRAL',
    entry_notes: '',
    leverage: '1',
    client_ids: [],
};

function validate(f) {
    const e = {};
    if (!f.stock_name.trim()) e.stock_name = 'Symbol is required.';
    if (!f.entry_price) e.entry_price = 'Entry price is required.';
    else if (isNaN(f.entry_price) || +f.entry_price <= 0) e.entry_price = 'Invalid price.';
    
    if (!f.quantity) e.quantity = 'Quantity is required.';
    else if (isNaN(f.quantity) || +f.quantity <= 0) e.quantity = 'Invalid quantity.';

    if (!f.target) e.target = 'Target is required.';
    if (!f.stop_loss) e.stop_loss = 'Stop loss is required.';
    if (!f.trade_date) e.trade_date = 'Date is required.';
    if (!f.strategy) e.strategy = 'Select a strategy.';
    if (!f.entry_notes.trim()) e.entry_notes = 'Entry notes are required.';
    if (!f.leverage) e.leverage = 'Leverage is required.';
    if (!f.client_ids || f.client_ids.length === 0) e.client_ids = 'At least one client must be selected.';
    
    return e;
}

export default function OpenTrade() {
    const navigate = useNavigate();
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [availableClients, setAvailableClients] = useState([]);

    useEffect(() => {
        api.get('/api/clients')
           .then(res => {
               if (res.data?.data) {
                   setAvailableClients(res.data.data.filter(c => c.status === 'ACTIVE'));
               }
           })
           .catch(err => console.error("Failed to load clients", err));
    }, []);

    function handleChange(e) {
        const { id, value } = e.target;
        setForm(prev => ({ ...prev, [id]: value }));
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
    }

    // Derived risk/reward preview
    const entryPrice = parseFloat(form.entry_price) || 0;
    const target = parseFloat(form.target) || 0;
    const stopLoss = parseFloat(form.stop_loss) || 0;
    const qty = parseFloat(form.quantity) || 0;
    const maxProfitVal = form.mode === 'BUY' ? (target - entryPrice) * qty : (entryPrice - target) * qty;
    const maxLossVal = form.mode === 'BUY' ? (entryPrice - stopLoss) * qty : (stopLoss - entryPrice) * qty;

    const maxProfit = entryPrice && target ? maxProfitVal.toFixed(2) : null;
    const maxLoss = entryPrice && stopLoss ? maxLossVal.toFixed(2) : null;
    const rr = maxLoss && maxProfit && maxLoss > 0
        ? (Math.abs(maxProfit) / Math.abs(maxLoss)).toFixed(2) : null;

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');
        const errs = validate(form);
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            await api.post('/api/trades', {
                stock_name: form.stock_name.trim().toUpperCase(),
                // DB: trade_type = LONG/SHORT (direction), mode = INTRADAY/MTF (duration)
                trade_type: form.mode === 'BUY' ? 'LONG' : 'SHORT',
                mode: form.trade_type,   // INTRADAY or MTF
                entry_price: Number(form.entry_price),
                quantity: Number(form.quantity),
                target: form.target ? Number(form.target) : null,
                stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
                trade_date: form.trade_date || null,
                strategy: form.strategy || null,
                conviction_level: Number(form.conviction_level),
                entry_nifty_mood: form.entry_nifty_mood,
                entry_notes: form.entry_notes.trim() || null,
                leverage: Number(form.leverage),
                client_ids: form.client_ids,
            });
            navigate('/trades');
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to open trade.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="page">
            <div className="page__header">
                <Button variant="secondary" onClick={() => navigate('/trades')}>← Back</Button>
                <h2 className="page__title">Open New Trade</h2>
            </div>

            {submitError && <div className="alert alert--error">{submitError}</div>}

            <form onSubmit={handleSubmit} noValidate>
                <div className="trade-form-layout">

                    {/* ── Left column ───────────────────────────────────────── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                        {/* Stock & Mode */}
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Trade Setup
                            </h3>
                            <div className="form-grid">
                                <Input
                                    id="stock_name"
                                    label="Stock Symbol"
                                    value={form.stock_name}
                                    onChange={handleChange}
                                    placeholder="e.g. RELIANCE, NIFTY50"
                                    error={errors.stock_name}
                                    required
                                />
                                <div className="form-group">
                                    <label className="form-label">Mode</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                        {['BUY', 'SELL'].map(opt => (
                                            <label key={opt} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                gap: '0.4rem', padding: '0.55rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `2px solid ${form.mode === opt ? (opt === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)'}`,
                                                background: form.mode === opt ? (opt === 'BUY' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)') : 'transparent',
                                                cursor: 'pointer', fontWeight: 600,
                                                color: form.mode === opt ? (opt === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-text-muted)',
                                                fontSize: 'var(--font-size-sm)', transition: 'all var(--transition)',
                                            }}>
                                                <input type="radio" id="mode" name="mode" value={opt}
                                                    checked={form.mode === opt}
                                                    onChange={handleChange}
                                                    style={{ display: 'none' }} />
                                                {opt === 'BUY' ? '▲' : '▼'} {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="form-grid" style={{ marginTop: 'var(--space-sm)' }}>
                                <div className="form-group">
                                    <label className="form-label">Trade Type</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                        {['INTRADAY', 'MTF', 'SWING', 'LONG TERM'].map(opt => (
                                            <label key={opt} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '0.55rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `2px solid ${form.trade_type === opt ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                background: form.trade_type === opt ? 'var(--color-primary-soft)' : 'transparent',
                                                cursor: 'pointer', fontWeight: 600,
                                                color: form.trade_type === opt ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                fontSize: 'var(--font-size-sm)', transition: 'all var(--transition)',
                                            }}>
                                                <input type="radio" name="trade_type" value={opt}
                                                    checked={form.trade_type === opt}
                                                    onChange={(e) => {
                                                        const targetVal = e.target.value;
                                                        setForm(prev => ({
                                                            ...prev,
                                                            trade_type: targetVal,
                                                            leverage: (targetVal === 'SWING' || targetVal === 'LONG TERM') ? '0' : (prev.leverage === '0' ? '1' : prev.leverage)
                                                        }));
                                                    }}
                                                    style={{ display: 'none' }} />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <Input id="leverage" label="Leverage" type="number" value={form.leverage}
                                    onChange={handleChange} placeholder="1" required error={errors.leverage}
                                    disabled={form.trade_type === 'SWING' || form.trade_type === 'LONG TERM'} />
                            </div>
                        </Card>

                        {/* Clients Involved */}
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Clients Involved <span className="required-mark">*</span>
                            </h3>
                            {availableClients.length === 0 ? (
                                <p className="placeholder-text">Loading clients or none available...</p>
                            ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                    {availableClients.map(c => {
                                        const isSelected = form.client_ids.includes(c.client_id);
                                        return (
                                            <button key={c.client_id} type="button" 
                                                onClick={() => {
                                                    setForm(prev => {
                                                        const newIds = isSelected 
                                                            ? prev.client_ids.filter(id => id !== c.client_id)
                                                            : [...prev.client_ids, c.client_id];
                                                        return { ...prev, client_ids: newIds };
                                                    });
                                                    if (errors.client_ids) setErrors(prev => ({...prev, client_ids: ''}));
                                                }}
                                                style={{
                                                padding: '0.4rem 0.85rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1.5px solid ${isSelected ? 'var(--color-gold)' : 'var(--color-border)'}`,
                                                background: isSelected ? 'var(--color-gold-soft)' : 'transparent',
                                                color: isSelected ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                                fontWeight: 600, fontSize: 'var(--font-size-sm)',
                                                cursor: 'pointer', transition: 'all var(--transition)',
                                            }}>
                                                {c.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.client_ids && <span className="form-error" style={{ display:'block', marginTop:'var(--space-sm)' }}>{errors.client_ids}</span>}
                        </Card>

                        {/* Price Details */}
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Price Details
                            </h3>
                            <div className="form-grid">
                                <Input id="entry_price" label="Entry Price ₹" type="number"
                                    value={form.entry_price} onChange={handleChange}
                                    placeholder="0.00" error={errors.entry_price} required />
                                <Input id="quantity" label="Quantity" type="number"
                                    value={form.quantity} onChange={handleChange}
                                    placeholder="0" error={errors.quantity} required />
                                <Input id="target" label="Target ₹" type="number"
                                    value={form.target} onChange={handleChange} placeholder="0.00" required error={errors.target} />
                                <Input id="stop_loss" label="Stop Loss ₹" type="number"
                                    value={form.stop_loss} onChange={handleChange} placeholder="0.00" required error={errors.stop_loss} />
                                <Input id="trade_date" label="Entry Date" type="date"
                                    value={form.trade_date} onChange={handleChange} required error={errors.trade_date} />
                            </div>
                        </Card>

                        {/* Strategy & Conviction */}
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Strategy & Psychology
                            </h3>

                            <div className="form-group">
                                <label htmlFor="strategy" className="form-label">
                                    Strategy <span className="required-mark">*</span>
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                    {STRATEGIES.map(s => (
                                        <button key={s} type="button"
                                            onClick={() => {
                                                setForm(prev => ({ ...prev, strategy: s }));
                                                if (errors.strategy) setErrors(prev => ({ ...prev, strategy: '' }));
                                            }}
                                            style={{
                                                padding: '0.3rem 0.75rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1.5px solid ${form.strategy === s ? 'var(--color-primary)' : (errors.strategy ? 'var(--color-danger)' : 'var(--color-border)')}`,
                                                background: form.strategy === s ? 'var(--color-primary-soft)' : 'transparent',
                                                color: form.strategy === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                fontWeight: 500, fontSize: 'var(--font-size-sm)',
                                                cursor: 'pointer', transition: 'all var(--transition)',
                                            }}>{s}</button>
                                    ))}
                                </div>
                                {errors.strategy && <span className="form-error">{errors.strategy}</span>}
                            </div>

                            {/* Conviction slider */}
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label htmlFor="conviction_level" className="form-label">
                                    Conviction Level — <strong style={{ color: 'var(--color-primary)' }}>{form.conviction_level}/10</strong>
                                </label>
                                <input id="conviction_level" type="range" min="1" max="10" step="1"
                                    value={form.conviction_level} onChange={handleChange}
                                    style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    <span>1 — Low</span><span>10 — High</span>
                                </div>
                            </div>

                            {/* Nifty mood */}
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label className="form-label">Entry Nifty Mood</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                    {NIFTY_MOODS.map(m => (
                                        <button key={m} type="button"
                                            onClick={() => setForm(prev => ({ ...prev, entry_nifty_mood: m }))}
                                            style={{
                                                padding: '0.3rem 0.75rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1.5px solid ${form.entry_nifty_mood === m ? 'var(--color-warning)' : 'var(--color-border)'}`,
                                                background: form.entry_nifty_mood === m ? 'var(--color-warning-soft)' : 'transparent',
                                                color: form.entry_nifty_mood === m ? 'var(--color-warning)' : 'var(--color-text-muted)',
                                                fontWeight: 500, fontSize: 'var(--font-size-sm)',
                                                cursor: 'pointer', transition: 'all var(--transition)',
                                            }}>{m}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label htmlFor="entry_notes" className="form-label">
                                    Entry Notes <span className="required-mark">*</span>
                                </label>
                                <textarea id="entry_notes" className={`form-input ${errors.entry_notes ? 'form-input--error' : ''}`}
                                    value={form.entry_notes} onChange={(e) => {
                                        handleChange(e);
                                        if (errors.entry_notes) setErrors(prev => ({ ...prev, entry_notes: '' }));
                                    }}
                                    placeholder="Why are you entering this trade? What's your thesis?"
                                    rows={3} />
                                {errors.entry_notes && <span className="form-error">{errors.entry_notes}</span>}
                            </div>
                        </Card>
                    </div>

                    {/* ── Right column — Live Preview ───────────────────────── */}
                    <div className="trade-form-preview">
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Trade Preview
                            </h3>
                            <dl className="detail-list">
                                <dt>Symbol</dt>
                                <dd style={{ fontWeight: 700 }}>{form.stock_name.toUpperCase() || '—'}</dd>

                                <dt>Clients</dt>
                                <dd style={{ fontWeight: 600, color: 'var(--color-gold)' }}>{form.client_ids.length}</dd>

                                <dt>Mode</dt>
                                <dd style={{ color: form.mode === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                                    {form.mode}
                                </dd>

                                <dt>Type</dt>
                                <dd><span className="badge badge--yellow">{form.trade_type}</span></dd>

                                <dt>Entry</dt>
                                <dd>{entryPrice ? `₹${entryPrice.toLocaleString()}` : '—'}</dd>

                                <dt>Qty</dt>
                                <dd>{qty || '—'}</dd>

                                <dt>Target</dt>
                                <dd style={{ color: 'var(--color-success)' }}>{target ? `₹${target.toLocaleString()}` : '—'}</dd>

                                <dt>Stop Loss</dt>
                                <dd style={{ color: 'var(--color-danger)' }}>{stopLoss ? `₹${stopLoss.toLocaleString()}` : '—'}</dd>

                                <dt>Date</dt>
                                <dd>{form.trade_date || '—'}</dd>
                            </dl>

                            {(maxProfit || maxLoss) && (
                                <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                                        {maxProfit && (
                                            <div style={{ background: 'var(--color-success-soft)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Max Profit</div>
                                                <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.9rem' }}>₹{maxProfit}</div>
                                            </div>
                                        )}
                                        {maxLoss && (
                                            <div style={{ background: 'var(--color-danger-soft)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Max Loss</div>
                                                <div style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '0.9rem' }}>₹{maxLoss}</div>
                                            </div>
                                        )}
                                    </div>
                                    {rr && (
                                        <div style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                                            Risk:Reward = <strong style={{ color: 'var(--color-primary)' }}>1 : {rr}</strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ marginTop: 'var(--space-md)' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xs)' }}>
                                    Conviction: {form.conviction_level}/10
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(form.conviction_level / 10) * 100}%`, background: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                                </div>
                            </div>
                        </Card>

                        <Button type="submit" variant="primary" disabled={submitting}
                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}>
                            {submitting ? 'Opening Trade…' : '🚀 Open Trade'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => navigate('/trades')} disabled={submitting}
                            style={{ width: '100%' }}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}