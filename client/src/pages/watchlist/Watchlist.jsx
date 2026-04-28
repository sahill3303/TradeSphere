import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';

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
        <div className="space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Watchlist</h1>
                    <p className="text-zinc-400 mt-1">Live market data for your selected stocks</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
                {/* Sidebar for Search and List */}
                <div className="lg:col-span-1 flex flex-col space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-hidden">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Search company (e.g. Reliance)..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-3 text-zinc-400">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        )}

                        {suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => addSymbol(s.symbol, s.name)}
                                        className="w-full text-left px-4 py-2 hover:bg-zinc-700 focus:bg-zinc-700 transition-colors flex flex-col items-start border-b border-zinc-700/50 last:border-0"
                                    >
                                        <span className="text-white text-sm font-medium">{s.name}</span>
                                        <span className="text-xs text-zinc-400">{s.symbol}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {loading ? (
                            <div className="text-center text-zinc-500 py-4">Loading watchlist...</div>
                        ) : symbols.length === 0 ? (
                            <div className="text-center text-zinc-500 py-8 border border-dashed border-zinc-700 rounded-lg">
                                Your watchlist is empty. Search above to add stocks.
                            </div>
                        ) : (
                            symbols.map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 p-3 rounded-lg border border-zinc-700/50 transition-colors group">
                                    <div>
                                        <div className="text-sm font-medium text-white">{item.name || item.symbol.split(':')[1]}</div>
                                        <div className="text-xs text-zinc-500">{item.symbol}</div>
                                    </div>
                                    <button 
                                        onClick={() => removeSymbol(item.id)}
                                        className="text-zinc-500 hover:text-red-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Widget Area */}
                <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                    {symbols.length > 0 ? (
                        <div className="flex-1 w-full h-full" ref={widgetContainerRef}></div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                            <svg className="w-16 h-16 mb-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <p>Add stocks to your watchlist to see live market data here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
