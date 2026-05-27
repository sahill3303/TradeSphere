import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 *
 * Checks authentication state and enforces role-based routing constraints.
 */
export default function ProtectedRoute() {
    const { token, user, loading } = useAuth();
    const location = useLocation();

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
    if (user) {
        if (user.role === 'superadmin' && location.pathname !== '/super-admin') {
            return <Navigate to="/super-admin" replace />;
        }
        if (user.role !== 'superadmin' && location.pathname === '/super-admin') {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <Outlet />;
}
