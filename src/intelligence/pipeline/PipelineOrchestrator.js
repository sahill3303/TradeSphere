import { NormalizationEngine }   from '../engines/NormalizationEngine.js';
import { ClassificationEngine }  from '../engines/ClassificationEngine.js';
import { ImpactEngine }          from '../engines/ImpactEngine.js';
import { NarrativeEngine }       from '../engines/NarrativeEngine.js';
import { CredibilityEngine }     from '../engines/CredibilityEngine.js';
import {
  RSSAdapter, RBIAdapter, SEBIAdapter,
  NSEAdapter, BSEAdapter, EconomicAdapter,
} from '../adapters/SourceAdapters.js';
import db from '../../config/db.js';

// ============================================================
//  Pipeline Orchestrator
//  Coordinates all 7 layers into a single processing run.
//  Called by the scheduled worker every 30 minutes.
// ============================================================

const normEngine   = new NormalizationEngine();
const classEngine  = new ClassificationEngine();
const impactEngine = new ImpactEngine();
const narEngine    = new NarrativeEngine();
const credEngine   = new CredibilityEngine();

const ADAPTERS = [
  new RSSAdapter(),
  new RBIAdapter(),
  new SEBIAdapter(),
  new NSEAdapter(),
  new BSEAdapter(),
  new EconomicAdapter(),
];

// In-memory run state
let lastRunTime = null;
let isRunning = false;

// In-memory dedup set for this session (keyed by content_hash)
const SESSION_SEEN = new Set();

// ── Pipeline: process a single raw signal ────────────────────

export async function processSignal(raw) {
  try {
    // Deduplication check
    if (raw.content_hash && SESSION_SEEN.has(raw.content_hash)) {
      return null;
    }
    if (raw.content_hash) SESSION_SEEN.add(raw.content_hash);

    // L2: Normalize
    const normalized = normEngine.normalize(raw);

    // L3: Classify
    const classified = classEngine.classify(normalized);

    // L4: Impact
    const impacted = impactEngine.score(classified);

    // L5: Narrative (async — may call Gemini)
    const narrated = await narEngine.generate(impacted);

    // L6: Credibility
    const final = credEngine.score(narrated);

    return final;
  } catch (err) {
    console.error(`[Pipeline] signal processing error: ${err.message}`);
    return null;
  }
}

// ── Database persistence ─────────────────────────────────────

async function ensureTable() {
  const createSQL = `
    CREATE TABLE IF NOT EXISTS intelligence_feed (
      id              VARCHAR(36) PRIMARY KEY,
      content_hash    VARCHAR(64) UNIQUE,
      source          VARCHAR(100) NOT NULL,
      display_name    VARCHAR(200),
      source_weight   DECIMAL(4,3) DEFAULT 0.5,
      title           TEXT NOT NULL,
      content         TEXT,
      url             TEXT,
      region          VARCHAR(20) DEFAULT 'INDIA',
      asset_class     VARCHAR(50) DEFAULT 'EQUITY',
      published_at    DATETIME NOT NULL,
      published_at_ist VARCHAR(40),
      primary_category VARCHAR(100),
      secondary_category VARCHAR(100),
      sector          VARCHAR(200),
      country_iso     VARCHAR(10),
      ticker_symbols  JSON,
      keywords        JSON,
      sentiment_raw   VARCHAR(20),
      impact_direction VARCHAR(20),
      impact_strength  TINYINT,
      time_horizon    VARCHAR(30),
      affected_instruments JSON,
      impact_reasoning TEXT,
      impact_confidence DECIMAL(3,2),
      headline        TEXT,
      bullet_what     TEXT,
      bullet_why      TEXT,
      bullet_markets  TEXT,
      tone            VARCHAR(20),
      generated_by    VARCHAR(30) DEFAULT 'template',
      credibility_score TINYINT,
      credibility_grade CHAR(1),
      credibility_flags JSON,
      is_low_confidence TINYINT(1) DEFAULT 0,
      is_published    TINYINT(1) DEFAULT 1,
      ingested_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_published_at (published_at DESC),
      INDEX idx_primary_category (primary_category),
      INDEX idx_impact_direction (impact_direction),
      INDEX idx_credibility_score (credibility_score DESC),
      INDEX idx_source (source),
      INDEX idx_is_low_confidence (is_low_confidence)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.query(createSQL);
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.error('[Pipeline] Table creation error:', err.message);
    }
  }

  // Add v2 analyst columns (safe — won't fail if they already exist)
  await migrateSchema();
}

// ── Schema migration: add analyst columns if missing ─────────
async function migrateSchema() {
  const newColumns = [
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS what_happened    TEXT",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS why_it_matters   TEXT",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS who_is_affected  TEXT",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS sectors_benefit  JSON",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS sectors_harmed   JSON",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS effect_timing    VARCHAR(30)",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS analyst_summary  TEXT",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS impact_score     TINYINT",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS confidence_score TINYINT",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS affected_assets  JSON",
    "ALTER TABLE intelligence_feed ADD COLUMN IF NOT EXISTS expected_duration VARCHAR(60)",
  ];

  for (const sql of newColumns) {
    try {
      await db.query(sql);
    } catch (err) {
      // Column already exists — ignore
      if (!err.message?.includes('Duplicate column') && !err.message?.includes('already exists')) {
        console.warn('[Migration] Column add warning:', err.message.substring(0, 80));
      }
    }
  }
  console.log('[Pipeline] Schema migration complete.');
}

export async function persistSignal(signal) {
  const sql = `
    INSERT INTO intelligence_feed
      (id, content_hash, source, display_name, source_weight, title, content, url,
       region, asset_class, published_at, published_at_ist,
       primary_category, secondary_category, sector, country_iso,
       ticker_symbols, keywords, sentiment_raw,
       impact_direction, impact_strength, time_horizon,
       affected_instruments, impact_reasoning, impact_confidence,
       headline, bullet_what, bullet_why, bullet_markets, tone, generated_by,
       credibility_score, credibility_grade, credibility_flags, is_low_confidence,
       is_published,
       what_happened, why_it_matters, who_is_affected,
       sectors_benefit, sectors_harmed, effect_timing,
       analyst_summary, impact_score, confidence_score,
       affected_assets, expected_duration)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE ingested_at = ingested_at
  `;

  const norm  = signal.normalized    || {};
  const cls   = signal.classification || {};
  const imp   = signal.impact         || {};
  const nar   = signal.narrative      || {};
  const cred  = signal.credibility    || {};

  const values = [
    signal.id,
    signal.content_hash || null,
    signal.source,
    signal.displayName || signal.source,
    signal.sourceWeight || 0.5,
    signal.title,
    (signal.content || '').substring(0, 1000),
    signal.url || '',
    norm.region    || signal.region    || 'INDIA',
    norm.asset_class || signal.asset_class || 'EQUITY',
    signal.timestamp ? new Date(signal.timestamp) : new Date(),
    norm.timestamp_ist || null,
    cls.primary_category   || null,
    cls.secondary_category || null,
    norm.sector      || null,
    norm.country_iso || null,
    JSON.stringify(norm.ticker_symbols || []),
    JSON.stringify(cls.keywords || []),
    cls.sentiment_raw || 'neutral',
    imp.direction   || nar.direction || 'Neutral',
    nar.impact_score || imp.strength || 3,
    imp.time_horizon || null,
    JSON.stringify(imp.affected_instruments || []),
    imp.reasoning   || null,
    imp.confidence  || 0.5,
    nar.headline      || signal.title,
    nar.what_happened || '',
    nar.why_it_matters || '',
    nar.analyst_summary || '',
    'Signal',  // tone (legacy field, kept for compat)
    nar.generated_by  || 'template',
    cred.score    || 50,
    cred.grade    || 'C',
    JSON.stringify(cred.flags || []),
    cred.is_low_confidence ? 1 : 0,
    ((signal.source === 'nse' || signal.source === 'bse') && (norm.ticker_symbols || []).length === 0) ? 0 : 1, // is_published
    // ── Analyst v2 fields ────────────────────────
    nar.what_happened    || null,
    nar.why_it_matters   || null,
    nar.who_is_affected  || null,
    JSON.stringify(nar.sectors_benefit  || []),
    JSON.stringify(nar.sectors_harmed   || []),
    nar.effect_timing    || null,
    nar.analyst_summary  || null,
    nar.impact_score     || imp.strength || null,
    nar.confidence_score || null,
    JSON.stringify(nar.affected_assets  || []),
    nar.expected_duration || null,
  ];

  await db.query(sql, values);
}

// ── Backfill analyst fields for pre-v2 signals ───────────────
// Fetches rows with no analyst data, re-runs them through the
// NarrativeEngine (fallback mode), and UPDATEs them in-place.
// Runs in batches of 30 per pipeline cycle.

async function backfillAnalystFields() {
  try {
    const [rows] = await db.query(`
      SELECT id, title, content, source, display_name, source_weight,
             impact_direction, impact_strength, time_horizon,
             affected_instruments, impact_reasoning, impact_confidence,
             primary_category, sector, credibility_score, credibility_grade
      FROM intelligence_feed
      WHERE analyst_summary IS NULL AND is_published = 1
      LIMIT 30
    `);

    if (rows.length === 0) return;
    console.log('[Backfill] Patching ' + rows.length + ' pre-v2 signals with analyst data...');

    for (const row of rows) {
      try {
        const fakeSignal = {
          id:           row.id,
          title:        row.title,
          content:      row.content || '',
          source:       row.source,
          displayName:  row.display_name,
          sourceWeight: parseFloat(row.source_weight) || 0,
          classification: {
            primary_category: row.primary_category,
            sector_relevance: row.primary_category
              ? [{ sector: row.primary_category, relevance_score: 0.7 }]
              : [],
          },
          impact: {
            direction:   row.impact_direction || 'Neutral',
            strength:    row.impact_strength  || 2,
            time_horizon: row.time_horizon    || 'Swing',
            affected_instruments: (() => {
              try { return JSON.parse(row.affected_instruments || '[]'); } catch { return []; }
            })(),
            reasoning:   row.impact_reasoning || '',
            confidence:  parseFloat(row.impact_confidence) || 0.5,
          },
          normalized:  { sector: row.sector },
          credibility: { score: row.credibility_score || 50, grade: row.credibility_grade || 'C' },
        };

        // Run through analyst engine (uses fallback since sourceWeight=0)
        const result = await narEngine.generate(fakeSignal);
        const nar    = result.narrative || {};

        await db.query(`
          UPDATE intelligence_feed SET
            what_happened     = ?,
            why_it_matters    = ?,
            who_is_affected   = ?,
            sectors_benefit   = ?,
            sectors_harmed    = ?,
            effect_timing     = ?,
            analyst_summary   = ?,
            impact_score      = ?,
            confidence_score  = ?,
            affected_assets   = ?,
            expected_duration = ?,
            generated_by      = ?,
            headline = COALESCE(NULLIF(headline, ''), ?)
          WHERE id = ?
        `, [
          nar.what_happened    || null,
          nar.why_it_matters   || null,
          nar.who_is_affected  || null,
          JSON.stringify(nar.sectors_benefit  || []),
          JSON.stringify(nar.sectors_harmed   || []),
          nar.effect_timing    || null,
          nar.analyst_summary  || null,
          nar.impact_score     || row.impact_strength || null,
          nar.confidence_score || null,
          JSON.stringify(nar.affected_assets  || []),
          nar.expected_duration || null,
          nar.generated_by     || 'template',
          nar.headline         || row.title,
          row.id,
        ]);
      } catch (err) {
        console.warn('[Backfill] Signal ' + row.id + ' failed: ' + err.message.substring(0, 60));
      }
    }
    console.log('[Backfill] Done.');
  } catch (err) {
    console.error('[Backfill] Error:', err.message);
  }
}

// ── Main orchestration run ───────────────────────────────────

export async function runPipeline() {
  console.log('[Pipeline] ▶ Starting intelligence pipeline run...');
  isRunning = true;
  try {
    await ensureTable();

    let totalFetched   = 0;
    let totalProcessed = 0;
    let totalSaved     = 0;
    let totalErrors    = 0;

    // Collect from all adapters in parallel
    const adapterResults = await Promise.allSettled(
      ADAPTERS.map(adapter => adapter.fetchAll())
    );

    const allRaw = [];
    for (const r of adapterResults) {
      if (r.status === 'fulfilled') {
        allRaw.push(...r.value);
      }
    }
    totalFetched = allRaw.length;
    console.log(`[Pipeline] Fetched ${totalFetched} raw signals`);

    // Process signals sequentially to respect Gemini rate limits
    for (const raw of allRaw) {
      try {
        const processed = await processSignal(raw);
        if (!processed) continue;
        totalProcessed++;

        try {
          await persistSignal(processed);
          totalSaved++;
        } catch (dbErr) {
          // Duplicate key is expected and OK — just skip
          if (!dbErr.message?.includes('Duplicate')) {
            console.warn(`[Pipeline] DB save error: ${dbErr.message}`);
            totalErrors++;
          }
        }
      } catch (err) {
        console.warn(`[Pipeline] Process error: ${err.message}`);
        totalErrors++;
      }
    }

    lastRunTime = new Date();

    const summary = {
      fetched: totalFetched,
      processed: totalProcessed,
      saved: totalSaved,
      errors: totalErrors,
      timestamp: lastRunTime.toISOString(),
    };

    console.log(`[Pipeline] ✅ Done — fetched:${totalFetched} processed:${totalProcessed} saved:${totalSaved} errors:${totalErrors}`);

    // Backfill analyst fields for any pre-v2 signals that lack them
    backfillAnalystFields().catch(e => console.error('[Backfill] Unhandled:', e.message));

    return summary;
  } finally {
    isRunning = false;
  }
}

// ── Get processed feed from DB ───────────────────────────────

export async function getFeed({ page = 1, limit = 20, category, direction, horizon, timing, minScore = 0 } = {}) {
  const offset = (page - 1) * limit;
  let where  = 'is_published = 1';
  const params = [];

  // Exclude routine low-impact stock news from the default feed
  where += ` AND (primary_category != 'Corporate' OR COALESCE(impact_score, impact_strength, 0) >= 6)`;

  // Exclude "Market Watch" noise
  where += ` AND headline NOT LIKE 'Market Watch:%' AND title NOT LIKE 'Market Watch:%'`;

  if (category) { where += ' AND primary_category = ?';  params.push(category); }
  if (direction) { where += ' AND impact_direction = ?';  params.push(direction); }
  if (horizon)   { where += ' AND time_horizon = ?';      params.push(horizon); }
  if (timing)    { where += ' AND effect_timing = ?';     params.push(timing); }
  if (minScore > 0) { where += ' AND credibility_score >= ?'; params.push(minScore); }


  const countSql = `SELECT COUNT(*) AS total FROM intelligence_feed WHERE ${where}`;
  const dataSql  = `
    SELECT * FROM intelligence_feed
    WHERE ${where}
    ORDER BY published_at DESC
    LIMIT ? OFFSET ?
  `;

  const [[countRow]] = await db.query(countSql, params);
  const [rows]       = await db.query(dataSql, [...params, limit, offset]);

  return {
    total: countRow.total,
    page,
    per_page: limit,
    items: rows.map(formatRow),
  };
}

export async function getItemById(id) {
  const [rows] = await db.query('SELECT * FROM intelligence_feed WHERE id = ?', [id]);
  return rows.length ? formatRow(rows[0]) : null;
}

export async function getPipelineStatus() {
  try {
    const [[row]] = await db.query(
      'SELECT COUNT(*) as total FROM intelligence_feed'
    );
    let lastRun = lastRunTime;
    if (!lastRun) {
      const [[maxRow]] = await db.query('SELECT MAX(ingested_at) as last_run FROM intelligence_feed');
      lastRun = maxRow.last_run;
    }
    return {
      status: isRunning ? 'running' : 'healthy',
      total_items: row.total,
      last_run: lastRun
    };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

// ── 48-hour TTL Cleanup ──────────────────────────────────────
// Deletes any signal ingested more than 48 hours ago.
// Called automatically every 6 hours by the scheduler in app.js.

export async function cleanupOldSignals() {
  try {
    const [result] = await db.query(
      `DELETE FROM intelligence_feed
       WHERE ingested_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)`
    );
    const deleted = result.affectedRows ?? 0;
    console.log(`[Cleanup] ✅ Removed ${deleted} signal(s) older than 48 hours.`);
    return { deleted };
  } catch (err) {
    console.error('[Cleanup] Error:', err.message);
    return { deleted: 0, error: err.message };
  }
}

// ── Format DB row into API response shape ────────────────────

function safeJSON(val) {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return val || [];
}

export function formatRow(row) {
  return {
    id:            row.id,
    published_at:  row.published_at,
    published_at_ist: row.published_at_ist,
    ingested_at:   row.ingested_at,
    source: {
      name:        row.source,
      display_name: row.display_name,
      weight:      parseFloat(row.source_weight),
    },
    headline:      row.headline,
    url:           row.url,
    region:        row.region,
    generated_by:  row.generated_by,

    // ── Analyst v2 fields ─────────────────────
    analyst: {
      summary:          row.analyst_summary  || null,
      what_happened:    row.what_happened    || null,
      why_it_matters:   row.why_it_matters   || null,
      who_is_affected:  row.who_is_affected  || null,
      sectors_benefit:  safeJSON(row.sectors_benefit),
      sectors_harmed:   safeJSON(row.sectors_harmed),
      effect_timing:    row.effect_timing    || null,
      impact_score:     row.impact_score     || row.impact_strength || null,
      confidence_score: row.confidence_score || null,
      affected_assets:  safeJSON(row.affected_assets),
      expected_duration: row.expected_duration || null,
    },

    // ── Legacy / L3 classification ────────────
    classification: {
      primary_category:   row.primary_category,
      secondary_category: row.secondary_category,
      sector:             row.sector,
      keywords:           safeJSON(row.keywords),
      sentiment:          row.sentiment_raw,
    },

    // ── L4 impact (rule-based) ────────────────
    impact: {
      direction:            row.impact_direction,
      strength:             row.impact_strength,
      time_horizon:         row.time_horizon,
      affected_instruments: safeJSON(row.affected_instruments),
      reasoning:            row.impact_reasoning,
      confidence:           parseFloat(row.impact_confidence),
    },

    // ── L6 credibility ────────────────────────
    credibility: {
      score:             row.credibility_score,
      grade:             row.credibility_grade,
      source_weight:     parseFloat(row.source_weight),
      flags:             safeJSON(row.credibility_flags),
      is_low_confidence: !!row.is_low_confidence,
    },
  };
}
