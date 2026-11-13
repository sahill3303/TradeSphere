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

        // Google Finance primary live price element selectors
        let priceText = $('.YMlKec.fxKbKc, div[data-last-price]').first().text().replace(/[₹$,\s]/g, '').trim();
        const mainBox = $('.ujg0He, .LhDNu, .zhtAvb').first();
        if (!priceText && mainBox.length) {
            priceText = mainBox.find('[jsname="Pdsbrc"]').text().replace(/[₹$,\s]/g, '').trim();
        }

        if (!priceText) return null;
        const finalPrice = parseFloat(priceText);
        if (isNaN(finalPrice) || finalPrice <= 0) return null;

        let pctText = $('[jsname="vY9t3b"], .JwB6zf').first().text().replace(/[%+\s]/g, '').trim();
        let chgText = $('[jsname="xnruHf"], .CydAGb').first().text().replace(/[()+\s]/g, '').trim();

        const isDown = $('i:contains("arrow_downward"), .p22krf').length > 0;
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
 * Fetches quote from Yahoo Finance JSON Chart API
 */
async function fetchFromYahooFinance(sym) {
    let yahooTicker = sym;
    const upper = sym.toUpperCase();
    if (upper === 'NIFTY_50' || upper === 'NIFTY' || upper === 'NIFTY 50' || upper === 'NIFTY50') {
        yahooTicker = '^NSEI';
    } else if (upper === 'SENSEX') {
        yahooTicker = '^BSESN';
    } else if (upper === 'NIFTY_BANK' || upper === 'BANK NIFTY' || upper === 'BANKNIFTY') {
        yahooTicker = '^NSEBANK';
    } else if (upper === 'NIFTY_IT') {
        yahooTicker = '^CNXIT';
    }

    const tickersToTry = yahooTicker.startsWith('^') ? [yahooTicker] : [`${yahooTicker}.NS`, `${yahooTicker}.BO`];

    for (const t of tickersToTry) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?interval=1d&range=1d`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(4000)
            });
            if (!res.ok) continue;

            const json = await res.json();
            const result = json?.chart?.result?.[0];
            const meta = result?.meta;
            if (!meta) continue;

            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || meta.previousClose || price;

            if (typeof price === 'number' && !isNaN(price) && price > 0) {
                const change = parseFloat((price - prevClose).toFixed(2));
                const percentChange = prevClose > 0 ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
                return {
                    symbol: sym,
                    name: meta.shortName || meta.symbol || sym,
                    price: price.toFixed(2),
                    change: change.toFixed(2),
                    percentChange: percentChange.toFixed(2),
                    previousClose: Number(prevClose).toFixed(2),
                };
            }
        } catch (_) {}
    }
    return null;
}

/**
 * Fallback to Screener.in if needed (Strict HTML Cheerio + Verified Chart Dataset)
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
            const $ = cheerio.load(html);

            const idMatch = html.match(/data-company-id="(\d+)"/) || html.match(/\/api\/company\/(\d+)\//);

            let currentPrice = null;
            let prevClose = null;
            let change = 0;
            let percentChange = 0;

            // 1. Scrape strictly from the top-ratios list (never search announcements/text)
            $('#top-ratios li, .company-ratios li, ul.flex-grid li').each((_, el) => {
                const name = $(el).find('.name').text().trim().toLowerCase();
                if (name.includes('current price') || name === 'cmp') {
                    const valEl = $(el).find('.value');
                    const numText = valEl.find('.number').text() || valEl.text();
                    const cleanNum = numText.replace(/[₹,\s]/g, '').trim();
                    const p = parseFloat(cleanNum);
                    if (!isNaN(p) && p > 0) {
                        currentPrice = p;
                    }
                }
            });

            // 2. Fetch the 7-day verified official price chart series (guaranteed exchange prices)
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
                        if (vals.length > 0) {
                            const latest = parseFloat(vals[vals.length - 1][1]);
                            // Verified numerical price from the chart dataset takes precedence
                            if (!isNaN(latest) && latest > 0) {
                                currentPrice = latest;
                            }
                            if (vals.length > 1) {
                                const prev = parseFloat(vals[vals.length - 2][1]);
                                if (prev > 0) {
                                    prevClose = prev;
                                    change = parseFloat((currentPrice - prev).toFixed(2));
                                    percentChange = parseFloat(((change / prev) * 100).toFixed(2));
                                }
                            }
                        }
                    }
                } catch (_) {}
            }

            if (currentPrice !== null && !isNaN(currentPrice) && currentPrice > 0) {
                return {
                    symbol: sym,
                    name: sym,
                    price: currentPrice.toFixed(2),
                    change: change.toFixed(2),
                    percentChange: percentChange.toFixed(2),
                    previousClose: (prevClose || currentPrice).toFixed(2),
                };
            }
        }
    } catch (_) {}
    return null;
}

/**
 * Fetches stock price with caching & multi-tiered fallback.
 */
export async function fetchStockPrice(symbol) {
    const cleanSym = normalizeSymbol(symbol);
    if (!cleanSym) return null;

    const cached = priceCache.get(cleanSym);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    // Tier 1: Google Finance
    let quote = await fetchFromGoogleFinance(cleanSym);

    // Tier 2: Yahoo Finance JSON Chart API
    if (!quote) {
        quote = await fetchFromYahooFinance(cleanSym);
    }

    // Tier 3: Screener.in with Cheerio & 7-Day Chart Dataset
    if (!quote) {
        quote = await fetchFromScreener(cleanSym);
    }

    // Validation Guard: Ensure valid positive price & protect against irrational anomalies
    if (quote) {
        const numPrice = parseFloat(quote.price);
        if (!isNaN(numPrice) && numPrice > 0) {
            const last = lastKnownPrice.get(cleanSym);
            if (last) {
                const lastNum = parseFloat(last.price);
                // Reject massive 3.5x jumps or 75% drops in seconds unless it's a new tracking session
                if (!isNaN(lastNum) && lastNum > 0) {
                    const ratio = numPrice / lastNum;
                    if (ratio > 3.5 || ratio < 0.25) {
                        console.warn(`[PriceAnomaly] Rejected suspicious quote for ${cleanSym}: new=${numPrice}, lastKnown=${lastNum}`);
                        return last;
                    }
                }
            }

            priceCache.set(cleanSym, { data: quote, timestamp: Date.now() });
            lastKnownPrice.set(cleanSym, quote);
            return quote;
        }
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
