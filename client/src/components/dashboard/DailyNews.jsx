import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function DailyNews() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/news')
            .then(res => setNews(res.data.data))
            .catch(err => console.error('Failed to load news:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !news || news.length === 0) return null;

    return (
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--color-gold)' }}>
                    🔥 Top 5 Critical Updates
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', background: 'var(--color-surface)', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-sm)' }}>
                    Today's Key Events
                </span>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gap: 'var(--space-md)',
                overflowX: 'auto',
                paddingBottom: 'var(--space-sm)'
            }}>
                {news.map((item, idx) => (
                    <a 
                        key={idx} 
                        href={item.link} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                            cursor: 'pointer',
                            minWidth: '200px'
                        }}
                        className="news-card"
                    >
                        {item.imageUrl ? (
                            <img 
                                src={item.imageUrl} 
                                alt="" 
                                style={{ width: '100%', height: '130px', objectFit: 'cover' }} 
                            />
                        ) : (
                            <div style={{ width: '100%', height: '130px', background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '2rem' }}>
                                📰
                            </div>
                        )}
                        <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {item.title}
                            </h4>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: 'auto' }}>
                                Read more →
                            </span>
                        </div>
                    </a>
                ))}
            </div>
            <style jsx="true">{`
                .news-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--color-gold) !important;
                    box-shadow: 0 4px 15px rgba(212, 175, 55, 0.15);
                }
                .news-card:hover h4 {
                    color: var(--color-gold) !important;
                }
                /* Custom scrollbar for small screens if grid overflows */
                div::-webkit-scrollbar {
                    height: 6px;
                }
                div::-webkit-scrollbar-track {
                    background: var(--color-surface-alt);
                    border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb {
                    background: var(--color-border);
                    border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb:hover {
                    background: var(--color-gold);
                }
            `}</style>
        </div>
    );
}
