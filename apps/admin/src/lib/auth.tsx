'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from './api';

export type UserRole = 'owner' | 'admin' | 'manager' | 'viewer';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  businessId: string;
  businessName: string;
  createdAt: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_USER: AdminUser = {
  id: 'usr_admin_001',
  email: 'sarah@grandplazahotel.com',
  displayName: 'Sarah Mitchell',
  avatarUrl: undefined,
  role: 'owner',
  businessId: 'biz_001',
  businessName: 'Grand Plaza Hotel Group',
  createdAt: '2024-06-15T10:00:00Z',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('atlas_admin_token');
    if (token) {
      api
        .get<AdminUser>('identity', '/auth/me')
        .then(setUser)
        .catch(() => {
          // Fall back to mock user for development
          setUser(MOCK_USER);
        })
        .finally(() => setLoading(false));
    } else {
      // For development, auto-login with mock user
      setUser(MOCK_USER);
      localStorage.setItem('atlas_admin_token', 'dev_token');
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ token: string; user: AdminUser }>('identity', '/auth/login', {
        email,
        password,
      });
      localStorage.setItem('atlas_admin_token', res.token);
      setUser(res.user);
    } catch {
      // In development, use mock user
      localStorage.setItem('atlas_admin_token', 'dev_token');
      setUser(MOCK_USER);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('atlas_admin_token');
    setUser(null);
  }, []);

  const isRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
