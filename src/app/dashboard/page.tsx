'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock,
  GraduationCap,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import type {
  AssignmentDto,
  AttemptDto,
  SimulationDto,
} from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { StatTile } from '@/components/lab/stat-tile';
import { MiniCalendar, type CalendarMarker } from '@/components/lab/mini-calendar';
import { ProductivityChart } from '@/components/lab/productivity-chart';
import { SectionHeader, PanelCard } from '@/components/lab/section';
import { LabBadge } from '@/components/lab/lab-badge';
import { ParticleField } from '@/components/lab/motion/particle-field';
import { StaggerGrid, StaggerItem } from '@/components/lab/motion/stagger-grid';
import { CounterUp } from '@/components/lab/motion/counter-up';
import { PageTransition } from '@/components/lab/motion/page-transition';
import { fadeInUp, EASE } from '@/lib/motion';
import { api, type Badge as BadgeKind, type UserStatsDto } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

const BADGE_LABELS: Record<BadgeKind, { label: string; desc: string; emoji: string }> = {
  'premier-pas': { label: 'Premier pas', desc: '1 TP terminé', emoji: '👣' },
  trio: { label: 'Trio', desc: '3 TPs terminés', emoji: '🎯' },
  excellence: { label: 'Excellence', desc: 'Score ≥ 90', emoji: '⭐' },
  polyvalent: { label: 'Polyvalent', desc: '2 matières', emoji: '🌈' },
  perseverant: { label: 'Persévérant', desc: '5+ tentatives', emoji: '💪' },
};

const FAKE_PRODUCTIVITY = [
  { day: 'Lun', mentoring: 12, selfImprove: 18, student: 35 },
  { day: 'Mar', mentoring: 15, selfImprove: 32, student: 78 },
  { day: 'Mer', mentoring: 20, selfImprove: 28, student: 52 },
  { day: 'Jeu', mentoring: 14, selfImprove: 30, student: 60 },
  { day: 'Ven', mentoring: 18, selfImprove: 22, student: 50 },
  { day: 'Sam', mentoring: 10, selfImprove: 15, student: 30 },
  { day: 'Dim', mentoring: 22, selfImprove: 35, student: 80 },
];

export default function DashboardPage() {
  return (
    <LabShell>
      <DashboardContent />
    </LabShell>
  );
}

function DashboardContent() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<UserStatsDto | null>(null);
  const [simulations, setSimulations] = useState<SimulationDto[] | null>(null);
  const [assignments, setAssignments] = useState<AssignmentDto[] | null>(null);
  const [recent, setRecent] = useState<AttemptDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10));

  useEffect(() => {
    if (!token || !user) return;
    const isStudent = user.role === 'student';

    Promise.all([
      api.analytics.me(token).catch(() => null),
      api.simulations.list(token).catch(() => [] as SimulationDto[]),
      api.attempts.mine(token).catch(() => [] as AttemptDto[]),
      isStudent
        ? api.classes.myAssignments(token).catch(() => [] as AssignmentDto[])
        : Promise.resolve([] as AssignmentDto[]),
    ])
      .then(([s, sims, atts, asg]) => {
        setStats(s);
        setSimulations(sims);
        setRecent(atts.slice(0, 8));
        setAssignments(asg);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, [token, user]);

  if (!user) return null;
  const isStudent = user.role === 'student';
  const isTeacherLike = user.role === 'teacher' || user.role === 'admin' || user.role === 'sysadmin';

  // Top TPs : si student et assignations dispo, on prend les assignés ; sinon catalogue
  const topSims = useMemo(() => {
    if (!simulations) return [];
    if (isStudent && assignments && assignments.length > 0) {
      const seen = new Set<string>();
      const list: SimulationDto[] = [];
      for (const a of assignments) {
        if (seen.has(a.simulationId)) continue;
        const s = simulations.find((x) => x.id === a.simulationId);
        if (s) {
          seen.add(s.id);
          list.push(s);
        }
      }
      return list.slice(0, 6);
    }
    return simulations.slice(0, 6);
  }, [simulations, assignments, isStudent]);

  // Markers calendrier : prochaines tentatives + dueAt assignations
  const markers = useMemo<CalendarMarker[]>(() => {
    const list: CalendarMarker[] = [];
    if (assignments) {
      for (const a of assignments) {
        if (a.dueAt) {
          list.push({ date: a.dueAt.slice(0, 10), tone: 'peach' });
        }
      }
    }
    for (const a of recent) {
      list.push({ date: a.createdAt.slice(0, 10), tone: 'lab' });
    }
    return list;
  }, [assignments, recent]);

  return (
    <PageTransition className="grid gap-4 xl:grid-cols-[1fr_360px]">
      {/* Colonne principale */}
      <div className="space-y-6">
        {/* Hero d'accueil avec particules */}
        <PanelCard padding="lg" className="relative overflow-hidden bg-lab-mesh">
          <ParticleField count={14} variant="lab" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-lab-700 ring-1 ring-lab-100 backdrop-blur">
                <Sparkles className="h-3 w-3" />
                {isStudent ? 'Espace élève' : 'Espace pédagogique'}
              </span>
              <h1 className="mt-3 font-display text-3xl font-bold text-night-900 md:text-4xl">
                Bienvenue, {user.fullName.split(' ')[0]} !
              </h1>
              <p className="mt-2 max-w-xl text-sm text-night-600">
                {isStudent
                  ? 'Reprends un TP en cours ou explore le catalogue des laboratoires virtuels.'
                  : "Vue rapide sur l'activité de tes classes et les tentatives à corriger."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {isStudent ? (
                  <>
                    <CtaPrimary href={'/student/tps' as Route}>Voir mes TPs</CtaPrimary>
                    <CtaSecondary href={'/student/join' as Route}>Rejoindre une classe</CtaSecondary>
                  </>
                ) : (
                  <>
                    <CtaPrimary href={'/teacher/classes' as Route}>Mes classes</CtaPrimary>
                    <CtaSecondary href={'/teacher/attempts' as Route}>Tentatives à évaluer</CtaSecondary>
                  </>
                )}
              </div>
            </div>
          </div>
        </PanelCard>

        {error ? (
          <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        {/* Top TPs / labos — apparition en cascade */}
        <section>
          <SectionHeader
            title={isStudent ? 'Top TPs pour toi' : 'Catalogue de labos'}
            viewAllHref={isStudent ? ('/student/tps' as Route) : ('/teacher/classes' as Route)}
          />
          {simulations === null ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-3xl bg-night-100" />
              ))}
            </div>
          ) : topSims.length === 0 ? (
            <PanelCard className="mt-3 text-center" padding="lg">
              <BookOpen className="mx-auto h-10 w-10 text-night-300" />
              <p className="mt-2 text-sm text-night-500">Aucun TP au catalogue pour le moment.</p>
            </PanelCard>
          ) : (
            <StaggerGrid className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topSims.map((s, i) => (
                <StaggerItem key={s.id}>
                  <SimCard sim={s} highlighted={i === 0 || i === 4} />
                </StaggerItem>
              ))}
            </StaggerGrid>
          )}
        </section>

        {/* Tentatives récentes (élève) ou récap (prof) */}
        {isStudent && recent.length > 0 ? (
          <section>
            <SectionHeader
              title="Mes tentatives récentes"
              viewAllHref={'/student/tps' as Route}
            />
            <div className="mt-3 space-y-2">
              {recent.slice(0, 4).map((a) => {
                const sim = simulations?.find((s) => s.id === a.simulationId);
                return <AttemptRow key={a.id} attempt={a} sim={sim} />;
              })}
            </div>
          </section>
        ) : null}

        {/* Badges (élève) */}
        {isStudent && stats?.badges && stats.badges.length > 0 ? (
          <section>
            <SectionHeader title={`Mes badges (${stats.badges.length})`} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {stats.badges.map((b) => (
                <BadgeCard key={b} badge={b} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Colonne droite */}
      <div className="space-y-4">
        <DateHeader date={today} />

        <MiniCalendar
          initialDate={today}
          markers={markers}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />

        {/* Stats */}
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-night-900">
            Vue d&apos;ensemble
          </h2>
          {stats === null ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-night-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile
                label="XP"
                value={stats.xp}
                tone="lab"
                icon={<Sparkles className="h-4 w-4" />}
              />
              <StatTile
                label="TPs terminés"
                value={stats.completedCount}
                tone="emerald"
                icon={<Target className="h-4 w-4" />}
              />
              <StatTile
                label="Démarrés"
                value={stats.startedCount}
                tone="blue"
                icon={<BookOpen className="h-4 w-4" />}
              />
              <StatTile
                label="Score moyen"
                value={stats.averageScore !== null ? stats.averageScore : '—'}
                tone="amber"
                icon={<TrendingUp className="h-4 w-4" />}
              />
            </div>
          )}
        </section>

        {/* Productivité — placeholder visuel pour l'instant (pas exposé par l'API) */}
        <section>
          <SectionHeader title="Productivité" />
          <PanelCard className="mt-3" padding="none">
            <ProductivityChart data={FAKE_PRODUCTIVITY} />
          </PanelCard>
        </section>
      </div>
    </PageTransition>
  );
}

function CtaPrimary({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center gap-2 rounded-xl bg-lab-gradient px-5 text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function CtaSecondary({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-night-900 ring-1 ring-night-200 transition hover:bg-night-50"
    >
      {children}
    </Link>
  );
}

function SimCard({ sim, highlighted }: { sim: SimulationDto; highlighted?: boolean }) {
  const dark = highlighted;
  return (
    <Link href={`/tp/${sim.slug}` as Route} className="block">
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={EASE.snappy}
        className={cn(
          'group flex h-full flex-col gap-2 rounded-3xl p-4 ring-1 transition-shadow',
          dark
            ? 'bg-night-900 text-white ring-night-800 hover:ring-lab-500'
            : 'bg-white text-night-900 ring-night-100 hover:shadow-lab-card hover:ring-lab-200',
        )}
      >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <LabBadge tone={subjectTone(sim.subject)}>{sim.subject ?? 'STEM'}</LabBadge>
          <LabBadge tone="virtual">{sim.targetGrade ?? 'Tous niveaux'}</LabBadge>
        </div>
      </div>
      <h3 className={cn('font-display text-base font-semibold leading-snug', dark ? 'text-white' : 'text-night-900')}>
        {sim.title}
      </h3>
      <p className={cn('flex-1 text-xs', dark ? 'text-white/70' : 'text-night-500')}>
        {subjectTagline(sim.subject)}
      </p>
      <div className={cn('flex items-center justify-between border-t pt-3 text-xs', dark ? 'border-white/10 text-white/70' : 'border-night-100 text-night-500')}>
        <span className="font-mono text-[11px]">/{sim.slug}</span>
        <span className="inline-flex items-center gap-0.5 font-medium">
          Démarrer
          <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </span>
      </div>
      </motion.div>
    </Link>
  );
}

function subjectTone(subject?: string | null): 'maths' | 'physique' | 'svt' | 'info' | 'techno' | 'neutral' {
  if (!subject) return 'neutral';
  const s = subject.toLowerCase();
  if (s.includes('math')) return 'maths';
  if (s.includes('physique') || s.includes('chimie')) return 'physique';
  if (s.includes('svt')) return 'svt';
  if (s.includes('info')) return 'info';
  if (s.includes('techno')) return 'techno';
  return 'neutral';
}

function subjectTagline(subject?: string | null): string {
  const tone = subjectTone(subject);
  return {
    maths: 'Manipulations interactives — géométrie, fonctions, statistiques.',
    physique: 'Expériences guidées — électricité, chimie, mécanique.',
    svt: 'Observation et exploration — biologie, géologie, écologie.',
    info: 'Programmation et algorithmes appliqués.',
    techno: 'Conception et systèmes techniques.',
    neutral: 'TP interactif aligné sur le programme sénégalais.',
  }[tone];
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

function BadgeCard({ badge }: { badge: BadgeKind }) {
  const cfg = BADGE_LABELS[badge];
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-night-100">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lab-gradient text-xl text-white shadow-lab-glow">
        {cfg.emoji}
      </span>
      <div>
        <div className="text-sm font-semibold text-night-900">{cfg.label}</div>
        <div className="text-xs text-night-500">{cfg.desc}</div>
      </div>
    </div>
  );
}

function DateHeader({ date }: { date: Date }) {
  const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div>
      <div className="font-display text-2xl font-bold text-night-900">{capitalize(dayName)}</div>
      <div className="text-sm text-night-500">{capitalize(dateStr)}</div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
