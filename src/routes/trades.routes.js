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
    hardDeleteTrade,
    getTradeLists,
    createTradeList,
    deleteTradeList,
    addTradesToList,
    removeTradesFromList
} from '../controllers/trades.controller.js';

const router = express.Router();

// Apply verifyToken to ALL routes in this router
router.use(verifyToken);

// 🔹 TRADE LISTS (TAGS) — Must come before /:trade_id
router.get('/lists', getTradeLists);
router.post('/lists', createTradeList);
router.delete('/lists/:list_id', deleteTradeList);
router.post('/lists/:list_id/trades', addTradesToList);
router.delete('/lists/:list_id/trades', removeTradesFromList);

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

// 🔹 UPDATE TRADE (EVERYTHING EDITABLE)
router.patch('/:trade_id', updateTrade);

// 🔹 DELETE TRADE
router.delete('/:trade_id', deleteTrade);

// 🔹 RESTORE TRADE
router.patch('/:trade_id/restore', restoreTrade);

// 🔹 HARD DELETE TRADE (permanent)
router.delete('/:trade_id/permanent', hardDeleteTrade);

export default router;
