import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
    getAccountSummary,
    addFunds,
    getPaperTrades,
    openPaperTrade,
    exitPaperTrade,
    deletePaperTrade,
    updatePaperTradeCategory
} from '../controllers/paperTrade.controller.js';

const router = express.Router();

router.use(verifyToken);

router.get('/summary', getAccountSummary);
router.post('/funds', addFunds);
router.get('/', getPaperTrades);
router.post('/', openPaperTrade);
router.patch('/:id/exit', exitPaperTrade);
router.patch('/:id/category', updatePaperTradeCategory);
router.delete('/:id', deletePaperTrade);

export default router;
