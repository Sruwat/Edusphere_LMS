import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginScreen } from './components/login-screen';
import { OptimizedLMSDashboard } from './components/optimized-lms-dashboard';

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
            <Navigate to="/login" replace />
          )
        } 
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <AppRoutes />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
