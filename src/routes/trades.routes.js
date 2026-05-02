import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
    openTrade,
    addTradeNote,
    exitTrade,
    getAllTrades,
    getTradeById,
    updateTrade,
    deleteTrade,
    getDeletedTrades,
    restoreTrade,
    hardDeleteTrade
} from '../controllers/trades.controller.js';

const router = express.Router();

// Apply verifyToken to ALL routes in this router
router.use(verifyToken);

// 🔹 OPEN TRADE
router.post('/', openTrade);

// 🔹 ADD NOTE TO TRADE
router.post('/:trade_id/notes', addTradeNote);

// 🔹 EXIT TRADE
router.patch('/:trade_id/exit', exitTrade);

// 🔹 GET ALL TRADES
router.get('/', getAllTrades);

// 🔹 GET DELETED TRADES
router.get('/deleted', getDeletedTrades);

// 🔹 GET TRADE BY ID
router.get('/:trade_id', getTradeById);

// 🔹 UPDATE TRADE (ONLY IF OPEN)
router.patch('/:trade_id', updateTrade);

// 🔹 DELETE TRADE
router.delete('/:trade_id', deleteTrade);

// 🔹 RESTORE TRADE
router.patch('/:trade_id/restore', restoreTrade);

// 🔹 HARD DELETE TRADE (permanent)
router.delete('/:trade_id/permanent', hardDeleteTrade);

export default router;


// review all trade routes overall
