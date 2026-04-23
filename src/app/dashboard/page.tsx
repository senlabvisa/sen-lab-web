'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserDto } from '@senlabvisa/shared-types';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      router.replace('/login');
      return;
    }
    api.me(token).then(setUser).catch((e) => setError(e.message));
  }, [router]);

  function logout() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    router.push('/login');
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg bg-alert/10 p-4 text-alert">{error}</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold text-science">Bienvenue {user?.fullName ?? '…'}</h1>
      <p className="text-ink/70">Rôle : {user?.role ?? '—'}</p>
      <Button variant="outline" onClick={logout}>Se déconnecter</Button>
    </main>
  );
}
