import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
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
import Notes from './pages/notes/Notes';
import Analysis from './pages/analysis/Analysis';
import Watchlist from './pages/watchlist/Watchlist';

export default function App() {
  return (
    <ThemeProvider>
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

            {/* Notes */}
            <Route path="/notes" element={
              <Layout><Notes /></Layout>
            } />

            {/* Analysis */}
            <Route path="/analysis" element={
              <Layout><Analysis /></Layout>
            } />

            {/* Watchlist */}
            <Route path="/watchlist" element={
              <Layout><Watchlist /></Layout>
            } />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
