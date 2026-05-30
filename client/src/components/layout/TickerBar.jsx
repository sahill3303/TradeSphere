import { useEffect, useState } from 'react';
import api from '../../api/axios';
import './TickerBar.css';

const TICKER_SYMBOLS = [
    { label: 'NIFTY 50', yahoo: '%5ENSEI', prefix: '₹' },
    { label: 'SENSEX', yahoo: '%5EBSESN', prefix: '₹' },
    { label: 'NIFTY BANK', yahoo: '%5ENSEBANK', prefix: '₹' },
    { label: 'NIFTY IT', yahoo: '%5ECNXIT', prefix: '₹' },
    { label: 'RELIANCE', yahoo: 'RELIANCE.NS', prefix: '₹' },
    { label: 'HDFC BANK', yahoo: 'HDFCBANK.NS', prefix: '₹' },
    { label: 'DOW JONES', yahoo: '%5EDJI', prefix: '$' },
    { label: 'NASDAQ', yahoo: '%5ENDX', prefix: '$' }
];

export default function TickerBar() {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchAllPrices = async () => {
            try {
                const results = await Promise.all(
                    TICKER_SYMBOLS.map(async (item) => {
                        try {
                            const { data } = await api.get(`/dashboard/market-chart/${item.yahoo}?interval=1m&range=1d`);
                            const change = data.currentPrice - data.previousClose;
                            const changePct = data.previousClose ? (change / data.previousClose) * 100 : 0;
                            return {
                                label: item.label,
                                price: data.currentPrice,
                                changePct: changePct,
                                prefix: item.prefix
                            };
                        } catch (err) {
                            console.error(`Failed to fetch ticker for ${item.label}:`, err);
                            return null;
                        }
                    })
                );

                if (isMounted) {
                    setPrices(results.filter(Boolean));
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error fetching ticker prices:', err);
            }
        };

        fetchAllPrices();
        const interval = setInterval(fetchAllPrices, 60000); // refresh every 1 min

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    if (loading || prices.length === 0) {
        return (
            <div className="ticker-bar">
                <div className="ticker-loading">Loading live index prices…</div>
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
                                <span className="ticker-item__label">{item.label}</span>
                                <span className="ticker-item__price">
                                    {item.prefix}{Number(item.price).toLocaleString(item.prefix === '$' ? 'en-US' : 'en-IN', { maximumFractionDigits: 2 })}
                                </span>
                                <span className={`ticker-item__change ${isPositive ? 'ticker-item__change--pos' : 'ticker-item__change--neg'}`}>
                                    {isPositive ? '▲' : '▼'} {Math.abs(item.changePct).toFixed(2)}%
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
                                <span className="ticker-item__label">{item.label}</span>
                                <span className="ticker-item__price">
                                    {item.prefix}{Number(item.price).toLocaleString(item.prefix === '$' ? 'en-US' : 'en-IN', { maximumFractionDigits: 2 })}
                                </span>
                                <span className={`ticker-item__change ${isPositive ? 'ticker-item__change--pos' : 'ticker-item__change--neg'}`}>
                                    {isPositive ? '▲' : '▼'} {Math.abs(item.changePct).toFixed(2)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
