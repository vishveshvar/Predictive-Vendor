import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Bot } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import CommandPalette from './components/layout/CommandPalette';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Register from './pages/Register';
import PublicTrackPage from './pages/PublicTrackPage';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';
import ClientAnalytics from './pages/client/ClientAnalytics';
import ClientInventory from './pages/client/ClientInventory';
import ClientPredictions from './pages/client/ClientPredictions';
import ClientOrders from './pages/client/ClientOrders';
import ClientRMA from './pages/client/ClientRMA';
import ClientReports from './pages/client/ClientReports';
import ClientAssistant from './pages/client/ClientAssistant';

// Supplier Pages
import SupplierCommandCenter from './pages/supplier/SupplierCommandCenter';
import SupplierGlobalDemand from './pages/supplier/SupplierGlobalDemand';
import SupplierClients from './pages/supplier/SupplierClients';
import SupplierOrders from './pages/supplier/SupplierOrders';
import SupplierRMA from './pages/supplier/SupplierRMA';
import SupplierModelStudio from './pages/supplier/SupplierModelStudio';
import SupplierExtensions from './pages/supplier/SupplierExtensions';
import SupplierReports from './pages/supplier/SupplierReports';
import SupplierAssistant from './pages/supplier/SupplierAssistant';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000,
    },
  },
});

function ProtectedLayout({ requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isAssistantRoute = location.pathname.includes('/assistant');
  const targetAssistant = user?.role === 'supplier' ? '/supplier/assistant' : '/client/assistant';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-xs font-mono">Verifying session credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Cross-tenant access guard
  if (requiredRole && user?.role !== requiredRole) {
    if (user?.role === 'client') {
      return <Navigate to="/client" replace />;
    } else {
      return <Navigate to="/supplier" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onOpenCommandPalette={() => setPaletteOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>
      </div>

      {/* Persistent Floating Chatbot Launcher */}
      {!isAssistantRoute && (
        <button
          type="button"
          onClick={() => navigate(targetAssistant)}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-xl shadow-cyan-500/20 z-50 transition-transform hover:scale-105 group"
          title="Open Analytics Assistant"
          aria-label="Open Analytics Assistant"
        >
          <span className="relative flex items-center justify-center">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </span>
        </button>
      )}

      {/* Global Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl font-black mb-4">
        404
      </div>
      <h1 className="text-xl font-bold font-display text-white">Page Not Found</h1>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <a
        href="/"
        className="mt-6 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider hover:bg-cyan-400 transition-colors"
      >
        Return to Home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<Register />} />
              <Route path="/track/:hash" element={<PublicTrackPage />} />

              {/* Protected Client Routes */}
              <Route element={<ProtectedLayout requiredRole="client" />}>
                <Route path="/client" element={<ClientDashboard />} />
                <Route path="/client/dashboard" element={<Navigate to="/client" replace />} />
                <Route path="/client/analytics" element={<ClientAnalytics />} />
                <Route path="/client/inventory" element={<ClientInventory />} />
                <Route path="/client/predictions" element={<ClientPredictions />} />
                <Route path="/client/orders" element={<ClientOrders />} />
                <Route path="/client/rma" element={<ClientRMA />} />
                <Route path="/client/reports" element={<ClientReports />} />
                <Route path="/client/assistant" element={<ClientAssistant />} />
              </Route>

              {/* Protected Supplier Routes */}
              <Route element={<ProtectedLayout requiredRole="supplier" />}>
                <Route path="/supplier" element={<SupplierCommandCenter />} />
                <Route path="/supplier/dashboard" element={<Navigate to="/supplier" replace />} />
                <Route path="/supplier/demand" element={<SupplierGlobalDemand />} />
                <Route path="/supplier/clients" element={<SupplierClients />} />
                <Route path="/supplier/orders" element={<SupplierOrders />} />
                <Route path="/supplier/rma" element={<SupplierRMA />} />
                <Route path="/supplier/model-studio" element={<SupplierModelStudio />} />
                <Route path="/supplier/extensions" element={<SupplierExtensions />} />
                <Route path="/supplier/reports" element={<SupplierReports />} />
                <Route path="/supplier/assistant" element={<SupplierAssistant />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
