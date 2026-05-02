import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { getWatchlist, addWatchlistSymbol, removeWatchlistSymbol, searchStocks, getCategories, addCategory, removeCategory, getPrices } from '../controllers/watchlist.controller.js';

const router = express.Router();

// Search is public
router.get('/search', searchStocks);

// All other routes require authentication
router.use(verifyToken);

router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.delete('/categories/:id', removeCategory);
router.get('/prices', getPrices);

router.get('/', getWatchlist);
router.post('/', addWatchlistSymbol);
router.delete('/:id', removeWatchlistSymbol);

export default router;
