import * as cheerio from 'cheerio';

async function fetchGroww() {
    try {
        const res = await fetch('https://groww.in/indices/global-indices/sgx-nifty', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
            const match = nextData.match(/"priceData":\{"value":([0-9.]+),"open":([0-9.]+),"high":([0-9.]+),"low":([0-9.]+),"close":([0-9.]+)/);
            if (match) {
                console.log({
                    currentPrice: parseFloat(match[1]),
                    previousClose: parseFloat(match[5])
                });
            } else {
                console.log('No match');
            }
        }
    } catch(e) {
        console.error('Groww error', e.message);
    }
}

fetchGroww();
