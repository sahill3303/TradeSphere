import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 *
 * Waits for session restore (loading) before deciding to redirect.
 * This prevents a flash-redirect to /login on hard refresh when
 * the user is actually authenticated (token valid, /me call pending).
 */
export default function ProtectedRoute() {
    const { token, loading } = useAuth();

    // While the /api/auth/me call is in-flight, render nothing (or a spinner).
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

    return token ? <Outlet /> : <Navigate to="/login" replace />;
}
