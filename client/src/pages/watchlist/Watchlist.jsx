import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../api/axios';
import './Watchlist.css';

const CATEGORIES = ['Short', 'Long', 'Specific Week'];

export default function Watchlist() {
    const [symbols, setSymbols] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
    const [selectedForAdd, setSelectedForAdd] = useState(null); // { symbol, name }
    const [isEditing, setIsEditing] = useState(false);

    const widgetContainerRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const activeSymbols = useMemo(() => {
        return symbols.filter(s => (s.category || 'Short') === activeCategory);
    }, [symbols, activeCategory]);

    const lastUpdated = useMemo(() => {
        if (activeSymbols.length === 0) return null;
        const latest = activeSymbols.reduce((latestDate, current) => {
            const currentDate = new Date(current.created_at);
            return currentDate > latestDate ? currentDate : latestDate;
        }, new Date(0));
        
        return latest.toLocaleString('en-IN', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
        });
    }, [activeSymbols]);

    useEffect(() => {
        renderWidget();
    }, [activeSymbols]);

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
        }, 500);
    };

    const confirmAddSymbol = async (category) => {
        if (!selectedForAdd) return;
        try {
            const { data } = await api.post('/watchlist', { 
                symbol: selectedForAdd.symbol, 
                name: selectedForAdd.name,
                category 
            });
            if (data.success) {
                setSearchQuery('');
                setSuggestions([]);
                setSelectedForAdd(null);
                setActiveCategory(category); // switch to the category to see it
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
        if (!widgetContainerRef.current) return;

        widgetContainerRef.current.innerHTML = '';

        if (activeSymbols.length === 0 && !isEditing) return;

        const innerWidget = document.createElement('div');
        innerWidget.className = 'tradingview-widget-container__widget';
        innerWidget.style.height = '100%';
        innerWidget.style.width = '100%';
        widgetContainerRef.current.appendChild(innerWidget);

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
                    name: activeCategory,
                    originalName: "Indices",
                    symbols: activeSymbols.map(s => ({
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
                    <p className="page__subtitle">Live market data categorized by timeline</p>
                </div>
            </header>

            <div className="watchlist-content">
                {/* Sidebar for Search */}
                <div className="watchlist-sidebar">
                    <div className="watchlist-search">
                        <input 
                            type="text" 
                            placeholder="Search company (e.g. Reliance)..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="form-input"
                            autoFocus
                        />
                        {isSearching && (
                            <div className="watchlist-search__loader"></div>
                        )}

                        {suggestions.length > 0 && !selectedForAdd && (
                            <div className="watchlist-suggestions">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedForAdd(s)}
                                        className="watchlist-suggestion-btn"
                                    >
                                        <span className="watchlist-suggestion-name">{s.name}</span>
                                        <span className="watchlist-suggestion-symbol">{s.symbol}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        {/* Category Selection Modal/Overlay */}
                        {selectedForAdd && (
                            <div className="watchlist-add-modal">
                                <h4>Add to Category</h4>
                                <p className="watchlist-add-stock-name">{selectedForAdd.name}</p>
                                <div className="watchlist-add-options">
                                    {CATEGORIES.map(cat => (
                                        <button 
                                            key={cat} 
                                            onClick={() => confirmAddSymbol(cat)}
                                            className="btn btn--secondary"
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    className="btn btn--ghost mt-2" 
                                    onClick={() => setSelectedForAdd(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="watchlist-sidebar-info">
                        <div className="watchlist-sidebar-icon">🔍</div>
                        <p>Search for a stock above and select a category to add it to your watchlist.</p>
                    </div>
                </div>

                {/* Main Area */}
                <div className="watchlist-main-wrapper">
                    <div className="watchlist-tabs-header">
                        <div className="watchlist-tabs">
                            {CATEGORIES.map(cat => (
                                <button 
                                    key={cat}
                                    className={`watchlist-tab ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => { setActiveCategory(cat); setIsEditing(false); }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div className="watchlist-tabs-actions">
                            {lastUpdated && (
                                <span className="watchlist-last-updated">Last Updated: {lastUpdated}</span>
                            )}
                            <button 
                                className={`btn ${isEditing ? 'btn--primary' : 'btn--secondary'}`}
                                onClick={() => setIsEditing(!isEditing)}
                                disabled={activeSymbols.length === 0}
                            >
                                {isEditing ? 'Done' : 'Edit List'}
                            </button>
                        </div>
                    </div>

                    <div className="watchlist-main">
                        {loading ? (
                            <div className="watchlist-placeholder">Loading...</div>
                        ) : isEditing ? (
                            <div className="watchlist-edit-mode">
                                <h3 className="mb-4">Manage {activeCategory} Watchlist</h3>
                                {activeSymbols.length === 0 ? (
                                    <p className="text-zinc-500">No stocks in this category.</p>
                                ) : (
                                    <div className="watchlist-edit-list">
                                        {activeSymbols.map(item => (
                                            <div key={item.id} className="watchlist-edit-item">
                                                <div>
                                                    <div className="font-medium">{item.name || item.symbol.split(':')[1]}</div>
                                                    <div className="text-xs text-zinc-500">{item.symbol}</div>
                                                </div>
                                                <button 
                                                    className="btn btn--danger"
                                                    onClick={() => removeSymbol(item.id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : activeSymbols.length > 0 ? (
                            <div className="watchlist-widget-container tradingview-widget-container" ref={widgetContainerRef}></div>
                        ) : (
                            <div className="watchlist-placeholder">
                                <div className="watchlist-placeholder-icon">📈</div>
                                <p>No stocks in the <strong>{activeCategory}</strong> category.</p>
                                <p className="text-sm mt-2 opacity-50">Search in the left panel to add some.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
