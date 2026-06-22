import express from 'express';
import {
  getFeedHandler,
  getItemHandler,
  getPipelineStatusHandler,
  triggerPipelineHandler,
  searchIntelligence,
} from '../controllers/intelligence.controller.js';

const router = express.Router();

// ── Feed endpoints ────────────────────────────────────────────
// GET /api/intelligence/feed?page=1&limit=20&category=Macro&direction=Bullish&horizon=Swing&min_score=55
router.get('/feed', getFeedHandler);

// GET /api/intelligence/search
router.get('/search', searchIntelligence);

// GET /api/intelligence/feed/:id
router.get('/feed/:id', getItemHandler);

// ── Pipeline management ───────────────────────────────────────
// GET /api/intelligence/pipeline/status
router.get('/pipeline/status', getPipelineStatusHandler);

// POST /api/intelligence/pipeline/run  (admin trigger)
router.post('/pipeline/run', triggerPipelineHandler);

export default router;
