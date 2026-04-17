import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthFailureHandler } from '../services/api';
import { toast } from 'sonner';

const AuthContext = createContext(null);

function isStorageBlockedError(error) {
  if (!error) return false;
  const message = String(error.message || error);
  return message.includes('Access is denied') || message.includes('storage') || message.includes('Storage');
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = (typeof localStorage !== 'undefined') ? localStorage.getItem('user') : null;
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      if (!isStorageBlockedError(e)) console.warn('localStorage.getItem failed during AuthContext init', e);
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we have an access token but no user, try to fetch /auth/me
    let access = null;
    try { access = localStorage.getItem('access'); } catch (e) { if (!isStorageBlockedError(e)) console.warn('localStorage.getItem failed in AuthContext', e); access = null; }
    if (access && !user) {
      setLoading(true);
      api.me()
        .then((u) => {
          if (u) {
            try { localStorage.setItem('user', JSON.stringify(u)); } catch (e) { if (!isStorageBlockedError(e)) console.warn('localStorage.setItem failed in AuthContext', e); }
            setUser(u);
          }
        })
        .catch(() => {
          // token may be invalid; clear stored auth
          api.logout();
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
    // register centralized auth failure handler
    const navigate = (typeof window !== 'undefined' && window.__NAVIGATE_FN__) ? window.__NAVIGATE_FN__ : null;
    setAuthFailureHandler(() => {
      toast.error('Session expired — please sign in again');
      api.logout();
      setUser(null);
      try {
        // prefer react-router navigation when available
        if (navigate) {
          navigate('/login');
        } else {
          // fallback to window.location as last resort
          window.location.href = '/login';
        }
      } catch (e) { /* ignore */ }
    });
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.login(email, password);
      // api.login stores tokens and user in localStorage
      if (data && data.user) setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const register = async ({ name, email, password, role = 'student' }) => {
    setLoading(true);
    try {
      const data = await api.register({ name, email, password, role });
      if (data && data.user) setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
