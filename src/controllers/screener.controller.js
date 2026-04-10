import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.screener.in/'
};

// Step 1: resolve the correct Screener slug from a symbol/name query
async function resolveScreenerUrl(query) {
    const searchRes = await fetch(
        `https://www.screener.in/api/company/search/?q=${encodeURIComponent(query)}&v=3&fts=1`,
        { headers: { ...HEADERS, 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }
    );
    if (!searchRes.ok) throw new Error('Screener.in search failed.');
    const results = await searchRes.json();
    // Find first real company result (id !== null)
    const match = results.find(r => r.id !== null && r.url);
    if (!match) throw new Error(`No stock found for "${query}" on Screener.in. Try the exact NSE/BSE symbol.`);
    return { name: match.name, url: `https://www.screener.in${match.url}` };
}

// Step 2: scrape the resolved URL
async function scrapeScreener(url) {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Failed to load Screener page (HTTP ${res.status}).`);
    return res.text();
}

// Step 3: extract structured data from HTML
function parseScreenerHtml(html) {
    const $ = cheerio.load(html);

    // Company name
    const name = $('h1.h2').first().text().trim() || $('h1').first().text().trim();

    // Key ratios from #top-ratios
    const ratios = {};
    $('#top-ratios li').each((_, el) => {
        const label = $(el).find('.name').text().trim();
        const value = $(el).find('.value, .number').first().text().trim().replace(/\s+/g, ' ');
        if (label && value) ratios[label] = value;
    });

    // About
    const about = $('div.about p').first().text().trim();

    // Pros
    const pros = [];
    $('div.pros li').each((_, el) => {
        const t = $(el).text().trim();
        if (t) pros.push(t);
    });

    // Cons
    const cons = [];
    $('div.cons li').each((_, el) => {
        const t = $(el).text().trim();
        if (t) cons.push(t);
    });

    // Quarterly results (last 4 quarters)
    const quarterly = { headers: [], rows: [] };
    const qSection = $('section#quarters');
    if (qSection.length) {
        qSection.find('thead th').each((_, th) => quarterly.headers.push($(th).text().trim()));
        qSection.find('tbody tr').slice(0, 6).each((_, tr) => {
            const cells = [];
            $(tr).find('td').each((_, td) => cells.push($(td).text().trim().replace(/\s+/g, ' ')));
            if (cells.length > 1) quarterly.rows.push(cells);
        });
    }

    // Annual P&L (last 5 years)
    const annual = { headers: [], rows: [] };
    const plSection = $('section#profit-loss');
    if (plSection.length) {
        plSection.find('thead th').each((_, th) => annual.headers.push($(th).text().trim()));
        plSection.find('tbody tr').slice(0, 6).each((_, tr) => {
            const cells = [];
            $(tr).find('td').each((_, td) => cells.push($(td).text().trim().replace(/\s+/g, ' ')));
            if (cells.length > 1) annual.rows.push(cells);
        });
    }

    // Shareholding (most recent quarter)
    const shareholding = [];
    $('section#shareholding table tbody tr').each((_, tr) => {
        const cells = [];
        $(tr).find('td').each((_, td) => cells.push($(td).text().trim()));
        if (cells[0] && cells.length > 1) {
            shareholding.push({ group: cells[0], latest: cells[cells.length - 1] });
        }
    });

    return { name, ratios, about, pros, cons, quarterly, annual, shareholding };
}

// Step 4: AI factual summary (no buy/sell verdict)
async function generateAISummary(stockData, symbol, horizon, apiKey) {
    try {
        const ai = new GoogleGenAI({ apiKey });

        const horizonContext = horizon
            ? `\nThe user is analysing this stock for: **${horizon}** purpose.`
            : '';

        const prompt = `You are TradeSphere AI, a financial data analyst. Provide a 100% factual, data-driven summary of this stock. Do NOT give any buy/sell/hold recommendations or price targets.${horizonContext}

Stock: ${stockData.name || symbol}
Key Ratios: ${JSON.stringify(stockData.ratios)}
Pros from Screener: ${stockData.pros.join('; ')}
Cons from Screener: ${stockData.cons.join('; ')}
About: ${stockData.about?.substring(0, 300)}

Provide response in this EXACT JSON format (no markdown):
{
  "summary": "3-4 sentence factual business and financial summary. Mention key metrics. No opinion.",
  "horizonContext": "${horizon ? `Factual observations specifically relevant for ${horizon} analysis (2-3 sentences, no advice)` : ''}",
  "keyMetrics": [
    {"label": "metric name", "value": "value", "context": "what this means factually (1 line)"}
  ],
  "watchPoints": ["factual data point to watch 1", "factual data point to watch 2", "factual data point 3"]
}

Return ONLY valid JSON.`;

        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const response = await result.response;
        let text = response.text().trim()
            .replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error('AI summary error:', e.message);
        return null;
    }
}

export const analyzeStock = async (req, res) => {
    const { symbol } = req.params;
    const horizon = req.query.horizon || ''; // intraday | swing | long-term

    if (!symbol) return res.status(400).json({ success: false, message: 'Stock symbol required.' });

    try {
        const cacheKey = `${symbol.toUpperCase()}_${horizon}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json({ success: true, cached: true, data: cached.data });
        }

        // Resolve correct screener URL via search
        const { name: resolvedName, url } = await resolveScreenerUrl(symbol);

        // Scrape
        const html = await scrapeScreener(url);
        const stockData = parseScreenerHtml(html);

        // If name not found from scrape, use resolved name
        if (!stockData.name && resolvedName) stockData.name = resolvedName;

        // AI Summary
        const apiKey = process.env.GEMINI_API_KEY;
        const aiSummary = apiKey ? await generateAISummary(stockData, symbol, horizon, apiKey) : null;

        const result = {
            symbol: symbol.toUpperCase(),
            resolvedName,
            screenerUrl: url,
            horizon,
            ...stockData,
            aiSummary
        };

        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.json({ success: true, data: result });

    } catch (err) {
        console.error('Screener error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};
