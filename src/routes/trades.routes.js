import express from 'express';
import {
    openTrade,
    addTradeNote,
    exitTrade,
    getAllTrades,
    getTradeById,
    updateTrade,
    deleteTrade,
    getDeletedTrades,
    restoreTrade
} from '../controllers/trades.controller.js';

const router = express.Router();

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

export default router;