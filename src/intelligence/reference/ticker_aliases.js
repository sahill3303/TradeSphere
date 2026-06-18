// Canonical ticker alias map — maps common name variants to NSE canonical symbols
export const TICKER_ALIASES = {
  // Index aliases
  'nifty': 'NIFTY50', 'nifty 50': 'NIFTY50', 'nifty50': 'NIFTY50',
  'sensex': 'SENSEX', 'bse sensex': 'SENSEX',
  'bank nifty': 'BANKNIFTY', 'banknifty': 'BANKNIFTY', 'nifty bank': 'BANKNIFTY',
  'nifty it': 'NIFTYIT', 'it index': 'NIFTYIT',
  'nifty pharma': 'NIFTYPHARMA',
  'nifty metal': 'NIFTYMETAL', 'nifty metals': 'NIFTYMETAL',
  'nifty energy': 'NIFTYENERGY',
  'nifty fmcg': 'NIFTYFMCG',
  'nifty auto': 'NIFTYAUTO',
  'nifty realty': 'NIFTYREALTY',
  'nifty midcap': 'NIFTYMIDCAP100',

  // Large cap equities
  'reliance': 'RELIANCE.NS', 'ril': 'RELIANCE.NS', 'reliance industries': 'RELIANCE.NS',
  'tcs': 'TCS.NS', 'tata consultancy': 'TCS.NS',
  'infosys': 'INFY.NS', 'infy': 'INFY.NS',
  'hdfc bank': 'HDFCBANK.NS', 'hdfc': 'HDFCBANK.NS',
  'icici bank': 'ICICIBANK.NS',
  'sbi': 'SBIN.NS', 'state bank': 'SBIN.NS',
  'kotak': 'KOTAKBANK.NS', 'kotak bank': 'KOTAKBANK.NS',
  'axis bank': 'AXISBANK.NS',
  'bajaj finance': 'BAJFINANCE.NS',
  'wipro': 'WIPRO.NS',
  'hcl tech': 'HCLTECH.NS', 'hcl': 'HCLTECH.NS',
  'itc': 'ITC.NS',
  'hindustan unilever': 'HINDUNILVR.NS', 'hul': 'HINDUNILVR.NS',
  'asian paints': 'ASIANPAINT.NS',
  'maruti': 'MARUTI.NS', 'maruti suzuki': 'MARUTI.NS',
  'sun pharma': 'SUNPHARMA.NS', 'sun pharmaceutical': 'SUNPHARMA.NS',
  'ongc': 'ONGC.NS',
  'ntpc': 'NTPC.NS',
  'power grid': 'POWERGRID.NS',
  'adani': 'ADANIENT.NS',
  'tata steel': 'TATASTEEL.NS',
  'jsw steel': 'JSWSTEEL.NS',
  'dr reddy': 'DRREDDY.NS', "dr. reddy's": 'DRREDDY.NS',
  'cipla': 'CIPLA.NS',
  'ultratech': 'ULTRACEMCO.NS', 'ultratech cement': 'ULTRACEMCO.NS',
  'l&t': 'LT.NS', 'larsen': 'LT.NS', 'larsen & toubro': 'LT.NS',
  'nestle': 'NESTLEIND.NS',
  'bajaj auto': 'BAJAJ-AUTO.NS',
  'hero motocorp': 'HEROMOTOCO.NS',
  'titan': 'TITAN.NS',
  'm&m': 'M&M.NS', 'mahindra': 'M&M.NS',
  'tata motors': 'TATAMOTORS.NS',
  'divis': 'DIVISLAB.NS', "divi's": 'DIVISLAB.NS',

  // Commodities
  'crude': 'CRUDE_OIL', 'oil': 'CRUDE_OIL', 'brent': 'BRENT_CRUDE',
  'gold': 'GOLD', 'silver': 'SILVER', 'copper': 'COPPER',
  'natural gas': 'NATURAL_GAS', 'natgas': 'NATURAL_GAS',
  'wheat': 'WHEAT', 'corn': 'CORN',

  // Currencies
  'rupee': 'USDINR', 'inr': 'USDINR', 'usd/inr': 'USDINR',
  'dollar': 'USD', 'euro': 'EUR', 'yen': 'JPY', 'pound': 'GBP',
};

// Normalize a raw ticker/name to canonical form
export function normalizeTicker(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return TICKER_ALIASES[key] || raw.toUpperCase();
}

// Extract all known tickers from a block of text
export function extractTickers(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set();
  for (const [alias, canonical] of Object.entries(TICKER_ALIASES)) {
    if (lower.includes(alias)) found.add(canonical);
  }
  return Array.from(found);
}
