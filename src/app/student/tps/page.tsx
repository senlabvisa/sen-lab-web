'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Clock,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';
import type { AssignmentDto, AttemptDto, SimulationDto } from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBadge, RatingPill } from '@/components/lab/lab-badge';
import { PanelCard, SectionHeader } from '@/components/lab/section';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

type Tab = 'mine' | 'free';

export default function StudentTpsPage() {
  return (
    <LabShell allowedRoles={['student', 'admin', 'teacher', 'sysadmin']}>
      <StudentTpsContent />
    </LabShell>
  );
}

function StudentTpsContent() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>('mine');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [simulations, setSimulations] = useState<SimulationDto[] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentDto[] | null>(null);
  const [recent, setRecent] = useState<AttemptDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [sims, attempts, mine] = await Promise.all([
        api.simulations.list(token),
        api.attempts.mine(token).catch(() => [] as AttemptDto[]),
        user?.role === 'student'
          ? api.classes.myAssignments(token).catch(() => [] as AssignmentDto[])
          : Promise.resolve([] as AssignmentDto[]),
      ]);
      setSimulations(sims);
      setRecent(attempts.slice(0, 8));
      setAssignments(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const simById = useMemo(() => new Map(simulations?.map((s) => [s.id, s]) ?? []), [simulations]);

  const assignedSims = useMemo(() => {
    if (!assignments || !simulations) return null;
    const seen = new Set<string>();
    const list: Array<{ assignment: AssignmentDto; sim: SimulationDto }> = [];
    for (const a of assignments) {
      if (seen.has(a.simulationId)) continue;
      const sim = simById.get(a.simulationId);
      if (!sim) continue;
      seen.add(a.simulationId);
      list.push({ assignment: a, sim });
    }
    return list;
  }, [assignments, simulations, simById]);

  const lastAttemptBySim = useMemo(() => {
    const map = new Map<string, AttemptDto>();
    for (const a of recent) {
      const existing = map.get(a.simulationId);
      if (!existing || new Date(a.createdAt) > new Date(existing.createdAt)) {
        map.set(a.simulationId, a);
      }
    }
    return map;
  }, [recent]);

  const filteredSimulations = useMemo(() => {
    if (!simulations) return null;
    return simulations.filter((s) => {
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (subjectFilter !== 'all' && subjectTone(s.subject) !== subjectFilter) return false;
      return true;
    });
  }, [simulations, search, subjectFilter]);

  const subjects = [
    { id: 'all', label: 'Toutes' },
    { id: 'maths', label: 'Maths' },
    { id: 'physique', label: 'Physique-Chimie' },
    { id: 'svt', label: 'SVT' },
  ];

  return (
    <div className="space-y-5">
      <LabBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/dashboard' as Route },
          { label: 'Mes TPs' },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-night-900">
            Mes laboratoires virtuels
          </h1>
          <p className="mt-1 text-sm text-night-500">
            Choisis un TP assigné par ton enseignant·e ou explore le catalogue libre.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-night-100">
          <Stat label="Assignés" value={assignedSims?.length ?? '—'} />
          <span className="h-6 w-px bg-night-200" />
          <Stat label="Catalogue" value={simulations?.length ?? '—'} />
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-2xl bg-night-50 p-1">
          <TabBtn active={tab === 'mine'} onClick={() => setTab('mine')}>
            <BookOpen className="h-4 w-4" />
            Mes cours
            {assignedSims ? <Counter value={assignedSims.length} active={tab === 'mine'} /> : null}
          </TabBtn>
          <TabBtn active={tab === 'free'} onClick={() => setTab('free')}>
            <Sparkles className="h-4 w-4" />
            Entraînement libre
            {simulations ? <Counter value={simulations.length} active={tab === 'free'} /> : null}
          </TabBtn>
        </div>

        <div className="relative ml-auto min-w-[260px] flex-1 sm:flex-initial">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-300" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un TP…"
            className="h-11 w-full rounded-xl bg-white pl-10 pr-4 text-sm shadow-lab-soft ring-1 ring-night-100 placeholder:text-night-400 focus:ring-2 focus:ring-lab-300 focus:outline-none"
          />
        </div>
      </div>

      {/* Filtres matières */}
      {tab === 'free' ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-night-400">Matière :</span>
          {subjects.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSubjectFilter(s.id)}
              className={cn(
                'inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition',
                subjectFilter === s.id
                  ? 'bg-night-900 text-white'
                  : 'bg-white text-night-600 ring-1 ring-night-100 hover:bg-night-50',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {/* Tab content */}
      {tab === 'mine' ? (
        assignedSims === null ? (
          <SkeletonGrid />
        ) : assignedSims.length === 0 ? (
          <PanelCard padding="lg" className="text-center">
            <BookOpen className="mx-auto h-10 w-10 text-night-300" />
            <p className="mt-3 text-sm text-night-500">
              Tu n&apos;es inscrit·e dans aucune classe pour le moment.
            </p>
            <Link
              href={'/student/join' as Route}
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl bg-lab-gradient px-4 text-sm font-semibold text-white shadow-lab-glow"
            >
              Rejoindre une classe
              <ChevronRight className="h-4 w-4" />
            </Link>
          </PanelCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assignedSims.map(({ assignment, sim }, i) => (
              <TpCard
                key={assignment.id}
                sim={sim}
                assignment={assignment}
                lastAttempt={lastAttemptBySim.get(sim.id)}
                highlighted={i === 0}
              />
            ))}
          </div>
        )
      ) : filteredSimulations === null ? (
        <SkeletonGrid />
      ) : filteredSimulations.length === 0 ? (
        <PanelCard padding="lg" className="text-center">
          <p className="text-sm text-night-500">
            Aucun TP ne correspond à ta recherche.
          </p>
        </PanelCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSimulations.map((sim, i) => (
            <TpCard
              key={sim.id}
              sim={sim}
              lastAttempt={lastAttemptBySim.get(sim.id)}
              highlighted={i === 0 || i === 4}
            />
          ))}
        </div>
      )}

      {/* Tentatives récentes */}
      {recent.length > 0 ? (
        <section>
          <SectionHeader title="Mes tentatives récentes" />
          <div className="mt-3 space-y-2">
            {recent.map((a) => {
              const sim = simById.get(a.simulationId);
              return <AttemptRow key={a.id} attempt={a} sim={sim} />;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="font-display text-lg font-bold text-night-900">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-night-400">{label}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-medium transition',
        active
          ? 'bg-white text-night-900 shadow-lab-soft'
          : 'text-night-500 hover:text-night-900',
      )}
    >
      {children}
    </button>
  );
}

function Counter({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-1.5 text-[10px] font-bold',
        active ? 'bg-lab-100 text-lab-700' : 'bg-night-100 text-night-600',
      )}
    >
      {value}
    </span>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-3xl bg-night-100" />
      ))}
    </div>
  );
}

function TpCard({
  sim,
  assignment,
  lastAttempt,
  highlighted,
}: {
  sim: SimulationDto;
  assignment?: AssignmentDto;
  lastAttempt?: AttemptDto;
  highlighted?: boolean;
}) {
  const tone = subjectTone(sim.subject);
  const dark = highlighted;

  const status = lastAttempt
    ? lastAttempt.status === 'completed'
      ? lastAttempt.publishedAt
        ? { label: 'Note publiée', tone: 'top' as const }
        : { label: 'Terminé', tone: 'top' as const }
      : { label: 'En cours', tone: 'new' as const }
    : { label: 'À faire', tone: 'neutral' as const };

  return (
    <Link
      href={`/tp/${sim.slug}` as Route}
      className={cn(
        'group flex flex-col gap-3 rounded-3xl p-4 ring-1 transition',
        dark
          ? 'bg-night-900 text-white ring-night-800 hover:ring-lab-500'
          : 'bg-white text-night-900 ring-night-100 hover:shadow-lab-card hover:ring-lab-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <LabBadge tone={tone}>{sim.subject ?? 'STEM'}</LabBadge>
          <LabBadge tone="virtual">{sim.targetGrade ?? 'Tous niveaux'}</LabBadge>
        </div>
        <LabBadge tone={status.tone}>{status.label}</LabBadge>
      </div>

      <h3
        className={cn(
          'font-display text-base font-semibold leading-snug line-clamp-2',
          dark ? 'text-white' : 'text-night-900',
        )}
      >
        {sim.title}
      </h3>

      <div className={cn('flex items-center gap-2 text-xs', dark ? 'text-white/70' : 'text-night-500')}>
        <span className="font-mono">/{sim.slug}</span>
      </div>

      {/* Footer */}
      <div
        className={cn(
          'mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs',
          dark ? 'border-white/10' : 'border-night-100',
        )}
      >
        {assignment?.dueAt ? (
          <span className={cn('inline-flex items-center gap-1', dark ? 'text-amber-200' : 'text-amber-700')}>
            <Clock className="h-3 w-3" />à rendre {new Date(assignment.dueAt).toLocaleDateString('fr-FR')}
          </span>
        ) : (
          <span className={cn(dark ? 'text-white/50' : 'text-night-400')}>Entraînement libre</span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-medium transition group-hover:gap-1',
            dark ? 'text-white' : 'text-lab-700',
          )}
        >
          Démarrer
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function AttemptRow({ attempt, sim }: { attempt: AttemptDto; sim?: SimulationDto }) {
  return (
    <Link
      href={`/tp/${sim?.slug ?? ''}` as Route}
      className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-night-100 transition hover:ring-lab-200"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lab-100 text-lab-700">
        <Target className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-night-900">
          {sim?.title ?? '(TP inconnu)'}
        </div>
        <div className="text-xs text-night-500">
          {new Date(attempt.createdAt).toLocaleDateString('fr-FR')} · {attempt.status}
          {attempt.publishedAt ? ' · note publiée' : ''}
        </div>
      </div>
      {attempt.score !== null ? (
        <span className="rounded-lg bg-mint px-2 py-1 font-mono text-xs font-bold text-mintInk">
          {attempt.score}/100
        </span>
      ) : (
        <span className="text-xs text-night-300">—</span>
      )}
    </Link>
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
  if (s.includes('info')) return 'info';
  if (s.includes('techno')) return 'techno';
  return 'neutral';
}
