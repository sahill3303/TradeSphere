import { useEffect, useState } from 'react';
import api from '../../api/axios';
import './TickerBar.css';

// NIFTY 50 is shown first alongside all user watchlist stocks
const DEFAULT_TICKER_ITEMS = [
    { label: 'NIFTY 50', symbol: 'NIFTY 50', category: 'INDEX', prefix: '₹' },
];

export default function TickerBar() {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchAllPrices = async () => {
            try {
                // 1. Fetch all watchlist symbols across all categories (Long, SSF, weekly, Reliance, etc.)
                let watchlistItems = [];
                try {
                    const wlRes = await api.get('/watchlist/ticker-symbols');
                    if (wlRes.data && wlRes.data.success && Array.isArray(wlRes.data.data)) {
                        watchlistItems = wlRes.data.data;
                    }
                } catch (err) {
                    // Fallback to /watchlist if ticker-symbols is not available
                    try {
                        const fallbackRes = await api.get('/watchlist');
                        if (fallbackRes.data && fallbackRes.data.success && Array.isArray(fallbackRes.data.data)) {
                            watchlistItems = fallbackRes.data.data;
                        }
                    } catch (_) {}
                }

                // 2. Map watchlist symbols preserving category
                const watchlistSymbols = watchlistItems.map(item => {
                    const cleanSym = item.symbol.split(':').pop().trim().toUpperCase();
                    return {
                        label: cleanSym,
                        symbol: cleanSym,
                        name: item.name || cleanSym,
                        category: item.category || 'WATCHLIST',
                        prefix: '₹'
                    };
                });

                // 3. Combine NIFTY 50 + All Watchlist stocks (all categories: Long, SSF, weekly, Reliance, etc.)
                const allItemsToFetch = [...DEFAULT_TICKER_ITEMS];
                watchlistSymbols.forEach(ws => {
                    if (!allItemsToFetch.some(ts => ts.symbol.toUpperCase() === ws.symbol.toUpperCase())) {
                        allItemsToFetch.push(ws);
                    }
                });

                // 4. Batch fetch prices
                const symbolsParam = allItemsToFetch.map(item => item.symbol).join(',');
                const { data } = await api.get(`/watchlist/prices?symbols=${encodeURIComponent(symbolsParam)}`);

                if (data && data.success && data.data) {
                    const priceMap = data.data;
                    const results = allItemsToFetch.map(item => {
                        const quote = priceMap[item.symbol] || priceMap[item.label] || priceMap[item.symbol.toUpperCase()];
                        if (!quote || quote.price == null) return null;

                        const rawPct = quote.percentChange != null ? quote.percentChange : quote.changePct;
                        const changeVal = parseFloat(rawPct) || 0;

                        return {
                            label: item.label,
                            name: item.name,
                            category: item.category,
                            price: quote.price,
                            changePct: changeVal,
                            prefix: item.prefix || '₹'
                        };
                    }).filter(Boolean);

                    if (isMounted && results.length > 0) {
                        setPrices(results);
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('Error fetching ticker prices:', err);
            }
        };

        fetchAllPrices();
        const interval = setInterval(fetchAllPrices, 25000); // refresh every 25s

        // Listen for custom event when watchlist changes
        const handleWatchlistUpdate = () => {
            fetchAllPrices();
        };
        window.addEventListener('watchlist-updated', handleWatchlistUpdate);

        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener('watchlist-updated', handleWatchlistUpdate);
        };
    }, []);

    if (loading || prices.length === 0) {
        return (
            <div className="ticker-bar">
                <div className="ticker-loading">Loading live prices…</div>
            </div>
        );
    }

    return (
        <div className="ticker-bar">
            <div className="ticker-track">
                <div className="ticker-list">
                    {prices.map((item, idx) => {
                        const isPositive = item.changePct >= 0;
                        return (
                            <div key={`list1-${idx}`} className="ticker-item">
                                {item.category && item.category !== 'INDEX' && (
                                    <span className={`ticker-item__cat cat--${item.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {item.category}
                                    </span>
                                )}
                                <span className="ticker-item__label">{item.label}</span>
                                <span className="ticker-item__price">
                                    {item.prefix}{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className={`ticker-item__change ${isPositive ? 'ticker-item__change--pos' : 'ticker-item__change--neg'}`}>
                                    {isPositive ? '▲ +' : '▼ -'}{Math.abs(item.changePct).toFixed(2)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
                {/* Duplicate for infinite loop */}
                <div className="ticker-list" aria-hidden="true">
                    {prices.map((item, idx) => {
                        const isPositive = item.changePct >= 0;
                        return (
                            <div key={`list2-${idx}`} className="ticker-item">
                                {item.category && item.category !== 'INDEX' && (
                                    <span className={`ticker-item__cat cat--${item.category.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {item.category}
                                    </span>
                                )}
                                <span className="ticker-item__label">{item.label}</span>
                                <span className="ticker-item__price">
                                    {item.prefix}{Number(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className={`ticker-item__change ${isPositive ? 'ticker-item__change--pos' : 'ticker-item__change--neg'}`}>
                                    {isPositive ? '▲ +' : '▼ -'}{Math.abs(item.changePct).toFixed(2)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
