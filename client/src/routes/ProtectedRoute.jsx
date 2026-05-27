import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

/**
 * ProtectedRoute
 *
 * Checks authentication state and enforces role-based routing constraints.
 * If user is frozen or subscription is expired, renders a premium black fullscreen block.
 */
export default function ProtectedRoute() {
    const { token, user, loading, logout } = useAuth();
    const location = useLocation();

    // Check blocked status
    const isFrozen = user && (user.is_frozen === 1 || user.is_frozen === true);
    const isExpired = user && user.role !== 'superadmin' && user.subscription_expires_at && new Date(user.subscription_expires_at) < new Date();
    const isBlocked = isFrozen || isExpired;

    const [message, setMessage] = useState('');

    useEffect(() => {
        if (isExpired) {
            setMessage('Hello Team TradeSphere, my trial plan has expired and I would like to extend it with the Rs 2000 monthly premium plan. Please assist me with the activation process.');
        } else if (isFrozen) {
            setMessage('Hello Team TradeSphere, my account has been frozen due to suspicious activity. Please help me verify and unfreeze my account.');
        }
    }, [isExpired, isFrozen]);

    const handleEmailSend = (e) => {
        e.preventDefault();
        const subject = encodeURIComponent(isFrozen ? "Account Frozen Inquiry - TradeSphere" : "Subscription Renewal - TradeSphere");
        const body = encodeURIComponent(message);
        window.location.href = `mailto:oneforge.1f@gmail.com?subject=${subject}&body=${body}`;
    };

    const handleWhatsAppSend = (e) => {
        e.preventDefault();
        const formattedMessage = `Email: ${user?.email}\n\n${message}`;
        const text = encodeURIComponent(formattedMessage);
        window.open(`https://wa.me/917020807574?text=${text}`, '_blank');
    };

    // While the /api/auth/me call is in-flight, render a clean spinner.
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg)',
            }}>
                Authenticating…
            </div>
        );
    }

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Redirect role-specific users trying to access unauthorized areas
    if (user && !isBlocked) {
        if (user.role === 'superadmin' && location.pathname !== '/super-admin') {
            return <Navigate to="/super-admin" replace />;
        }
        if (user.role !== 'superadmin' && location.pathname === '/super-admin') {
            return <Navigate to="/dashboard" replace />;
        }
    }

    // Render fullscreen block if user is frozen or subscription is expired
    if (isBlocked) {
        return (
            <div className="blocked-overlay">
                <style>{`
                    .blocked-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        background-color: #0B0B0D;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 99999;
                        overflow-y: auto;
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        padding: 1.5rem;
                        box-sizing: border-box;
                    }

                    .blocked-overlay * {
                        box-sizing: border-box;
                    }

                    .blocked-card {
                        background: rgba(23, 23, 26, 0.75);
                        border: 1px solid ${isFrozen ? 'rgba(239, 68, 68, 0.25)' : 'rgba(212, 175, 55, 0.25)'};
                        border-radius: 16px;
                        padding: 2.5rem;
                        max-width: 540px;
                        width: 100%;
                        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7), ${isFrozen ? '0 0 30px rgba(239, 68, 68, 0.05)' : '0 0 30px rgba(212, 175, 55, 0.05)'};
                        backdrop-filter: blur(16px);
                        -webkit-backdrop-filter: blur(16px);
                        animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        text-align: center;
                        max-height: 90vh;
                        overflow-y: auto;
                        margin: auto 0;
                    }

                    .blocked-card::-webkit-scrollbar {
                        width: 6px;
                    }
                    .blocked-card::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .blocked-card::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 3px;
                    }
                    .blocked-card::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.25);
                    }

                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    .blocked-badge {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 64px;
                        height: 64px;
                        border-radius: 50%;
                        margin-bottom: 1.5rem;
                        background: ${isFrozen ? 'rgba(239, 68, 68, 0.1)' : 'rgba(212, 175, 55, 0.1)'};
                        border: 1px solid ${isFrozen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(212, 175, 55, 0.3)'};
                        color: ${isFrozen ? '#EF4444' : '#D4AF37'};
                        animation: pulse 2s infinite ease-in-out;
                    }

                    @keyframes pulse {
                        0%, 100% {
                            transform: scale(1);
                            box-shadow: 0 0 0 0 ${isFrozen ? 'rgba(239, 68, 68, 0.4)' : 'rgba(212, 175, 55, 0.4)'};
                        }
                        50% {
                            transform: scale(1.05);
                            box-shadow: 0 0 15px 5px ${isFrozen ? 'rgba(239, 68, 68, 0.2)' : 'rgba(212, 175, 55, 0.2)'};
                        }
                    }

                    .blocked-title {
                        font-family: 'Poppins', sans-serif;
                        font-size: 1.8rem;
                        font-weight: 700;
                        color: #FFFFFF;
                        margin-bottom: 0.75rem;
                        letter-spacing: -0.025em;
                    }

                    .blocked-desc {
                        font-size: 0.95rem;
                        color: #9CA3AF;
                        line-height: 1.6;
                        margin-bottom: 1.5rem;
                    }

                    .blocked-plan-box {
                        background: rgba(212, 175, 55, 0.05);
                        border: 1px dashed rgba(212, 175, 55, 0.3);
                        border-radius: 12px;
                        padding: 1.25rem;
                        margin-bottom: 1.5rem;
                        text-align: left;
                    }

                    .blocked-plan-title {
                        font-weight: 600;
                        color: #D4AF37;
                        font-size: 0.85rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: 0.25rem;
                    }

                    .blocked-plan-price {
                        font-size: 1.5rem;
                        font-weight: 800;
                        color: #FFFFFF;
                        margin-bottom: 0.5rem;
                    }

                    .blocked-plan-note {
                        font-size: 0.85rem;
                        color: #D4AF37;
                        line-height: 1.4;
                    }

                    .blocked-frozen-box {
                        background: rgba(239, 68, 68, 0.05);
                        border: 1px dashed rgba(239, 68, 68, 0.3);
                        border-radius: 12px;
                        padding: 1.25rem;
                        margin-bottom: 1.5rem;
                        text-align: left;
                        color: #EF4444;
                    }

                    .blocked-frozen-title {
                        font-weight: 600;
                        font-size: 0.85rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: 0.25rem;
                    }

                    .blocked-frozen-detail {
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: #FFFFFF;
                        margin-bottom: 0.25rem;
                    }

                    .blocked-frozen-note {
                        font-size: 0.85rem;
                        color: #EF4444;
                        line-height: 1.4;
                    }

                    .positive-note {
                        font-size: 0.85rem;
                        color: #10B981;
                        background: rgba(16, 185, 129, 0.08);
                        border: 1px solid rgba(16, 185, 129, 0.2);
                        padding: 0.75rem 1rem;
                        border-radius: 8px;
                        margin-bottom: 1.75rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        line-height: 1.4;
                    }

                    .contact-form {
                        width: 100%;
                        text-align: left;
                    }

                    .form-group {
                        margin-bottom: 1.25rem;
                    }

                    .form-label {
                        display: block;
                        font-size: 0.8rem;
                        font-weight: 600;
                        color: #9CA3AF;
                        margin-bottom: 0.5rem;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }

                    .form-input {
                        width: 100%;
                        background: #121214;
                        border: 1px solid #26262B;
                        border-radius: 8px;
                        padding: 0.75rem 1rem;
                        color: #F5F5F5;
                        font-size: 0.9rem;
                        transition: border-color 0.2s;
                    }

                    .form-input[readonly] {
                        color: #6B7280;
                        cursor: not-allowed;
                        background: #0B0B0D;
                    }

                    .form-textarea {
                        width: 100%;
                        background: #121214;
                        border: 1px solid #26262B;
                        border-radius: 8px;
                        padding: 0.75rem 1rem;
                        color: #F5F5F5;
                        font-size: 0.9rem;
                        min-height: 100px;
                        resize: vertical;
                        font-family: inherit;
                        transition: border-color 0.2s, box-shadow 0.2s;
                    }

                    .form-textarea:focus {
                        outline: none;
                        border-color: ${isFrozen ? '#EF4444' : '#D4AF37'};
                        box-shadow: 0 0 10px ${isFrozen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.15)'};
                    }

                    .action-buttons {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1rem;
                        margin-top: 1.5rem;
                    }

                    @media (max-width: 480px) {
                        .action-buttons {
                            grid-template-columns: 1fr;
                        }
                    }

                    .btn {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        padding: 0.85rem 1rem;
                        border-radius: 8px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s;
                        border: none;
                        text-decoration: none;
                    }

                    .btn:hover {
                        transform: translateY(-2px);
                    }

                    .btn:active {
                        transform: translateY(0);
                    }

                    .btn-email {
                        background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%);
                        color: #000000;
                        box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
                    }

                    .btn-email:hover {
                        box-shadow: 0 6px 16px rgba(212, 175, 55, 0.35);
                    }

                    .btn-whatsapp {
                        background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                        color: #FFFFFF;
                        box-shadow: 0 4px 12px rgba(37, 211, 102, 0.2);
                    }

                    .btn-whatsapp:hover {
                        box-shadow: 0 6px 16px rgba(37, 211, 102, 0.35);
                    }

                    .btn-logout {
                        background: transparent;
                        border: 1px solid #26262B;
                        color: #9CA3AF;
                        margin-top: 1.5rem;
                        width: 100%;
                        justify-content: center;
                    }

                    .btn-logout:hover {
                        background: rgba(239, 68, 68, 0.08);
                        border-color: rgba(239, 68, 68, 0.3);
                        color: #EF4444;
                    }
                `}</style>

                <div className="blocked-card">
                    {/* Badge */}
                    <div className="blocked-badge">
                        {isFrozen ? (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        ) : (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"></path>
                            </svg>
                        )}
                    </div>

                    {/* Header */}
                    <h1 className="blocked-title">
                        {isFrozen ? "Account Frozen" : "Trial Plan Expired"}
                    </h1>

                    <p className="blocked-desc">
                        {isFrozen 
                            ? "Suspicious activity detected on your account. To ensure the safety of your funds and data, account operations are temporarily suspended." 
                            : "Your 30-day free trial of TradeSphere has come to an end. Upgrade to a premium plan to continue enjoying our advanced trading capabilities."
                        }
                    </p>

                    {/* Details Box */}
                    {isExpired && (
                        <div className="blocked-plan-box">
                            <div className="blocked-plan-title">Premium Subscription</div>
                            <div className="blocked-plan-price">Rs 2,000 / month</div>
                            <div className="blocked-plan-note">
                                For extending the plan, you need to contact Team TradeSphere.
                            </div>
                        </div>
                    )}

                    {isFrozen && (
                        <div className="blocked-frozen-box">
                            <div className="blocked-frozen-title">Security Alert</div>
                            <div className="blocked-frozen-detail">Suspicious Activity Detected</div>
                            <div className="blocked-frozen-note">
                                To unfreeze your account, please verify your identity with Team TradeSphere.
                            </div>
                        </div>
                    )}

                    {/* Positive Message */}
                    <div className="positive-note">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>
                            {isFrozen 
                                ? "We value your security above all. Let's resolve this quickly and get your trading back on track."
                                : "We're excited to have you back! Join our premium community and unlock all trading insights."
                            }
                        </span>
                    </div>

                    {/* Contact Form */}
                    <form className="contact-form">
                        <div className="form-group">
                            <label className="form-label">Your Email</label>
                            <input 
                                type="email" 
                                className="form-input" 
                                value={user?.email || ''} 
                                readOnly 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Message to Team TradeSphere</label>
                            <textarea 
                                className="form-textarea" 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="action-buttons">
                            <button 
                                type="button" 
                                className="btn btn-email" 
                                onClick={handleEmailSend}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                Send via Email
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-whatsapp" 
                                onClick={handleWhatsAppSend}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.454L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.793 1.452 5.518 0 10.006-4.486 10.01-10.002.002-2.673-1.04-5.184-2.93-7.077-1.89-1.89-4.4-2.934-7.079-2.935-5.523 0-10.016 4.49-10.02 10.007-.002 1.838.5 3.63 1.453 5.213l-.951 3.473 3.564-.93zm12.39-7.234c-.308-.154-1.82-.9-2.102-.998-.282-.102-.489-.154-.693.154-.205.308-.795.998-.974 1.205-.18.206-.359.23-.667.077-.308-.154-1.299-.48-2.476-1.531-.915-.818-1.533-1.83-1.712-2.137-.18-.308-.02-.475.134-.628.14-.136.308-.359.461-.539.154-.18.205-.308.308-.513.103-.205.051-.385-.026-.539-.077-.154-.693-1.667-.95-2.285-.25-.603-.503-.52-.693-.53-.18-.01-.385-.01-.59-.01-.205 0-.539.077-.821.385-.282.308-1.077 1.051-1.077 2.564 0 1.513 1.077 2.974 1.226 3.18.15.205 2.11 3.22 5.11 4.516.714.308 1.272.492 1.707.63.717.228 1.37.196 1.887.119.577-.087 1.82-.744 2.077-1.462.256-.718.256-1.334.18-1.462-.077-.128-.282-.205-.59-.359z"/>
                                </svg>
                                Chat on WhatsApp
                            </button>
                        </div>
                    </form>

                    <button className="btn btn-logout" onClick={logout}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout and Switch Account
                    </button>
                </div>
            </div>
        );
    }

    return <Outlet />;
}
