import { useEffect, useState } from 'react';
import api from '../../api/axios';

/**
 * MarketChart (Repurposed as CMP Card)
 * Shows only the Current Market Price (CMP) and daily change.
 */
const SYMBOL_MAP = {
    'NSE:NIFTY': '%5ENSEI',
    'NSE:BANKNIFTY': '%5ENSEBANK',
    'NSE:FINNIFTY': '%5ENSEFIN',
    'NSE:CNXIT': '%5ECNXIT',
    'BSE:SENSEX': '%5EBSESN',
    'DJI': '%5EDJI',
    'IXIC': '%5EIXIC',
};

export default function MarketChart({ 
    symbol: initialSymbol, 
    label: initialLabel, 
    accentColor: initialColor = '#D4AF37'
}) {
    const [priceData, setPriceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const fetchPrice = async () => {
            try {
                // Map back to Yahoo symbols for the proxy
                const yahooSym = SYMBOL_MAP[initialSymbol] || initialSymbol;
                const { data } = await api.get(`/dashboard/market-chart/${yahooSym}?interval=1m&range=1d`);
                
                if (isMounted) {
                    setPriceData({
                        price: data.currentPrice,
                        prev: data.previousClose,
                        symbol: data.symbol
                    });
                    setError(false);
                }
            } catch (err) {
                console.error('CMP fetch error:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, 30000); // refresh every 30s

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [initialSymbol]);

    const change = priceData ? (priceData.price - priceData.prev) : 0;
    const changePct = priceData?.prev ? (change / priceData.prev) * 100 : 0;
    const isPositive = change >= 0;

    if (loading && !priceData) {
        return (
            <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '120px' }}>
                <div className="skeleton" style={{ height: '14px', width: '40%', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '32px', width: '70%', borderRadius: '4px' }} />
                <div className="skeleton" style={{ height: '14px', width: '30%', borderRadius: '4px' }} />
            </div>
        );
    }

    if (error && !priceData) {
        return (
            <div className="card" style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--color-text-dim)', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.8rem' }}>Price Unavailable</span>
            </div>
        );
    }

    return (
        <div className="card cmp-card">
            {/* Background Accent Gradient */}
            <div className="cmp-card__accent" style={{ background: `linear-gradient(90deg, transparent, ${initialColor}08)` }} />
            
            <div className="cmp-card__header">
                <span className="cmp-card__indicator" style={{ background: initialColor, boxShadow: `0 0 8px ${initialColor}` }} />
                <span className="cmp-card__label">{initialLabel}</span>
            </div>

            <div className="cmp-card__body">
                <h2 className="cmp-card__price">
                    ₹{Number(priceData?.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </h2>
                
                <div className={`cmp-card__change ${isPositive ? 'cmp-card__change--pos' : 'cmp-card__change--neg'}`}>
                    <span>{isPositive ? '▲' : '▼'}</span>
                    <span>{Math.abs(changePct).toFixed(2)}%</span>
                </div>
            </div>

            {/* Top Border Accent */}
            <div className="cmp-card__border" style={{ background: `linear-gradient(90deg, ${initialColor}, transparent)` }} />
        </div>
    );
}
