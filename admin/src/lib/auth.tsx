'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, setToken, getToken } from './api';
import type { AdminUser } from './types';

interface AuthState {
  user: AdminUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const router = useRouter();

  const load = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setStatus('anonymous');
      return;
    }
    try {
      const data = await api<{ user: AdminUser }>('/auth/me');
      if (data.user.role !== 'admin') {
        setToken(null);
        setUser(null);
        setStatus('anonymous');
        return;
      }
      setUser(data.user);
      setStatus('authenticated');
    } catch {
      setToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const login = useCallback(
    async (phone: string, password: string) => {
      const data = await api<{ user: AdminUser; token: string }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: { phone: phone.trim(), password },
      });
      if (data.user.role !== 'admin') {
        throw new ApiError(403, 'ADMIN_ONLY', 'This account does not have admin access');
      }
      setToken(data.token);
      setUser(data.user);
      setStatus('authenticated');
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('anonymous');
    router.replace('/login');
  }, [router]);

  const value = useMemo<AuthState>(
    () => ({ user, status, login, logout, refresh: load }),
    [user, status, login, logout, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
