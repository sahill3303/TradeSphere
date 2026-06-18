// ============================================================
//  Layer 4: Impact Engine
//  Input:  ClassifiedSignal
//  Output: + impact: { direction, strength, time_horizon, affected_instruments, reasoning }
// ============================================================

const INSTRUMENTS = ['Nifty 50', 'Bank Nifty', 'IT', 'Pharma', 'Metals', 'Energy', 'FMCG', 'Rupee', 'Gold', 'Crude'];

// Impact scoring matrix: keyed by (category, sentiment, keywords)
const IMPACT_MATRIX = [
  // ── Macro: Rate Decisions ────────────────────────────────
  {
    match: text => /rate cut|repo.*cut|rbi.*cut|cut.*rate/i.test(text),
    direction: 'Bullish', strength: 9, horizon: 'Swing',
    affected: [
      { name: 'Nifty 50',    direction: 'Bullish', magnitude: 7 },
      { name: 'Bank Nifty',  direction: 'Bullish', magnitude: 9 },
      { name: 'Rupee',       direction: 'Bearish', magnitude: 4 },
      { name: 'Gold',        direction: 'Bullish', magnitude: 3 },
    ],
    reasoning: 'Rate cut signals easier liquidity. Banks benefit from NIM expansion expectations and loan demand surge.',
  },
  {
    match: text => /rate hike|repo.*hike|hike.*rate|rbi.*raises/i.test(text),
    direction: 'Bearish', strength: 8, horizon: 'Swing',
    affected: [
      { name: 'Nifty 50',    direction: 'Bearish', magnitude: 6 },
      { name: 'Bank Nifty',  direction: 'Bearish', magnitude: 8 },
      { name: 'Rupee',       direction: 'Bullish', magnitude: 5 },
      { name: 'Gold',        direction: 'Bearish', magnitude: 4 },
    ],
    reasoning: 'Rate hike tightens liquidity, compresses valuations and raises cost of credit for banks and borrowers.',
  },

  // ── Macro: Inflation ─────────────────────────────────────
  {
    match: text => /cpi.*rises|inflation.*high|inflation.*spike|cpi above/i.test(text),
    direction: 'Bearish', strength: 6, horizon: 'Swing',
    affected: [
      { name: 'Nifty 50',    direction: 'Bearish', magnitude: 5 },
      { name: 'Bank Nifty',  direction: 'Bearish', magnitude: 6 },
      { name: 'FMCG',        direction: 'Bearish', magnitude: 4 },
      { name: 'Gold',        direction: 'Bullish', magnitude: 5 },
    ],
    reasoning: 'High inflation increases rate-hike probability, pressuring equity valuations and consuming margins.',
  },
  {
    match: text => /cpi.*eases|inflation.*eases|inflation.*falls|cpi.*low|inflation.*control/i.test(text),
    direction: 'Bullish', strength: 6, horizon: 'Swing',
    affected: [
      { name: 'Nifty 50',    direction: 'Bullish', magnitude: 5 },
      { name: 'Bank Nifty',  direction: 'Bullish', magnitude: 5 },
      { name: 'FMCG',        direction: 'Bullish', magnitude: 4 },
    ],
    reasoning: 'Easing inflation opens space for accommodative policy, lifting risk appetite and discretionary demand.',
  },

  // ── Global: US Fed ───────────────────────────────────────
  {
    match: text => /fed.*rate cut|powell.*cut|federal reserve.*cut/i.test(text),
    direction: 'Bullish', strength: 8, horizon: 'Medium-Term',
    affected: [
      { name: 'Nifty 50',    direction: 'Bullish', magnitude: 6 },
      { name: 'IT',          direction: 'Bullish', magnitude: 7 },
      { name: 'Rupee',       direction: 'Bullish', magnitude: 6 },
      { name: 'Gold',        direction: 'Bullish', magnitude: 7 },
    ],
    reasoning: 'US rate cuts weaken dollar, boost FII flows into EMs including India. IT exports benefit from better client budgets.',
  },
  {
    match: text => /fed.*hike|powell.*hike|federal reserve.*raise/i.test(text),
    direction: 'Bearish', strength: 8, horizon: 'Swing',
    affected: [
      { name: 'Nifty 50',    direction: 'Bearish', magnitude: 6 },
      { name: 'Rupee',       direction: 'Bearish', magnitude: 7 },
      { name: 'IT',          direction: 'Bearish', magnitude: 4 },
      { name: 'Gold',        direction: 'Bearish', magnitude: 6 },
    ],
    reasoning: 'US rate hike strengthens dollar, triggers FII outflows from EMs, rupee depreciation pressures import costs.',
  },

  // ── Commodity: Crude Oil ─────────────────────────────────
  {
    match: text => /crude.*rises|oil.*rises|brent.*above|oil.*surge|crude.*high/i.test(text),
    direction: 'Bearish', strength: 7, horizon: 'Swing',
    affected: [
      { name: 'Nifty 50',    direction: 'Bearish', magnitude: 5 },
      { name: 'Energy',      direction: 'Bullish', magnitude: 7 },
      { name: 'FMCG',        direction: 'Bearish', magnitude: 5 },
      { name: 'Rupee',       direction: 'Bearish', magnitude: 6 },
      { name: 'Crude',       direction: 'Bullish', magnitude: 9 },
    ],
    reasoning: 'Rising crude widens India CAD, depreciates rupee, inflates input costs for paint, chemicals and transport.',
  },
  {
    match: text => /crude.*falls|oil.*drops|brent.*falls|oil.*decline/i.test(text),
    direction: 'Bullish', strength: 6, horizon: 'Swing',
    affected: [
      { name: 'Nifty 50',    direction: 'Bullish', magnitude: 5 },
      { name: 'Energy',      direction: 'Bearish', magnitude: 6 },
      { name: 'FMCG',        direction: 'Bullish', magnitude: 5 },
      { name: 'Rupee',       direction: 'Bullish', magnitude: 5 },
      { name: 'Crude',       direction: 'Bearish', magnitude: 9 },
    ],
    reasoning: 'Falling crude compresses India import bill, strengthens rupee, and boosts margin-sensitive sectors.',
  },

  // ── Gold ─────────────────────────────────────────────────
  {
    match: text => /gold.*record|gold.*all.time high|gold.*surge|gold.*rally/i.test(text),
    direction: 'Bullish', strength: 5, horizon: 'Medium-Term',
    affected: [
      { name: 'Gold',        direction: 'Bullish', magnitude: 9 },
      { name: 'Rupee',       direction: 'Bearish', magnitude: 3 },
    ],
    reasoning: 'Gold rally signals risk-off sentiment or dollar weakness. Bullion ETFs and jewellery stocks benefit.',
  },

  // ── Geopolitics ──────────────────────────────────────────
  {
    match: text => /war|conflict|attack|missile|sanction|nuclear|coup/i.test(text),
    direction: 'Bearish', strength: 9, horizon: 'Intraday',
    affected: [
      { name: 'Nifty 50',    direction: 'Bearish', magnitude: 8 },
      { name: 'Bank Nifty',  direction: 'Bearish', magnitude: 7 },
      { name: 'Rupee',       direction: 'Bearish', magnitude: 8 },
      { name: 'Gold',        direction: 'Bullish', magnitude: 8 },
      { name: 'Crude',       direction: 'Bullish', magnitude: 7 },
    ],
    reasoning: 'Geopolitical shocks trigger immediate risk-off. Flight to gold; energy spikes; EMs see sharp FII outflows.',
  },

  // ── Regulation ───────────────────────────────────────────
  {
    match: text => /sebi.*ban|sebi.*penalty|sebi.*action|regulatory crackdown/i.test(text),
    direction: 'Bearish', strength: 6, horizon: 'Swing',
    affected: [
      { name: 'Nifty 50',    direction: 'Bearish', magnitude: 4 },
      { name: 'Bank Nifty',  direction: 'Bearish', magnitude: 5 },
    ],
    reasoning: 'Regulatory action introduces market uncertainty and increases compliance costs for the affected sector.',
  },

  // ── Earnings ─────────────────────────────────────────────
  {
    match: text => /beats estimate|profit jumps|revenue surges|strong quarter|earnings beat/i.test(text),
    direction: 'Bullish', strength: 6, horizon: 'Intraday',
    affected: [
      { name: 'Nifty 50',    direction: 'Bullish', magnitude: 3 },
    ],
    reasoning: 'Earnings beat triggers sector re-rating and improves market sentiment for the broader index.',
  },
  {
    match: text => /misses estimate|profit falls|revenue declines|weak quarter|earnings miss/i.test(text),
    direction: 'Bearish', strength: 5, horizon: 'Intraday',
    affected: [
      { name: 'Nifty 50',    direction: 'Bearish', magnitude: 3 },
    ],
    reasoning: 'Earnings miss weighs on sector sentiment and can spill over to peers.',
  },

  // ── GDP ──────────────────────────────────────────────────
  {
    match: text => /gdp.*grows|gdp.*rises|growth.*above|gdp beat|strong gdp/i.test(text),
    direction: 'Bullish', strength: 7, horizon: 'Long-Term',
    affected: [
      { name: 'Nifty 50',    direction: 'Bullish', magnitude: 6 },
      { name: 'Bank Nifty',  direction: 'Bullish', magnitude: 6 },
      { name: 'Rupee',       direction: 'Bullish', magnitude: 5 },
    ],
    reasoning: 'Strong GDP signals broad-based demand, supports corporate earnings and FII sentiment toward India.',
  },
];

// Fallback scoring based purely on sentiment
function fallbackScore(sentiment) {
  if (sentiment === 'positive') return {
    direction: 'Bullish', strength: 4, horizon: 'Intraday',
    affected: [{ name: 'Nifty 50', direction: 'Bullish', magnitude: 3 }],
    reasoning: 'Positive tone inferred from content keywords.',
  };
  if (sentiment === 'negative') return {
    direction: 'Bearish', strength: 4, horizon: 'Intraday',
    affected: [{ name: 'Nifty 50', direction: 'Bearish', magnitude: 3 }],
    reasoning: 'Negative tone inferred from content keywords.',
  };
  return {
    direction: 'Neutral', strength: 2, horizon: 'Intraday',
    affected: [{ name: 'Nifty 50', direction: 'Neutral', magnitude: 1 }],
    reasoning: 'Neutral content with no clear directional signal.',
  };
}

export class ImpactEngine {
  score(signal) {
    const text = `${signal.title} ${signal.content || ''}`;
    const sentiment = signal.classification?.sentiment_raw || 'neutral';

    let matched = null;
    for (const rule of IMPACT_MATRIX) {
      if (rule.match(text)) {
        matched = rule;
        break;
      }
    }

    const direction = matched ? matched.direction : fallbackScore(sentiment).direction;
    const baseAffected = matched
      ? matched.affected.map(i => ({ ...i }))
      : fallbackScore(sentiment).affected.map(i => ({ ...i }));

    // Merge normalized ticker symbols into affected instruments list
    const normalizedTickers = signal.normalized?.ticker_symbols || [];
    for (const sym of normalizedTickers) {
      if (!baseAffected.some(i => i.name.toUpperCase() === sym.toUpperCase())) {
        baseAffected.push({
          name: sym,
          direction: direction,
          magnitude: 5,
        });
      }
    }

    const impact = matched
      ? {
          direction:            matched.direction,
          strength:             matched.strength,
          time_horizon:         matched.horizon,
          affected_instruments: baseAffected,
          reasoning:            matched.reasoning,
          confidence:           0.80,
        }
      : {
          ...fallbackScore(sentiment),
          affected_instruments: baseAffected,
          confidence:           0.45,
        };

    return {
      ...signal,
      impact,
    };
  }
}
