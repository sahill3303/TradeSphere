import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
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

function today() { return new Date().toISOString().split('T')[0]; }

export default function OpenPaperTrade() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [errors, setErrors] = useState({});
    
    // Autocomplete state
    const [stockSuggestions, setStockSuggestions] = useState([]);
    const [isSearchingStock, setIsSearchingStock] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const stockSearchTimeout = useRef(null);
    const stockInputRef = useRef(null);
    const suggestionsRef = useRef(null);

    const [orderForm, setOrderForm] = useState({
        stock_name: '',
        holding_type: 'TRADING', // 'TRADING' | 'INVESTMENT'
        entry_price: '',
        quantity: '100',
        target: '',
        stop_loss: '',
        strategy: STRATEGY_OPTIONS[0],
        conviction_level: '5',
        notes: '',
        trade_date: today()
    });

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (
                stockInputRef.current && !stockInputRef.current.contains(e.target) &&
                suggestionsRef.current && !suggestionsRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleChange(e) {
        const { id, value } = e.target;
        setOrderForm(prev => ({ ...prev, [id]: value }));
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
    }

    // Symbol autocompletion handler
    const handleStockInput = async (e) => {
        const value = e.target.value;
        setOrderForm(prev => ({ ...prev, stock_name: value }));
        if (errors.stock_name) setErrors(prev => ({ ...prev, stock_name: '' }));

        if (stockSearchTimeout.current) clearTimeout(stockSearchTimeout.current);

        if (value.length < 2) {
            setStockSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        stockSearchTimeout.current = setTimeout(async () => {
            try {
                setIsSearchingStock(true);
                const { data } = await api.get(`/watchlist/search?q=${encodeURIComponent(value.trim())}`);
                if (data.success && data.data && data.data.length > 0) {
                    setStockSuggestions(data.data.slice(0, 6));
                    setShowSuggestions(true);
                } else if (Array.isArray(data) && data.length > 0) {
                    setStockSuggestions(data.slice(0, 6));
                    setShowSuggestions(true);
                } else {
                    setStockSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsSearchingStock(false);
            }
        }, 400);
    };

    const handleSelectStock = async (sym) => {
        const cleanSym = sym.symbol ? sym.symbol.replace(/^[A-Z]+:/, '') : (sym.ticker || sym.name || sym);
        setOrderForm(prev => ({ ...prev, stock_name: cleanSym }));
        setStockSuggestions([]);
        setShowSuggestions(false);
        if (errors.stock_name) setErrors(prev => ({ ...prev, stock_name: '' }));

        // Try to fetch latest quote to auto-populate entry price
        try {
            const { data } = await api.get(`/watchlist/prices?symbols=${cleanSym}`);
            if (data.success && data.data && data.data[cleanSym]) {
                const liveP = typeof data.data[cleanSym] === 'object' ? data.data[cleanSym].price : data.data[cleanSym];
                if (liveP && !isNaN(liveP)) {
                    setOrderForm(prev => ({ ...prev, stock_name: cleanSym, entry_price: Number(liveP).toFixed(2) }));
                }
            }
        } catch (e) {
            // ignore auto quote fail
        }
    };

    const handleOrderSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        const errs = {};
        if (!orderForm.stock_name.trim()) errs.stock_name = 'Symbol is required.';
        if (!orderForm.entry_price || isNaN(orderForm.entry_price) || +orderForm.entry_price <= 0) errs.entry_price = 'Invalid entry price.';
        if (!orderForm.quantity || isNaN(orderForm.quantity) || +orderForm.quantity <= 0) errs.quantity = 'Invalid quantity.';
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSubmitting(true);
        try {
            const { data } = await api.post('/paper-trades', {
                ...orderForm,
                conviction_level: Number(orderForm.conviction_level) >= 8 ? 'High' : (Number(orderForm.conviction_level) <= 3 ? 'Low' : 'Medium')
            });
            if (data.success) {
                navigate('/paper-trade');
            }
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to open paper trade position.');
        } finally {
            setSubmitting(false);
        }
    };

    // Derived risk/reward preview
    const entryPrice = parseFloat(orderForm.entry_price) || 0;
    const target = parseFloat(orderForm.target) || 0;
    const stopLoss = parseFloat(orderForm.stop_loss) || 0;
    const qty = parseFloat(orderForm.quantity) || 0;
    
    // Simulate buy side only for paper trade
    const maxProfitVal = (target - entryPrice) * qty;
    const maxLossVal = (entryPrice - stopLoss) * qty;

    const maxProfit = entryPrice && target && maxProfitVal > 0 ? maxProfitVal.toFixed(2) : null;
    const maxLoss = entryPrice && stopLoss && maxLossVal > 0 ? maxLossVal.toFixed(2) : null;
    const rr = maxLoss && maxProfit && maxLoss > 0
        ? (Math.abs(maxProfit) / Math.abs(maxLoss)).toFixed(2) : null;

    return (
        <div className="page">
            <div className="page__header">
                <Button variant="secondary" onClick={() => navigate('/paper-trade')}>← Back</Button>
                <h2 className="page__title">Execute Simulated Buy Position</h2>
            </div>

            {submitError && <div className="alert alert--error">{submitError}</div>}

            <form onSubmit={handleOrderSubmit} noValidate>
                <div className="trade-form-layout">

                    {/* ── Left column ───────────────────────────────────────── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

                        {/* Trade Setup */}
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Simulated Trade Setup
                            </h3>
                            <div className="form-grid">
                                {/* Stock Symbol with Autocomplete */}
                                <div className="form-group stock-autocomplete-wrapper" style={{ position: 'relative' }}>
                                    <label htmlFor="stock_name" className="form-label">
                                        Stock Symbol <span className="required-mark"> *</span>
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            ref={stockInputRef}
                                            id="stock_name"
                                            type="text"
                                            value={orderForm.stock_name}
                                            onChange={handleStockInput}
                                            onFocus={() => stockSuggestions.length > 0 && setShowSuggestions(true)}
                                            placeholder="Search company or symbol..."
                                            autoComplete="off"
                                            className={`form-input${errors.stock_name ? ' form-input--error' : ''}`}
                                            style={{ paddingRight: isSearchingStock ? '2.5rem' : undefined }}
                                        />
                                        {isSearchingStock && (
                                            <div className="stock-search-spinner" />
                                        )}
                                    </div>
                                    {errors.stock_name && <p className="form-error">{errors.stock_name}</p>}

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && stockSuggestions.length > 0 && (
                                        <div ref={suggestionsRef} className="stock-suggestions-dropdown">
                                            {stockSuggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className="stock-suggestion-item"
                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectStock(s); }}
                                                >
                                                    <span className="stock-suggestion-name">{s.name}</span>
                                                    <span className="stock-suggestion-symbol">{s.symbol || s.ticker}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Portfolio Category</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                                        {['TRADING', 'INVESTMENT'].map(opt => (
                                            <label key={opt} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                gap: '0.4rem', padding: '0.55rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `2px solid ${orderForm.holding_type === opt ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                background: orderForm.holding_type === opt ? 'var(--color-primary-soft)' : 'transparent',
                                                cursor: 'pointer', fontWeight: 600,
                                                color: orderForm.holding_type === opt ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                fontSize: 'var(--font-size-sm)', transition: 'all var(--transition)',
                                            }}>
                                                <input type="radio" id="holding_type" name="holding_type" value={opt}
                                                    checked={orderForm.holding_type === opt}
                                                    onChange={handleChange}
                                                    style={{ display: 'none' }} />
                                                {opt === 'TRADING' ? 'Active Trading' : 'Long-Term'}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Price Details */}
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Price Details
                            </h3>
                            <div className="form-grid">
                                <Input id="entry_price" label="Entry Price ₹" type="number"
                                    value={orderForm.entry_price} onChange={handleChange}
                                    placeholder="0.00" error={errors.entry_price} required />
                                <Input id="quantity" label="Quantity" type="number"
                                    value={orderForm.quantity} onChange={handleChange}
                                    placeholder="0" error={errors.quantity} required />
                                <Input id="target" label="Target ₹" type="number"
                                    value={orderForm.target} onChange={handleChange} placeholder="Optional exit target" />
                                <Input id="stop_loss" label="Stop Loss ₹" type="number"
                                    value={orderForm.stop_loss} onChange={handleChange} placeholder="Optional protective stop" />
                                <Input id="trade_date" label="Execution Date" type="date"
                                    value={orderForm.trade_date} onChange={handleChange} required />
                            </div>
                        </Card>

                        {/* Strategy & Conviction */}
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Strategy & Thesis
                            </h3>

                            <div className="form-group">
                                <label htmlFor="strategy" className="form-label">
                                    Strategy / Setup Used
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                                    {STRATEGY_OPTIONS.map(s => (
                                        <button key={s} type="button"
                                            onClick={() => setOrderForm(prev => ({ ...prev, strategy: s }))}
                                            style={{
                                                padding: '0.3rem 0.75rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1.5px solid ${orderForm.strategy === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                background: orderForm.strategy === s ? 'var(--color-primary-soft)' : 'transparent',
                                                color: orderForm.strategy === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                fontWeight: 500, fontSize: 'var(--font-size-sm)',
                                                cursor: 'pointer', transition: 'all var(--transition)',
                                            }}>{s}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Conviction slider */}
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label htmlFor="conviction_level" className="form-label">
                                    Conviction Level — <strong style={{ color: 'var(--color-primary)' }}>{orderForm.conviction_level}/10</strong>
                                </label>
                                <input id="conviction_level" type="range" min="1" max="10" step="1"
                                    value={orderForm.conviction_level} onChange={handleChange}
                                    style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                    <span>1 — Experimental</span><span>10 — High Conviction</span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label htmlFor="notes" className="form-label">
                                    Pre-Trade Thesis & Notes (Why this stock now?)
                                </label>
                                <textarea id="notes" className="form-input"
                                    value={orderForm.notes} onChange={handleChange}
                                    placeholder="Write down your conviction, technical triggers, support/resistance levels, or fundamental news..."
                                    rows={3} />
                            </div>
                        </Card>
                    </div>

                    {/* ── Right column — Live Preview ───────────────────────── */}
                    <div className="trade-form-preview">
                        <Card>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 'var(--space-md)', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                                Paper Trade Preview
                            </h3>
                            <dl className="detail-list">
                                <dt>Symbol</dt>
                                <dd style={{ fontWeight: 700 }}>{orderForm.stock_name.toUpperCase() || '—'}</dd>

                                <dt>Category</dt>
                                <dd><span className="badge badge--yellow">{orderForm.holding_type}</span></dd>

                                <dt>Entry</dt>
                                <dd>{entryPrice ? `₹${entryPrice.toLocaleString()}` : '—'}</dd>

                                <dt>Qty</dt>
                                <dd>{qty || '—'}</dd>

                                <dt>Target</dt>
                                <dd style={{ color: 'var(--color-success)' }}>{target ? `₹${target.toLocaleString()}` : '—'}</dd>

                                <dt>Stop Loss</dt>
                                <dd style={{ color: 'var(--color-danger)' }}>{stopLoss ? `₹${stopLoss.toLocaleString()}` : '—'}</dd>

                                <dt>Date</dt>
                                <dd>{orderForm.trade_date || '—'}</dd>
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
                                    Conviction: {orderForm.conviction_level}/10
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(Number(orderForm.conviction_level) / 10) * 100}%`, background: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                                </div>
                            </div>
                        </Card>

                        <Button type="submit" variant="primary" disabled={submitting}
                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}>
                            {submitting ? 'Placing Order…' : <><Rocket size={16} style={{marginRight:'6px'}}/> Execute Simulated Order</>}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => navigate('/paper-trade')} disabled={submitting}
                            style={{ width: '100%' }}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
