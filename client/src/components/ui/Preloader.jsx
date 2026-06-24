import { useState, useEffect } from 'react';
import TS2Logo from '../../assets/TS2.png';

export default function Preloader({ onStartSlide, onComplete }) {
    const [progress, setProgress] = useState(4); // Start at 04% like the reference
    const [phase, setPhase] = useState('loading'); // 'loading', 'sliding', 'done'

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.floor(Math.random() * 5) + 1; // Random increment
                if (next >= 100) {
                    clearInterval(interval);
                    setTimeout(() => setPhase('sliding'), 300); // Brief pause at 100%
                    return 100;
                }
                return next;
            });
        }, 20); // Fast interval for a quick startup
        
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (phase === 'sliding') {
            if (onStartSlide) onStartSlide();
            const timer = setTimeout(() => {
                setPhase('done');
                if (onComplete) onComplete();
            }, 800); // matches transition duration
            return () => clearTimeout(timer);
        }
    }, [phase, onStartSlide, onComplete]);

    if (phase === 'done') return null;

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: '#0A0A0A',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: phase === 'sliding' ? 'translateY(-100%)' : 'translateY(0)',
                transition: 'transform 0.8s cubic-bezier(0.76, 0, 0.24, 1)',
            }}
        >
            <div style={{
                opacity: phase === 'sliding' ? 0 : 1,
                transform: phase === 'sliding' ? 'scale(0.9)' : 'scale(1)',
                transition: 'all 0.5s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
            }}>
                <img 
                    src={TS2Logo} 
                    alt="TradeSphere Logo" 
                    style={{ 
                        width: '80px', 
                        height: '80px', 
                        filter: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.5))',
                        objectFit: 'contain'
                    }} 
                />
                <div style={{
                    fontFamily: 'monospace',
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: '#d4af37', // TradeSphere Gold
                    letterSpacing: '0.15em'
                }}>
                    {progress.toString().padStart(2, '0')}%
                </div>
            </div>
        </div>
    );
}
