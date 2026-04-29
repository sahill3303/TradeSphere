import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import './Watchlist.css';

export default function Watchlist() {
    const [symbols, setSymbols] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const widgetContainerRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        fetchWatchlist();
    }, []);

    useEffect(() => {
        renderWidget();
    }, [symbols]);

    const fetchWatchlist = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/watchlist');
            if (data.success) {
                setSymbols(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch watchlist', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                setIsSearching(true);
                const { data } = await api.get(`/watchlist/search?q=${encodeURIComponent(query)}`);
                if (data.success) {
                    setSuggestions(data.data);
                }
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setIsSearching(false);
            }
        }, 500); // 500ms debounce
    };

    const addSymbol = async (symbol, name) => {
        try {
            const { data } = await api.post('/watchlist', { symbol, name });
            if (data.success) {
                setSearchQuery('');
                setSuggestions([]);
                fetchWatchlist();
            }
        } catch (error) {
            console.error('Failed to add symbol', error);
        }
    };

    const removeSymbol = async (id) => {
        try {
            const { data } = await api.delete(`/watchlist/${id}`);
            if (data.success) {
                fetchWatchlist();
            }
        } catch (error) {
            console.error('Failed to remove symbol', error);
        }
    };

    const renderWidget = () => {
        if (!widgetContainerRef.current || symbols.length === 0) {
            // clear if no symbols
            if (widgetContainerRef.current) widgetContainerRef.current.innerHTML = '';
            return;
        }

        // Clean previous widget
        widgetContainerRef.current.innerHTML = '';

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-data.js';
        script.async = true;

        const widgetConfig = {
            colorTheme: "dark",
            dateRange: "12M",
            showChart: false,
            locale: "en",
            largeChartUrl: "",
            isTransparent: true,
            showSymbolLogo: true,
            showFloatingTooltip: true,
            width: "100%",
            height: "100%",
            symbolsGroups: [
                {
                    name: "My Watchlist",
                    originalName: "Indices",
                    symbols: symbols.map(s => ({
                        name: s.symbol,
                        displayName: s.name || s.symbol.split(':')[1]
                    }))
                }
            ]
        };

        script.innerHTML = JSON.stringify(widgetConfig);
        widgetContainerRef.current.appendChild(script);
    };

    return (
        <div className="page watchlist-page">
            <header className="page__header watchlist-header">
                <div>
                    <h1 className="page__title">Watchlist</h1>
                    <p className="page__subtitle">Live market data for your selected stocks</p>
                </div>
            </header>

            <div className="watchlist-content">
                {/* Sidebar for Search and List */}
                <div className="watchlist-sidebar">
                    <div className="watchlist-search">
                        <input 
                            type="text" 
                            placeholder="Search company (e.g. Reliance)..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="form-input"
                        />
                        {isSearching && (
                            <div className="watchlist-search__loader"></div>
                        )}

                        {suggestions.length > 0 && (
                            <div className="watchlist-suggestions">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => addSymbol(s.symbol, s.name)}
                                        className="watchlist-suggestion-btn"
                                    >
                                        <span className="watchlist-suggestion-name">{s.name}</span>
                                        <span className="watchlist-suggestion-symbol">{s.symbol}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="watchlist-list">
                        {loading ? (
                            <div className="watchlist-empty">Loading watchlist...</div>
                        ) : symbols.length === 0 ? (
                            <div className="watchlist-empty">
                                Your watchlist is empty.<br/><br/>Search above to add stocks.
                            </div>
                        ) : (
                            symbols.map((item) => (
                                <div key={item.id} className="watchlist-item">
                                    <div className="watchlist-item-info">
                                        <span className="watchlist-item-name">{item.name || item.symbol.split(':')[1]}</span>
                                        <span className="watchlist-item-symbol">{item.symbol}</span>
                                    </div>
                                    <button 
                                        onClick={() => removeSymbol(item.id)}
                                        className="watchlist-item-remove"
                                        title="Remove"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Widget Area */}
                <div className="watchlist-main">
                    {symbols.length > 0 ? (
                        <div className="watchlist-widget-container" ref={widgetContainerRef}></div>
                    ) : (
                        <div className="watchlist-placeholder">
                            <div className="watchlist-placeholder-icon">📈</div>
                            <p>Add stocks to your watchlist to see live market data here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
