'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { ArrowRight, CheckCircle2, GraduationCap, KeyRound } from 'lucide-react';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { PanelCard } from '@/components/lab/section';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function JoinClassPage() {
  return (
    <LabShell allowedRoles={['student']}>
      <JoinClassContent />
    </LabShell>
  );
}

function JoinClassContent() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ classId: string; className: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.classes.join(token, code.trim().toUpperCase());
      setSuccess(result);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <LabBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/dashboard' as Route },
          { label: 'Rejoindre une classe' },
        ]}
      />

      <PanelCard padding="lg" className="bg-lab-mesh">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lab-gradient text-white shadow-lab-glow">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-night-900">
              Rejoindre une classe
            </h1>
            <p className="text-sm text-night-600">
              Entre le code communiqué par ton enseignant·e.
            </p>
          </div>
        </div>
      </PanelCard>

      <PanelCard padding="lg">
        <h2 className="font-display text-lg font-semibold text-night-900">Code de la classe</h2>
        <p className="mt-1 mb-4 text-sm text-night-600">
          Ton identifiant{' '}
          <span className="rounded-md bg-night-50 px-1.5 py-0.5 font-mono text-xs text-night-900 ring-1 ring-night-100">
            {user?.identifier ?? ''}
          </span>{' '}
          doit figurer dans la liste autorisée par ton encadrant.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex : PHY3EM-XK42"
              className="h-12 w-full rounded-xl bg-white pl-10 pr-4 font-mono text-sm uppercase tracking-wider ring-1 ring-night-200 placeholder:text-night-300 focus:ring-2 focus:ring-lab-300 focus:outline-none"
              autoComplete="off"
              required
              minLength={4}
              maxLength={40}
            />
          </div>
          <button
            type="submit"
            disabled={busy || code.trim().length < 4}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lab-gradient text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95 disabled:opacity-50"
          >
            {busy ? 'Inscription…' : 'Rejoindre la classe'}
            {!busy ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </form>

        {error ? (
          <div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-2xl bg-mint/40 p-4 ring-1 ring-mintInk/20">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-mintInk" />
              <div className="flex-1">
                <p className="text-sm font-medium text-mintInk">
                  Inscrit·e à <strong>{success.className}</strong> !
                </p>
                <p className="mt-1 text-xs text-mintInk/80">
                  Tu peux désormais voir les TPs assignés par ton enseignant·e.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/student/tps')}
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-mintInk px-3 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  Voir mes TPs
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </PanelCard>
    </div>
  );
}
