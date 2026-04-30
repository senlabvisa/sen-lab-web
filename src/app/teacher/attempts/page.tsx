'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ChevronRight, Filter, Target } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AttemptDto, SimulationDto, UserDto } from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBadge } from '@/components/lab/lab-badge';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { PanelCard } from '@/components/lab/section';
import { LabAvatar } from '@/components/lab/avatar';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type StatusFilter = '' | 'started' | 'completed' | 'failed';

export default function TeacherAttemptsPage() {
  return (
    <LabShell allowedRoles={['teacher', 'admin']}>
      <TeacherAttemptsContent />
    </LabShell>
  );
}

function TeacherAttemptsContent() {
  const { token } = useAuth();
  const [attempts, setAttempts] = useState<AttemptDto[] | null>(null);
  const [sims, setSims] = useState<SimulationDto[]>([]);
  const [students, setStudents] = useState<Map<string, UserDto>>(new Map());
  const [simFilter, setSimFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [attemptList, simList, studentList] = await Promise.all([
        api.attempts.list(token, {
          ...(simFilter ? { simulationId: simFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        }),
        api.simulations.list(token),
        api.users.list(token, { role: 'student' }).catch(() => [] as UserDto[]),
      ]);
      setAttempts(attemptList);
      setSims(simList);
      setStudents(new Map(studentList.map((s) => [s.id, s])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token, simFilter, statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const simsById = new Map(sims.map((s) => [s.id, s]));

  const stats = {
    total: attempts?.length ?? 0,
    completed: attempts?.filter((a) => a.status === 'completed').length ?? 0,
    pending: attempts?.filter((a) => a.status === 'completed' && !a.publishedAt).length ?? 0,
  };

  return (
    <div className="space-y-5">
      <LabBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/dashboard' as Route },
          { label: 'Tentatives' },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-night-900">
            Tentatives des élèves
          </h1>
          <p className="mt-1 text-sm text-night-500">
            Consulte les TPs en cours et publie les notes après évaluation.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-night-100">
          <Stat label="Total" value={stats.total} />
          <span className="h-6 w-px bg-night-200" />
          <Stat label="À publier" value={stats.pending} accent="amber" />
          <span className="h-6 w-px bg-night-200" />
          <Stat label="Terminées" value={stats.completed} accent="emerald" />
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <PanelCard padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-night-100 p-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-night-500">
            <Filter className="h-3.5 w-3.5" />
            Filtres
          </span>
          <select
            aria-label="Filtrer par TP"
            className="h-10 rounded-xl border border-night-200 bg-white px-3 text-sm transition focus:border-lab-500 focus:outline-none focus:ring-4 focus:ring-lab-100"
            value={simFilter}
            onChange={(e) => setSimFilter(e.target.value)}
          >
            <option value="">Tous les TPs</option>
            {sims.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrer par statut"
            className="h-10 rounded-xl border border-night-200 bg-white px-3 text-sm transition focus:border-lab-500 focus:outline-none focus:ring-4 focus:ring-lab-100"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="">Tous les statuts</option>
            <option value="started">En cours</option>
            <option value="completed">Terminé</option>
            <option value="failed">Échoué</option>
          </select>
        </div>

        {attempts !== null && attempts.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="mx-auto h-10 w-10 text-night-300" />
            <p className="mt-2 text-sm text-night-500">Aucune tentative enregistrée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-night-50 text-xs uppercase tracking-wider text-night-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Élève</th>
                  <th className="px-4 py-3 text-left font-medium">TP</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Score</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {attempts === null
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t border-night-100">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 w-3/4 animate-pulse rounded-full bg-night-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : null}
                {attempts?.map((a) => {
                  const student = students.get(a.studentId);
                  const sim = simsById.get(a.simulationId);
                  return (
                    <tr key={a.id} className="border-t border-night-100 transition hover:bg-lab-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <LabAvatar size="sm" name={student?.fullName ?? '?'} />
                          <div>
                            <div className="font-medium text-night-900">
                              {student?.fullName ?? '(élève inconnu)'}
                            </div>
                            <div className="font-mono text-[11px] text-night-400">
                              {student?.identifier ?? a.studentId.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-night-700">
                        <div>{sim?.title ?? '(TP inconnu)'}</div>
                        {sim ? (
                          <LabBadge tone={subjectTone(sim.subject)} className="mt-1">
                            {sim.subject}
                          </LabBadge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <LabBadge
                            tone={
                              a.status === 'completed'
                                ? 'top'
                                : a.status === 'started'
                                  ? 'new'
                                  : 'neutral'
                            }
                          >
                            {a.status}
                          </LabBadge>
                          {a.publishedAt ? (
                            <LabBadge tone="certified">publiée</LabBadge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {a.score !== null ? (
                          <span className="rounded-lg bg-mint px-2 py-1 text-xs font-bold text-mintInk">
                            {a.score}/100
                          </span>
                        ) : (
                          <span className="text-night-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-night-500">
                        {new Date(a.createdAt).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/teacher/attempts/${a.id}` as Route}
                          className="inline-flex h-9 items-center gap-1 rounded-lg bg-lab-100 px-3 text-xs font-semibold text-lab-700 transition hover:bg-lab-200"
                        >
                          Évaluer
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: 'amber' | 'emerald';
}) {
  const color = accent === 'amber' ? 'text-amber-600' : accent === 'emerald' ? 'text-emerald-600' : 'text-night-900';
  return (
    <div className="text-center">
      <div className={`font-display text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-night-400">{label}</div>
    </div>
  );
}

function subjectTone(
  subject?: string | null,
): 'maths' | 'physique' | 'svt' | 'info' | 'techno' | 'neutral' {
  if (!subject) return 'neutral';
  const s = subject.toLowerCase();
  if (s.includes('math')) return 'maths';
  if (s.includes('physique') || s.includes('chimie')) return 'physique';
  if (s.includes('svt')) return 'svt';
  return 'neutral';
}
