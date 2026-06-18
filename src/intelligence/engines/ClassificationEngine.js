// ============================================================
//  Layer 3: Classification Engine
//  Input:  NormalizedSignal
//  Output: + classification: { primary, secondary, sector_relevance, keywords, sentiment_raw }
// ============================================================

// Category enum
const CATEGORIES = {
  MACRO:         'Macro',
  REGULATION:    'Regulation',
  CORPORATE:     'Corporate',
  COMMODITY:     'Commodity',
  GLOBAL_MARKETS:'Global Markets',
  CURRENCY:      'Currency',
  FIXED_INCOME:  'Fixed Income',
  EARNINGS:      'Earnings',
  GEOPOLITICS:   'Geopolitics',
};

// Keyword rule sets — order matters (first match wins for primary)
const CLASSIFICATION_RULES = [
  {
    category: CATEGORIES.EARNINGS,
    keywords: ['quarterly result', 'q1 result', 'q2 result', 'q3 result', 'q4 result',
               'earnings', 'net profit', 'pat ', 'ebitda', 'revenue growth', 'topline',
               'bottomline', 'fy24', 'fy25', 'fy26', 'qoq', 'yoy profit',
               'beats estimate', 'misses estimate', 'guidance', 'annual report'],
  },
  {
    category: CATEGORIES.REGULATION,
    keywords: ['sebi', 'circular', 'regulation', 'compliance', 'penalty', 'ban',
               'insider trading', 'rbi circular', 'rbi notification', 'policy update',
               'regulatory', 'order', 'directive', 'amendment', 'notification'],
  },
  {
    category: CATEGORIES.MACRO,
    keywords: ['repo rate', 'crr ', 'slr ', 'gdp', 'inflation', 'cpi', 'wpi',
               'monetary policy', 'mpc', 'fiscal deficit', 'current account',
               'rbi policy', 'rate cut', 'rate hike', 'iip', 'pmi', 'trade balance',
               'fiscal policy', 'budget', 'tax', 'direct tax', 'gst collection',
               'economic growth', 'rbi governor'],
  },
  {
    category: CATEGORIES.GEOPOLITICS,
    keywords: ['war', 'conflict', 'sanction', 'election', 'coup', 'missile',
               'nato', 'ukraine', 'russia', 'middle east', 'iran', 'israel',
               'geopolit', 'trade war', 'tariff', 'trump', 'biden', 'modi',
               'diplomatic', 'border tension', 'military'],
  },
  {
    category: CATEGORIES.CURRENCY,
    keywords: ['rupee', 'usd/inr', 'dollar index', 'forex', 'exchange rate',
               'currency', 'dxy', 'depreciate', 'appreciate', 'rbi intervention',
               'foreign exchange', 'remittance', 'nre', 'nro'],
  },
  {
    category: CATEGORIES.COMMODITY,
    keywords: ['crude oil', 'brent', 'wti', 'gold price', 'silver price',
               'copper price', 'commodity', 'opec', 'natural gas', 'mcx',
               'iron ore', 'aluminium', 'zinc', 'lead', 'nickel', 'wheat',
               'sugar price', 'cotton price'],
  },
  {
    category: CATEGORIES.FIXED_INCOME,
    keywords: ['bond', 'yield', 'g-sec', 'treasury', 'debenture', 'ncd',
               'fixed income', 'debt', 'coupon', '10-year yield', 'gsec',
               'sovereign bond', 'credit rating', 'moody', 'fitch', 's&p rating'],
  },
  {
    category: CATEGORIES.GLOBAL_MARKETS,
    keywords: ['federal reserve', 'fed rate', 'us market', 'wall street', 'dow jones',
               'nasdaq', 's&p 500', 'european market', 'nikkei', 'hang seng',
               'global market', 'asian market', 'ecb', 'boe', 'bank of england',
               'jerome powell', 'us economy', 'us gdp', 'us cpi', 'nfp', 'payroll'],
  },
  {
    category: CATEGORIES.CORPORATE,
    keywords: ['acquisition', 'merger', 'stake', 'buyback', 'ipo', 'nfo',
               'fundraise', 'rights issue', 'fpo', 'ceo', 'cfo', 'management',
               'board meeting', 'dividend', 'bonus share', 'split', 'demerger',
               'joint venture', 'expansion', 'capex', 'order win', 'contract'],
  },
];

// Sentiment polarity keywords
const BULLISH_KEYWORDS = [
  'beat', 'surge', 'rally', 'gain', 'rise', 'record', 'high', 'growth',
  'profit', 'positive', 'upgrade', 'buy', 'outperform', 'strong', 'robust',
  'expansion', 'recovery', 'optimism', 'upside', 'boost', 'soar', 'jump',
  'rate cut', 'easing', 'stimulus', 'order win',
];

const BEARISH_KEYWORDS = [
  'fall', 'crash', 'drop', 'decline', 'loss', 'miss', 'weak', 'low',
  'downgrade', 'sell', 'underperform', 'negative', 'recession', 'slowdown',
  'sanction', 'ban', 'penalty', 'investigation', 'default', 'rate hike',
  'tightening', 'inflation', 'crisis', 'concern', 'warning', 'risk',
];

// Sector relevance scoring
const SECTOR_KEYWORD_MAP = {
  'Banking & Financial Services': ['bank', 'nifty bank', 'hdfc', 'icici', 'sbi', 'kotak', 'nbfc', 'rbi', 'repo rate', 'credit', 'lending'],
  'Information Technology':       ['tcs', 'infosys', 'wipro', 'hcl', 'it sector', 'software', 'tech', 'digital', 'us dollar revenue', 'visa'],
  'Healthcare & Pharma':          ['pharma', 'drug', 'api', 'sun pharma', 'cipla', 'dr reddy', 'fda', 'usfda', 'clinical trial', 'ncd'],
  'Energy':                       ['crude', 'oil', 'ongc', 'bpcl', 'ioc', 'reliance energy', 'ntpc', 'power', 'opec'],
  'Metals & Mining':              ['steel', 'tata steel', 'jsw', 'aluminium', 'copper', 'iron ore', 'mining', 'metal'],
  'FMCG & Consumer':              ['fmcg', 'hul', 'itc', 'nestle', 'consumer', 'rural demand', 'inflation impact'],
  'Automobiles':                  ['auto', 'maruti', 'tata motors', 'mahindra', 'hero', 'bajaj', 'ev', 'electric vehicle'],
  'Infrastructure & Real Estate': ['infra', 'cement', 'real estate', 'realty', 'construction', 'highway', 'housing'],
};

function scoreSectorRelevance(text) {
  const t = text.toLowerCase();
  const scores = [];
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORD_MAP)) {
    const hits = keywords.filter(kw => t.includes(kw)).length;
    if (hits > 0) {
      scores.push({
        sector,
        relevance_score: Math.min(1.0, hits * 0.25),
      });
    }
  }
  return scores.sort((a, b) => b.relevance_score - a.relevance_score);
}

function detectSentiment(text) {
  const t = text.toLowerCase();
  const bullishHits = BULLISH_KEYWORDS.filter(kw => t.includes(kw)).length;
  const bearishHits = BEARISH_KEYWORDS.filter(kw => t.includes(kw)).length;
  if (bullishHits > bearishHits) return 'positive';
  if (bearishHits > bullishHits) return 'negative';
  return 'neutral';
}

function extractKeywords(text) {
  const t = text.toLowerCase();
  const allKw = CLASSIFICATION_RULES.flatMap(r => r.keywords);
  return allKw.filter(kw => t.includes(kw)).slice(0, 10);
}

export class ClassificationEngine {
  classify(signal) {
    const text = `${signal.title} ${signal.content || ''}`.toLowerCase();

    let primary   = CATEGORIES.CORPORATE;
    let secondary = null;

    // Source-specific overrides
    if (signal.source === 'rbi') {
      primary   = CATEGORIES.MACRO;
      secondary = CATEGORIES.FIXED_INCOME;
    } else if (signal.source === 'sebi') {
      primary   = CATEGORIES.REGULATION;
    } else if (signal.source === 'trading_economics') {
      primary   = CATEGORIES.MACRO;
    } else {
      // Rule-based keyword matching
      const matched = [];
      for (const rule of CLASSIFICATION_RULES) {
        if (rule.keywords.some(kw => text.includes(kw))) {
          matched.push(rule.category);
        }
      }
      if (matched.length >= 1) primary   = matched[0];
      if (matched.length >= 2) secondary = matched[1];
    }

    return {
      ...signal,
      classification: {
        primary_category:   primary,
        secondary_category: secondary,
        sector_relevance:   scoreSectorRelevance(text),
        keywords:           extractKeywords(text),
        sentiment_raw:      detectSentiment(text),
      },
    };
  }
}
