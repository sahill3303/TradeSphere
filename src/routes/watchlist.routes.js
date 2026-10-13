import express from 'express';
import { verifyToken, optionalVerifyToken } from '../middleware/auth.middleware.js';
import { getWatchlist, addWatchlistSymbol, removeWatchlistSymbol, searchStocks, getCategories, addCategory, removeCategory, getPrices, getTickerSymbols } from '../controllers/watchlist.controller.js';

const router = express.Router();

// Search, live prices, and ticker symbols are public / optionally authenticated
router.get('/search', searchStocks);
router.get('/prices', getPrices);
router.get('/ticker-symbols', optionalVerifyToken, getTickerSymbols);

// All other routes require authentication
router.use(verifyToken);

router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.delete('/categories/:id', removeCategory);

router.get('/', getWatchlist);
router.post('/', addWatchlistSymbol);
router.delete('/:id', removeWatchlistSymbol);

export default router;
