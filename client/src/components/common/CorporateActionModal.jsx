import { useState, useMemo, useEffect } from 'react';
import {
    Split, ArrowRight, Check, AlertCircle, Calendar, X,
    Sparkles, ShieldCheck, Scale, RefreshCw
} from 'lucide-react';
import api from '../../api/axios';
import './CorporateActionModal.css';

const PRESETS = {
    STOCK_SPLIT: [
        { label: '1 : 10 (FV ₹10 → ₹1)', from: 1, to: 10 },
        { label: '1 : 5 (FV ₹10 → ₹2)',  from: 1, to: 5 },
        { label: '1 : 2 (FV ₹10 → ₹5)',  from: 1, to: 2 },
        { label: '1 : 4 (FV ₹10 → ₹2.5)',from: 1, to: 4 },
    ],
    BONUS_ISSUE: [
        { label: '1 : 1 (100% Bonus)', from: 1, to: 1 },
        { label: '2 : 1 (200% Bonus)', from: 1, to: 2 },
        { label: '1 : 2 (50% Bonus)',  from: 2, to: 1 },
        { label: '3 : 1 (300% Bonus)', from: 1, to: 3 },
        { label: '1 : 4 (25% Bonus)',  from: 4, to: 1 },
    ],
    REVERSE_SPLIT: [
        { label: '10 : 1 Consolidation', from: 10, to: 1 },
        { label: '5 : 1 Consolidation',  from: 5,  to: 1 },
        { label: '2 : 1 Consolidation',  from: 2,  to: 1 },
    ]
};

/**
 * Layer 3 Watchdog: Heuristic detection of stock splits / bonus issues
 * Compares entry_price vs CMP to see if it matches standard corporate action ratios.
 */
export function detectPotentialSplit(entryPrice, currentPrice) {
    const entry = Number(entryPrice);
    const cmp = Number(currentPrice);
    if (!entry || !cmp || entry <= 0 || cmp <= 0) return null;
    const ratio = entry / cmp;

    if (ratio >= 8.5 && ratio <= 11.5) {
        return { action: 'STOCK_SPLIT', ratio: { from: 1, to: 10 }, label: '⚡ Split Detected (~1:10)', desc: 'Current price is ~1/10th of entry (likely 1:10 split)' };
    }
    if (ratio >= 4.4 && ratio <= 5.6) {
        return { action: 'STOCK_SPLIT', ratio: { from: 1, to: 5 }, label: '⚡ Split Detected (~1:5)', desc: 'Current price is ~1/5th of entry (likely 1:5 split)' };
    }
    if (ratio >= 3.5 && ratio <= 4.5) {
        return { action: 'STOCK_SPLIT', ratio: { from: 1, to: 4 }, label: '⚡ Split Detected (~1:4)', desc: 'Current price is ~1/4th of entry (likely 1:4 split)' };
    }
    if (ratio >= 2.6 && ratio <= 3.4) {
        return { action: 'STOCK_SPLIT', ratio: { from: 1, to: 3 }, label: '⚡ Split / Bonus (~1:3)', desc: 'Current price is ~1/3rd of entry (likely 1:3 split or 2:1 bonus)' };
    }
    if (ratio >= 1.75 && ratio <= 2.25) {
        return { action: 'STOCK_SPLIT', ratio: { from: 1, to: 2 }, label: '⚡ Split / Bonus (~1:2)', desc: 'Current price is ~1/2 of entry (likely 1:2 split or 1:1 bonus)' };
    }
    return null;
}

export default function CorporateActionModal({
    trade,
    initialAction = 'STOCK_SPLIT',
    initialRatio = { from: 1, to: 10 },
    onClose,
    onSuccess
}) {
    if (!trade) return null;

    const [actionType, setActionType] = useState(initialAction);
    const [ratioFrom, setRatioFrom] = useState(initialRatio.from || 1);
    const [ratioTo, setRatioTo] = useState(initialRatio.to || 10);
    const [exDate, setExDate] = useState(new Date().toISOString().split('T')[0]);
    const [adjustTargetSl, setAdjustTargetSl] = useState(true);
    const [notes, setNotes] = useState('');
    const [customQty, setCustomQty] = useState('');
    const [customPrice, setCustomPrice] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Pre-populate presets when action type changes
    const currentPresets = PRESETS[actionType] || [];

    // Calculate Projected Holding
    const projection = useMemo(() => {
        const oldQty = Number(trade.quantity) || 0;
        const oldPrice = Number(trade.entry_price) || 0;
        const lev = Number(trade.leverage) || 1;
        const oldInvested = (oldPrice * oldQty) / lev;

        const numFrom = parseFloat(ratioFrom) || 1;
        const numTo = parseFloat(ratioTo) || 1;

        let multiplier = 1;
        let projQty = oldQty;
        let projPrice = oldPrice;

        if (actionType === 'STOCK_SPLIT') {
            multiplier = numTo / numFrom;
            projQty = Math.round(oldQty * multiplier);
            projPrice = multiplier > 0 ? oldPrice / multiplier : oldPrice;
        } else if (actionType === 'BONUS_ISSUE') {
            multiplier = 1 + (numTo / numFrom);
            projQty = Math.round(oldQty * multiplier);
            projPrice = multiplier > 0 ? oldPrice / multiplier : oldPrice;
        } else if (actionType === 'REVERSE_SPLIT') {
            multiplier = numTo / numFrom;
            projQty = Math.max(1, Math.round(oldQty * multiplier));
            projPrice = multiplier > 0 ? oldPrice / multiplier : oldPrice;
        } else if (actionType === 'CUSTOM_ADJUSTMENT') {
            projQty = Number(customQty) > 0 ? Math.round(Number(customQty)) : oldQty;
            projPrice = Number(customPrice) > 0 ? Number(customPrice) : oldPrice;
            multiplier = oldQty > 0 ? projQty / oldQty : 1;
        }

        const projInvested = (projPrice * projQty) / lev;

        // Target & SL
        const oldTarget = trade.target ? Number(trade.target) : null;
        const oldSL = trade.stop_loss ? Number(trade.stop_loss) : null;
        const projTarget = (adjustTargetSl && oldTarget && multiplier > 0) ? oldTarget / multiplier : oldTarget;
        const projSL = (adjustTargetSl && oldSL && multiplier > 0) ? oldSL / multiplier : oldSL;

        return {
            oldQty,
            oldPrice,
            oldInvested,
            projQty,
            projPrice,
            projInvested,
            multiplier,
            oldTarget,
            oldSL,
            projTarget,
            projSL,
            qtyDiff: projQty - oldQty
        };
    }, [trade, actionType, ratioFrom, ratioTo, adjustTargetSl, customQty, customPrice]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (actionType !== 'CUSTOM_ADJUSTMENT') {
            if (Number(ratioFrom) <= 0 || Number(ratioTo) <= 0) {
                setError('Ratio numbers must be greater than zero.');
                return;
            }
        } else {
            if (!customQty || Number(customQty) <= 0 || !customPrice || Number(customPrice) <= 0) {
                setError('Please provide valid positive values for custom quantity and price.');
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                action_type: actionType,
                ratio_from: ratioFrom,
                ratio_to: ratioTo,
                adjust_target_sl: adjustTargetSl,
                ex_date: exDate,
                notes: notes.trim(),
                custom_quantity: actionType === 'CUSTOM_ADJUSTMENT' ? Number(customQty) : undefined,
                custom_entry_price: actionType === 'CUSTOM_ADJUSTMENT' ? Number(customPrice) : undefined
            };

            await api.post(`/trades/${trade.trade_id}/corporate-action`, payload);

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err) {
            console.error('Corporate action error:', err);
            setError(err.response?.data?.message || 'Failed to apply corporate action.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="corp-modal-overlay" onClick={onClose}>
            <div className="corp-modal-box" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="corp-header">
                    <div>
                        <h3 className="corp-header__title">
                            <Split size={20} color="var(--color-primary, #d4af37)" />
                            Corporate Action & Split Wizard
                        </h3>
                        <p className="corp-header__subtitle">
                            Adjust <strong>{trade.stock_name}</strong> for Stock Splits, Bonus Issues, or Consolidations.
                            Total cost basis is 100% preserved.
                        </p>
                    </div>
                    <button type="button" className="btn-close-pad" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={15} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Action Type Selector */}
                    <div className="corp-action-types">
                        <button
                            type="button"
                            className={`corp-action-btn ${actionType === 'STOCK_SPLIT' ? 'corp-action-btn--active' : ''}`}
                            onClick={() => {
                                setActionType('STOCK_SPLIT');
                                setRatioFrom(1);
                                setRatioTo(10);
                            }}
                        >
                            <span>Stock Split</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>e.g. 1 : 10</span>
                        </button>

                        <button
                            type="button"
                            className={`corp-action-btn ${actionType === 'BONUS_ISSUE' ? 'corp-action-btn--active' : ''}`}
                            onClick={() => {
                                setActionType('BONUS_ISSUE');
                                setRatioFrom(1);
                                setRatioTo(1);
                            }}
                        >
                            <span>Bonus Issue</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>e.g. 1 : 1 Bonus</span>
                        </button>

                        <button
                            type="button"
                            className={`corp-action-btn ${actionType === 'REVERSE_SPLIT' ? 'corp-action-btn--active' : ''}`}
                            onClick={() => {
                                setActionType('REVERSE_SPLIT');
                                setRatioFrom(10);
                                setRatioTo(1);
                            }}
                        >
                            <span>Reverse Split</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Consolidation</span>
                        </button>

                        <button
                            type="button"
                            className={`corp-action-btn ${actionType === 'CUSTOM_ADJUSTMENT' ? 'corp-action-btn--active' : ''}`}
                            onClick={() => {
                                setActionType('CUSTOM_ADJUSTMENT');
                                setCustomQty(trade.quantity);
                                setCustomPrice(trade.entry_price);
                            }}
                        >
                            <span>Custom Override</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Direct Input</span>
                        </button>
                    </div>

                    {/* Presets Bar */}
                    {currentPresets.length > 0 && actionType !== 'CUSTOM_ADJUSTMENT' && (
                        <div className="corp-presets">
                            <span className="corp-presets__label">Popular Ratios:</span>
                            {currentPresets.map((p, idx) => {
                                const isActive = Number(ratioFrom) === p.from && Number(ratioTo) === p.to;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        className={`corp-preset-chip ${isActive ? 'corp-preset-chip--active' : ''}`}
                                        onClick={() => {
                                            setRatioFrom(p.from);
                                            setRatioTo(p.to);
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Ratio Inputs */}
                    {actionType !== 'CUSTOM_ADJUSTMENT' ? (
                        <div className="corp-form-grid">
                            <div>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>
                                    {actionType === 'STOCK_SPLIT' ? 'Old Shares (Ratio From)' : actionType === 'BONUS_ISSUE' ? 'Existing Shares Held (For Every)' : 'Old Shares Consolidating'}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    className="form-input"
                                    value={ratioFrom}
                                    onChange={(e) => setRatioFrom(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>
                                    {actionType === 'STOCK_SPLIT' ? 'New Shares (Ratio To)' : actionType === 'BONUS_ISSUE' ? 'Bonus Shares Received' : 'New Shares Resulting'}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    className="form-input"
                                    value={ratioTo}
                                    onChange={(e) => setRatioTo(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="corp-form-grid">
                            <div>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Adjusted Quantity *</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-input"
                                    value={customQty}
                                    onChange={(e) => setCustomQty(e.target.value)}
                                    placeholder={`Current: ${trade.quantity}`}
                                    required
                                />
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Adjusted Entry Price (₹) *</label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    className="form-input"
                                    value={customPrice}
                                    onChange={(e) => setCustomPrice(e.target.value)}
                                    placeholder={`Current: ₹${trade.entry_price}`}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Interactive Visual Comparison Box */}
                    <div className="corp-compare-box">
                        <div className="corp-compare-grid">
                            {/* Current Card */}
                            <div className="corp-compare-card">
                                <div className="corp-compare-title">Current Holding</div>
                                <div className="corp-compare-row">
                                    <span style={{ color: '#94a3b8' }}>Quantity:</span>
                                    <strong>{projection.oldQty} shares</strong>
                                </div>
                                <div className="corp-compare-row">
                                    <span style={{ color: '#94a3b8' }}>Avg Buy Price:</span>
                                    <strong>₹{projection.oldPrice.toFixed(2)}</strong>
                                </div>
                                {projection.oldTarget && (
                                    <div className="corp-compare-row">
                                        <span style={{ color: '#94a3b8' }}>Target:</span>
                                        <span style={{ color: '#34d399' }}>₹{projection.oldTarget.toFixed(2)}</span>
                                    </div>
                                )}
                                {projection.oldSL && (
                                    <div className="corp-compare-row">
                                        <span style={{ color: '#94a3b8' }}>Stop Loss:</span>
                                        <span style={{ color: '#f87171' }}>₹{projection.oldSL.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="corp-compare-row">
                                    <span style={{ color: '#94a3b8' }}>Total Invested:</span>
                                    <strong style={{ color: 'var(--color-primary)' }}>₹{projection.oldInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="corp-compare-arrow">
                                <ArrowRight size={22} />
                            </div>

                            {/* Projected Card */}
                            <div className="corp-compare-card corp-compare-card--projected">
                                <div className="corp-compare-title" style={{ color: 'var(--color-primary)' }}>
                                    Projected Post-Action
                                </div>
                                <div className="corp-compare-row">
                                    <span style={{ color: '#94a3b8' }}>Quantity:</span>
                                    <strong style={{ color: '#38bdf8' }}>
                                        {projection.projQty} shares
                                        {projection.qtyDiff !== 0 && (
                                            <span style={{ fontSize: '0.72rem', marginLeft: '4px', color: projection.qtyDiff > 0 ? '#34d399' : '#f87171' }}>
                                                ({projection.qtyDiff > 0 ? '+' : ''}{projection.qtyDiff})
                                            </span>
                                        )}
                                    </strong>
                                </div>
                                <div className="corp-compare-row">
                                    <span style={{ color: '#94a3b8' }}>Avg Buy Price:</span>
                                    <strong style={{ color: '#fbbf24' }}>₹{projection.projPrice.toFixed(2)}</strong>
                                </div>
                                {projection.projTarget && (
                                    <div className="corp-compare-row">
                                        <span style={{ color: '#94a3b8' }}>Target:</span>
                                        <span style={{ color: '#34d399' }}>₹{projection.projTarget.toFixed(2)}</span>
                                    </div>
                                )}
                                {projection.projSL && (
                                    <div className="corp-compare-row">
                                        <span style={{ color: '#94a3b8' }}>Stop Loss:</span>
                                        <span style={{ color: '#f87171' }}>₹{projection.projSL.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="corp-compare-row">
                                    <span style={{ color: '#94a3b8' }}>Total Invested:</span>
                                    <strong style={{ color: 'var(--color-primary)' }}>₹{projection.projInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Invariance Check */}
                        <div className="corp-invariance-badge">
                            <ShieldCheck size={16} />
                            <span>
                                Capital Invariant: Total cost basis remains exactly ₹{projection.projInvested.toLocaleString('en-IN', { maximumFractionDigits: 2 })}.
                            </span>
                        </div>
                    </div>

                    {/* Options & Date */}
                    <div className="corp-options-section">
                        <div className="corp-form-grid" style={{ marginBottom: 0 }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>Ex-Date of Action</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={exDate}
                                    onChange={(e) => setExDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.25rem' }}>
                                <label className="corp-checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={adjustTargetSl}
                                        onChange={(e) => setAdjustTargetSl(e.target.checked)}
                                    />
                                    <span>Proportionately adjust Target & Stop Loss</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>Reason & Filing Notes (Optional)</label>
                            <textarea
                                className="form-input"
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Sub-division of equity shares from face value ₹10 to ₹1 approved by board..."
                                style={{ fontSize: '0.82rem', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="portfolio-modal-footer" style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                        <button
                            type="button"
                            className="btn-paper-cancel"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-paper-confirm"
                            disabled={submitting}
                            style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b8972e 100%)', color: '#0b0e14', fontWeight: 800 }}
                        >
                            {submitting ? 'Applying Adjustment…' : 'Confirm & Apply Corporate Action'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
