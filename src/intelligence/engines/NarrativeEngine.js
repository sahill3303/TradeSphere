import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// ============================================================
//  Layer 5 — Analyst Narrative Engine  (v2.0)
//
//  This engine does NOT summarise news.
//  For every event it answers 7 analyst questions and
//  generates a complete structured analyst report.
//
//  7 Questions:
//    1. What happened?
//    2. Why does it matter?
//    3. Who is affected?
//    4. Is it Bullish, Bearish, Neutral, or Mixed?
//    5. Which sectors benefit?
//    6. Which sectors are harmed?
//    7. Is the effect Immediate, Short-Term, or Delayed?
//
//  7 Generated Outputs:
//    1. Headline        (analyst-style, conveying market implication)
//    2. Analyst Summary (2-3 sentence executive summary)
//    3. Impact Score    (1–10)
//    4. Confidence Score (0–100)
//    5. Affected Assets  (specific NSE/BSE tickers or indices)
//    6. Affected Sectors (benefiting + harmed, separately)
//    7. Expected Duration
// ============================================================

// ── Valid sector names the model must choose from ──────────────
const SECTORS = [
  'Banking & Financial Services',
  'Information Technology',
  'Healthcare & Pharma',
  'Energy & Oil & Gas',
  'Metals & Mining',
  'FMCG & Consumer Staples',
  'Automobiles & Auto Components',
  'Infrastructure & Real Estate',
  'Telecom',
  'Capital Goods & Defence',
  'Agriculture & Chemicals',
  'Insurance',
  'Media & Entertainment',
];

const DURATION_OPTIONS = [
  'Intraday',
  '2-3 days',
  '1-2 weeks',
  '2-4 weeks',
  '1-3 months',
  'Long-Term (3+ months)',
];

// ── Gemini system instruction ──────────────────────────────────
const SYSTEM_INSTRUCTION = `You are a senior equity research analyst at a top Indian fund house.
Your role is NOT to summarise news. Your role is to ANALYSE financial events and determine their exact market implications.
You think in terms of sector rotation, instrument impact, and time-horizon of effects.
You always separate what happened (fact) from what it means (analysis).
Respond with ONLY valid JSON. No markdown. No code fences. No text outside the JSON object.`;

// ── Gemini prompt builder ──────────────────────────────────────
function buildAnalystPrompt(signal) {
  const instruments = (signal.impact?.affected_instruments || [])
    .map(i => `${i.name} (${i.direction})`)
    .join(', ') || 'none identified yet';

  return `Analyse this financial market event and produce a complete structured analyst report.

EVENT DATA:
- Title: ${signal.title}
- Source: ${signal.displayName || signal.source}
- Category: ${signal.classification?.primary_category || 'Unknown'}
- Sector: ${signal.normalized?.sector || 'General'}
- Content: ${(signal.content || signal.title).substring(0, 500)}
- Pre-scored Direction: ${signal.impact?.direction || 'Unknown'} (${signal.impact?.strength || '?'}/10)
- Pre-identified Instruments: ${instruments}
- Keywords: ${(signal.classification?.keywords || []).join(', ')}

Answer these 7 analyst questions and produce the 7 required outputs.
Respond with ONLY this JSON (no markdown, no fences, exact field names):

{
  "headline": "Analyst-style headline that conveys the MARKET IMPLICATION, NOT the news event. Max 15 words. Title case. Example: 'RBI Rate Cut Positions Banking Sector for Sharp Re-Rating' NOT 'RBI Cuts Rate by 25bps'",

  "analyst_summary": "2-3 sentence executive summary. Focus on implications for Indian equity investors. Be specific — name indices, sectors, or instruments affected.",

  "what_happened": "1 precise factual sentence. State the event, the actor, and the magnitude/detail. Do not include analysis.",

  "why_it_matters": "1-2 sentences on market significance. Why should a trader or investor care right now?",

  "who_is_affected": "Name specific companies (with NSE tickers if known), sectors, or market participants that are directly affected. Be specific.",

  "direction": "Bullish OR Bearish OR Neutral OR Mixed (use Mixed when some sectors benefit and others are harmed)",

  "sectors_benefit": ["Choose ONLY from this list: ${SECTORS.join(', ')}. Empty array if none."],

  "sectors_harmed": ["Choose ONLY from this list: ${SECTORS.join(', ')}. Empty array if none."],

  "effect_timing": "Immediate (price moves within hours/today) OR Short-Term (visible in 1-2 weeks) OR Delayed (materialises over 1-3 months)",

  "impact_score": <integer 1-10. 1=irrelevant noise, 5=notable, 8=high-impact, 10=market-moving event like RBI rate decision or major geopolitical shock>,

  "confidence_score": <integer 0-100. How confident are you in this analysis? 90+=high conviction, 50-70=reasonable, below 40=speculative>,

  "affected_assets": ["List specific NSE/BSE tickers (e.g. HDFCBANK.NS, TCS.NS), index names (e.g. NIFTY50, BANKNIFTY, NIFTYIT), or commodity names (e.g. Gold, Brent Crude). Max 8 items."],

  "expected_duration": "Choose exactly one: Intraday | 2-3 days | 1-2 weeks | 2-4 weeks | 1-3 months | Long-Term (3+ months)"
}`;
}

// ── Deterministic fallback analyst report ──────────────────────
// Used when Gemini is unavailable or confidence is too low.
// Derives analytical fields from pipeline L3/L4 data.

const TIMING_MAP = {
  'Intraday':    'Immediate',
  'Swing':       'Short-Term',
  'Medium-Term': 'Delayed',
  'Long-Term':   'Delayed',
};

const DURATION_MAP = {
  'Intraday':    'Intraday',
  'Swing':       '2-4 weeks',
  'Medium-Term': '1-3 months',
  'Long-Term':   'Long-Term (3+ months)',
};

function buildFallbackReport(signal) {
  const { title, classification, impact, normalized, credibility } = signal;
  const direction    = impact?.direction    || 'Neutral';
  const strength     = impact?.strength     || 2;
  const category     = classification?.primary_category || 'Market Update';
  const sector       = normalized?.sector   || 'General Markets';
  const reasoning    = impact?.reasoning    || '';
  const horizon      = impact?.time_horizon || 'Swing';
  const instruments  = (impact?.affected_instruments || []).map(i => i.name);
  const sectorRel    = classification?.sector_relevance || [];

  // Analyst-style headline vs news-style
  const directionWord = direction === 'Bullish'  ? 'Bullish Signal'
                      : direction === 'Bearish'  ? 'Downside Risk'
                      : direction === 'Mixed'    ? 'Mixed Signals'
                      :                            'Market Watch';

  const headline = `${directionWord}: ${
    title.length > 70 ? title.substring(0, 67) + '...' : title
  }`;

  // Determine benefiting vs harmed sectors from direction
  const topSectors = sectorRel.slice(0, 3).map(s => {
    // Map sector names to our canonical list
    const raw = (s.sector || '').toLowerCase();
    if (raw.includes('bank') || raw.includes('financ')) return 'Banking & Financial Services';
    if (raw.includes('it') || raw.includes('tech'))    return 'Information Technology';
    if (raw.includes('health') || raw.includes('pharma')) return 'Healthcare & Pharma';
    if (raw.includes('energy') || raw.includes('oil'))  return 'Energy & Oil & Gas';
    if (raw.includes('metal') || raw.includes('mining')) return 'Metals & Mining';
    if (raw.includes('fmcg') || raw.includes('consumer')) return 'FMCG & Consumer Staples';
    if (raw.includes('auto'))                           return 'Automobiles & Auto Components';
    if (raw.includes('real') || raw.includes('infra'))  return 'Infrastructure & Real Estate';
    if (raw.includes('telecom'))                        return 'Telecom';
    if (raw.includes('capital') || raw.includes('defence')) return 'Capital Goods & Defence';
    return null;
  }).filter(Boolean);

  const sectorsBenefit = direction === 'Bullish' ? topSectors : [];
  const sectorsHarmed  = direction === 'Bearish' ? topSectors : [];

  // Confidence derived from credibility score
  const confidence = Math.min(75, Math.round((credibility?.score || 45) * 0.75));

  return {
    headline,
    analyst_summary: reasoning
      || `This ${category} development may affect ${sector} sector participants. `
      + `${direction === 'Bullish' ? 'Upside potential identified.' : direction === 'Bearish' ? 'Downside risk flagged.' : 'Monitor for directional clarity.'} `
      + `Impact is assessed as ${strength}/10 in strength.`,
    what_happened:   title,
    why_it_matters:  reasoning || `This event has direct implications for ${sector} sector dynamics and may influence positioning decisions.`,
    who_is_affected: instruments.length > 0
      ? instruments.join(', ')
      : `${sector} sector participants and index-level positioning`,
    direction,
    sectors_benefit: sectorsBenefit,
    sectors_harmed:  sectorsHarmed,
    effect_timing:   TIMING_MAP[horizon] || 'Short-Term',
    impact_score:    strength,
    confidence_score: confidence,
    affected_assets:  instruments.filter(i => i.length <= 20).slice(0, 6),
    expected_duration: DURATION_MAP[horizon] || '2-4 weeks',
  };
}

// ── Validate and sanitise Gemini response ──────────────────────
const VALID_DIRECTIONS = ['Bullish', 'Bearish', 'Neutral', 'Mixed'];
const VALID_TIMINGS    = ['Immediate', 'Short-Term', 'Delayed'];

function sanitise(parsed, signal) {
  let sectorsBenefit = Array.isArray(parsed.sectors_benefit) ? parsed.sectors_benefit : [];
  let sectorsHarmed  = Array.isArray(parsed.sectors_harmed)  ? parsed.sectors_harmed  : [];

  // Remove overlapping sectors to avoid logical contradictions
  const overlap = sectorsBenefit.filter(s => sectorsHarmed.includes(s));
  if (overlap.length > 0) {
    const dir = VALID_DIRECTIONS.includes(parsed.direction)
      ? parsed.direction : (signal.impact?.direction || 'Neutral');
    if (dir === 'Bullish') {
      sectorsHarmed = sectorsHarmed.filter(s => !overlap.includes(s));
    } else if (dir === 'Bearish') {
      sectorsBenefit = sectorsBenefit.filter(s => !overlap.includes(s));
    } else {
      sectorsBenefit = sectorsBenefit.filter(s => !overlap.includes(s));
      sectorsHarmed = sectorsHarmed.filter(s => !overlap.includes(s));
    }
  }

  return {
    headline: (parsed.headline || signal.title).substring(0, 160),
    analyst_summary:  parsed.analyst_summary || '',
    what_happened:    parsed.what_happened   || signal.title,
    why_it_matters:   parsed.why_it_matters  || '',
    who_is_affected:  parsed.who_is_affected || '',
    direction: VALID_DIRECTIONS.includes(parsed.direction)
      ? parsed.direction : (signal.impact?.direction || 'Neutral'),
    sectors_benefit: sectorsBenefit,
    sectors_harmed:  sectorsHarmed,
    effect_timing: VALID_TIMINGS.includes(parsed.effect_timing)
      ? parsed.effect_timing : 'Short-Term',
    impact_score:    Math.min(10, Math.max(1, parseInt(parsed.impact_score)    || signal.impact?.strength || 3)),
    confidence_score:Math.min(100,Math.max(0, parseInt(parsed.confidence_score) || 50)),
    affected_assets: Array.isArray(parsed.affected_assets) ? parsed.affected_assets.slice(0, 8) : [],
    expected_duration: DURATION_OPTIONS.includes(parsed.expected_duration)
      ? parsed.expected_duration : '2-4 weeks',
    generated_by: 'gemini-analyst',
  };
}

// ── Main generate function ─────────────────────────────────────

export class NarrativeEngine {
  async generate(signal) {
    const apiKey      = process.env.GEMINI_API_KEY;
    const sourceWeight = signal.sourceWeight || 0;

    // Only invoke Gemini for mid-to-high weight sources
    const useAI = apiKey && sourceWeight >= 0.50;

    if (useAI) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          systemInstruction: SYSTEM_INSTRUCTION,
        });

        const prompt = buildAnalystPrompt(signal);
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const response = await result.response;
        let raw = response.text().trim();

        // Strip accidental markdown fences
        raw = raw
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        const parsed  = JSON.parse(raw);
        const analyst = sanitise(parsed, signal);

        return { ...signal, narrative: analyst };
      } catch (err) {
        console.warn(`[NarrativeEngine] Gemini failed (${err.message.substring(0, 60)}), using fallback.`);
      }
    }

    // Deterministic analyst fallback
    const analyst = buildFallbackReport(signal);
    return { ...signal, narrative: { ...analyst, generated_by: 'template' } };
  }
}
