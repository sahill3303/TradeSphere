/**
 * screenerPrice.service.js
 * Centralized live market & closing price service for TradeSphere.
 * Provides real-time and closing prices, point changes, and percentage changes.
 */

import * as cheerio from 'cheerio';

const SYMBOL_MAP = {
    'NIFTY 50': { symbol: 'NIFTY_50', exchange: 'INDEXNSE' },
    'NIFTY': { symbol: 'NIFTY_50', exchange: 'INDEXNSE' },
    'NIFTY50': { symbol: 'NIFTY_50', exchange: 'INDEXNSE' },
    'NSE:NIFTY': { symbol: 'NIFTY_50', exchange: 'INDEXNSE' },
    '%5ENSEI': { symbol: 'NIFTY_50', exchange: 'INDEXNSE' },
    '^NSEI': { symbol: 'NIFTY_50', exchange: 'INDEXNSE' },
    'SENSEX': { symbol: 'SENSEX', exchange: 'INDEXBOM' },
    'BSE:SENSEX': { symbol: 'SENSEX', exchange: 'INDEXBOM' },
    '%5EBSESN': { symbol: 'SENSEX', exchange: 'INDEXBOM' },
    '^BSESN': { symbol: 'SENSEX', exchange: 'INDEXBOM' },
    'BANK NIFTY': { symbol: 'NIFTY_BANK', exchange: 'INDEXNSE' },
    'BANKNIFTY': { symbol: 'NIFTY_BANK', exchange: 'INDEXNSE' },
    'NSE:BANKNIFTY': { symbol: 'NIFTY_BANK', exchange: 'INDEXNSE' },
    'NIFTY IT': { symbol: 'NIFTY_IT', exchange: 'INDEXNSE' },
    'CNXIT': { symbol: 'NIFTY_IT', exchange: 'INDEXNSE' },
    'GOLD': { symbol: 'GOLDBEES', exchange: 'NSE' },
};

const priceCache = new Map();  // cleanSymbol -> { data, timestamp }
const lastKnownPrice = new Map(); // cleanSymbol -> quote (persistent memory cache)
const CACHE_TTL_MS = 20 * 1000; // 20 seconds cache

/**
 * Normalizes symbols by stripping prefixes (NSE:, BSE:) and suffixes (.NS, .BO).
 */
export function normalizeSymbol(rawSymbol) {
    if (!rawSymbol) return '';
    let sym = String(rawSymbol).trim();
    try {
        sym = decodeURIComponent(sym);
    } catch (_) {}
    sym = sym.toUpperCase();

    if (SYMBOL_MAP[sym]) return sym;

    sym = sym.replace(/^[A-Z0-9]+:/, '');
    sym = sym.replace(/\.(NS|BO)$/i, '');
    sym = sym.trim();

    return sym;
}

/**
 * Fetches quote from Google Finance
 */
async function fetchFromGoogleFinance(sym) {
    let targetSym = sym;
    let targetExchange = 'NSE';

    if (SYMBOL_MAP[sym]) {
        targetSym = SYMBOL_MAP[sym].symbol;
        targetExchange = SYMBOL_MAP[sym].exchange;
    }

    const parsePage = async (exchange) => {
        const url = `https://www.google.com/finance/quote/${encodeURIComponent(targetSym)}:${encodeURIComponent(exchange)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);

        const mainBox = $('.ujg0He, .LhDNu, .zhtAvb').first();
        if (!mainBox.length) return null;

        const priceText = mainBox.find('[jsname="Pdsbrc"]').text().replace(/[₹$,]/g, '').trim();
        const pctText = mainBox.find('[jsname="vY9t3b"]').text().replace(/[%+]/g, '').trim();
        const chgText = mainBox.find('[jsname="xnruHf"]').text().replace(/[()+]/g, '').trim();

        const isDown = mainBox.find('i:contains("arrow_downward")').length > 0;
        const finalPrice = parseFloat(priceText);

        if (isNaN(finalPrice)) return null;

        const pctVal = parseFloat(pctText);
        const chgVal = parseFloat(chgText);

        const finalPct = !isNaN(pctVal) ? (isDown ? -Math.abs(pctVal) : Math.abs(pctVal)) : 0;
        const finalChg = !isNaN(chgVal) ? (isDown ? -Math.abs(chgVal) : Math.abs(chgVal)) : 0;
        const prevClose = finalPrice - finalChg;

        const nameText = $('.zzDege').first().text().trim() || sym;

        return {
            symbol: sym,
            name: nameText,
            price: finalPrice.toFixed(2),
            change: finalChg.toFixed(2),
            percentChange: finalPct.toFixed(2),
            previousClose: prevClose.toFixed(2),
        };
    };

    try {
        let quote = await parsePage(targetExchange);
        if (!quote && targetExchange === 'NSE') {
            quote = await parsePage('BOM');
        }
        return quote;
    } catch (_) {
        return null;
    }
}

/**
 * Fallback to Screener.in if needed
 */
async function fetchFromScreener(sym) {
    try {
        let url = `https://www.screener.in/company/${encodeURIComponent(sym)}/consolidated/`;
        let res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            url = `https://www.screener.in/company/${encodeURIComponent(sym)}/`;
            res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
                signal: AbortSignal.timeout(5000),
            });
        }
        if (res.ok) {
            const html = await res.text();
            const idMatch = html.match(/data-company-id="(\d+)"/) || html.match(/\/api\/company\/(\d+)\//);
            const priceMatch = html.match(/Current Price[\s\S]*?class="number">([^<]+)<\/span>/i) ||
                               html.match(/Current Price[\s\S]*?₹\s*([0-9,.]+)/i);

            if (priceMatch) {
                const currentPrice = parseFloat(priceMatch[1].replace(/,/g, '').trim());
                let change = 0;
                let percentChange = 0;
                let prevClose = currentPrice;

                if (idMatch) {
                    try {
                        const chartRes = await fetch(`https://www.screener.in/api/company/${idMatch[1]}/chart/?days=7`, {
                            headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120', 'Accept': 'application/json' },
                            signal: AbortSignal.timeout(4000),
                        });
                        if (chartRes.ok) {
                            const chartData = await chartRes.json();
                            const pDataset = chartData.datasets?.find(d => d.metric === 'Price');
                            const vals = pDataset?.values || [];
                            if (vals.length > 1) {
                                const latest = parseFloat(vals[vals.length - 1][1]);
                                const prev = parseFloat(vals[vals.length - 2][1]);
                                if (prev > 0) {
                                    prevClose = prev;
                                    change = parseFloat((latest - prev).toFixed(2));
                                    percentChange = parseFloat(((change / prev) * 100).toFixed(2));
                                }
                            }
                        }
                    } catch (_) {}
                }

                return {
                    symbol: sym,
                    name: sym,
                    price: currentPrice.toFixed(2),
                    change: change.toFixed(2),
                    percentChange: percentChange.toFixed(2),
                    previousClose: prevClose.toFixed(2),
                };
            }
        }
    } catch (_) {}
    return null;
}

/**
 * Fetches stock price with caching.
 */
export async function fetchStockPrice(symbol) {
    const cleanSym = normalizeSymbol(symbol);
    if (!cleanSym) return null;

    const cached = priceCache.get(cleanSym);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    let quote = await fetchFromGoogleFinance(cleanSym);

    if (!quote) {
        quote = await fetchFromScreener(cleanSym);
    }

    if (quote) {
        priceCache.set(cleanSym, { data: quote, timestamp: Date.now() });
        lastKnownPrice.set(cleanSym, quote);
        return quote;
    }

    if (lastKnownPrice.has(cleanSym)) {
        return lastKnownPrice.get(cleanSym);
    }

    return null;
}

/**
 * Fetches batch prices for multiple symbols concurrently.
 */
export async function fetchBatchPrices(symbols) {
    if (!symbols || symbols.length === 0) return {};

    const rawList = Array.isArray(symbols) ? symbols : String(symbols).split(',').filter(Boolean);
    const uniqueRaw = [...new Set(rawList.map(s => s.trim()).filter(Boolean))];
    const priceMap = {};

    const results = await Promise.allSettled(
        uniqueRaw.map(async (rawSym) => {
            const data = await fetchStockPrice(rawSym);
            return { rawSym, data };
        })
    );

    for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.data) {
            const { rawSym, data } = res.value;
            const cleanSym = normalizeSymbol(rawSym);

            priceMap[rawSym] = data;
            priceMap[cleanSym] = data;
            if (rawSym.includes(':')) {
                priceMap[rawSym.split(':').pop().trim()] = data;
            }
        }
    }

    return priceMap;
}

export function resolveCompany(symbol) {
    return { id: null, name: symbol, url: `https://www.screener.in/company/${symbol}/`, symbol };
}

export default {
    normalizeSymbol,
    resolveCompany,
    fetchStockPrice,
    fetchBatchPrices,
};
