import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginScreen } from './components/login-screen';
import { LandingHome } from './components/landing-home';
import { OptimizedLMSDashboard } from './components/optimized-lms-dashboard';
import { getBackendStatus, subscribeBackendStatus } from './services/api';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // expose navigate to auth context so auth-failure can push to history
    try { window.__NAVIGATE_FN__ = (url) => navigate(url); } catch (e) { /* ignore */ }
    return () => { try { delete window.__NAVIGATE_FN__; } catch (e) {} };
  }, [navigate]);
  
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      
      <Route 
        path="/:role/:username/*" 
        element={
          <ProtectedRoute>
            <OptimizedLMSDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/" 
        element={
          user ? (
            // use canonical `username` from the API (falls back to 'user' if missing)
            <Navigate to={`/${user.role}/${(user.username || 'user').toLowerCase().replace(/\s+/g, '_')}/dashboard`} replace />
          ) : (
            <LandingHome />
          )
        } 
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [backendStatus, setBackendStatus] = useState(getBackendStatus());

  useEffect(() => subscribeBackendStatus(setBackendStatus), []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          {backendStatus.unavailable && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Backend unavailable right now. Some live features may not load until the server recovers.
            </div>
          )}
          <AppRoutes />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
