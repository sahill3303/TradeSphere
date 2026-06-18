import crypto from 'crypto';

// ============================================================
//  BaseAdapter — all source adapters extend this
// ============================================================
export class BaseAdapter {
  constructor(config = {}) {
    this.source      = config.source;       // e.g. 'rbi'
    this.displayName = config.displayName;  // e.g. 'RBI'
    this.region      = config.region || 'INDIA';
    this.assetClass  = config.assetClass || 'MULTI';
    this.pollInterval = config.pollInterval || 300_000; // 5 min default
    this.maxRetries   = 3;
  }

  // ── Must be implemented by subclass ──────────────────────
  async collect() {
    throw new Error(`${this.source}: collect() not implemented`);
  }

  async toRawSignal(raw) {
    throw new Error(`${this.source}: toRawSignal() not implemented`);
  }

  // ── Utilities ────────────────────────────────────────────

  generateId() {
    return crypto.randomUUID();
  }

  // Normalizes any date string to ISO 8601 UTC
  toUTC(dateStr) {
    if (!dateStr) return new Date().toISOString();
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  // Generates a stable content hash for deduplication
  contentHash(source, title) {
    return crypto.createHash('sha256')
      .update(`${source}::${(title || '').toLowerCase().trim()}`)
      .digest('hex');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Run loop ─────────────────────────────────────────────
  // Called by the worker; iterates and returns processed signals
  async fetchAll() {
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        const rawItems = await this.collect();
        const signals  = [];
        for (const raw of rawItems) {
          try {
            const signal = await this.toRawSignal(raw);
            if (signal) signals.push(signal);
          } catch (itemErr) {
            console.warn(`[${this.source}] item error: ${itemErr.message}`);
          }
        }
        return signals;
      } catch (err) {
        attempts++;
        console.error(`[${this.source}] fetch attempt ${attempts} failed: ${err.message}`);
        if (attempts < this.maxRetries) await this.sleep(1000 * attempts);
      }
    }
    return [];
  }
}
