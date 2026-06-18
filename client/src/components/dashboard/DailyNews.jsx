import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

// ─────────────────────────────────────────────────────────────
//  DailyNews — upgraded to use the Market Intelligence Engine
//  Falls back to the legacy /news endpoint if intelligence
//  feed is empty (e.g. pipeline hasn't run yet).
// ─────────────────────────────────────────────────────────────

const DIRECTION_CONFIG = {
  Bullish: { arrow: '▲', color: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
  Bearish: { arrow: '▼', color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
  Neutral: { arrow: '●', color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)' },
};

const TONE_CONFIG = {
  Alert:  { label: '🔴 ALERT',  color: '#EF4444' },
  Signal: { label: '🟡 SIGNAL', color: '#D4AF37' },
  Watch:  { label: '🔵 WATCH',  color: '#60A5FA' },
  Update: { label: '⚪ UPDATE', color: '#9CA3AF' },
};

function formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    let h = d.getHours(), ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}, ${h}:${m} ${ampm}`;
  } catch { return ''; }
}

// ── Intelligence Card (compact, for Dashboard) ────────────────
function IntelCard({ item, idx }) {
  const dir  = DIRECTION_CONFIG[item.impact?.direction] || DIRECTION_CONFIG.Neutral;
  const tone = TONE_CONFIG[item.tone]                   || TONE_CONFIG.Update;

  return (
    <a
      href={item.url || '#'}
      target={item.url ? '_blank' : '_self'}
      rel="noreferrer"
      className="dn-intel-card"
    >
      {/* Index */}
      <div className="dn-intel-card__index">{idx + 1}</div>

      {/* Body */}
      <div className="dn-intel-card__body">
        {/* Top row: Source · Tone · Category · Time */}
        <div className="dn-intel-card__meta">
          <span className="dn-intel-source">
            {item.source?.display_name || item.source?.name}
          </span>
          <span className="dn-intel-tone" style={{ color: tone.color }}>
            {tone.label}
          </span>
          {item.classification?.primary_category && (
            <span className="dn-intel-category">
              {item.classification.primary_category}
            </span>
          )}
          <span className="dn-intel-time">{formatTime(item.published_at)}</span>
        </div>

        {/* Headline */}
        <p className="dn-intel-card__headline">{item.headline}</p>

        {/* Impact badge + instruments */}
        <div className="dn-intel-card__signals">
          <span
            className="dn-intel-dir-badge"
            style={{ color: dir.color, background: dir.bg, border: `1px solid ${dir.color}40` }}
          >
            {dir.arrow} {item.impact?.direction} {item.impact?.strength}/10
          </span>
          {item.impact?.time_horizon && (
            <span className="dn-intel-horizon">{item.impact.time_horizon}</span>
          )}
          {(item.impact?.affected_instruments || []).slice(0, 3).map((inst, i) => {
            const ic = DIRECTION_CONFIG[inst.direction] || DIRECTION_CONFIG.Neutral;
            return (
              <span
                key={i}
                className="dn-intel-inst"
                style={{ color: ic.color, background: ic.bg }}
              >
                {ic.arrow} {inst.name}
              </span>
            );
          })}
        </div>

        {/* Why bullet (concise) */}
        {item.bullets?.why && (
          <p className="dn-intel-card__why hide-mobile">{item.bullets.why}</p>
        )}
      </div>

      <span className="dn-intel-arrow hide-mobile">→</span>
    </a>
  );
}

// ── Legacy RSS item (fallback) ────────────────────────────────
function LegacyCard({ item, idx }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      let h = d.getHours(), ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${d.getDate()} ${months[d.getMonth()]}, ${h}:${m} ${ampm}`;
    } catch { return ''; }
  };

  return (
    <a href={item.link} target="_blank" rel="noreferrer" className="dn-legacy-card">
      <div className="dn-intel-card__index">{idx + 1}</div>
      <div className="dn-intel-card__body">
        <div className="dn-intel-card__meta">
          <span className="dn-intel-source">{item.source}</span>
          <span className="dn-intel-time">🕐 {formatDate(item.pubDate)}</span>
        </div>
        <p className="dn-intel-card__headline">{item.title}</p>
        {item.summary && (
          <p className="dn-intel-card__why hide-mobile">{item.summary}</p>
        )}
      </div>
      <span className="dn-intel-arrow hide-mobile">→</span>
    </a>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function DailyNews() {
  const navigate = useNavigate();
  const [items,    setItems]    = useState([]);
  const [isIntel,  setIsIntel]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);

  useEffect(() => {
    // Try intelligence feed first
    api.get('/intelligence/feed?limit=5&min_score=40')
      .then(res => {
        if (res.data.success && res.data.data?.length > 0) {
          setItems(res.data.data);
          setIsIntel(true);
        } else {
          return fetchLegacy();
        }
      })
      .catch(() => fetchLegacy())
      .finally(() => setLoading(false));
  }, []);

  const fetchLegacy = () =>
    api.get('/news')
      .then(res => {
        if (res.data.success && res.data.data?.articles?.length > 0) {
          setItems(res.data.data.articles);
          setIsIntel(false);
        }
      })
      .catch(() => setError(true));

  if (loading) {
    return (
      <div className="card dn-card">
        <div className="dn-card__header">
          <div className="dn-header-left">
            <span>⚡</span>
            <h3>Market Intelligence</h3>
          </div>
        </div>
        <div className="dn-skeletons">
          {[1,2,3].map(i => (
            <div key={i} className="dn-skeleton-row">
              <div className="skeleton" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 13, width: '35%', borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 18, width: '90%', borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 13, width: '55%', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || items.length === 0) return null;

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="card dn-card">
      {/* ── Gold accent bar */}
      <div className="dn-card__accent" />

      {/* ── Header */}
      <div className="dn-card__header">
        <div className="dn-header-left">
          <span className="dn-header-icon">⚡</span>
          <h3>Market Intelligence</h3>
          {isIntel && (
            <span className="dn-live-badge">7-LAYER AI</span>
          )}
        </div>
        <div className="dn-header-right">
          <span className="dn-date">📅 {todayLabel}</span>
        </div>
      </div>

      {/* ── Items */}
      <div className="dn-items">
        {items.map((item, idx) =>
          isIntel
            ? <IntelCard key={item.id || idx} item={item} idx={idx} />
            : <LegacyCard key={idx} item={item} idx={idx} />
        )}
      </div>

      {/* ── Footer */}
      <div className="dn-card__footer">
        <span className="dn-footer-note">
          {isIntel ? '⚡ Powered by Market Intelligence Engine' : 'Source: RSS Feeds'}
        </span>
        {isIntel && (
          <button
            id="dn-view-intelligence-btn"
            className="dn-view-all-btn"
            onClick={() => navigate('/intelligence')}
          >
            Full Intelligence Feed →
          </button>
        )}
      </div>

      <style>{`
        .dn-card {
          padding: 0;
          margin-bottom: var(--space-lg);
          position: relative;
          overflow: hidden;
        }
        .dn-card__accent {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--color-gold), transparent);
        }
        .dn-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--color-border);
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .dn-header-left {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .dn-header-icon { font-size: 1rem; }
        .dn-card__header h3 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-text);
        }
        .dn-live-badge {
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #000;
          background: var(--color-gold);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }
        .dn-header-right { display: flex; align-items: center; }
        .dn-date {
          font-size: 0.68rem;
          color: var(--color-text-dim);
        }
        /* ── Intel Cards ── */
        .dn-items {
          display: flex;
          flex-direction: column;
        }
        .dn-intel-card,
        .dn-legacy-card {
          display: flex;
          gap: var(--space-md);
          align-items: flex-start;
          padding: 1.1rem var(--space-lg);
          border-bottom: 1px solid var(--color-border);
          text-decoration: none;
          transition: background 0.15s;
          cursor: pointer;
        }
        .dn-intel-card:last-child,
        .dn-legacy-card:last-child { border-bottom: none; }
        .dn-intel-card:hover,
        .dn-legacy-card:hover {
          background: rgba(212,175,55,0.04);
        }
        .dn-intel-card:hover .dn-intel-card__headline,
        .dn-legacy-card:hover .dn-intel-card__headline {
          color: var(--color-gold);
        }
        .dn-intel-card:hover .dn-intel-arrow { opacity: 1 !important; transform: translateX(3px); }
        .dn-intel-card__index {
          min-width: 24px;
          height: 24px;
          border-radius: 6px;
          flex-shrink: 0;
          margin-top: 2px;
          background: var(--color-surface-alt);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--color-text-muted);
        }
        .dn-intel-card__body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .dn-intel-card__meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .dn-intel-source {
          font-size: 0.66rem;
          font-weight: 700;
          color: var(--color-gold);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .dn-intel-tone {
          font-size: 0.64rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .dn-intel-category {
          font-size: 0.64rem;
          font-weight: 600;
          color: var(--color-text-dim);
          background: var(--color-surface-alt);
          border: 1px solid var(--color-border);
          padding: 0.1rem 0.45rem;
          border-radius: 999px;
        }
        .dn-intel-time {
          font-size: 0.62rem;
          color: var(--color-text-dim);
          margin-left: auto;
        }
        .dn-intel-card__headline {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          line-height: 1.5;
          transition: color 0.15s;
        }
        .dn-intel-card__signals {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }
        .dn-intel-dir-badge {
          font-size: 0.64rem;
          font-weight: 700;
          padding: 0.18rem 0.55rem;
          border-radius: 999px;
        }
        .dn-intel-horizon {
          font-size: 0.62rem;
          color: var(--color-text-dim);
          background: var(--color-surface-alt);
          border: 1px solid var(--color-border);
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
        }
        .dn-intel-inst {
          font-size: 0.62rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
        }
        .dn-intel-card__why {
          margin: 0;
          font-size: 0.76rem;
          color: var(--color-text-muted);
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dn-intel-arrow {
          font-size: 0.75rem;
          color: var(--color-gold);
          flex-shrink: 0;
          margin-top: 4px;
          opacity: 0.4;
          transition: all 0.2s;
        }
        /* ── Footer ── */
        .dn-card__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) var(--space-lg);
          border-top: 1px solid var(--color-border);
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .dn-footer-note {
          font-size: 0.64rem;
          color: var(--color-text-dim);
          font-style: italic;
        }
        .dn-view-all-btn {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-gold);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.3rem 0.75rem;
          border-radius: var(--radius-md);
          transition: background 0.15s;
        }
        .dn-view-all-btn:hover {
          background: rgba(212,175,55,0.08);
        }
        /* ── Skeletons ── */
        .dn-skeletons {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .dn-skeleton-row {
          display: flex;
          gap: var(--space-md);
          padding: 1.1rem var(--space-lg);
          border-bottom: 1px solid var(--color-border);
          align-items: flex-start;
        }
        /* ── Mobile ── */
        @media (max-width: 480px) {
          .dn-intel-card, .dn-legacy-card { padding: 0.85rem var(--space-md); }
          .dn-intel-card__headline { font-size: 0.82rem; }
        }
      `}</style>
    </div>
  );
}
