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

// 🔹 Market Chart Proxy (Yahoo Finance → avoids CORS)
// symbol examples: %5ENSEI (Nifty50), %5ENSEBANK (BankNifty)
router.get('/market-chart/:symbol', verifyToken, async (req, res) => {
    try {
        const { symbol } = req.params;          // already URL-encoded by client
        const interval = req.query.interval || '5m';
        const range    = req.query.range    || '1d';
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=false`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ message: 'Yahoo Finance fetch failed' });
        }

        const json = await response.json();
        const result = json?.chart?.result?.[0];
        if (!result) return res.status(404).json({ message: 'No data returned' });

        const timestamps = result.timestamp || [];
        const quote      = result.indicators?.quote?.[0] || {};
        const closes     = quote.close  || [];
        const opens      = quote.open   || [];
        const highs      = quote.high   || [];
        const lows       = quote.low    || [];

        const candles = timestamps
            .map((t, i) => ({
                time:  t + 19800,  // +5:30h → display as IST in the chart
                open:  opens[i]  != null ? +opens[i].toFixed(2)  : null,
                high:  highs[i]  != null ? +highs[i].toFixed(2)  : null,
                low:   lows[i]   != null ? +lows[i].toFixed(2)   : null,
                close: closes[i] != null ? +closes[i].toFixed(2) : null,
            }))
            .filter(c => c.open != null && c.close != null);

        const meta = result.meta || {};
        res.json({
            symbol:        meta.symbol,
            currency:      meta.currency,
            currentPrice:  meta.regularMarketPrice,
            previousClose: meta.chartPreviousClose,
            candles,
        });
    } catch (err) {
        console.error('Market chart proxy error:', err.message);
        res.status(500).json({ message: 'Market chart proxy error', error: err.message });
    }
});

export default router;