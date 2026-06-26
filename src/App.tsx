import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SupabaseAuthProvider, useAuth } from './context/SupabaseAuthContext';
import DashboardLayout from './components/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import DashboardFormsPage from './pages/DashboardForms';
import DashboardWooCommercePage from './pages/DashboardWooCommerce';
import DashboardMarketplace from './pages/DashboardMarketplace';
import DashboardBilling from './pages/DashboardBilling';
import DashboardSettings from './pages/DashboardSettings';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Premium loading screen while verifying JWT/LocalStorage context session
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          <span className="text-sm font-bold tracking-tight text-foreground">PluginFoundry Core</span>
        </div>
        <p className="text-xs text-muted-foreground">Synchronizing platform database sessions...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <SupabaseAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Unauthenticated Login Portal */}
          <Route path="/login" element={<Login />} />

          {/* Secure Layout Wrap with Protected Routing */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/forms"
            element={
              <ProtectedRoute>
                <DashboardFormsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/woocommerce"
            element={
              <ProtectedRoute>
                <DashboardWooCommercePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/marketplace"
            element={
              <ProtectedRoute>
                <DashboardMarketplace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/billing"
            element={
              <ProtectedRoute>
                <DashboardBilling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <DashboardSettings />
              </ProtectedRoute>
            }
          />

          {/* Root Fallbacks */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </SupabaseAuthProvider>
  );
}
