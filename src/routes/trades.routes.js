import express from 'express';
import {
    createTrade,
    createFullJournal,
    closeTrade,
    getAllTrades,
    getTradeById,
    getTradeAnalytics,
    getRiskMetrics
} from '../controllers/trades.controller.js';

const router = express.Router();

// Basic trade
router.post('/', createTrade);

// ✅ FULL JOURNAL ROUTE
router.post('/createFullJournal', createFullJournal);

// ✅ CLOSE TRADE ROUTE
router.patch('/:trade_id/close', closeTrade);

// ✅ GET ALL TRADES ROUTE
router.get('/', getAllTrades);

// ✅ GET TRADE BY ID ROUTE
router.get('/:trade_id', getTradeById);

// ✅ GET TRADE ANALYTICS ROUTE
router.get('/analytics/performance', getTradeAnalytics);

// ✅ GET TRADE RISK METRICS ROUTE
router.get('/analytics/risk', getRiskMetrics);



export default router;
