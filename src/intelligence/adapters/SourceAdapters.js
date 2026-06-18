import Parser from 'rss-parser';
import { BaseAdapter } from './BaseAdapter.js';

const parser = new Parser({ timeout: 15000 });

// ============================================================
//  RSSAdapter — generic RSS/Atom feed adapter
//  Handles: Reuters (public RSS), Mint, BusinessLine,
//           NDTV Profit, ET Markets, Moneycontrol, Economic Times
// ============================================================

const RSS_SOURCES = [
  // Indian Financial News
  {
    url: 'https://www.livemint.com/rss/markets',
    source: 'livemint',
    displayName: 'Mint',
    region: 'INDIA',
    assetClass: 'EQUITY',
    sourceWeight: 0.65,
  },
  {
    url: 'https://www.thehindubusinessline.com/markets/stock-markets/?service=rss',
    source: 'businessline',
    displayName: 'BusinessLine',
    region: 'INDIA',
    assetClass: 'EQUITY',
    sourceWeight: 0.65,
  },
  {
    url: 'https://feeds.feedburner.com/ndtvprofit-latest',
    source: 'ndtv_profit',
    displayName: 'NDTV Profit',
    region: 'INDIA',
    assetClass: 'EQUITY',
    sourceWeight: 0.62,
  },
  {
    url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    source: 'economic_times',
    displayName: 'Economic Times',
    region: 'INDIA',
    assetClass: 'MULTI',
    sourceWeight: 0.68,
  },
  {
    url: 'https://www.moneycontrol.com/rss/MCtopnews.xml',
    source: 'moneycontrol',
    displayName: 'Moneycontrol',
    region: 'INDIA',
    assetClass: 'EQUITY',
    sourceWeight: 0.63,
  },
  // Global
  {
    url: 'https://feeds.reuters.com/reuters/businessNews',
    source: 'reuters',
    displayName: 'Reuters',
    region: 'GLOBAL',
    assetClass: 'MULTI',
    sourceWeight: 0.90,
  },
  {
    url: 'https://feeds.ft.com/rss/home/uk',
    source: 'financial_times',
    displayName: 'Financial Times',
    region: 'GLOBAL',
    assetClass: 'MULTI',
    sourceWeight: 0.82,
  },
];

export class RSSAdapter extends BaseAdapter {
  constructor() {
    super({ source: 'rss_aggregate', displayName: 'RSS Feeds' });
    this.sources = RSS_SOURCES;
  }

  async collect() {
    const results = await Promise.allSettled(
      this.sources.map(async (src) => {
        try {
          const feed = await parser.parseURL(src.url);
          return feed.items.map(item => ({ ...item, _meta: src }));
        } catch (err) {
          console.warn(`[RSS] ${src.source} failed: ${err.message}`);
          return [];
        }
      })
    );

    const all = [];
    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }
    return all;
  }

  async toRawSignal(item) {
    const meta    = item._meta;
    const title   = (item.title || '').trim();
    const content = (item.contentSnippet || item.content || item.summary || '')
      .replace(/<[^>]+>/g, '')
      .trim()
      .substring(0, 500);

    if (!title) return null;

    return {
      id:         this.generateId(),
      timestamp:  this.toUTC(item.isoDate || item.pubDate),
      source:     meta.source,
      displayName: meta.displayName,
      sourceWeight: meta.sourceWeight,
      title,
      content,
      url:        item.link || '',
      region:     meta.region,
      asset_class: meta.assetClass,
      content_hash: this.contentHash(meta.source, title),
    };
  }
}

// ============================================================
//  RBIAdapter — Reserve Bank of India RSS
// ============================================================
export class RBIAdapter extends BaseAdapter {
  constructor() {
    super({
      source: 'rbi',
      displayName: 'Reserve Bank of India',
      region: 'INDIA',
      assetClass: 'FIXED_INCOME',
      pollInterval: 600_000, // 10 min
    });
    this.feedUrl = 'https://www.rbi.org.in/scripts/rss.aspx';
  }

  async collect() {
    try {
      const feed = await parser.parseURL(this.feedUrl);
      return feed.items;
    } catch (err) {
      console.warn(`[RBI] feed error: ${err.message}`);
      return [];
    }
  }

  async toRawSignal(item) {
    const title = (item.title || '').trim();
    if (!title) return null;

    return {
      id:          this.generateId(),
      timestamp:   this.toUTC(item.isoDate || item.pubDate),
      source:      'rbi',
      displayName: 'Reserve Bank of India',
      sourceWeight: 1.00,
      title,
      content:     (item.contentSnippet || item.summary || '').replace(/<[^>]+>/g, '').trim().substring(0, 500),
      url:         item.link || 'https://www.rbi.org.in',
      region:      'INDIA',
      asset_class: 'FIXED_INCOME',
      content_hash: this.contentHash('rbi', title),
    };
  }
}

// ============================================================
//  SEBIAdapter — Securities & Exchange Board of India
// ============================================================
export class SEBIAdapter extends BaseAdapter {
  constructor() {
    super({
      source: 'sebi',
      displayName: 'SEBI',
      region: 'INDIA',
      assetClass: 'EQUITY',
      pollInterval: 900_000, // 15 min
    });
    // SEBI circulars RSS / press releases
    this.feedUrl = 'https://www.sebi.gov.in/sebi_data/commondocs/mar-2024_p.xml';
    this.altUrl  = 'https://www.sebi.gov.in/rss.xml';
  }

  async collect() {
    try {
      const feed = await parser.parseURL(this.altUrl);
      return feed.items;
    } catch (err) {
      console.warn(`[SEBI] feed error: ${err.message}`);
      return [];
    }
  }

  async toRawSignal(item) {
    const title = (item.title || '').trim();
    if (!title) return null;

    return {
      id:          this.generateId(),
      timestamp:   this.toUTC(item.isoDate || item.pubDate),
      source:      'sebi',
      displayName: 'SEBI',
      sourceWeight: 1.00,
      title,
      content:     (item.contentSnippet || '').replace(/<[^>]+>/g, '').trim().substring(0, 500),
      url:         item.link || 'https://www.sebi.gov.in',
      region:      'INDIA',
      asset_class: 'EQUITY',
      content_hash: this.contentHash('sebi', title),
    };
  }
}

// ============================================================
//  NSEAdapter — National Stock Exchange announcements
// ============================================================
export class NSEAdapter extends BaseAdapter {
  constructor() {
    super({
      source: 'nse',
      displayName: 'NSE India',
      region: 'INDIA',
      assetClass: 'EQUITY',
      pollInterval: 300_000,
    });
  }

  async collect() {
    try {
      // NSE corporate announcements API
      const res = await fetch(
        'https://www.nseindia.com/api/corporate-announcements?index=equities',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
            'Referer': 'https://www.nseindia.com/',
          },
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.slice(0, 30) : [];
    } catch (err) {
      console.warn(`[NSE] fetch error: ${err.message}`);
      return [];
    }
  }

  async toRawSignal(item) {
    const symbol = (item.symbol || '').trim();
    const subject = (item.subject || '').trim();
    const desc = (item.desc || '').trim();
    const text = subject || desc || '';
    
    const title = symbol ? `${symbol}: ${text}` : text;
    if (!title) return null;

    return {
      id:          this.generateId(),
      timestamp:   this.toUTC(item.an_dt || item.bm_dt),
      source:      'nse',
      displayName: 'NSE India',
      sourceWeight: 0.98,
      title,
      content:     item.attchmnt_text || desc || subject,
      url:         `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
      region:      'INDIA',
      asset_class: 'EQUITY',
      ticker:      symbol,
      content_hash: this.contentHash('nse', title),
    };
  }
}

// ============================================================
//  BSEAdapter — Bombay Stock Exchange filings
// ============================================================
export class BSEAdapter extends BaseAdapter {
  constructor() {
    super({
      source: 'bse',
      displayName: 'BSE India',
      region: 'INDIA',
      assetClass: 'EQUITY',
      pollInterval: 300_000,
    });
  }

  async collect() {
    try {
      // BSE corporate announcements
      const res = await fetch(
        'https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w?strCat=-1&strType=C&strScrip=&strSearch=P&strToDate=&strFromDate=&mykey=undefined',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://www.bseindia.com/',
          },
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.Table || []).slice(0, 30);
    } catch (err) {
      console.warn(`[BSE] fetch error: ${err.message}`);
      return [];
    }
  }

  async toRawSignal(item) {
    const shortName = (item.SHORTNAME || '').trim();
    const scripCd   = (item.SCRIP_CD || '').trim();
    const longName  = (item.LONGNAME || '').trim();
    const symbol    = shortName || scripCd || longName || '';

    const headline = (item.HEADLINE || item.NEWSSUB || '').trim();
    const title = symbol ? `${symbol}: ${headline}` : headline;
    if (!title) return null;

    return {
      id:          this.generateId(),
      timestamp:   this.toUTC(item.NEWS_DT || item.DissemDT),
      source:      'bse',
      displayName: 'BSE India',
      sourceWeight: 0.98,
      title,
      content:     item.NSECATEGORY || headline,
      url:         item.ATTACHMENTNAME
        ? `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${item.ATTACHMENTNAME}`
        : 'https://www.bseindia.com',
      region:      'INDIA',
      asset_class: 'EQUITY',
      ticker:      symbol,
      content_hash: this.contentHash('bse', title),
    };
  }
}

// ============================================================
//  EconomicAdapter — Trading Economics key macro data
// ============================================================
export class EconomicAdapter extends BaseAdapter {
  constructor() {
    super({
      source: 'trading_economics',
      displayName: 'Trading Economics',
      region: 'INDIA',
      assetClass: 'MACRO',
      pollInterval: 3_600_000, // 1 hour
    });
  }

  async collect() {
    // Returns structured macro data items for India
    // Trading Economics free tier returns limited data via their calendar
    try {
      const res = await fetch(
        'https://api.tradingeconomics.com/calendar/country/india?c=guest:guest',
        { headers: { 'Accept': 'application/json' } }
      );
      if (!res.ok) return this._fallbackData();
      const data = await res.json();
      return Array.isArray(data) ? data.slice(0, 20) : this._fallbackData();
    } catch {
      return this._fallbackData();
    }
  }

  _fallbackData() {
    // Hardcoded key macro snapshot for when API is unavailable
    return [
      { Indicator: 'Repo Rate', Actual: '6.25', Previous: '6.50', Unit: '%', Country: 'India', Date: new Date().toISOString() },
      { Indicator: 'CPI YoY', Actual: '4.2', Previous: '4.8', Unit: '%', Country: 'India', Date: new Date().toISOString() },
      { Indicator: 'GDP Growth', Actual: '7.2', Previous: '6.7', Unit: '%', Country: 'India', Date: new Date().toISOString() },
    ];
  }

  async toRawSignal(item) {
    if (!item.Indicator) return null;
    const title = `India ${item.Indicator}: ${item.Actual}${item.Unit || ''}` +
      (item.Previous ? ` (prev: ${item.Previous}${item.Unit || ''})` : '');

    return {
      id:          this.generateId(),
      timestamp:   this.toUTC(item.Date),
      source:      'trading_economics',
      displayName: 'Trading Economics',
      sourceWeight: 0.70,
      title,
      content:     `${item.Country || 'India'} — ${item.Indicator}: Actual ${item.Actual}${item.Unit || ''}, Previous ${item.Previous || 'N/A'}${item.Unit || ''}`,
      url:         'https://tradingeconomics.com/india/indicators',
      region:      'INDIA',
      asset_class: 'MACRO',
      content_hash: this.contentHash('trading_economics', title),
    };
  }
}
