import { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';
import ReactMarkdown from 'react-markdown';

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: "Hi! I'm **TradeSphere AI**, your exclusive market assistant. How can we dominate the markets today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const [hasOpened, setHasOpened] = useState(false);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            setShowTooltip(false);
            setHasOpened(true);
        }
    }, [messages, isOpen]);

    useEffect(() => {
        // Show tooltip 3 seconds after page load ONLY if they haven't opened the chat yet.
        const timer = setTimeout(() => {
            setHasOpened(prevOpened => {
                if (!prevOpened) setShowTooltip(true);
                return prevOpened;
            });
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input.trim() };
        const updatedHistory = [...messages, userMsg];
        
        setMessages(updatedHistory);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/bot/chat', {
                messages: messages, // send history before current
                newMessage: userMsg.content
            });

            if (res.data.success) {
                setMessages([...updatedHistory, { role: 'ai', content: res.data.text }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errMsg = error.response?.data?.message || 'Failed to connect. Please make sure your GEMINI_API_KEY is placed in the backend .env file.';
            setMessages([...updatedHistory, { role: 'ai', content: `**Error**: ${errMsg}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 'var(--space-xl)',
            right: 'var(--space-xl)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 'var(--space-sm)'
        }}>
            
            {/* Tooltip Pop-up */}
            {!isOpen && showTooltip && (
                <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-gold)',
                    padding: '0.6rem 1rem',
                    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    color: 'var(--color-text)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    animation: 'slideUp 0.3s ease-out',
                    position: 'relative'
                }}>
                    ✨ May I help you analyze a trade?
                    {/* Small triangle pointer */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-6px',
                        right: '25px',
                        width: '10px',
                        height: '10px',
                        background: 'var(--color-surface)',
                        borderBottom: '1px solid var(--color-gold)',
                        borderRight: '1px solid var(--color-gold)',
                        transform: 'rotate(45deg)'
                    }}></div>
                </div>
            )}

            {/* Widget Button */}
            <button 
                onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }}
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-dark))',
                    color: '#0B0B0D',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
            >
                {isOpen ? (
                    <span style={{ fontSize: '1.5rem' }}>✕</span>
                ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: 70,
                    right: 0,
                    width: '380px',
                    height: '550px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1rem',
                        background: 'var(--color-surface-alt)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ 
                                width: 28, height: 28, borderRadius: '50%', 
                                background: 'var(--color-gold-soft)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center' 
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                                    <path d="M12 12 2.1 7.1"></path>
                                    <path d="m12 12 9.9 4.9"></path>
                                </svg>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-gold)', fontSize: '0.95rem' }}>TradeSphere AI</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)' }}></div>
                                    Online
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div style={{
                        flex: 1,
                        padding: '1rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        scrollbarWidth: 'thin'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '0.75rem 1rem',
                                borderRadius: msg.role === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0',
                                backgroundColor: msg.role === 'user' ? 'var(--color-gold-soft)' : 'var(--color-surface-alt)',
                                border: `1px solid ${msg.role === 'user' ? 'var(--color-gold)' : 'var(--color-border)'}`,
                                color: msg.role === 'user' ? 'var(--color-gold)' : 'var(--color-text)',
                            }}>
                                <div style={{
                                    fontSize: '0.85rem',
                                    lineHeight: 1.5,
                                    margin: 0
                                }}>
                                    <ReactMarkdown components={{
                                        p: ({node, ...props}) => <p style={{margin: '0 0 0.5em 0'}} {...props}/>,
                                        a: ({node, ...props}) => <a style={{color: 'var(--color-gold)', textDecoration: 'underline'}} target="_blank" rel="noreferrer" {...props}/>,
                                        strong: ({node, ...props}) => <strong style={{color: msg.role === 'user' ? 'var(--color-gold)' : 'var(--color-text)'}} {...props}/>,
                                    }}>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ alignSelf: 'flex-start', color: 'var(--color-text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                Assistant is typing...
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: '1rem',
                        borderTop: '1px solid var(--color-border)',
                        background: 'var(--color-surface-alt)'
                    }}>
                        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about markets, trades..."
                                style={{
                                    flex: 1,
                                    padding: '0.6rem 1rem',
                                    borderRadius: '999px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text)',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    background: input.trim() && !loading ? 'var(--color-gold)' : 'var(--color-border)',
                                    color: '#0B0B0D',
                                    border: 'none',
                                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ➤
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            <style jsx="true">{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
