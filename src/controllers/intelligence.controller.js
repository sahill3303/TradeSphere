import { runPipeline, getFeed, getItemById, getPipelineStatus, processSignal, persistSignal, formatRow } from '../intelligence/pipeline/PipelineOrchestrator.js';
import db from '../config/db.js';
import crypto from 'crypto';
import Parser from 'rss-parser';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

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

// GET /api/intelligence/search
export const searchIntelligence = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:30d&hl=en-IN&gl=IN&ceid=IN:en`;
    const feed = await parser.parseURL(url);
    
    if (!feed.items || feed.items.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Take top 10 recent items
    const topItems = feed.items.slice(0, 10);

    const rawSignals = topItems.map(article => {
      const content = (article.title + ' ' + (article.contentSnippet || '')).trim();
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');
      return {
        id: crypto.randomUUID(),
        content_hash: contentHash,
        source: article.source || 'Google News',
        title: article.title,
        content: article.contentSnippet || article.title,
        url: article.link,
        timestamp: article.isoDate || article.pubDate ? new Date(article.isoDate || article.pubDate).toISOString() : new Date().toISOString(),
        region: 'INDIA',
        asset_class: 'EQUITY'
      };
    });

    const analyzedSignals = [];
    for (const raw of rawSignals) {
      try {
        const [existing] = await db.query('SELECT * FROM intelligence_feed WHERE content_hash = ?', [raw.content_hash]);
        if (existing.length > 0) {
          analyzedSignals.push(formatRow(existing[0]));
          continue;
        }

        const processed = await processSignal(raw);
        if (processed) {
          await persistSignal(processed);
          const dbItem = await getItemById(processed.id);
          if (dbItem) analyzedSignals.push(dbItem);
        }
      } catch (err) {
        console.error('[Search] Error processing signal:', err.message);
      }
    }

    // Sort by published_at DESC
    analyzedSignals.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    res.json({ success: true, data: analyzedSignals });
  } catch (err) {
    console.error('[Search] searchIntelligence error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to search intelligence.' });
  }
};
