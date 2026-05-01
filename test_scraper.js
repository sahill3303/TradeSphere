import * as cheerio from 'cheerio';

async function test() {
    const r = await fetch('https://www.screener.in/company/RELIANCE/consolidated/');
    const html = await r.text();
    const $ = cheerio.load(html);
    const price = $('#top-ratios li:contains("Current Price") .number').first().text().trim();
    console.log('EXTRACTED PRICE:', price);
}
test();
