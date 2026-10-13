import express from 'express';
import { analyzeStock } from '../controllers/screener.controller.js';
import { fetchBatchPrices } from '../services/screenerPrice.service.js';

const router = express.Router();

// GET /api/screener/prices?symbols=RELIANCE,TCS
router.get('/prices', async (req, res) => {
    const { symbols } = req.query;
    if (!symbols) return res.json({ success: true, data: {} });
    try {
        const symbolArray = symbols.split(',').map(s => s.trim()).filter(Boolean);
        const priceMap = await fetchBatchPrices(symbolArray);
        res.json({ success: true, data: priceMap });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch prices' });
    }
});

// GET /api/screener/:symbol?horizon=intraday|swing|long-term
router.get('/:symbol', analyzeStock);

export default router;
