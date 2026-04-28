import express from 'express';
import { getWatchlist, addWatchlistSymbol, removeWatchlistSymbol, searchStocks } from '../controllers/watchlist.controller.js';

const router = express.Router();

router.get('/', getWatchlist);
router.post('/', addWatchlistSymbol);
router.delete('/:id', removeWatchlistSymbol);
router.get('/search', searchStocks);

export default router;
