import { runPipeline, getFeed, getItemById, getPipelineStatus } from '../intelligence/pipeline/PipelineOrchestrator.js';

// ============================================================
//  Intelligence Controller
// ============================================================

// GET /api/intelligence/feed
export const getFeedHandler = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, direction, horizon, timing, min_score = 0 } = req.query;

    const result = await getFeed({
      page:      parseInt(page),
      limit:     Math.min(parseInt(limit), 50), // cap at 50
      category,
      direction,
      horizon,
      timing,
      minScore:  parseInt(min_score),
    });

    res.json({
      success: true,
      data:    result.items,
      meta: {
        total:       result.total,
        page:        result.page,
        per_page:    result.per_page,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Intelligence] getFeed error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch intelligence feed.' });
  }
};


// GET /api/intelligence/feed/:id
export const getItemHandler = async (req, res) => {
  try {
    const item = await getItemById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, data: item });
  } catch (err) {
    console.error('[Intelligence] getItem error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch item.' });
  }
};

// GET /api/intelligence/pipeline/status
export const getPipelineStatusHandler = async (req, res) => {
  try {
    const status = await getPipelineStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/intelligence/pipeline/run  (manual trigger — admin only)
export const triggerPipelineHandler = async (req, res) => {
  try {
    // Non-blocking: respond immediately, run in background
    res.json({ success: true, message: 'Pipeline triggered. Processing in background.' });
    runPipeline().catch(err => console.error('[Pipeline] manual trigger error:', err.message));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
