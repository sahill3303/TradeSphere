import Parser from 'rss-parser';

const parser = new Parser();

// Cache for news so we don't spam the RSS endpoint
let newsCache = null;
let lastFetchTime = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Fetch og:image from a URL
async function fetchOgImage(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        
        const res = await fetch(url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(timeout);
        
        const html = await res.text();
        // Extract og:image meta tag
        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) 
                      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        return ogMatch ? ogMatch[1] : null;
    } catch {
        return null;
    }
}

export const getDailyNews = async (req, res) => {
    try {
        const now = new Date().getTime();
        
        // Serve from cache if available and fresh
        if (newsCache && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION_MS) {
            return res.json({ success: true, count: newsCache.length, data: newsCache });
        }

        // Fetch Top News from Moneycontrol (Highly curated, important daily news for India & Global)
        const feed = await parser.parseURL('https://www.moneycontrol.com/rss/MCtopnews.xml');
        
        // Take top 5
        const top5Items = feed.items.slice(0, 5);

        // Fetch og:image for each article in parallel
        const articles = await Promise.all(top5Items.map(async (item) => {
            const imageUrl = await fetchOgImage(item.link);
            return {
                title: item.title,
                description: (item.contentSnippet || '').substring(0, 120),
                link: item.link,
                pubDate: item.pubDate,
                imageUrl: imageUrl,
                source: 'Moneycontrol'
            };
        }));

        // Update cache
        newsCache = articles;
        lastFetchTime = now;

        res.json({ success: true, count: articles.length, data: articles });
    } catch (error) {
        console.error('Error fetching RSS News:', error.message);
        if (newsCache) {
            return res.json({ success: true, count: newsCache.length, data: newsCache, cached: true });
        }
        res.status(500).json({ success: false, message: 'Failed to fetch news feed.' });
    }
};
