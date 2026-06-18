// Sector normalization map — maps raw strings to canonical GICS-aligned sector names
export const SECTOR_MAP = {
  // Information Technology
  'it': 'Information Technology', 'tech': 'Information Technology',
  'technology': 'Information Technology', 'software': 'Information Technology',
  'information technology': 'Information Technology',
  'it sector': 'Information Technology', 'nifty it': 'Information Technology',

  // Banking & Financial Services
  'banking': 'Banking & Financial Services', 'bank': 'Banking & Financial Services',
  'banks': 'Banking & Financial Services', 'nbfc': 'Banking & Financial Services',
  'financial services': 'Banking & Financial Services', 'finance': 'Banking & Financial Services',
  'insurance': 'Banking & Financial Services',

  // Healthcare & Pharma
  'pharma': 'Healthcare & Pharma', 'pharmaceutical': 'Healthcare & Pharma',
  'pharmaceuticals': 'Healthcare & Pharma', 'healthcare': 'Healthcare & Pharma',
  'health': 'Healthcare & Pharma', 'hospital': 'Healthcare & Pharma',
  'biotech': 'Healthcare & Pharma',

  // Energy
  'energy': 'Energy', 'oil': 'Energy', 'oil & gas': 'Energy',
  'crude': 'Energy', 'petroleum': 'Energy', 'refinery': 'Energy',
  'power': 'Energy', 'renewables': 'Energy',

  // Metals & Mining
  'metals': 'Metals & Mining', 'metal': 'Metals & Mining', 'mining': 'Metals & Mining',
  'steel': 'Metals & Mining', 'aluminium': 'Metals & Mining', 'aluminum': 'Metals & Mining',
  'copper': 'Metals & Mining', 'iron ore': 'Metals & Mining',

  // FMCG & Consumer
  'fmcg': 'FMCG & Consumer', 'consumer goods': 'FMCG & Consumer',
  'consumer staples': 'FMCG & Consumer', 'retail': 'FMCG & Consumer',
  'food': 'FMCG & Consumer', 'beverages': 'FMCG & Consumer',

  // Automobiles
  'auto': 'Automobiles', 'automobile': 'Automobiles', 'automotive': 'Automobiles',
  'vehicles': 'Automobiles', 'ev': 'Automobiles', 'electric vehicle': 'Automobiles',

  // Infrastructure & Real Estate
  'infra': 'Infrastructure & Real Estate', 'infrastructure': 'Infrastructure & Real Estate',
  'realty': 'Infrastructure & Real Estate', 'real estate': 'Infrastructure & Real Estate',
  'cement': 'Infrastructure & Real Estate', 'construction': 'Infrastructure & Real Estate',

  // Telecom
  'telecom': 'Telecom', 'telecommunications': 'Telecom', 'jio': 'Telecom',

  // Capital Goods
  'capital goods': 'Capital Goods', 'engineering': 'Capital Goods',
  'industrial': 'Capital Goods', 'defence': 'Capital Goods',

  // Agricultural
  'agriculture': 'Agriculture & Agri-Commodities', 'agri': 'Agriculture & Agri-Commodities',
  'fertilizer': 'Agriculture & Agri-Commodities',
};

export const COUNTRY_ISO = {
  'india': 'IN', 'indian': 'IN', 'bharat': 'IN',
  'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
  'china': 'CN', 'chinese': 'CN',
  'japan': 'JP', 'japanese': 'JP',
  'european union': 'EU', 'europe': 'EU', 'eu': 'EU',
  'united kingdom': 'GB', 'uk': 'GB', 'britain': 'GB',
  'germany': 'DE', 'german': 'DE',
  'france': 'FR', 'french': 'FR',
  'russia': 'RU', 'russian': 'RU',
  'saudi arabia': 'SA', 'saudi': 'SA',
  'uae': 'AE', 'dubai': 'AE',
  'australia': 'AU', 'australian': 'AU',
  'canada': 'CA', 'canadian': 'CA',
  'brazil': 'BR', 'brazilian': 'BR',
  'opec': 'OPEC',
  'global': 'GLOBAL', 'world': 'GLOBAL', 'international': 'GLOBAL',
};

// Normalize sector raw text to canonical sector name
export function normalizeSector(raw) {
  if (!raw) return 'General';
  const key = raw.toLowerCase().trim();
  for (const [alias, canonical] of Object.entries(SECTOR_MAP)) {
    if (key.includes(alias)) return canonical;
  }
  return 'General';
}

// Normalize country name to ISO code
export function normalizeCountry(raw) {
  if (!raw) return 'GLOBAL';
  const key = raw.toLowerCase().trim();
  for (const [alias, iso] of Object.entries(COUNTRY_ISO)) {
    if (key.includes(alias)) return iso;
  }
  return 'GLOBAL';
}
