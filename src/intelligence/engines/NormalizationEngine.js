import { extractTickers, normalizeTicker } from '../reference/ticker_aliases.js';
import { normalizeSector, normalizeCountry } from '../reference/sector_map.js';

// ============================================================
//  Layer 2: Normalization Engine
//  Input:  RawSignal
//  Output: NormalizedSignal (extends RawSignal with .normalized{})
// ============================================================

// Convert UTC ISO string to IST (UTC+5:30)
function toIST(utcIso) {
  if (!utcIso) return null;
  try {
    const d = new Date(utcIso);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const ist = new Date(d.getTime() + istOffset);
    return ist.toISOString().replace('Z', '+05:30');
  } catch {
    return null;
  }
}

// Infer asset class from content keywords
function inferAssetClass(text) {
  const t = (text || '').toLowerCase();
  if (/\bforex\b|rupee|exchange rate|usd\/inr|dollar|\beur\b|\bjpy\b/.test(t)) return 'FOREX';
  if (/\bcommodit|\bgold\b|\bcrude\b|\bsilver\b|\bcopper\b|\bwheat\b/.test(t)) return 'COMMODITY';
  if (/\bbond\b|yield|g-sec|treasury|fixed income|debenture/.test(t)) return 'FIXED_INCOME';
  if (/\bcrypto\b|bitcoin|ethereum|blockchain/.test(t)) return 'CRYPTO';
  return 'EQUITY';
}

// Infer region from content keywords
function inferRegion(text, existingRegion) {
  if (existingRegion && existingRegion !== 'MULTI') return existingRegion;
  const t = (text || '').toLowerCase();
  if (/\bfed\b|federal reserve|wall street|\bnyse\b|nasdaq|s&p 500/.test(t)) return 'US';
  if (/\becb\b|european central bank|\beuro\b|\beu\b/.test(t)) return 'EU';
  if (/\bchina\b|pboc|shanghai|hong kong/.test(t)) return 'ASIA';
  if (/\bopec\b|gulf|middle east/.test(t)) return 'GLOBAL';
  return existingRegion || 'INDIA';
}

export class NormalizationEngine {
  normalize(signal) {
    const fullText = `${signal.title} ${signal.content || ''}`;

    const timestampUtc = signal.timestamp || new Date().toISOString();
    const timestampIst = toIST(timestampUtc);

    const tickers   = extractTickers(fullText);
    if (signal.ticker) {
      const normalizedRaw = normalizeTicker(signal.ticker);
      if (normalizedRaw && !tickers.includes(normalizedRaw)) {
        tickers.push(normalizedRaw);
      }
    }
    const sector    = normalizeSector(fullText);
    const countryIso = normalizeCountry(fullText);
    const assetClass = signal.asset_class === 'MULTI'
      ? inferAssetClass(fullText)
      : (signal.asset_class || 'EQUITY');
    const region    = inferRegion(fullText, signal.region);

    return {
      ...signal,
      // Overwrite with normalized values
      timestamp:   timestampUtc,
      asset_class: assetClass,
      region,
      normalized: {
        timestamp_utc: timestampUtc,
        timestamp_ist: timestampIst,
        ticker_symbols: tickers,
        sector,
        country_iso:   countryIso,
        asset_class:   assetClass,
        region,
      },
    };
  }
}
