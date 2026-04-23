'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.login({ identifier, password });
      sessionStorage.setItem('accessToken', tokens.accessToken);
      sessionStorage.setItem('refreshToken', tokens.refreshToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-science">Connexion</h1>
        <p className="mt-1 text-sm text-ink/60">Entre ton identifiant d&apos;école et ton mot de passe.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="identifier" className="block text-sm font-medium text-ink">Identifiant</label>
            <Input
              id="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="lycee-limamou/moussa"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-ink">Mot de passe</label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <div role="alert" className="rounded-lg bg-alert/10 p-3 text-sm text-alert">
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </main>
  );
}
