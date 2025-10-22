// @ts-nocheck
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { http } from '../../lib/http';

type User = { id: string; email: string } | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/me');
      if (res.status === 401) {
        setUser(null);
        return;
      }
      if (!res.ok) throw new Error(`me failed (${res.status})`);
      const data = await res.json();
      setUser(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to check session');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await http('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    // Clear user state
    setUser(null);
    // Clear any storage (in case anything was stored)
    sessionStorage.clear();
    localStorage.removeItem('pms-tasks');
    // Redirect to login
    window.location.href = '/login';
  };

  const value = useMemo(
    () => ({ user, loading, error, refresh: fetchMe, logout }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
