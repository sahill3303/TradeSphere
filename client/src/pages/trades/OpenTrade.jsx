import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { Rocket, ArrowLeft, Check, TrendingUp, TrendingDown, Shield, Target, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import './OpenTrade.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const NIFTY_MOODS = ['BULLISH', 'BEARISH', 'SIDEWAYS', 'VOLATILE', 'NEUTRAL'];
const STRATEGIES = ['BREAKOUT', 'REVERSAL', 'TREND_FOLLOW', 'SCALP', 'SWING', 'NEWS_PLAY', 'VALUE_INVESTING', 'GROWTH', 'OTHER'];
const TRADE_TYPES = ['INTRADAY', 'SWING', 'MTF', 'LONG TERM'];

function today() {
    return new Date().toISOString().split('T')[0];
}

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
    else if (isNaN(f.entry_price) || +f.entry_price <= 0) e.entry_price = 'Invalid entry price.';
    
    if (!f.quantity) e.quantity = 'Quantity is required.';
    else if (isNaN(f.quantity) || +f.quantity <= 0) e.quantity = 'Invalid quantity.';

    if (!f.target) e.target = 'Target is required.';
    else if (isNaN(f.target) || +f.target <= 0) e.target = 'Invalid target price.';

    if (!f.stop_loss) e.stop_loss = 'Stop loss is required.';
    else if (isNaN(f.stop_loss) || +f.stop_loss <= 0) e.stop_loss = 'Invalid stop loss.';

    if (!f.trade_date) {
        e.trade_date = 'Date is required.';
    } else {
        const match = String(f.trade_date).trim().match(/^(\d+)-(\d{2})-(\d{2})/);
        if (!match) {
            e.trade_date = 'Invalid date format (YYYY-MM-DD).';
        } else if (match[1].length !== 4) {
            e.trade_date = 'Year must be a 4-digit year (e.g. 2026).';
        } else {
            const year = parseInt(match[1], 10);
            if (year < 2000 || year > 2099) {
                e.trade_date = 'Year must be between 2000 and 2099.';
            }
        }
    }

    // NOTE: In Strategy & Psychology, ONLY entry_notes is mandatory!
    if (!f.entry_notes.trim()) e.entry_notes = 'Entry notes are required.';

    if (f.trade_type !== 'SWING' && f.trade_type !== 'LONG TERM') {
        if (!f.leverage) e.leverage = 'Leverage is required.';
        else if (isNaN(f.leverage) || +f.leverage < 1) e.leverage = 'Minimum leverage is 1.';
    }

    if (!f.client_ids || f.client_ids.length === 0) e.client_ids = 'At least one client must be selected.';
    
    return e;
}

export default function OpenTrade() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [form, setForm] = useState(BLANK);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [availableClients, setAvailableClients] = useState([]);
    const [liveQuotePrice, setLiveQuotePrice] = useState(null);

    // Stock search autocomplete
    const [stockSuggestions, setStockSuggestions] = useState([]);
    const [isSearchingStock, setIsSearchingStock] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const stockSearchTimeout = useRef(null);
    const stockInputRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        api.get('/clients')
           .then(res => {
               if (res.data?.data) {
                   const activeClients = res.data.data.filter(c => c.status === 'ACTIVE');
                   setAvailableClients(activeClients);
                   if (activeClients.length === 1) {
                       setForm(prev => ({ ...prev, client_ids: [activeClients[0].client_id] }));
                   }
               }
           })
           .catch(err => console.error("Failed to load clients", err));
    }, []);

    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam) {
            const cleanType = typeParam.toUpperCase().trim();
            if (TRADE_TYPES.includes(cleanType)) {
                setForm(prev => ({
                    ...prev,
                    trade_type: cleanType,
                    // If Long Term, there is NO sell option -> force BUY
                    mode: cleanType === 'LONG TERM' ? 'BUY' : prev.mode,
                    leverage: (cleanType === 'SWING' || cleanType === 'LONG TERM') ? '0' : prev.leverage
                }));
            }
        }
    }, [searchParams]);

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
        setForm(prev => ({ ...prev, [id]: value }));
        if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
    }

    function handleTradeTypeSelect(type) {
        setForm(prev => ({
            ...prev,
            trade_type: type,
            // If Long Term, SELL option is not allowed: auto-switch to BUY
            mode: type === 'LONG TERM' ? 'BUY' : prev.mode,
            leverage: (type === 'SWING' || type === 'LONG TERM') ? '0' : (prev.leverage === '0' ? '1' : prev.leverage)
        }));
        if (errors.leverage) setErrors(prev => ({ ...prev, leverage: '' }));
    }

    function handleModeSelect(newMode) {
        // Guard against selecting SELL if trade_type is LONG TERM
        if (form.trade_type === 'LONG TERM' && newMode === 'SELL') return;
        setForm(prev => ({ ...prev, mode: newMode }));
    }

    function handleStockInput(e) {
        const value = e.target.value;
        setForm(prev => ({ ...prev, stock_name: value }));
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
                const { data } = await api.get(`/watchlist/search?q=${encodeURIComponent(value)}`);
                if (data.success && data.data.length > 0) {
                    setStockSuggestions(data.data);
                    setShowSuggestions(true);
                } else {
                    setStockSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch (err) {
                console.error('Stock search failed', err);
            } finally {
                setIsSearchingStock(false);
            }
        }, 350);
    }

    async function handleSelectStock(suggestion) {
        const cleanSymbol = suggestion.symbol ? suggestion.symbol.replace(/^[A-Z]+:/, '') : suggestion.symbol;
        setForm(prev => ({ ...prev, stock_name: cleanSymbol }));
        setStockSuggestions([]);
        setShowSuggestions(false);
        if (errors.stock_name) setErrors(prev => ({ ...prev, stock_name: '' }));

        // Auto-fetch latest live quote from Screener to auto-populate entry price
        try {
            const { data } = await api.get(`/watchlist/prices?symbols=${cleanSymbol}`);
            if (data?.success && data?.data?.[cleanSymbol]) {
                const liveP = typeof data.data[cleanSymbol] === 'object' ? data.data[cleanSymbol].price : data.data[cleanSymbol];
                if (liveP && !isNaN(liveP)) {
                    const priceFormatted = Number(liveP).toFixed(2);
                    setLiveQuotePrice(priceFormatted);
                    setForm(prev => ({ ...prev, stock_name: cleanSymbol, entry_price: priceFormatted }));
                    if (errors.entry_price) setErrors(prev => ({ ...prev, entry_price: '' }));
                }
            }
        } catch (_) {}
    }

    // Derived risk/reward calculations
    const entryPrice = parseFloat(form.entry_price) || 0;
    const target = parseFloat(form.target) || 0;
    const stopLoss = parseFloat(form.stop_loss) || 0;
    const qty = parseFloat(form.quantity) || 0;
    const totalCapital = entryPrice && qty ? (entryPrice * qty) : 0;

    const maxProfitVal = form.mode === 'BUY' ? (target - entryPrice) * qty : (entryPrice - target) * qty;
    const maxLossVal = form.mode === 'BUY' ? (entryPrice - stopLoss) * qty : (stopLoss - entryPrice) * qty;

    const maxProfit = entryPrice && target ? maxProfitVal.toFixed(2) : null;
    const maxLoss = entryPrice && stopLoss ? maxLossVal.toFixed(2) : null;
    const rr = maxLoss && maxProfit && maxLoss > 0
        ? (Math.abs(maxProfit) / Math.abs(maxLoss)).toFixed(2) : null;

    // Percentages
    const targetDiff = form.mode === 'BUY' ? (target - entryPrice) : (entryPrice - target);
    const targetPct = entryPrice && target ? ((targetDiff / entryPrice) * 100).toFixed(2) : null;

    const slDiff = form.mode === 'BUY' ? (entryPrice - stopLoss) : (stopLoss - entryPrice);
    const slPct = entryPrice && stopLoss ? ((slDiff / entryPrice) * 100).toFixed(2) : null;

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError('');
        const errs = validate(form);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            // Scroll to the first error
            const firstErrorKey = Object.keys(errs)[0];
            const el = document.getElementById(firstErrorKey);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/trades', {
                stock_name: form.stock_name.trim().toUpperCase(),
                trade_type: form.mode === 'BUY' ? 'LONG' : 'SHORT',
                mode: form.trade_type,
                entry_price: Number(form.entry_price),
                quantity: Number(form.quantity),
                target: form.target ? Number(form.target) : null,
                stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
                trade_date: form.trade_date || null,
                strategy: form.strategy || null,
                conviction_level: Number(form.conviction_level) || 5,
                entry_nifty_mood: form.entry_nifty_mood || null,
                entry_notes: form.entry_notes.trim(),
                leverage: (form.trade_type === 'SWING' || form.trade_type === 'LONG TERM') ? 1 : Number(form.leverage || 1),
                client_ids: form.client_ids,
            });
            const fromPortfolio = searchParams.get('from') === 'portfolio' || (searchParams.get('type') || '').toUpperCase() === 'LONG TERM';
            navigate(fromPortfolio ? '/portfolio' : '/trades');
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Failed to open trade.');
        } finally {
            setSubmitting(false);
        }
    }

    const isLongTerm = form.trade_type === 'LONG TERM';
    const fromPortfolio = searchParams.get('from') === 'portfolio' || isLongTerm;

    return (
        <div className="page open-trade-container">
            {/* Top Header */}
            <div className="open-trade-header">
                <div className="open-trade-header__left">
                    <Button variant="secondary" onClick={() => navigate(fromPortfolio ? '/portfolio' : '/trades')}>
                        <ArrowLeft size={16} style={{ marginRight: '6px' }} /> Back
                    </Button>
                    <div className="open-trade-header__titles">
                        <h2 className="open-trade-header__title">
                            {isLongTerm ? 'Open New Portfolio Position' : 'Open New Trade'}
                        </h2>
                        <p className="open-trade-header__subtitle">
                            {isLongTerm 
                                ? 'Build and track your conviction equity investment holding with fundamental thesis' 
                                : 'Configure parameters, assign active clients, and record thesis'}
                        </p>
                    </div>
                </div>

                <div className={`open-trade-header__badge ${form.mode === 'BUY' ? 'open-trade-header__badge--buy' : 'open-trade-header__badge--sell'}`}>
                    {form.mode === 'BUY' ? '▲ BUY' : '▼ SELL'} • {form.trade_type}
                </div>
            </div>

            {submitError && (
                <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>
                    <AlertCircle size={18} style={{ flexShrink: 0, marginRight: '8px' }} />
                    <span>{submitError}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
                <div className="open-trade-grid">
                    
                    {/* ── Left Column: Form Fields ───────────────────────── */}
                    <div className="open-trade-sections">

                        {/* SECTION 1: Trade Setup */}
                        <Card>
                            <div className="trade-card-header">
                                <h3 className="trade-card-header__title">
                                    <Target size={18} color="var(--color-primary)" /> Trade Setup
                                </h3>
                                <span className="trade-card-header__subtitle">Instrument & Type</span>
                            </div>

                            <div className="form-grid">
                                {/* Stock Symbol Autocomplete */}
                                <div className="form-group stock-autocomplete-wrapper">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                                        <label htmlFor="stock_name" className="form-label" style={{ marginBottom: 0 }}>
                                            Stock Symbol <span className="required-mark">*</span>
                                        </label>
                                        {liveQuotePrice && (
                                            <span 
                                                className="live-quote-pill" 
                                                onClick={() => setForm(prev => ({ ...prev, entry_price: liveQuotePrice }))}
                                                title="Click to use live price as entry"
                                            >
                                                <span className="live-quote-pill__dot" />
                                                Live: ₹{liveQuotePrice}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            ref={stockInputRef}
                                            id="stock_name"
                                            type="text"
                                            value={form.stock_name}
                                            onChange={handleStockInput}
                                            onFocus={() => stockSuggestions.length > 0 && setShowSuggestions(true)}
                                            placeholder="Search e.g. RELIANCE, TATAMOTORS..."
                                            autoComplete="off"
                                            className={`form-input${errors.stock_name ? ' form-input--error' : ''}`}
                                            style={{ paddingRight: isSearchingStock ? '2.5rem' : undefined, textTransform: 'uppercase' }}
                                        />
                                        {isSearchingStock && <div className="stock-search-spinner" />}
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
                                                    <span className="stock-suggestion-symbol">{s.symbol}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Mode (BUY / SELL) — If LONG TERM, NO SELL OPTION */}
                                <div className="form-group">
                                    <label className="form-label">
                                        Action / Mode
                                    </label>
                                    {isLongTerm ? (
                                        <div className="long-term-buy-banner" title="Long Term holdings are delivery purchases only. Sell/Short option is excluded.">
                                            <div className="long-term-buy-banner__left">
                                                <span>▲ BUY</span>
                                            </div>
                                            <span className="long-term-buy-banner__tag">Long Term Delivery Only</span>
                                        </div>
                                    ) : (
                                        <div className="mode-toggle-group">
                                            <button
                                                type="button"
                                                className={`mode-toggle-btn mode-toggle-btn--buy ${form.mode === 'BUY' ? 'mode-toggle-btn--active' : ''}`}
                                                onClick={() => handleModeSelect('BUY')}
                                            >
                                                ▲ BUY
                                            </button>
                                            <button
                                                type="button"
                                                className={`mode-toggle-btn mode-toggle-btn--sell ${form.mode === 'SELL' ? 'mode-toggle-btn--active' : ''}`}
                                                onClick={() => handleModeSelect('SELL')}
                                            >
                                                ▼ SELL
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Trade Type Tabs & Leverage */}
                            <div className="form-grid" style={{ marginTop: 'var(--space-md)' }}>
                                <div className="form-group">
                                    <label className="form-label">Trade Type</label>
                                    <div className="segmented-control">
                                        {TRADE_TYPES.map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                className={`segmented-btn ${form.trade_type === opt ? 'segmented-btn--active' : ''}`}
                                                onClick={() => handleTradeTypeSelect(opt)}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Leverage {(!isLongTerm && form.trade_type !== 'SWING') && <span className="required-mark">*</span>}
                                    </label>
                                    {isLongTerm || form.trade_type === 'SWING' ? (
                                        <div style={{
                                            padding: '0.62rem 0.85rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--color-surface-alt)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-muted)',
                                            fontSize: 'var(--font-size-sm)',
                                            fontWeight: 500
                                        }}>
                                            1x (Cash Delivery / CNC)
                                        </div>
                                    ) : (
                                        <Input
                                            id="leverage"
                                            type="number"
                                            value={form.leverage}
                                            onChange={handleChange}
                                            placeholder="1"
                                            required
                                            error={errors.leverage}
                                            style={{ marginBottom: 0 }}
                                        />
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* SECTION 2: Client Allocation */}
                        <Card>
                            <div className="trade-card-header">
                                <h3 className="trade-card-header__title">
                                    <Shield size={18} color="var(--color-gold)" /> Client Allocation <span className="required-mark">*</span>
                                </h3>
                                <div className="clients-quick-actions">
                                    <button
                                        type="button"
                                        className="clients-quick-btn"
                                        onClick={() => {
                                            setForm(prev => ({ ...prev, client_ids: availableClients.map(c => c.client_id) }));
                                            if (errors.client_ids) setErrors(prev => ({ ...prev, client_ids: '' }));
                                        }}
                                    >
                                        Select All ({availableClients.length})
                                    </button>
                                    {form.client_ids.length > 0 && (
                                        <button
                                            type="button"
                                            className="clients-quick-btn"
                                            onClick={() => setForm(prev => ({ ...prev, client_ids: [] }))}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="clients-selection-bar">
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    Selected: <strong style={{ color: form.client_ids.length > 0 ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>{form.client_ids.length}</strong> of {availableClients.length} accounts
                                </span>
                            </div>

                            {availableClients.length === 0 ? (
                                <p className="placeholder-text" style={{ padding: 'var(--space-sm) 0' }}>
                                    Loading accounts or none found...
                                </p>
                            ) : (
                                <div className="clients-chip-grid">
                                    {availableClients.map(c => {
                                        const isSelected = form.client_ids.includes(c.client_id);
                                        return (
                                            <button
                                                key={c.client_id}
                                                type="button"
                                                onClick={() => {
                                                    setForm(prev => {
                                                        const newIds = isSelected 
                                                            ? prev.client_ids.filter(id => id !== c.client_id)
                                                            : [...prev.client_ids, c.client_id];
                                                        return { ...prev, client_ids: newIds };
                                                    });
                                                    if (errors.client_ids) setErrors(prev => ({ ...prev, client_ids: '' }));
                                                }}
                                                className={`client-chip ${isSelected ? 'client-chip--selected' : ''}`}
                                            >
                                                {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
                                                <span>{c.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.client_ids && (
                                <p className="form-error" style={{ marginTop: 'var(--space-sm)' }}>
                                    {errors.client_ids}
                                </p>
                            )}
                        </Card>

                        {/* SECTION 3: Price & Execution Details */}
                        <Card>
                            <div className="trade-card-header">
                                <h3 className="trade-card-header__title">
                                    <TrendingUp size={18} color="var(--color-success)" /> Price & Risk Parameters
                                </h3>
                                <span className="trade-card-header__subtitle">Entry, Target & Stop Loss</span>
                            </div>

                            <div className="form-grid">
                                <div>
                                    <Input
                                        id="entry_price"
                                        label="Entry Price ₹"
                                        type="number"
                                        step="any"
                                        value={form.entry_price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        error={errors.entry_price}
                                        required
                                    />
                                    {totalCapital > 0 && (
                                        <div className="calc-badge calc-badge--capital">
                                            Capital: ₹{totalCapital.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>

                                <Input
                                    id="quantity"
                                    label="Quantity"
                                    type="number"
                                    value={form.quantity}
                                    onChange={handleChange}
                                    placeholder="e.g. 100"
                                    error={errors.quantity}
                                    required
                                />

                                <div>
                                    <Input
                                        id="target"
                                        label="Target Price ₹"
                                        type="number"
                                        step="any"
                                        value={form.target}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                        error={errors.target}
                                    />
                                    {targetPct && (
                                        <div className="calc-badge calc-badge--profit">
                                            Potential: +{targetPct}% {maxProfit ? `(+₹${Math.abs(maxProfit)})` : ''}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <Input
                                        id="stop_loss"
                                        label="Stop Loss ₹"
                                        type="number"
                                        step="any"
                                        value={form.stop_loss}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                        error={errors.stop_loss}
                                    />
                                    {slPct && (
                                        <div className="calc-badge calc-badge--loss">
                                            Risk: -{slPct}% {maxLoss ? `(-₹${Math.abs(maxLoss)})` : ''}
                                        </div>
                                    )}
                                </div>

                                <Input
                                    id="trade_date"
                                    label="Entry Date"
                                    type="date"
                                    min="2000-01-01"
                                    max="2099-12-31"
                                    value={form.trade_date}
                                    onChange={handleChange}
                                    required
                                    error={errors.trade_date}
                                />
                            </div>
                        </Card>

                        {/* SECTION 4: Strategy & Psychology */}
                        {/* Requirement: Only entry notes is mandatory, not others */}
                        <Card>
                            <div className="trade-card-header">
                                <h3 className="trade-card-header__title">
                                    <Sparkles size={18} color="var(--color-primary)" /> Strategy & Psychology
                                </h3>
                                <span className="trade-card-header__subtitle">
                                    Only Entry Notes required *
                                </span>
                            </div>

                            {/* Strategy Pills (OPTIONAL) */}
                            <div className="form-group">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>
                                        Strategy <span className="optional-badge">Optional</span>
                                    </label>
                                    {form.strategy && (
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, strategy: '' }))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--color-text-muted)',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Clear selection
                                        </button>
                                    )}
                                </div>
                                <div className="strategy-pills-grid">
                                    {STRATEGIES.map(s => {
                                        const isSelected = form.strategy === s;
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                className={`strategy-pill ${isSelected ? 'strategy-pill--selected' : ''}`}
                                                onClick={() => setForm(prev => ({ ...prev, strategy: isSelected ? '' : s }))}
                                            >
                                                {s.replace(/_/g, ' ')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Conviction Slider (OPTIONAL) */}
                            <div className="conviction-slider-container" style={{ marginTop: 'var(--space-md)' }}>
                                <div className="conviction-header">
                                    <label htmlFor="conviction_level" className="form-label" style={{ marginBottom: 0 }}>
                                        Conviction Level <span className="optional-badge">Optional</span>
                                    </label>
                                    <span className="conviction-badge">
                                        {form.conviction_level}/10 — {+form.conviction_level >= 8 ? 'High Conviction' : +form.conviction_level >= 5 ? 'Moderate' : 'Speculative'}
                                    </span>
                                </div>
                                <input
                                    id="conviction_level"
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={form.conviction_level}
                                    onChange={handleChange}
                                    style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer', marginTop: '6px' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                    <span>1 — Low Conviction</span>
                                    <span>5 — Standard</span>
                                    <span>10 — Maximum Conviction</span>
                                </div>
                            </div>

                            {/* Market Mood (OPTIONAL) */}
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>
                                        Entry Nifty Mood <span className="optional-badge">Optional</span>
                                    </label>
                                    {form.entry_nifty_mood && (
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, entry_nifty_mood: '' }))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--color-text-muted)',
                                                fontSize: '0.75rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="strategy-pills-grid">
                                    {NIFTY_MOODS.map(m => {
                                        const isSelected = form.entry_nifty_mood === m;
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                className={`mood-pill ${isSelected ? 'mood-pill--selected' : ''}`}
                                                onClick={() => setForm(prev => ({ ...prev, entry_nifty_mood: isSelected ? '' : m }))}
                                            >
                                                {m}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Entry Notes (MANDATORY *) */}
                            <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                                <label htmlFor="entry_notes" className="form-label">
                                    Entry Notes <span className="required-mark">*</span>
                                </label>
                                <textarea
                                    id="entry_notes"
                                    className={`form-input ${errors.entry_notes ? 'form-input--error' : ''}`}
                                    value={form.entry_notes}
                                    onChange={(e) => {
                                        handleChange(e);
                                        if (errors.entry_notes) setErrors(prev => ({ ...prev, entry_notes: '' }));
                                    }}
                                    placeholder="Enter your trade thesis, rationale, technical setup, or fundamental catalyst..."
                                    rows={3}
                                />
                                {errors.entry_notes && (
                                    <p className="form-error">{errors.entry_notes}</p>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* ── Right Column: Order Preview Ticket ───────────────── */}
                    <div className="trade-ticket">
                        <div className="ticket-card">
                            <div className={`ticket-header-banner ${form.mode === 'BUY' ? 'ticket-header-banner--buy' : 'ticket-header-banner--sell'}`}>
                                <span>{form.mode} TICKET</span>
                                <span>{form.trade_type}</span>
                            </div>

                            <div className="ticket-body">
                                <div className="ticket-symbol-display">
                                    <h4 className="ticket-symbol-text">
                                        {form.stock_name ? form.stock_name.toUpperCase() : 'NO SYMBOL'}
                                    </h4>
                                    <div className="ticket-symbol-sub">
                                        {form.trade_date || 'Date not set'} • {form.client_ids.length} Account(s)
                                    </div>
                                </div>

                                <div className="ticket-stats-grid">
                                    <div className="ticket-stat-box">
                                        <div className="ticket-stat-label">Entry Price</div>
                                        <div className="ticket-stat-value">
                                            {entryPrice ? `₹${entryPrice.toLocaleString('en-IN')}` : '—'}
                                        </div>
                                    </div>

                                    <div className="ticket-stat-box">
                                        <div className="ticket-stat-label">Quantity</div>
                                        <div className="ticket-stat-value">
                                            {qty ? qty.toLocaleString('en-IN') : '—'}
                                        </div>
                                    </div>

                                    <div className="ticket-stat-box">
                                        <div className="ticket-stat-label">Target</div>
                                        <div className="ticket-stat-value" style={{ color: 'var(--color-success)' }}>
                                            {target ? `₹${target.toLocaleString('en-IN')}` : '—'}
                                        </div>
                                    </div>

                                    <div className="ticket-stat-box">
                                        <div className="ticket-stat-label">Stop Loss</div>
                                        <div className="ticket-stat-value" style={{ color: 'var(--color-danger)' }}>
                                            {stopLoss ? `₹${stopLoss.toLocaleString('en-IN')}` : '—'}
                                        </div>
                                    </div>
                                </div>

                                {totalCapital > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'var(--color-surface-alt)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '0.82rem'
                                    }}>
                                        <span style={{ color: 'var(--color-text-muted)' }}>Required Capital:</span>
                                        <strong style={{ color: 'var(--color-gold)' }}>
                                            ₹{totalCapital.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </strong>
                                    </div>
                                )}

                                {(maxProfit || maxLoss) && (
                                    <div className="ticket-pnl-summary">
                                        <div className="ticket-pnl-item">
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Max Profit</div>
                                            <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.95rem' }}>
                                                {maxProfit ? `+₹${Math.abs(maxProfit).toLocaleString('en-IN')}` : '—'}
                                            </div>
                                        </div>
                                        <div className="ticket-pnl-item">
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Max Risk</div>
                                            <div style={{ fontWeight: 700, color: 'var(--color-danger)', fontSize: '0.95rem' }}>
                                                {maxLoss ? `-₹${Math.abs(maxLoss).toLocaleString('en-IN')}` : '—'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {rr && (
                                    <div className="ticket-rr-meter">
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Risk : Reward</div>
                                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: +rr >= 2 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                                            1 : {rr}
                                        </div>
                                    </div>
                                )}

                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Conviction:</span>
                                    <strong style={{ color: 'var(--color-primary)' }}>{form.conviction_level}/10</strong>
                                </div>

                                <div className="ticket-actions">
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        disabled={submitting}
                                        style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                                    >
                                        {submitting ? (
                                            <>Opening Trade…</>
                                        ) : (
                                            <><Rocket size={16} style={{ marginRight: '6px' }} /> Open Trade</>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => navigate('/trades')}
                                        disabled={submitting}
                                        style={{ width: '100%' }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}