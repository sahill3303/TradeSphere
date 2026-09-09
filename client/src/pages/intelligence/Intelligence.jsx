import { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Briefcase, FileText, Eye, Clock, Calendar, CheckCircle, XCircle, Pin, Users, Sparkles, Radio } from 'lucide-react';
import api from '../../api/axios';
import './Intelligence.css';

// ============================================================
//  Market Intelligence — Analyst Terminal  v2.0
//  Every event is analysed, not summarised.
// ============================================================

// ── Direction config ───────────────────────────────────────────
const DIRECTION = {
  Bullish: { arrow: '▲', color: '#22C55E', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.30)', accent: '#22C55E' },
  Bearish: { arrow: '▼', color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.30)',  accent: '#EF4444' },
  Mixed:   { arrow: <Zap size={14} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', accent: '#F59E0B' },
  Neutral: { arrow: '●', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)',border: 'rgba(156,163,175,0.20)',accent: '#4B5563' },
};

const TONE = {
  Alert:  { label: '● ALERT',  color: '#EF4444', bg: '#EF444415' },
  Signal: { label: '◆ SIGNAL', color: '#D4AF37', bg: '#D4AF3715' },
  Watch:  { label: '◉ WATCH',  color: '#60A5FA', bg: '#60A5FA15' },
  Update: { label: '○ UPDATE', color: '#9CA3AF', bg: '#9CA3AF15' },
};

// ── Helpers ────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${m[d.getMonth()]}, ${h}:${mn} ${ap} IST`;
  } catch { return ''; }
}

function impactBlocks(score) {
  const n = Math.min(10, Math.max(0, score || 0));
  return '█'.repeat(n) + '░'.repeat(10 - n);
}

function confidenceColor(score) {
  if (score >= 75) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function gradeColor(grade) {
  const map = { A: '#22C55E', B: '#60A5FA', C: '#F59E0B', D: '#F97316', F: '#EF4444' };
  return map[grade] || '#9CA3AF';
}

// ── Analyst Card Component ─────────────────────────────────────
function AnalystCard({ item, openSymbols, paperSymbols, watchlistSymbols }) {
  const [expanded, setExpanded] = useState(false);

  const checkMatch = (symbolsArray) => {
    if (!symbolsArray || symbolsArray.length === 0) return false;
    return symbolsArray.some(sym => {
      const rawTickers = typeof item.ticker_symbols === 'string' ? item.ticker_symbols : JSON.stringify(item.ticker_symbols || []);
      const rawInst = typeof item.impact?.affected_instruments === 'string' ? item.impact.affected_instruments : JSON.stringify(item.impact?.affected_instruments || []);
      return rawTickers.includes(sym) || rawInst.includes(sym);
    });
  };

  const isPortfolio = checkMatch(openSymbols);
  const isPaperTrade = checkMatch(paperSymbols);
  const isWatchlist = checkMatch(watchlistSymbols);

  const a = item.analyst || {};
  const imp = item.impact || {};
  const cred = item.credibility || {};
  const cls = item.classification || {};

  // Direction: prefer analyst assessment over L4 rule-based
  const direction = a.impact_score
    ? (imp.direction || 'Neutral')
    : (imp.direction || 'Neutral');
  const dir = DIRECTION[direction] || DIRECTION.Neutral;

  // Determine tone from impact score
  const score = a.impact_score || imp.strength || 2;
  const toneKey = score >= 8 ? 'Alert' : score >= 6 ? 'Signal' : score >= 4 ? 'Watch' : 'Update';
  const tone = TONE[toneKey];

  const hasAnalysis = !!(a.what_happened || a.why_it_matters || a.who_is_affected);
  const hasSectors  = (a.sectors_benefit?.length > 0) || (a.sectors_harmed?.length > 0);
  const hasAssets   = a.affected_assets?.length > 0;

  return (
    <article
      className={`analyst-card ${score >= 6 ? 'analyst-card--important' : ''}`}
      style={{ '--card-accent': dir.accent }}
    >
      {/* ── Header ── */}
      <div className="analyst-card__header">
        <span
          className="analyst-tone-badge"
          style={{ color: tone.color, background: tone.bg }}
        >
          {tone.label}
        </span>
        <span className="analyst-source">
          {item.source?.display_name || item.source?.name}
        </span>
        {cls.primary_category && (
          <>
            <span className="analyst-dot">•</span>
            <span className="analyst-category">{cls.primary_category}</span>
          </>
        )}
        {isPortfolio && (
            <span className="analyst-category" style={{ background: 'linear-gradient(45deg, #F59E0B, #D97706)', color: '#000', fontWeight: 600, border: 'none', padding: '0.1rem 0.5rem', marginLeft: '0.5rem' }}>
              PORTFOLIO
            </span>
        )}
        {isPaperTrade && !isPortfolio && (
            <span className="analyst-category" style={{ background: 'linear-gradient(45deg, #60A5FA, #3B82F6)', color: '#000', fontWeight: 600, border: 'none', padding: '0.1rem 0.5rem', marginLeft: '0.5rem' }}>
              PAPER TRADE
            </span>
        )}
        {isWatchlist && !isPortfolio && !isPaperTrade && (
            <span className="analyst-category" style={{ background: 'linear-gradient(45deg, #A78BFA, #8B5CF6)', color: '#000', fontWeight: 600, border: 'none', padding: '0.1rem 0.5rem', marginLeft: '0.5rem' }}>
              WATCHLIST
            </span>
        )}
        <span className="analyst-time">{fmtTime(item.published_at)}</span>
      </div>

      {/* ── Body ── */}
      <div className="analyst-card__body">

        {/* Analyst Headline */}
        <h3 className="analyst-headline">
          {item.headline}
        </h3>

        {/* Executive Summary */}
        {a.summary && (
          <p className="analyst-summary">{a.summary}</p>
        )}

        {/* ── Verdict Strip ── */}
        <div className="analyst-verdict-strip">
          {/* Direction */}
          <span
            className="analyst-direction-badge"
            style={{
              color: dir.color,
              background: dir.bg,
              borderColor: dir.border,
            }}
          >
            <span>{dir.arrow}</span>
            <span>{direction}</span>
          </span>

          {/* Impact score */}
          {score > 0 && (
            <span className="analyst-impact-gauge">
              <span className="analyst-impact-gauge__label">Impact</span>
              <span className="analyst-impact-gauge__blocks">{impactBlocks(score)}</span>
              <span className="analyst-impact-gauge__score">{score}/10</span>
            </span>
          )}

          {/* Confidence */}
          {a.confidence_score != null && (
            <span className="analyst-confidence">
              <span>Conf.</span>
              <span
                className="analyst-confidence__value"
                style={{ color: confidenceColor(a.confidence_score) }}
              >
                {a.confidence_score}%
              </span>
            </span>
          )}

          {/* Effect Timing */}
          {a.effect_timing && (
            <span className="analyst-timing-badge">
              {a.effect_timing === 'Immediate' ? <Zap size={12} style={{marginRight:'4px'}}/> : a.effect_timing === 'Short-Term' ? <Clock size={12} style={{marginRight:'4px'}}/> : <Clock size={12} style={{marginRight:'4px'}}/>} {a.effect_timing}
            </span>
          )}

          {/* Duration */}
          {a.expected_duration && (
            <span className="analyst-duration-badge">
              <><Calendar size={12} style={{marginRight:'4px'}}/> {a.expected_duration}</>
            </span>
          )}
        </div>

        {/* ── Sector Impact ── */}
        {hasSectors && (
          <div className="analyst-sectors">
            <div className="analyst-sector-group">
              <span className="analyst-sector-group__label benefit"><CheckCircle size={14} style={{marginRight:'4px'}}/> Sectors Benefiting</span>
              <div className="analyst-sector-pills">
                {a.sectors_benefit?.length > 0
                  ? a.sectors_benefit.map((s, i) => (
                      <span key={i} className="analyst-sector-pill benefit">{s}</span>
                    ))
                  : <span className="analyst-sector-none">None identified</span>
                }
              </div>
            </div>
            <div className="analyst-sector-group">
              <span className="analyst-sector-group__label harm"><XCircle size={14} style={{marginRight:'4px'}}/> Sectors Harmed</span>
              <div className="analyst-sector-pills">
                {a.sectors_harmed?.length > 0
                  ? a.sectors_harmed.map((s, i) => (
                      <span key={i} className="analyst-sector-pill harm">{s}</span>
                    ))
                  : <span className="analyst-sector-none">None identified</span>
                }
              </div>
            </div>
          </div>
        )}

        {/* ── 7-Question Breakdown (toggle) ── */}
        {hasAnalysis && (
          <>
            <button
              className="intel-filter-pill"
              style={{
                marginBottom: expanded ? '0.75rem' : 0,
                transition: 'margin 0.2s',
              }}
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? '▲ Hide Analysis' : '▼ Full Analyst Breakdown'}
            </button>

            {expanded && (
              <div className="analyst-breakdown">
                {a.what_happened && (
                  <div className="analyst-breakdown__item">
                    <span className="analyst-breakdown__label"><Pin size={14} style={{marginRight:'4px'}}/> What Happened</span>
                    <p className="analyst-breakdown__text">{a.what_happened}</p>
                  </div>
                )}
                {a.why_it_matters && (
                  <div className="analyst-breakdown__item">
                    <span className="analyst-breakdown__label"><Zap size={14} style={{marginRight:'4px'}}/> Why It Matters</span>
                    <p className="analyst-breakdown__text">{a.why_it_matters}</p>
                  </div>
                )}
                {a.who_is_affected && (
                  <div className="analyst-breakdown__item">
                    <span className="analyst-breakdown__label"><Users size={14} style={{marginRight:'4px'}}/> Who Is Affected</span>
                    <p className="analyst-breakdown__text">{a.who_is_affected}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Affected Assets ── */}
        {hasAssets && (
          <div className="analyst-assets">
            <span className="analyst-assets__label">Assets:</span>
            {a.affected_assets.map((asset, i) => (
              <span key={i} className="analyst-asset-tag">{asset}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="analyst-card__footer">
        <div className="analyst-footer-left">
          <span className="analyst-credibility">
            Source: <span style={{ color: gradeColor(cred.grade), fontWeight: 700 }}>
              {cred.grade || '?'}
            </span> · Credibility {cred.score || '—'}/100
          </span>
          {item.generated_by === 'gemini-analyst' && (
            <span className="analyst-ai-badge"><Sparkles size={12} style={{marginRight:'4px'}}/> AI ANALYST</span>
          )}
        </div>
        <div className="analyst-footer-right">
          {item.url && item.url !== '' && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="analyst-source-link"
            >
              Source →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Skeleton card ──────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="intel-skeleton-card">
      <div className="skeleton" style={{ height: 14, width: '20%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 22, width: '80%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 14, width: '95%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {[60,80,100,70].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 26, width: w, borderRadius: 999 }} />
        ))}
      </div>
    </div>
  );
}

// ── Pipeline status bar data ───────────────────────────────────
const PIPELINE_STEPS = [
  { id: 'L1', label: 'Collect' },
  { id: 'L2', label: 'Normalize' },
  { id: 'L3', label: 'Classify' },
  { id: 'L4', label: 'Impact' },
  { id: 'L5', label: 'Analyst AI' },
  { id: 'L6', label: 'Credibility' },
  { id: 'L7', label: 'Persist' },
];

const CATEGORIES = ['Macro', 'Regulation', 'Corporate', 'Commodity', 'Global Markets', 'Currency', 'Earnings', 'Geopolitics'];
const DIRECTIONS = ['Bullish', 'Bearish', 'Neutral', 'Mixed'];
const TIMINGS    = ['Immediate', 'Short-Term', 'Delayed'];

// ── Main Page ──────────────────────────────────────────────────
export default function Intelligence() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meta,       setMeta]       = useState(null);
  const [status,     setStatus]     = useState(null);
  const [error,      setError]      = useState(null);

  const [openSymbols, setOpenSymbols] = useState([]);
  const [paperSymbols, setPaperSymbols] = useState([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);
  const [symbolsString, setSymbolsString] = useState('');
  const [isSymbolsLoaded, setIsSymbolsLoaded] = useState(false);

  const hasPersonalized = openSymbols.length > 0 || paperSymbols.length > 0 || watchlistSymbols.length > 0;

  const [filterCat,  setFilterCat]  = useState('');
  const [filterDir,  setFilterDir]  = useState('');
  const [filterTime, setFilterTime] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const searchTimeout = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    Promise.allSettled([
      api.get('/trades?status=OPEN'),
      api.get('/paper-trades'),
      api.get('/watchlist')
    ]).then(([tradesRes, paperRes, watchRes]) => {
      const extractSymbols = (arr) => {
        return [...new Set(arr.map(t => {
          const parts = (t.stock_name || t.symbol || '').split(':');
          return parts[parts.length - 1];
        }).filter(Boolean))];
      };

      let tArr = [], pArr = [], wArr = [];
      if (tradesRes.status === 'fulfilled') {
        const trades = tradesRes.value.data?.trades || [];
        tArr = extractSymbols(trades.filter(t => t.status === 'OPEN'));
        setOpenSymbols(tArr);
      }
      if (paperRes.status === 'fulfilled') {
        const pTrades = paperRes.value.data?.data || [];
        pArr = extractSymbols(pTrades);
        setPaperSymbols(pArr);
      }
      if (watchRes.status === 'fulfilled') {
        const wItems = watchRes.value.data?.data || [];
        wArr = extractSymbols(wItems);
        setWatchlistSymbols(wArr);
      }
      const allSymbols = [...new Set([...tArr, ...pArr, ...wArr])].join(',');
      setSymbolsString(allSymbols);
      setIsSymbolsLoaded(true);
    });
  }, []);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (!isSymbolsLoaded && !isRefresh) return;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: 30, min_score: 0 });
      if (filterCat)  params.set('category',  filterCat);
      if (filterDir)  params.set('direction',  filterDir);
      if (filterTime) params.set('timing',     filterTime);
      if (symbolsString) params.set('prioritize_symbols', symbolsString);

      const [feedRes, statusRes] = await Promise.all([
        api.get(`/intelligence/feed?${params}`),
        api.get('/intelligence/pipeline/status'),
      ]);

      if (feedRes.data.success) {
        setItems(feedRes.data.data || []);
        setMeta(feedRes.data.meta);
      }
      if (statusRes.data.success) setStatus(statusRes.data.data);
    } catch (err) {
      setError('Failed to load intelligence feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterCat, filterDir, filterTime, symbolsString, isSymbolsLoaded]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerPipeline = async () => {
    setRefreshing(true);
    try {
      await api.post('/intelligence/pipeline/run');
      setTimeout(() => fetchFeed(true), 3000);
    } catch {
      fetchFeed(true);
    }
  };

  const lastRun = status?.last_run
    ? new Date(status.last_run).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    : null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    
    setIsSearching(true);
    setSearchResults(null);
    setError(null);
    try {
      const { data } = await api.get(`/intelligence/search?q=${encodeURIComponent(searchQuery)}`);
      if (data.success) {
        setSearchResults(data.data);
      } else {
        setError('Failed to fetch search results.');
      }
    } catch (err) {
      setError('Error while searching intelligence.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSuggestions([]);
  };

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setIsFetchingSuggestions(true);
        const { data: res } = await api.get(`/watchlist/search?q=${encodeURIComponent(value)}`);
        if (res.success && res.data.length > 0) {
          setSuggestions(res.data);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error('Stock search failed', err);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = (s) => {
    const cleanSymbol = s.symbol ? s.symbol.replace(/^[A-Z]+:/, '') : s.symbol;
    // We can search by name or symbol, name is usually better for Yahoo Search API
    setSearchQuery(s.name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="page">
      <div className="intel-page">

        {/* ── Header ── */}
        <div className="intel-page__header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="intel-page__title"><Zap size={24} style={{marginRight:'8px'}}/> Market Intelligence</h1>
              {hasPersonalized && (
                <span className="dn-live-badge" title="Feed prioritized based on your portfolio, paper trades, and watchlist" style={{ background: 'linear-gradient(45deg, #F59E0B, #D97706)', color: '#000', cursor: 'help', fontWeight: 600 }}>
                  ✨ PERSONALIZED
                </span>
              )}
            </div>
            <p className="intel-page__subtitle">
              AI analyst — not a news feed. Every event is analysed for market impact.
            </p>
          </div>
          <button
            id="intel-refresh-btn"
            className={`intel-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={triggerPipeline}
            disabled={refreshing}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            {refreshing ? 'Analysing…' : 'Run Pipeline'}
          </button>
        </div>

        {/* ── Pipeline Status Strip ── */}
        <div className="intel-status-bar">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.id} className="intel-pipeline-step" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {i > 0 && <span className="intel-pipeline-arrow">→</span>}
              <span className="intel-pipeline-step__dot" />
              <span className="intel-pipeline-step__label">{step.id} · {step.label}</span>
            </div>
          ))}
          {status && (
            <div className="intel-status-meta">
              <span className="intel-status-count">
                <strong>{status.total_items}</strong> signals
              </span>
              {lastRun && (
                <span className="intel-status-count">Last run {lastRun}</span>
              )}
            </div>
          )}
        </div>

        {/* ── Search Bar ── */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input 
                ref={inputRef}
                type="text" 
                placeholder="Search stocks, crude, indexes, commodities..." 
                value={searchQuery}
                onChange={handleSearchInput}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                autoComplete="off"
                className="form-input"
                style={{ width: '100%', paddingRight: isFetchingSuggestions ? '2.5rem' : '0.8rem' }}
              />
              {isFetchingSuggestions && <div className="stock-search-spinner" style={{ top: '50%', transform: 'translateY(-50%)' }} />}
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div ref={suggestionsRef} className="stock-suggestions-dropdown" style={{ top: 'calc(100% + 4px)', zIndex: 100, width: '100%' }}>
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" className="stock-suggestion-item" onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}>
                      <span className="stock-suggestion-name">{s.name}</span>
                      <span className="stock-suggestion-symbol">{s.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="btn btn--primary" disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            {searchResults !== null && (
              <button type="button" className="btn btn--ghost" onClick={handleClearSearch} disabled={isSearching}>
                Clear
              </button>
            )}
          </form>
        </div>

        {/* ── Filters ── */}
        <div className="intel-filter-bar">
          {/* Category */}
          <div className="intel-filter-group">
            <button
              className={`intel-filter-pill ${!filterCat ? 'active' : ''}`}
              onClick={() => setFilterCat('')}
            >All</button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                className={`intel-filter-pill ${filterCat === c ? 'active' : ''}`}
                onClick={() => setFilterCat(filterCat === c ? '' : c)}
              >{c}</button>
            ))}
          </div>

          <div className="intel-filter-divider" />

          {/* Direction */}
          <div className="intel-filter-group">
            {DIRECTIONS.map(d => (
              <button
                key={d}
                className={`intel-filter-pill ${filterDir === d ? 'active' : ''}`}
                onClick={() => setFilterDir(filterDir === d ? '' : d)}
              >
                {DIRECTION[d]?.arrow} {d}
              </button>
            ))}
          </div>

          <div className="intel-filter-divider" />

          {/* Effect Timing */}
          <div className="intel-filter-group">
            {TIMINGS.map(t => (
              <button
                key={t}
                className={`intel-filter-pill ${filterTime === t ? 'active' : ''}`}
                onClick={() => setFilterTime(filterTime === t ? '' : t)}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>
            {error}
          </div>
        )}

        {/* ── Feed ── */}
        {isSearching ? (
          <div className="intel-empty">
            <div className="intel-empty__icon" style={{ animation: 'pulse 1.5s infinite' }}>⏳</div>
            <p className="intel-empty__title">Analysing Search Results</p>
            <p className="intel-empty__sub">Fetching recent news and running it through the AI analyst pipeline...</p>
          </div>
        ) : searchResults !== null ? (
          searchResults.length === 0 ? (
            <div className="intel-empty">
              <div className="intel-empty__icon"><Radio size={48} /></div>
              <p className="intel-empty__title">No recent news found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="intel-feed">
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-primary)', padding: '0.5rem' }}>
                Found {searchResults.length} analyzed signals for "{searchQuery}"
              </p>
              {searchResults.map(item => (
                <AnalystCard key={item.id} item={item} openSymbols={openSymbols} paperSymbols={paperSymbols} watchlistSymbols={watchlistSymbols} />
              ))}
            </div>
          )
        ) : loading ? (
          <div className="intel-loading">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="intel-empty">
            <div className="intel-empty__icon"><Radio size={48} /></div>
            <p className="intel-empty__title">No signals match your filters</p>
            <p className="intel-empty__sub">
              {filterCat || filterDir || filterTime
                ? 'Try clearing some filters, or run the pipeline to fetch fresh signals.'
                : 'Run the pipeline to fetch and analyse signals from all sources.'}
            </p>
          </div>
        ) : (
          <div className="intel-feed">
            {items.map(item => (
              <AnalystCard key={item.id} item={item} openSymbols={openSymbols} paperSymbols={paperSymbols} watchlistSymbols={watchlistSymbols} />
            ))}
            {meta && (
              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-text-dim)', padding: '0.5rem' }}>
                Showing {items.length} of {meta.total} signals · 48-hour rolling window
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
