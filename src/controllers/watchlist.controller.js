import db from '../config/db.js';
import fetch from 'node-fetch';

// Fetch all watchlist symbols
export const getWatchlist = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM watchlist_symbols ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Watchlist fetch error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch watchlist' });
    }
};

// Add a symbol to watchlist
export const addWatchlistSymbol = async (req, res) => {
    const { symbol, name } = req.body;
    if (!symbol) return res.status(400).json({ success: false, message: 'Symbol is required' });

    try {
        await db.query(
            'INSERT INTO watchlist_symbols (symbol, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
            [symbol.toUpperCase(), name || null]
        );
        res.status(201).json({ success: true, message: 'Symbol added to watchlist' });
    } catch (err) {
        console.error('Add watchlist symbol error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to add symbol' });
    }
};

// Remove a symbol from watchlist
export const removeWatchlistSymbol = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM watchlist_symbols WHERE id = ?', [id]);
        res.json({ success: true, message: 'Symbol removed from watchlist' });
    } catch (err) {
        console.error('Remove watchlist symbol error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to remove symbol' });
    }
};

// Search stocks using Screener.in API
export const searchStocks = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    try {
        const searchRes = await fetch(
            `https://www.screener.in/api/company/search/?q=${encodeURIComponent(q)}&v=3&fts=1`,
            { 
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'
                } 
            }
        );

        if (!searchRes.ok) throw new Error('Screener search failed');
        const results = await searchRes.json();
        
        // Map results to standard format and extract symbol from URL
        const mappedResults = results
            .filter(r => r.id !== null && r.url) // skip "search everywhere" dummy result
            .map(r => {
                // url format is usually /company/SYMBOL/ or /company/SYMBOL/consolidated/
                const match = r.url.match(/\/company\/([^/]+)/);
                const symbol = match ? match[1] : null;
                return {
                    name: r.name,
                    symbol: symbol ? `NSE:${symbol}` : null // TradingView expects exchange prefix
                };
            })
            .filter(r => r.symbol !== null);

        res.json({ success: true, data: mappedResults });
    } catch (err) {
        console.error('Stock search error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to search stocks' });
    }
};
