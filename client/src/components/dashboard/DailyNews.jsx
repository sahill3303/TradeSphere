import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function DailyNews() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        api.get('/news')
            .then(res => {
                if (res.data.success) setData(res.data.data);
                else setError(true);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    // Format: "5 Apr, 3:45 PM"
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const day = d.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            let h = d.getHours(), ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${day} ${months[d.getMonth()]}, ${h}:${m} ${ampm}`;
        } catch { return ''; }
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Loading today's market news…</div>
            </div>
        );
    }

    if (error || !data || !data.articles || data.articles.length === 0) return null;

    const { articles } = data;

    const formattedDate = new Date(data.date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata'
    });

    return (
        <div className="card" style={{
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Gold top border */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--color-gold), transparent)' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🔥</span>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                        Market Intelligence
                    </h3>
                    <span style={{
                        fontSize: '0.65rem', fontWeight: 700, color: '#0B0B0D',
                        background: 'var(--color-gold)', padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.06em'
                    }}>LIVE</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>📅 {formattedDate}</span>
            </div>

            {/* Articles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {articles.map((item, idx) => (
                    <a
                        key={idx}
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start',
                            padding: 'var(--space-md) 0',
                            borderBottom: idx < articles.length - 1 ? '1px solid var(--color-border)' : 'none',
                            textDecoration: 'none', transition: 'background 0.15s', borderRadius: 'var(--radius-sm)'
                        }}
                        className="news-article-row"
                    >
                        {/* Index */}
                        <div style={{
                            minWidth: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                            background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-dim)'
                        }}>{idx + 1}</div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Source + Time */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.68rem', color: 'var(--color-gold)', fontWeight: 600 }}>{item.source}</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>🕐 {formatDate(item.pubDate)}</span>
                            </div>
                            {/* Headline */}
                            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text)', lineHeight: 1.45, wordBreak: 'break-word' }}>
                                {item.title}
                            </p>
                            {/* Summary snippet */}
                            {item.summary && (
                                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-dim)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {item.summary}
                                </p>
                            )}
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', flexShrink: 0, marginTop: 4, alignSelf: 'flex-start' }}>→</span>
                    </a>
                ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                    Source: {data.source}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Refreshes every 30 min
                </span>
            </div>

            <style jsx="true">{`
                .news-article-row:hover p:first-of-type {
                    color: var(--color-gold) !important;
                }
            `}</style>
        </div>
    );
}
