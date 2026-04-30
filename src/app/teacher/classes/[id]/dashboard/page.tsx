'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Target, Users } from 'lucide-react';
import { LabShell } from '@/components/lab/lab-shell';
import { Badge, subjectTone } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { api, type ClassOverviewDto } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ClassDto } from '@senlabvisa/shared-types';

export default function ClassDashboardPage({ params }: { params: { id: string } }) {
  return (
    <LabShell allowedRoles={['teacher', 'admin']}>
      <ClassDashboardContent id={params.id} />
    </LabShell>
  );
}

function ClassDashboardContent({ id }: { id: string }) {
  const { token } = useAuth();
  const [cls, setCls] = useState<ClassDto | null>(null);
  const [overview, setOverview] = useState<ClassOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [c, o] = await Promise.all([
        api.classes.get(token, id),
        api.analytics.classOverview(token, id),
      ]);
      setCls(c);
      setOverview(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token, id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Stats agrégées
  const totalStarted =
    overview?.simulations.reduce((acc, r) => acc + r.startedCount, 0) ?? 0;
  const totalCompleted =
    overview?.simulations.reduce((acc, r) => acc + r.completedCount, 0) ?? 0;
  const overallCompletionPct =
    totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <Link
        href={`/teacher/classes/${id}` as Route}
        className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-science-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la classe
      </Link>

      {cls ? (
        <Card variant="hero" padding="lg">
          <div>
            <Badge tone="science" className="mb-3">
              <Target className="h-3 w-3" />
              Suivi pédagogique
            </Badge>
            <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
              Dashboard — {cls.name}
            </h1>
            <p className="mt-2 text-sm text-ink/70">
              Année {cls.academicYear} ·{' '}
              {overview?.rosterSize ?? 0} élève{(overview?.rosterSize ?? 0) > 1 ? 's' : ''}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <Skeleton className="h-10 w-2/3" />
        </Card>
      )}

      {error ? (
        <div role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {/* Stats agrégées */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          tone="science"
          icon={<Users className="h-5 w-5" />}
          label="Effectif"
          value={overview?.rosterSize ?? '—'}
          sub="Élèves inscrits"
        />
        <KpiCard
          tone="action"
          icon={<BookOpen className="h-5 w-5" />}
          label="TPs terminés"
          value={totalCompleted}
          sub={`Sur ${totalStarted} démarrés`}
        />
        <KpiCard
          tone="alert"
          icon={<Target className="h-5 w-5" />}
          label="Taux global"
          value={overview ? `${overallCompletionPct}` : '—'}
          unit="%"
          sub="Complétion moyenne"
        />
      </div>

      {/* Détails par TP */}
      <Card>
        <CardHeader>
          <CardTitle>Détails par TP</CardTitle>
        </CardHeader>

        {overview === null ? (
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} columns={6} />
              ))}
            </tbody>
          </table>
        ) : overview.simulations.length === 0 ? (
          <p className="py-4 text-center text-ink/60">Aucun TP dans le catalogue.</p>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-ink/5">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr className="text-left text-ink/60">
                  <th className="px-4 py-2 font-medium">TP</th>
                  <th className="px-4 py-2 font-medium">Matière</th>
                  <th className="px-4 py-2 font-medium">Démarrés</th>
                  <th className="px-4 py-2 font-medium">Terminés</th>
                  <th className="px-4 py-2 font-medium">Progression</th>
                  <th className="px-4 py-2 font-medium">Score moyen</th>
                </tr>
              </thead>
              <tbody>
                {overview.simulations.map((row) => {
                  const pct = Math.round(row.completionRate * 100);
                  const tone = subjectTone(row.subject);
                  const barClass =
                    pct >= 80
                      ? 'bg-action-700'
                      : pct >= 40
                        ? 'bg-science-700'
                        : 'bg-alert-500';
                  return (
                    <tr key={row.simulationId} className="border-t border-ink/5">
                      <td className="px-4 py-3 font-medium text-ink">
                        {row.simulationTitle}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={tone} size="sm">
                          {row.subject}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono">{row.startedCount}</td>
                      <td className="px-4 py-3 font-mono">{row.completedCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-ink/10">
                            <div
                              className={`h-full ${barClass} transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-ink">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {row.averageScore !== null ? (
                          <Badge tone="action" size="sm">
                            {row.averageScore}/100
                          </Badge>
                        ) : (
                          <span className="text-ink/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  unit,
  sub,
}: {
  tone: 'science' | 'action' | 'alert';
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: string;
}) {
  const styles = {
    science: { bg: 'bg-science-50', fg: 'text-science-700' },
    action: { bg: 'bg-action-50', fg: 'text-action-700' },
    alert: { bg: 'bg-alert-50', fg: 'text-alert-700' },
  }[tone];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink/60">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${styles.bg} ${styles.fg}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-3xl font-bold text-ink">{value}</span>
        {unit ? <span className="text-base font-medium text-ink/50">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-1 text-xs text-ink/50">{sub}</div> : null}
    </div>
  );
}
