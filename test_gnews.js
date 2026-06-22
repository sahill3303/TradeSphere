import Parser from 'rss-parser';

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

async function testGNews() {
    try {
        const query = 'Capri Global Capital Ltd';
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:30d&hl=en-IN&gl=IN&ceid=IN:en`;
        console.log('Fetching', url);
        const feed = await parser.parseURL(url);
        console.log(`Found ${feed.items.length} items`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testGNews();
