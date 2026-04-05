import Parser from 'rss-parser';

const parser = new Parser();

let newsCache = null;
let lastFetchTime = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 min — refresh frequently to show real news

// Real working RSS feeds with today's financial news
const RSS_SOURCES = [
    { url: 'https://www.livemint.com/rss/markets', source: 'Mint' },
    { url: 'https://www.thehindubusinessline.com/markets/stock-markets/?service=rss', source: 'BusinessLine' },
    { url: 'https://feeds.feedburner.com/ndtvprofit-latest', source: 'NDTV Profit' },
];

// Keywords to filter financial market relevant news (exclude IPL, cricket etc)
const FINANCE_KEYWORDS = [
    'nifty', 'sensex', 'market', 'stock', 'share', 'bse', 'nse', 'sebi',
    'rbi', 'inflation', 'gdp', 'rate', 'economy', 'trade', 'tariff',
    'global', 'oil', 'crude', 'gold', 'rupee', 'dollar', 'yen', 'fed',
    'fii', 'dii', 'mutual fund', 'ipo', 'earnings', 'result', 'profit',
    'loss', 'revenue', 'quarterly', 'fiscal', 'budget', 'war', 'geopolit',
    'china', 'us ', 'trump', 'export', 'import', 'mcap', 'index'
];

function isFinanceRelated(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    return FINANCE_KEYWORDS.some(kw => text.includes(kw));
}

function isToday(dateStr) {
    if (!dateStr) return false;
    const articleDate = new Date(dateStr);
    const now = new Date();
    return (
        articleDate.getFullYear() === now.getFullYear() &&
        articleDate.getMonth() === now.getMonth() &&
        articleDate.getDate() === now.getDate()
    );
}

export const getDailyNews = async (req, res) => {
    try {
        const now = Date.now();

        if (newsCache && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION_MS) {
            return res.json({ success: true, data: newsCache });
        }

        // Fetch from all sources in parallel
        const results = await Promise.allSettled(
            RSS_SOURCES.map(async ({ url, source }) => {
                const feed = await parser.parseURL(url);
                return feed.items.map(item => ({
                    title: item.title?.trim(),
                    summary: (item.contentSnippet || item.content || '').replace(/<[^>]+>/g, '').trim().substring(0, 200),
                    link: item.link,
                    pubDate: item.pubDate || item.isoDate,
                    isoDate: item.isoDate,
                    source,
                }));
            })
        );

        // Merge all articles from successful fetches
        let allArticles = [];
        for (const result of results) {
            if (result.status === 'fulfilled') {
                allArticles = allArticles.concat(result.value);
            }
        }

        // Filter: today only + finance related + has a title
        let todayArticles = allArticles
            .filter(a => a.title && isToday(a.pubDate || a.isoDate) && isFinanceRelated(a.title, a.summary))
            // Sort by date, most recent first
            .sort((a, b) => new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate));

        // If nothing from today, fall back to most recent 5 finance articles (last 3 days)
        if (todayArticles.length === 0) {
            todayArticles = allArticles
                .filter(a => a.title && isFinanceRelated(a.title, a.summary))
                .sort((a, b) => new Date(b.isoDate || b.pubDate) - new Date(a.isoDate || a.pubDate));
        }

        // De-duplicate by similar title (take first match)
        const seen = new Set();
        const deduped = todayArticles.filter(a => {
            // Use first 50 chars of title as key to catch near-duplicates
            const key = a.title.substring(0, 50).toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Take top 5
        const top5 = deduped.slice(0, 5);

        const result = {
            date: new Date().toISOString().split('T')[0],
            articles: top5,
            source: 'LiveMint · BusinessLine · NDTV Profit'
        };

        newsCache = result;
        lastFetchTime = now;

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('News error:', error.message);
        if (newsCache) {
            return res.json({ success: true, data: newsCache, cached: true });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch news.' });
    }
};
