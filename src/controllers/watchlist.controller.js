import db from '../config/db.js';

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
    const { symbol, name, category } = req.body;
    if (!symbol) return res.status(400).json({ success: false, message: 'Symbol is required' });
    
    const cat = category || 'Short'; // default to Short if not provided

    try {
        await db.query(
            'INSERT INTO watchlist_symbols (symbol, name, category) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), created_at=CURRENT_TIMESTAMP',
            [symbol.toUpperCase(), name || null, cat]
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

export const getCategories = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM watchlist_categories ORDER BY created_at ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Category fetch error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

export const addCategory = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });

    try {
        await db.query('INSERT IGNORE INTO watchlist_categories (name) VALUES (?)', [name]);
        res.status(201).json({ success: true, message: 'Category created' });
    } catch (err) {
        console.error('Add category error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
};

export const removeCategory = async (req, res) => {
    const { id } = req.params;
    try {
        // Find the category name
        const [rows] = await db.query('SELECT name FROM watchlist_categories WHERE id = ?', [id]);
        if (rows.length > 0) {
            const categoryName = rows[0].name;
            // Optionally delete symbols in this category
            await db.query('DELETE FROM watchlist_symbols WHERE category = ?', [categoryName]);
        }
        await db.query('DELETE FROM watchlist_categories WHERE id = ?', [id]);
        res.json({ success: true, message: 'Category removed' });
    } catch (err) {
        console.error('Remove category error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to remove category' });
    }
};

export const getPrices = async (req, res) => {
    const { symbols } = req.query; // Expecting comma separated string e.g. NSE:RELIANCE,BOM:500325
    if (!symbols) return res.json({ success: true, data: {} });

    try {
        const symbolArray = symbols.split(',').filter(Boolean);
        const cheerio = await import('cheerio');
        const priceMap = {};

        // Fetch prices concurrently
        await Promise.all(symbolArray.map(async (sym) => {
            try {
                // Screener expects symbol like RELIANCE without NSE: prefix
                const cleanSymbol = sym.split(':').pop(); 
                const response = await fetch(`https://www.screener.in/company/${cleanSymbol}/consolidated/`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                if (!response.ok) {
                    // Try standalone format if consolidated fails
                    const fallbackResponse = await fetch(`https://www.screener.in/company/${cleanSymbol}/`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (!fallbackResponse.ok) return;
                    const html = await fallbackResponse.text();
                    const $ = cheerio.load(html);
                    const price = $('.nowrap.value .number').first().text();
                    if (price) priceMap[sym] = price;
                    return;
                }

                const html = await response.text();
                const $ = cheerio.load(html);
                const price = $('.nowrap.value .number').first().text();
                if (price) priceMap[sym] = price;
            } catch (err) {
                console.error(`Failed to fetch price for ${sym}:`, err.message);
            }
        }));

        res.json({ success: true, data: priceMap });
    } catch (err) {
        console.error('Get prices error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch prices' });
    }
};
