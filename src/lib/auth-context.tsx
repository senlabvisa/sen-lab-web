'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserDto } from '@senlabvisa/shared-types';
import { api } from '@/lib/api';

type AuthState = {
  user: UserDto | null;
  token: string | null;
  loading: boolean;
  /** Ouvre une nouvelle session : persiste les tokens et recharge le profil. */
  signIn: (accessToken: string, refreshToken: string) => Promise<UserDto>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window === 'undefined' ? null : sessionStorage.getItem('accessToken');
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    api
      .me(stored)
      .then(setUser)
      .catch(() => {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(
    async (accessToken: string, refreshToken: string): Promise<UserDto> => {
      sessionStorage.setItem('accessToken', accessToken);
      sessionStorage.setItem('refreshToken', refreshToken);
      setToken(accessToken);
      setLoading(true);
      try {
        const me = await api.me(accessToken);
        setUser(me);
        return me;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, token, loading, signIn, logout }),
    [user, token, loading, signIn, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
