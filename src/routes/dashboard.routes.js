import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { fetchStockPrice } from '../services/screenerPrice.service.js';
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

// 🔹 Live Price Endpoint (Screener.in unified price source)
router.get('/market-chart/:symbol', verifyToken, async (req, res) => {
    try {
        const { symbol } = req.params;
        const priceData = await fetchStockPrice(symbol);
        if (!priceData) {
            return res.status(404).json({ message: 'Price unavailable on Screener.in' });
        }

        res.json({
            symbol: priceData.symbol,
            name: priceData.name,
            currency: 'INR',
            currentPrice: parseFloat(priceData.price),
            previousClose: parseFloat(priceData.previousClose || priceData.price),
            change: parseFloat(priceData.change || 0),
            changePct: parseFloat(priceData.percentChange || 0),
            candles: []
        });
    } catch (err) {
        console.error('Market chart price error:', err.message);
        res.status(500).json({ message: 'Price fetch error', error: err.message });
    }
});


export default router;