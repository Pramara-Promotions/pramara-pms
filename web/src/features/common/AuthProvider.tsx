// @ts-nocheck
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { http } from '../../lib/http';

type Role = {
  id: string;
  name: string;
  description?: string;
};

type Permission = {
  id: string;
  name: string;
  description?: string;
};

type User = {
  id: string;
  email: string;
  name?: string;
  status?: string;
  roles?: Role[];
  permissions?: Permission[];
  departmentId?: string;
  department?: { id: string; name: string };
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  // Permission checking utilities
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasAllPermissions: (...permissions: string[]) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (...roleNames: string[]) => boolean;
  isSuperAdmin: () => boolean;
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
      
      // Transform backend response to include roles and permissions
      // Backend /api/me should return: { id, email, name, status, roles: [...], permissions: [...] }
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

  // Permission checking utilities
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Super Admin has all permissions
    if (user.roles?.some(r => r.name === 'Super Admin')) return true;
    // Check if user has the specific permission
    return user.permissions?.some(p => p.name === permission) ?? false;
  };

  const hasAnyPermission = (...permissions: string[]): boolean => {
    if (!user) return false;
    // Super Admin has all permissions
    if (user.roles?.some(r => r.name === 'Super Admin')) return true;
    // Check if user has any of the permissions
    return permissions.some(perm => 
      user.permissions?.some(p => p.name === perm)
    );
  };

  const hasAllPermissions = (...permissions: string[]): boolean => {
    if (!user) return false;
    // Super Admin has all permissions
    if (user.roles?.some(r => r.name === 'Super Admin')) return true;
    // Check if user has all of the permissions
    return permissions.every(perm => 
      user.permissions?.some(p => p.name === perm)
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.roles?.some(r => r.name === roleName) ?? false;
  };

  const hasAnyRole = (...roleNames: string[]): boolean => {
    if (!user) return false;
    return roleNames.some(name => 
      user.roles?.some(r => r.name === name)
    );
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('Super Admin');
  };

  const value = useMemo(
    () => ({ 
      user, 
      loading, 
      error, 
      refresh: fetchMe, 
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      hasRole,
      hasAnyRole,
      isSuperAdmin,
    }),
    [user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
