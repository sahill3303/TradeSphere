import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
    getDashboardSummary,
    getMonthlyPerformance,
    getWinLossDistribution,
    getRecentTrades
} from '../controllers/dashboard.controller.js';

const router = express.Router();

// 🔹 Dashboard Summary
router.get('/summary', verifyToken, getDashboardSummary);

// 🔹 Monthly Performance Chart
router.get('/monthly-performance', verifyToken, getMonthlyPerformance);

// 🔹 Win/Loss Distribution
router.get('/win-loss-distribution', verifyToken, getWinLossDistribution);

// 🔹 Recent Trades
router.get('/recent-trades', verifyToken, getRecentTrades);

export default router;