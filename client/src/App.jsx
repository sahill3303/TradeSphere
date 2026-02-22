import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/layout/Layout';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Protected pages
import Dashboard from './pages/dashboard/Dashboard';
import ClientsList from './pages/clients/ClientsList';
import ClientDetails from './pages/clients/ClientDetails';
import TradesList from './pages/trades/TradesList';
import TradeDetails from './pages/trades/TradeDetails';
import OpenTrade from './pages/trades/OpenTrade';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — all inside ProtectedRoute outlet */}
          <Route element={<ProtectedRoute />}>
            {/* Dashboard */}
            <Route path="/dashboard" element={
              <Layout><Dashboard /></Layout>
            } />

            {/* Clients */}
            <Route path="/clients" element={
              <Layout><ClientsList /></Layout>
            } />
            <Route path="/clients/:id" element={
              <Layout><ClientDetails /></Layout>
            } />

            {/* Trades — /trades/open must come BEFORE /trades/:id */}
            <Route path="/trades" element={
              <Layout><TradesList /></Layout>
            } />
            <Route path="/trades/open" element={
              <Layout><OpenTrade /></Layout>
            } />
            <Route path="/trades/:id" element={
              <Layout><TradeDetails /></Layout>
            } />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
