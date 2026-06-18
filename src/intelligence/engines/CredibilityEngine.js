// ============================================================
//  Layer 6: Credibility Engine
//  Input:  Signal with narrative
//  Output: + credibility: { score, grade, source_weight, flags, is_low_confidence }
// ============================================================

// Source base weight table (matches architecture doc)
const SOURCE_WEIGHTS = {
  rbi:               1.00,
  sebi:              1.00,
  nse:               0.98,
  bse:               0.98,
  company_filing:    0.95,
  exchange_filing:   0.95,
  reuters:           0.90,
  bloomberg:         0.88,
  financial_times:   0.82,
  imf:               0.85,
  world_bank:        0.85,
  trading_economics: 0.70,
  economic_times:    0.68,
  livemint:          0.65,
  businessline:      0.65,
  ndtv_profit:       0.62,
  moneycontrol:      0.63,
};

const FLAG_TYPES = {
  SINGLE_SOURCE:        'SINGLE_SOURCE',
  UNVERIFIED_CLAIM:     'UNVERIFIED_CLAIM',
  SOCIAL_MEDIA_ORIGIN:  'SOCIAL_MEDIA_ORIGIN',
  CONTRADICTS_OFFICIAL: 'CONTRADICTS_OFFICIAL',
  STALE_NEWS:           'STALE_NEWS',
  DUPLICATE:            'DUPLICATE',
  LOW_CONTENT_QUALITY:  'LOW_CONTENT_QUALITY',
};

function getSourceWeight(source) {
  return SOURCE_WEIGHTS[source] || 0.40;
}

function computeRecencyScore(timestamp) {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageHrs = ageMs / (1000 * 60 * 60);
  if (ageHrs <= 1)  return 20;
  if (ageHrs <= 4)  return 14;
  if (ageHrs <= 12) return 8;
  if (ageHrs <= 24) return 4;
  return 0;
}

function computeContentQuality(signal) {
  let score = 0;
  if (signal.content && signal.content.length > 100) score += 4;
  if (signal.url && signal.url.startsWith('http')) score += 3;
  if (signal.classification?.keywords?.length > 2) score += 2;
  if (signal.impact?.affected_instruments?.length > 1) score += 1;
  return score; // max 10
}

function detectFlags(signal) {
  const flags = [];
  const ageMs  = Date.now() - new Date(signal.timestamp).getTime();
  const ageHrs = ageMs / (1000 * 60 * 60);

  if (ageHrs > 4)  flags.push(FLAG_TYPES.STALE_NEWS);
  if (!signal.content || signal.content.length < 30) flags.push(FLAG_TYPES.LOW_CONTENT_QUALITY);
  if (getSourceWeight(signal.source) < 0.55) flags.push(FLAG_TYPES.SINGLE_SOURCE);

  return flags;
}

function scoreToGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export class CredibilityEngine {
  score(signal) {
    const sourceWeight   = getSourceWeight(signal.source);
    const sourceScore    = Math.round(sourceWeight * 50);          // 0–50
    const recencyScore   = computeRecencyScore(signal.timestamp);  // 0–20
    const contentScore   = computeContentQuality(signal);          // 0–10
    // Corroboration bonus: +20 if official source (weight >= 0.95)
    const corrobBonus    = sourceWeight >= 0.95 ? 20 : 0;

    const totalScore = Math.min(100, sourceScore + recencyScore + contentScore + corrobBonus);
    const flags      = detectFlags(signal);
    const grade      = scoreToGrade(totalScore);

    return {
      ...signal,
      credibility: {
        score:            totalScore,
        grade,
        source_weight:    sourceWeight,
        flags,
        is_low_confidence: totalScore < 55,
      },
    };
  }
}
