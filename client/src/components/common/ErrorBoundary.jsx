import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    sessionStorage.removeItem('justLoggedIn');
    window.location.reload();
  };

  handleGoDashboard = () => {
    sessionStorage.removeItem('justLoggedIn');
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg, #0B0B0D)',
          color: 'var(--color-text, #F0F0F2)',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'var(--font-family, system-ui, sans-serif)'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--color-surface, #141417)',
            border: '1px solid var(--color-border, #28282E)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: 'var(--color-gold, #D4AF37)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '1.5rem'
            }}>
              ⚡
            </div>
            
            <h2 style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--color-text, #F0F0F2)',
              marginBottom: '0.75rem'
            }}>
              Something went wrong
            </h2>
            
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--color-text-muted, #9E9EA8)',
              lineHeight: 1.5,
              marginBottom: '1.75rem'
            }}>
              The application encountered an unexpected issue while rendering. Please reload to restore your session.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  background: 'var(--color-gold, #D4AF37)',
                  color: '#0B0B0D',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoDashboard}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  background: 'var(--color-surface-alt, #1D1D22)',
                  color: 'var(--color-text, #F0F0F2)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: '1px solid var(--color-border, #28282E)',
                  cursor: 'pointer'
                }}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
