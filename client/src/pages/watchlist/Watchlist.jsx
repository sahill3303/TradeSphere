import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../api/axios';
import './Watchlist.css';

export default function Watchlist() {
    const [categories, setCategories] = useState([]);
    const [symbols, setSymbols] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('');
    const [selectedForAdd, setSelectedForAdd] = useState(null); // { symbol, name }
    const [isEditing, setIsEditing] = useState(false);
    const [prices, setPrices] = useState({});
    const [pricesLoading, setPricesLoading] = useState(false);
    
    // New Category Modal
    const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [catsRes, symsRes] = await Promise.all([
                api.get('/watchlist/categories'),
                api.get('/watchlist')
            ]);
            
            if (catsRes.data.success) {
                setCategories(catsRes.data.data);
                if (catsRes.data.data.length > 0 && !activeCategory) {
                    setActiveCategory(catsRes.data.data[0].name);
                }
            }
            if (symsRes.data.success) {
                setSymbols(symsRes.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch watchlist data', error);
        } finally {
            setLoading(false);
        }
    };

    const activeSymbols = useMemo(() => {
        return symbols.filter(s => s.category === activeCategory);
    }, [symbols, activeCategory]);

    // Fetch prices when active symbols change
    useEffect(() => {
        if (activeSymbols.length > 0) {
            fetchPrices(activeSymbols);
        } else {
            setPrices({});
        }
    }, [activeSymbols]);

    const fetchPrices = async (syms) => {
        try {
            setPricesLoading(true);
            const symbolString = syms.map(s => s.symbol).join(',');
            const { data } = await api.get(`/watchlist/prices?symbols=${symbolString}`);
            if (data.success) {
                setPrices(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch prices', error);
        } finally {
            setPricesLoading(false);
        }
    };

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

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

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
                setActiveCategory(category);
                fetchData();
            }
        } catch (error) {
            console.error('Failed to add symbol', error);
        }
    };

    const removeSymbol = async (id) => {
        try {
            const { data } = await api.delete(`/watchlist/${id}`);
            if (data.success) fetchData();
        } catch (error) {
            console.error('Failed to remove symbol', error);
        }
    };

    const createNewCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            const { data } = await api.post('/watchlist/categories', { name: newCategoryName.trim() });
            if (data.success) {
                setNewCategoryName('');
                setShowNewCategoryModal(false);
                fetchData();
                setActiveCategory(newCategoryName.trim());
            }
        } catch (error) {
            console.error('Failed to create category', error);
        }
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
                        {isSearching && <div className="watchlist-search__loader"></div>}

                        {suggestions.length > 0 && !selectedForAdd && (
                            <div className="watchlist-suggestions">
                                {suggestions.map((s, i) => (
                                    <button key={i} onClick={() => setSelectedForAdd(s)} className="watchlist-suggestion-btn">
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
                                    {categories.map(cat => (
                                        <button key={cat.id} onClick={() => confirmAddSymbol(cat.name)} className="btn btn--secondary">
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                                <button className="btn btn--ghost mt-2" onClick={() => setSelectedForAdd(null)}>Cancel</button>
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
                            {categories.map(cat => (
                                <button 
                                    key={cat.id}
                                    className={`watchlist-tab ${activeCategory === cat.name ? 'active' : ''}`}
                                    onClick={() => { setActiveCategory(cat.name); setIsEditing(false); }}
                                >
                                    {cat.name}
                                </button>
                            ))}
                            <button className="watchlist-tab watchlist-tab--add" onClick={() => setShowNewCategoryModal(true)}>
                                + New Watchlist
                            </button>
                        </div>
                        <div className="watchlist-tabs-actions">
                            {lastUpdated && <span className="watchlist-last-updated">Last Updated: {lastUpdated}</span>}
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
                        ) : activeSymbols.length === 0 ? (
                            <div className="watchlist-placeholder">
                                <div className="watchlist-placeholder-icon">📈</div>
                                <p>No stocks in the <strong>{activeCategory}</strong> category.</p>
                                <p className="text-sm mt-2 opacity-50">Search in the left panel to add some.</p>
                            </div>
                        ) : (
                            <div className="watchlist-table-container">
                                <table className="watchlist-table">
                                    <thead>
                                        <tr>
                                            <th>Company Name</th>
                                            <th>Symbol</th>
                                            <th className="text-right">LTP (₹)</th>
                                            {isEditing && <th className="text-right">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeSymbols.map(item => (
                                            <tr key={item.id}>
                                                <td className="font-medium">{item.name || item.symbol.split(':')[1]}</td>
                                                <td className="text-xs text-zinc-500">{item.symbol}</td>
                                                <td className="text-right watchlist-ltp">
                                                    {pricesLoading ? (
                                                        <span className="pulsing-text">Fetching...</span>
                                                    ) : (
                                                        prices[item.symbol] ? `₹${prices[item.symbol]}` : <span className="opacity-50">N/A</span>
                                                    )}
                                                </td>
                                                {isEditing && (
                                                    <td className="text-right">
                                                        <button className="btn btn--danger btn--small" onClick={() => removeSymbol(item.id)}>Remove</button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Category Modal */}
            {showNewCategoryModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="mb-4">Create New Watchlist</h3>
                        <form onSubmit={createNewCategory}>
                            <input 
                                type="text" 
                                className="form-input mb-4" 
                                placeholder="Enter watchlist name..." 
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <button type="button" className="btn btn--ghost" onClick={() => setShowNewCategoryModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn--primary" disabled={!newCategoryName.trim()}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
