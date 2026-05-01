import express from 'express';
import { getWatchlist, addWatchlistSymbol, removeWatchlistSymbol, searchStocks, getCategories, addCategory, removeCategory, getPrices } from '../controllers/watchlist.controller.js';

const router = express.Router();

router.get('/search', searchStocks);
router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.delete('/categories/:id', removeCategory);
router.get('/prices', getPrices);

router.get('/', getWatchlist);
router.post('/', addWatchlistSymbol);
router.delete('/:id', removeWatchlistSymbol);

export default router;
