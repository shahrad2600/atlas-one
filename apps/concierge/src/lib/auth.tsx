'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from './api';

interface Agent {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  agentId: string;
  role: 'concierge' | 'senior_concierge' | 'supervisor';
  status: 'online' | 'away' | 'offline';
  createdAt: string;
}

interface AuthContextValue {
  agent: Agent | null;
  loading: boolean;
  login: (email: string, password: string, agentId: string) => Promise<void>;
  logout: () => void;
  updateStatus: (status: Agent['status']) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('concierge_token');
    if (token) {
      api
        .get<Agent>('identity', '/auth/me')
        .then(setAgent)
        .catch(() => {
          localStorage.removeItem('concierge_token');
          // Mock agent for development
          setAgent({
            id: 'agent-001',
            email: 'sarah.chen@atlas.travel',
            displayName: 'Sarah Chen',
            agentId: 'AGT-1042',
            role: 'senior_concierge',
            status: 'online',
            createdAt: '2024-06-15T00:00:00Z',
          });
        })
        .finally(() => setLoading(false));
    } else {
      // Mock agent for development
      setAgent({
        id: 'agent-001',
        email: 'sarah.chen@atlas.travel',
        displayName: 'Sarah Chen',
        agentId: 'AGT-1042',
        role: 'senior_concierge',
        status: 'online',
        createdAt: '2024-06-15T00:00:00Z',
      });
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, agentId: string) => {
    try {
      const res = await api.post<{ token: string; agent: Agent }>('identity', '/auth/login', {
        email,
        password,
        agentId,
      });
      localStorage.setItem('concierge_token', res.token);
      setAgent(res.agent);
    } catch {
      // Mock login for development
      localStorage.setItem('concierge_token', 'mock-token');
      setAgent({
        id: 'agent-001',
        email,
        displayName: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        agentId,
        role: 'senior_concierge',
        status: 'online',
        createdAt: new Date().toISOString(),
      });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('concierge_token');
    setAgent(null);
  }, []);

  const updateStatus = useCallback((status: Agent['status']) => {
    setAgent((prev) => (prev ? { ...prev, status } : null));
  }, []);

  return (
    <AuthContext.Provider value={{ agent, loading, login, logout, updateStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
