import express from 'express';
import { analyzeStock } from '../controllers/screener.controller.js';

const router = express.Router();

// GET /api/screener/:symbol?horizon=intraday|swing|long-term
router.get('/:symbol', analyzeStock);

export default router;
