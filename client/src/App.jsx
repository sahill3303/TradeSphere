import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ConfirmProvider } from './context/ConfirmContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/layout/Layout';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Welcome from './pages/welcome/Welcome';
import AboutApp from './pages/about/AboutApp';

// Info pages
import Privacy from './pages/info/Privacy';
import Terms from './pages/info/Terms';
import Support from './pages/info/Support';

// Protected pages
import Dashboard from './pages/dashboard/Dashboard';
import ClientsList from './pages/clients/ClientsList';
import ClientDetails from './pages/clients/ClientDetails';
import TradesList from './pages/trades/TradesList';
import TradeDetails from './pages/trades/TradeDetails';
import OpenTrade from './pages/trades/OpenTrade';
import PaperTrade from './pages/trades/PaperTrade';
import Notes from './pages/notes/Notes';
import Analysis from './pages/analysis/Analysis';
import Watchlist from './pages/watchlist/Watchlist';
import Settings from './pages/settings/Settings';
import Profile from './pages/profile/Profile';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import Intelligence from './pages/intelligence/Intelligence';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/about" element={<AboutApp />} />
                
                {/* Info routes */}
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/support" element={<Support />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
                  <Route path="/clients" element={<Layout><ClientsList /></Layout>} />
                  <Route path="/clients/:id" element={<Layout><ClientDetails /></Layout>} />
                  <Route path="/trades" element={<Layout><TradesList /></Layout>} />
                  <Route path="/trades/open" element={<Layout><OpenTrade /></Layout>} />
                  <Route path="/trades/:id" element={<Layout><TradeDetails /></Layout>} />
                  <Route path="/paper-trade" element={<Layout><PaperTrade /></Layout>} />
                  <Route path="/notes" element={<Layout><Notes /></Layout>} />
                  <Route path="/analysis" element={<Layout><Analysis /></Layout>} />
                  <Route path="/watchlist" element={<Layout><Watchlist /></Layout>} />
                  <Route path="/intelligence" element={<Layout><Intelligence /></Layout>} />
                  <Route path="/settings" element={<Layout><Settings /></Layout>} />
                  <Route path="/profile" element={<Layout><Profile /></Layout>} />
                  <Route path="/super-admin" element={<Layout><SuperAdminDashboard /></Layout>} />
                </Route>

                {/* Fallback */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </ConfirmProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
