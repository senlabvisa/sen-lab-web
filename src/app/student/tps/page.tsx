'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Atom,
  BookOpen,
  ChevronRight,
  Clock,
  Microscope,
  Search,
  Sigma,
  Sparkles,
  Target,
} from 'lucide-react';
import type { AssignmentDto, AttemptDto, SimulationDto } from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBadge } from '@/components/lab/lab-badge';
import { PanelCard, SectionHeader } from '@/components/lab/section';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { ParticleField } from '@/components/lab/motion/particle-field';
import { StaggerGrid, StaggerItem } from '@/components/lab/motion/stagger-grid';
import { PageTransition } from '@/components/lab/motion/page-transition';
import { fadeInUp, staggerContainer, EASE, tabContent } from '@/lib/motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

// ============================================================
// Catégorisation pédagogique : 3 grandes matières STEM × 7 niveaux
// ============================================================

type SubjectKey = 'maths' | 'physique-chimie' | 'svt';

const SUBJECTS: Array<{
  id: SubjectKey;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  icon: typeof Atom;
  // Critère de match avec le champ subject de SimulationDto
  match: (subject: string | null | undefined) => boolean;
}> = [
  {
    id: 'maths',
    label: 'Mathématiques',
    shortLabel: 'Maths',
    emoji: '∑',
    description: 'Géométrie, algèbre, fonctions, statistiques.',
    icon: Sigma,
    match: (s) => !!s && s.toLowerCase().includes('math'),
  },
  {
    id: 'physique-chimie',
    label: 'Sciences physiques',
    shortLabel: 'Physique-Chimie',
    emoji: '⚛︎',
    description: 'Électricité, mécanique, chimie, ondes, énergie.',
    icon: Atom,
    match: (s) => !!s && (s.toLowerCase().includes('physique') || s.toLowerCase().includes('chimie')),
  },
  {
    id: 'svt',
    label: 'SVT',
    shortLabel: 'SVT',
    emoji: '🌱',
    description: 'Biologie, géologie, écologie, anatomie.',
    icon: Microscope,
    match: (s) => !!s && s.toLowerCase().includes('svt'),
  },
];

const GRADES = [
  { id: 'all', label: 'Tous niveaux', short: 'Tous' },
  { id: '6eme', label: '6ème', short: '6e', cycle: 'Collège' },
  { id: '5eme', label: '5ème', short: '5e', cycle: 'Collège' },
  { id: '4eme', label: '4ème', short: '4e', cycle: 'Collège' },
  { id: '3eme', label: '3ème', short: '3e', cycle: 'Collège' },
  { id: 'seconde', label: 'Seconde', short: '2nde', cycle: 'Lycée' },
  { id: 'premiere', label: 'Première', short: '1ère', cycle: 'Lycée' },
  { id: 'terminale', label: 'Terminale', short: 'Tle', cycle: 'Lycée' },
] as const;

type GradeKey = (typeof GRADES)[number]['id'];

function matchGrade(simGrade: string | null | undefined, gradeKey: GradeKey): boolean {
  if (gradeKey === 'all') return true;
  if (!simGrade) return false;
  const norm = simGrade
    .toLowerCase()
    .replace(/è/g, 'e')
    .replace(/[éê]/g, 'e')
    .replace(/[^a-z0-9]/g, '');
  // ex: "3eme" matches "3eme", "3e", "3ème", "troisième" (best effort)
  return (
    norm.includes(gradeKey) ||
    (gradeKey === '6eme' && (norm.startsWith('6') || norm.includes('sixieme'))) ||
    (gradeKey === '5eme' && (norm.startsWith('5') || norm.includes('cinquieme'))) ||
    (gradeKey === '4eme' && (norm.startsWith('4') || norm.includes('quatrieme'))) ||
    (gradeKey === '3eme' && (norm.startsWith('3') || norm.includes('troisieme'))) ||
    (gradeKey === 'seconde' && (norm.includes('2nde') || norm.includes('seconde'))) ||
    (gradeKey === 'premiere' && (norm.includes('1ere') || norm.includes('premiere'))) ||
    (gradeKey === 'terminale' && (norm.includes('terminale') || norm.includes('terminal') || norm === 'tle'))
  );
}

// ============================================================
// Page
// ============================================================

export default function StudentTpsPage() {
  return (
    <LabShell allowedRoles={['student', 'admin', 'teacher', 'sysadmin']}>
      <StudentTpsContent />
    </LabShell>
  );
}

function StudentTpsContent() {
  const { token, user } = useAuth();
  const [activeSubject, setActiveSubject] = useState<SubjectKey>('physique-chimie');
  const [activeGrade, setActiveGrade] = useState<GradeKey>('all');
  const [search, setSearch] = useState('');
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

  const assignedSimIds = useMemo(
    () => new Set(assignments?.map((a) => a.simulationId) ?? []),
    [assignments],
  );

  // Compteurs pour les badges sur les onglets matière
  const countsBySubject = useMemo(() => {
    const counts = { maths: 0, 'physique-chimie': 0, svt: 0 } as Record<SubjectKey, number>;
    if (!simulations) return counts;
    for (const sim of simulations) {
      for (const sub of SUBJECTS) {
        if (sub.match(sim.subject)) counts[sub.id]++;
      }
    }
    return counts;
  }, [simulations]);

  // TPs filtrés par matière, niveau, recherche
  const filteredSimulations = useMemo(() => {
    if (!simulations) return null;
    const subject = SUBJECTS.find((s) => s.id === activeSubject);
    if (!subject) return [];
    return simulations
      .filter((s) => subject.match(s.subject))
      .filter((s) => matchGrade(s.targetGrade, activeGrade))
      .filter((s) => !search || s.title.toLowerCase().includes(search.toLowerCase()));
  }, [simulations, activeSubject, activeGrade, search]);

  // Regroupement par niveau (utile en mode "Tous niveaux")
  const groupedByGrade = useMemo(() => {
    if (!filteredSimulations || activeGrade !== 'all') return null;
    const groups: Record<string, SimulationDto[]> = {};
    for (const sim of filteredSimulations) {
      // Trouve le grade qui matche, sinon "Autre"
      const matched = GRADES.find((g) => g.id !== 'all' && matchGrade(sim.targetGrade, g.id));
      const key = matched?.id ?? 'autre';
      groups[key] = groups[key] ?? [];
      groups[key].push(sim);
    }
    return groups;
  }, [filteredSimulations, activeGrade]);

  return (
    <PageTransition className="space-y-5">
      <LabBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/dashboard' as Route },
          { label: 'Mes laboratoires' },
        ]}
      />

      {/* Hero avec particules */}
      <PanelCard padding="lg" className="relative overflow-hidden bg-lab-mesh">
        <ParticleField count={12} variant="lab" />
        <div className="relative z-10">
          <h1 className="font-display text-3xl font-bold text-night-900 md:text-4xl">
            Mes laboratoires virtuels
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-night-600">
            Choisis une matière puis un niveau pour explorer le catalogue de TP. Les TP assignés par
            ton enseignant·e apparaissent avec un badge violet.
          </p>
        </div>
      </PanelCard>

      {error ? (
        <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {/* Onglets MATIÈRE — 3 grandes cards animées */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-3"
      >
        {SUBJECTS.map((sub) => {
          const isActive = activeSubject === sub.id;
          const Icon = sub.icon;
          const count = countsBySubject[sub.id];
          return (
            <motion.button
              key={sub.id}
              variants={fadeInUp}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={EASE.snappy}
              onClick={() => {
                setActiveSubject(sub.id);
                setActiveGrade('all');
              }}
              className={cn(
                'relative overflow-hidden rounded-3xl p-5 text-left ring-1 transition',
                isActive
                  ? 'bg-night-900 text-white ring-night-800 shadow-lab-glow'
                  : 'bg-white text-night-900 ring-night-100 hover:ring-lab-200',
              )}
            >
              {isActive ? <ParticleField count={6} variant="dark" /> : null}
              <div className="relative z-10 flex items-start justify-between">
                <span
                  className={cn(
                    'grid h-12 w-12 place-items-center rounded-2xl text-2xl',
                    isActive ? 'bg-white/15 text-white' : 'bg-lab-100 text-lab-700',
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span
                  className={cn(
                    'inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[11px] font-bold',
                    isActive ? 'bg-white text-night-900' : 'bg-lab-100 text-lab-700',
                  )}
                >
                  {count}
                </span>
              </div>
              <div className="relative z-10 mt-3">
                <div className={cn('font-display text-lg font-semibold', isActive ? 'text-white' : 'text-night-900')}>
                  {sub.label}
                </div>
                <div className={cn('mt-1 text-xs', isActive ? 'text-white/70' : 'text-night-500')}>
                  {sub.description}
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Filtres NIVEAU + recherche */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-night-400">Niveau :</span>
          {GRADES.map((g) => {
            const isActive = activeGrade === g.id;
            return (
              <motion.button
                key={g.id}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveGrade(g.id)}
                className={cn(
                  'relative inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition',
                  isActive
                    ? 'text-white'
                    : 'bg-white text-night-600 ring-1 ring-night-100 hover:bg-night-50',
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId="active-grade-bg"
                    className="absolute inset-0 -z-0 rounded-full bg-night-900"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                ) : null}
                <span className="relative z-10">{g.short}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="relative ml-auto min-w-[220px] flex-1 sm:flex-initial">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-300" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un TP…"
            className="h-10 w-full rounded-xl bg-white pl-10 pr-4 text-sm shadow-lab-soft ring-1 ring-night-100 placeholder:text-night-400 focus:ring-2 focus:ring-lab-300 focus:outline-none"
          />
        </div>
      </div>

      {/* Liste des TPs (animée par changement matière/niveau) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeSubject}-${activeGrade}-${search}`}
          variants={tabContent}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="space-y-5"
        >
          {filteredSimulations === null ? (
            <SkeletonGrid />
          ) : filteredSimulations.length === 0 ? (
            <EmptyState subjectLabel={SUBJECTS.find((s) => s.id === activeSubject)!.label} />
          ) : groupedByGrade ? (
            // Mode "Tous niveaux" : sections par niveau
            GRADES.filter((g) => g.id !== 'all' && (groupedByGrade[g.id]?.length ?? 0) > 0).map((g) => {
              const sims = groupedByGrade[g.id] ?? [];
              return (
                <section key={g.id}>
                  <SectionHeader
                    title={
                      <span className="flex items-baseline gap-2">
                        <span>{g.label}</span>
                        {'cycle' in g ? (
                          <span className="text-xs font-normal text-night-400">{g.cycle}</span>
                        ) : null}
                        <span className="rounded-full bg-lab-100 px-2 py-0.5 text-[11px] font-semibold text-lab-700">
                          {sims.length}
                        </span>
                      </span>
                    }
                  />
                  <StaggerGrid className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sims.map((sim, i) => (
                      <StaggerItem key={sim.id}>
                        <TpCard
                          sim={sim}
                          highlighted={i === 0 && g.id === '3eme'}
                          assigned={assignedSimIds.has(sim.id)}
                          lastAttempt={lastAttemptBySim.get(sim.id)}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerGrid>
                </section>
              );
            })
          ) : (
            // Niveau spécifique : grille simple
            <StaggerGrid className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSimulations.map((sim, i) => (
                <StaggerItem key={sim.id}>
                  <TpCard
                    sim={sim}
                    highlighted={i === 0 || i === 4}
                    assigned={assignedSimIds.has(sim.id)}
                    lastAttempt={lastAttemptBySim.get(sim.id)}
                  />
                </StaggerItem>
              ))}
            </StaggerGrid>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tentatives récentes */}
      {recent.length > 0 ? (
        <section>
          <SectionHeader title="Mes tentatives récentes" />
          <div className="mt-3 space-y-2">
            {recent.slice(0, 4).map((a) => {
              const sim = simulations?.find((s) => s.id === a.simulationId);
              return <AttemptRow key={a.id} attempt={a} sim={sim} />;
            })}
          </div>
        </section>
      ) : null}
    </PageTransition>
  );
}

// ============================================================
// Sous-composants
// ============================================================

function TpCard({
  sim,
  highlighted,
  assigned,
  lastAttempt,
}: {
  sim: SimulationDto;
  highlighted?: boolean;
  assigned?: boolean;
  lastAttempt?: AttemptDto;
}) {
  const dark = highlighted;
  const tone = subjectTone(sim.subject);

  const status = lastAttempt
    ? lastAttempt.status === 'completed'
      ? lastAttempt.publishedAt
        ? { label: 'Note publiée', tone: 'top' as const }
        : { label: 'Terminé', tone: 'top' as const }
      : { label: 'En cours', tone: 'new' as const }
    : null;

  return (
    <Link href={`/tp/${sim.slug}` as Route} className="block">
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={EASE.snappy}
        className={cn(
          'group flex h-full flex-col gap-3 rounded-3xl p-4 ring-1 transition-shadow',
          dark
            ? 'bg-night-900 text-white ring-night-800 hover:ring-lab-500'
            : 'bg-white text-night-900 ring-night-100 hover:shadow-lab-card hover:ring-lab-200',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <LabBadge tone={tone}>{sim.subject ?? 'STEM'}</LabBadge>
            <LabBadge tone="virtual">{sim.targetGrade ?? '—'}</LabBadge>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {assigned ? <LabBadge tone="certified">Mes cours</LabBadge> : null}
            {status ? <LabBadge tone={status.tone}>{status.label}</LabBadge> : null}
          </div>
        </div>

        <h3
          className={cn(
            'font-display text-base font-semibold leading-snug line-clamp-2',
            dark ? 'text-white' : 'text-night-900',
          )}
        >
          {sim.title}
        </h3>

        <div className={cn('flex-1 text-xs', dark ? 'text-white/70' : 'text-night-500')}>
          <span className="font-mono text-[11px]">/{sim.slug}</span>
        </div>

        <div
          className={cn(
            'mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs',
            dark ? 'border-white/10' : 'border-night-100',
          )}
        >
          {assigned ? (
            <span className={cn('inline-flex items-center gap-1', dark ? 'text-amber-200' : 'text-amber-700')}>
              <Clock className="h-3 w-3" />
              Assigné
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
      </motion.div>
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

function EmptyState({ subjectLabel }: { subjectLabel: string }) {
  return (
    <PanelCard padding="lg" className="text-center">
      <BookOpen className="mx-auto h-10 w-10 text-night-300" />
      <p className="mt-3 text-sm text-night-500">
        Aucun TP en <strong>{subjectLabel}</strong> pour ce niveau.
      </p>
      <p className="mt-1 text-xs text-night-400">
        Essaie un autre niveau ou explore les autres matières.
      </p>
    </PanelCard>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-3xl bg-night-100" />
      ))}
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
