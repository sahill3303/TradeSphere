import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
    getDashboardSummary,
    getMonthlyPerformance,
    getWinLossDistribution,
    getRecentTrades
} from '../controllers/dashboard.controller.js';

const router = express.Router(); // ✅ router created FIRST

// dashboard summary
router.get('/summary', verifyToken, getDashboardSummary);

// monthly performance
router.get('/monthly-performance', verifyToken, getMonthlyPerformance);

// win-loss distribution
router.get('/win-loss-distribution', verifyToken, getWinLossDistribution);

// recent trades
router.get('/recent-trades', verifyToken, getRecentTrades);


export default router;
