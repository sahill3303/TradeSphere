async function searchYahoo() {
    const symbols = ['GIFTONIFTY.NS', 'NIFTY-F.NS', '^SGX', 'NIFTY_F_1.EX', 'NIFTY_F_1.NS'];
    for(let sym of symbols) {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`;
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const json = await res.json();
            if (json.chart.error) console.log(`${sym}: error`);
            else console.log(`${sym}: OK`);
        } catch (e) {
            console.log(`${sym}: failed`);
        }
    }
}
searchYahoo();
