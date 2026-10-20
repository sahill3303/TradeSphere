import db from '../config/db.js';
import { fetchBatchPrices } from '../services/screenerPrice.service.js';

// Fetch all watchlist symbols for this user
export const getWatchlist = async (req, res) => {
    try {
        const adminId = req.user.id;
        const [rows] = await db.query(
            `SELECT s.* 
             FROM watchlist_symbols s
             INNER JOIN watchlist_categories c ON s.admin_id = c.admin_id AND s.category = c.name
             WHERE s.admin_id = ? 
             ORDER BY s.created_at DESC`,
            [adminId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch watchlist' });
    }
};

// Add a symbol to watchlist
export const addWatchlistSymbol = async (req, res) => {
    const { symbol, name, category } = req.body;
    if (!symbol) return res.status(400).json({ success: false, message: 'Symbol is required' });

    const cat = category || 'Short';
    const adminId = req.user.id;

    try {
        const [catExists] = await db.query(
            'SELECT id FROM watchlist_categories WHERE name = ? AND admin_id = ?',
            [cat, adminId]
        );
        if (catExists.length === 0) {
            return res.status(400).json({ success: false, message: `Watchlist category '${cat}' does not exist` });
        }

        await db.query(
            `INSERT INTO watchlist_symbols (symbol, name, category, admin_id) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), created_at=CURRENT_TIMESTAMP`,
            [symbol.toUpperCase(), name || null, cat, adminId]
        );
        res.status(201).json({ success: true, message: 'Symbol added to watchlist' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to add symbol' });
    }
};

// Remove a symbol from watchlist
export const removeWatchlistSymbol = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    try {
        await db.query('DELETE FROM watchlist_symbols WHERE id = ? AND admin_id = ?', [id, adminId]);
        res.json({ success: true, message: 'Symbol removed from watchlist' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to remove symbol' });
    }
};

// Search stocks using Screener.in API (no auth scoping needed — public search)
export const searchStocks = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    try {
        const searchRes = await fetch(
            `https://www.screener.in/api/company/search/?q=${encodeURIComponent(q)}&v=3&fts=1`,
            { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' } }
        );

        if (!searchRes.ok) throw new Error('Screener search failed');
        const results = await searchRes.json();

        const mappedResults = results
            .filter(r => r.id !== null && r.url)
            .map(r => {
                const match = r.url.match(/\/company\/([^/]+)/);
                const symbol = match ? match[1] : null;
                return { name: r.name, symbol: symbol ? `NSE:${symbol}` : null };
            })
            .filter(r => r.symbol !== null);

        res.json({ success: true, data: mappedResults });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to search stocks' });
    }
};

export const getCategories = async (req, res) => {
    try {
        const adminId = req.user.id;
        const [rows] = await db.query(
            'SELECT * FROM watchlist_categories WHERE admin_id = ? ORDER BY created_at ASC',
            [adminId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

export const addCategory = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });
    const adminId = req.user.id;

    try {
        await db.query(
            'INSERT INTO watchlist_categories (name, admin_id) VALUES (?, ?)',
            [name, adminId]
        );
        res.status(201).json({ success: true, message: 'Category created' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
};

export const removeCategory = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    try {
        const [rows] = await db.query(
            'SELECT id, name FROM watchlist_categories WHERE (id = ? OR name = ?) AND admin_id = ?',
            [id, id, adminId]
        );
        if (rows.length > 0) {
            const catName = rows[0].name;
            const catId = rows[0].id;
            await db.query(
                'DELETE FROM watchlist_symbols WHERE category = ? AND admin_id = ?',
                [catName, adminId]
            );
            await db.query('DELETE FROM watchlist_categories WHERE id = ? AND admin_id = ?', [catId, adminId]);
            return res.json({ success: true, message: `Watchlist '${catName}' and its stocks removed successfully` });
        }
        res.status(404).json({ success: false, message: 'Watchlist category not found' });
    } catch (err) {
        console.error('Failed to remove category:', err);
        res.status(500).json({ success: false, message: 'Failed to remove category' });
    }
};

export const getPrices = async (req, res) => {
    const { symbols } = req.query;
    if (!symbols) return res.json({ success: true, data: {} });

    try {
        const symbolArray = symbols.split(',').map(s => s.trim()).filter(Boolean);
        const priceMap = await fetchBatchPrices(symbolArray);
        res.json({ success: true, data: priceMap });
    } catch (err) {
        console.error('getPrices error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch prices' });
    }
};

// Fetch all ticker symbols for user across all categories (Long, SSF, weekly, etc.)
export const getTickerSymbols = async (req, res) => {
    try {
        let adminId = req.user?.id;
        if (!adminId) {
            const [adminRows] = await db.query("SELECT id FROM admins WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
            adminId = adminRows.length > 0 ? adminRows[0].id : 13;
        }

        const [rows] = await db.query(
            `SELECT s.symbol, s.name, s.category 
             FROM watchlist_symbols s
             INNER JOIN watchlist_categories c ON s.admin_id = c.admin_id AND s.category = c.name
             WHERE s.admin_id = ? 
             ORDER BY s.category ASC, s.created_at DESC`,
            [adminId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('getTickerSymbols error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch ticker symbols' });
    }
};

