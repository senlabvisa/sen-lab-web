'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CloudOff,
  HelpCircle,
  Lightbulb,
  Menu,
  MessageSquare,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AssignmentDto, AttemptDto, SimulationDto } from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBadge } from '@/components/lab/lab-badge';
import { LabAvatar } from '@/components/lab/avatar';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { PanelCard } from '@/components/lab/section';
import { ParticleField } from '@/components/lab/motion/particle-field';
import { PulseDot } from '@/components/lab/motion/pulse-dot';
import { AnimatedTabs, AnimatedTabContent } from '@/components/lab/motion/animated-tabs';
import { MoleculeLoader } from '@/components/lab/motion/molecule-loader';
import { PageTransition } from '@/components/lab/motion/page-transition';
import { fadeInUp, staggerContainer, EASE } from '@/lib/motion';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import {
  completeAttemptOfflineFirst,
  startAttemptOfflineFirst,
} from '@/lib/sync-queue';
import { getModule } from '@/simulations/registry';

export default function TpPage({ params }: { params: { slug: string } }) {
  return (
    <LabShell allowedRoles={['student']}>
      <TpContent slug={params.slug} />
    </LabShell>
  );
}

type Phase = 'idle' | 'running' | 'completed' | 'error';

/** Les 5 étapes pédagogiques du Manuel de Scénarisation des TP. */
const STEPS = [
  { id: 'engagement', label: 'Amorce', emoji: '📖', icon: BookOpen, description: 'Comprendre le contexte et les objectifs.' },
  { id: 'hypothese', label: 'Hypothèse', emoji: '💡', icon: Lightbulb, description: 'Formuler une prédiction avant de manipuler.' },
  { id: 'manip', label: 'Manipulation', emoji: '🧪', icon: Beaker, description: 'Réaliser l\'expérience pas à pas.' },
  { id: 'mesures', label: 'Observation', emoji: '📊', icon: Target, description: 'Collecter et noter les mesures.' },
  { id: 'conclusion', label: 'Conclusion', emoji: '✅', icon: CheckCircle2, description: 'Valider l\'hypothèse, rédiger le rapport.' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

function TpContent({ slug }: { slug: string }) {
  const router = useRouter();
  const { token, user } = useAuth();
  const Module = getModule(slug);

  const [sim, setSim] = useState<SimulationDto | null>(null);
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [attempt, setAttempt] = useState<AttemptDto | null>(null);
  const [isLocalAttempt, setIsLocalAttempt] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>('engagement');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;
    api.simulations
      .getBySlug(token, slug)
      .then(setSim)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, [token, slug]);

  useEffect(() => {
    if (!token || !sim) return;
    api.classes
      .myAssignments(token)
      .then((all) => {
        const match = all.find((a) => a.simulationId === sim.id);
        setAssignment(match ?? null);
      })
      .catch(() => undefined);
  }, [token, sim]);

  useEffect(() => {
    if (phase !== 'running' || startedAtRef.current === null) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current!) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const start = useCallback(async () => {
    if (!token || !sim) return;
    setBusy(true);
    setError(null);
    try {
      const { attempt: a, local } = await startAttemptOfflineFirst(token, sim.id);
      setAttempt(a);
      setIsLocalAttempt(local);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhase('running');
      setActiveStep('engagement');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setPhase('error');
    } finally {
      setBusy(false);
    }
  }, [token, sim]);

  const completeWithScore = useCallback(
    async (dataJson: Record<string, unknown>, score: number) => {
      if (!token || !attempt) return;
      setBusy(true);
      setError(null);
      try {
        const { attempt: completed, local } = await completeAttemptOfflineFirst(
          token,
          attempt.id,
          isLocalAttempt,
          score,
          { ...dataJson, elapsedSeconds: elapsed },
        );
        setAttempt(completed);
        setIsLocalAttempt(local);
        setPhase('completed');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        setBusy(false);
      }
    },
    [token, attempt, isLocalAttempt, elapsed],
  );

  const validateFallback = useCallback(async () => {
    const penalty = Math.min(30, Math.floor(elapsed / 30));
    const score = Math.max(50, 100 - penalty);
    await completeWithScore({ shell: 'generic-mvp' }, score);
  }, [completeWithScore, elapsed]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const reset = () => {
    setAttempt(null);
    setIsLocalAttempt(false);
    setElapsed(0);
    startedAtRef.current = null;
    setPhase('idle');
    setActiveStep('engagement');
  };

  const isCourseMode = useMemo(() => assignment !== null, [assignment]);

  if (!user) return null;

  // ============================
  // PHASE 1 — Idle (avant démarrage)
  // ============================
  if (phase === 'idle') {
    return (
      <IdleView
        sim={sim}
        assignment={assignment}
        isCourseMode={isCourseMode}
        error={error}
        busy={busy}
        onStart={start}
      />
    );
  }

  // ============================
  // PHASE 3 — Completed
  // ============================
  if (phase === 'completed') {
    return (
      <CompletedView
        sim={sim}
        attempt={attempt}
        elapsed={elapsed}
        isLocalAttempt={isLocalAttempt}
        isCourseMode={isCourseMode}
        formatTime={formatTime}
        onReplay={reset}
        onBack={() => router.push('/student/tps' as Route)}
        user={user}
      />
    );
  }

  // ============================
  // PHASE 2 — Running (layout 3 colonnes skillzone, animé)
  // ============================
  const currentStepIdx = STEPS.findIndex((s) => s.id === activeStep);
  const tabsList = STEPS.map((s, i) => ({
    id: s.id,
    label: s.label,
    emoji: s.emoji,
    done: i < currentStepIdx,
  }));

  return (
    <PageTransition className="space-y-3">
      {/* Header noir skillzone — avec particules atomiques */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={EASE.smooth}
        className="relative flex flex-wrap items-center gap-3 overflow-hidden rounded-3xl bg-night-900 px-4 py-3 text-white"
      >
        <ParticleField count={14} variant="dark" />
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Plier/déplier la barre latérale"
          className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="relative z-10 min-w-0 flex-1">
          <div className="truncate font-display text-base font-semibold">
            {sim?.title ?? 'Chargement…'}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            <motion.span
              key={Math.floor(elapsed / 5)}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Auto-sauvegardé · {formatTime(elapsed)}
            </motion.span>
            {isLocalAttempt ? (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <CloudOff className="h-3 w-3" />
                Hors-ligne
              </span>
            ) : null}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          className="relative z-10 hidden h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:inline-flex"
          onClick={() => setActiveStep('engagement')}
        >
          Aperçu
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={validateFallback}
          disabled={busy}
          className="relative z-10 inline-flex h-9 items-center gap-1.5 rounded-lg bg-lab-500 px-4 text-xs font-semibold text-white shadow-lab-glow transition hover:bg-lab-600 disabled:opacity-50"
        >
          {busy ? 'Envoi…' : 'Valider le TP'}
        </motion.button>
      </motion.header>

      {/* Tabs étapes — animation slide layoutId */}
      <AnimatedTabs
        tabs={tabsList}
        active={activeStep}
        onChange={(id) => setActiveStep(id as StepId)}
      />

      {error ? (
        <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {/* Layout 3 colonnes — animé */}
      <motion.div
        layout
        transition={EASE.smooth}
        className={cn(
          'grid gap-3',
          sidebarOpen
            ? 'lg:grid-cols-[200px_1fr_320px]'
            : 'lg:grid-cols-[1fr_320px]',
        )}
      >
        {/* === Colonne gauche : Étapes === */}
        <AnimatePresence mode="wait">
          {sidebarOpen ? (
            <motion.aside
              key="left-aside"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={EASE.smooth}
              className="hidden lg:block"
            >
              <PanelCard padding="sm" className="sticky top-4">
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-night-400">
                Étapes
              </div>
              <ol className="space-y-1">
                {STEPS.map((step, i) => {
                  const isActive = activeStep === step.id;
                  const isPast = STEPS.findIndex((s) => s.id === activeStep) > i;
                  const StepIcon = step.icon;
                  return (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => setActiveStep(step.id)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-xl p-2 text-left text-xs font-medium transition',
                          isActive
                            ? 'bg-night-900 text-white'
                            : isPast
                              ? 'text-mintInk hover:bg-mint/40'
                              : 'text-night-600 hover:bg-night-50',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-7 w-7 shrink-0 place-items-center rounded-lg',
                            isActive
                              ? 'bg-white/15 text-white'
                              : isPast
                                ? 'bg-mint text-mintInk'
                                : 'bg-night-50 text-night-500',
                          )}
                        >
                          {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <div className={cn('truncate text-[10px] uppercase tracking-wider', isActive ? 'text-white/60' : 'text-night-400')}>
                            Étape {i + 1}
                          </div>
                          <div className="truncate">{step.label}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </PanelCard>
            </motion.aside>
          ) : null}
        </AnimatePresence>

        {/* === Colonne centre : Contenu de l'étape + simulation === */}
        <main className="min-w-0 space-y-4">
          <AnimatedTabContent activeId={activeStep}>
            <StepContent
              stepId={activeStep}
              sim={sim}
              isCourseMode={isCourseMode}
              assignment={assignment}
              Module={Module}
              onComplete={completeWithScore}
              onValidateFallback={validateFallback}
              busy={busy}
              onNextStep={() => {
                const idx = STEPS.findIndex((s) => s.id === activeStep);
                if (idx < STEPS.length - 1) setActiveStep(STEPS[idx + 1].id);
              }}
              onPrevStep={() => {
                const idx = STEPS.findIndex((s) => s.id === activeStep);
                if (idx > 0) setActiveStep(STEPS[idx - 1].id);
              }}
            />
          </AnimatedTabContent>
        </main>

        {/* === Colonne droite : Guide + Chat + Controlling centre === */}
        <motion.aside
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          <motion.div variants={fadeInUp}>
            <GuidePanel sim={sim} activeStep={activeStep} />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <MentorChatPanel mentorName="M. Diop" />
          </motion.div>
          <motion.div variants={fadeInUp}>
            <ControllingCentre elapsed={formatTime(elapsed)} onReset={reset} busy={busy} />
          </motion.div>
        </motion.aside>
      </motion.div>
    </PageTransition>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Idle view — avant de démarrer le TP
// ─────────────────────────────────────────────────────────────────────
function IdleView({
  sim,
  assignment,
  isCourseMode,
  error,
  busy,
  onStart,
}: {
  sim: SimulationDto | null;
  assignment: AssignmentDto | null;
  isCourseMode: boolean;
  error: string | null;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <PageTransition className="mx-auto w-full max-w-3xl space-y-4">
      <LabBreadcrumb
        items={[
          { label: 'Mes TPs', href: '/student/tps' as Route },
          { label: sim?.title ?? '…' },
        ]}
      />

      {sim ? (
        <PanelCard padding="lg" className="relative overflow-hidden bg-lab-mesh">
          <ParticleField count={12} variant="lab" />
          <div className="relative z-10 flex flex-wrap items-start gap-4">
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...EASE.spring, delay: 0.1 }}
              className="grid h-14 w-14 place-items-center rounded-2xl bg-lab-gradient text-white shadow-lab-glow text-2xl"
            >
              {subjectEmoji(sim.subject)}
            </motion.span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <LabBadge tone={subjectTone(sim.subject)}>{sim.subject ?? 'STEM'}</LabBadge>
                <LabBadge tone="virtual">Niveau {sim.targetGrade}</LabBadge>
                {isCourseMode ? (
                  <LabBadge tone="certified">
                    <BookOpen className="h-3 w-3" /> Mes cours
                  </LabBadge>
                ) : (
                  <LabBadge tone="new">
                    <Sparkles className="h-3 w-3" /> Entraînement libre
                  </LabBadge>
                )}
                {assignment?.dueAt ? (
                  <LabBadge tone="demand">
                    <Clock className="h-3 w-3" /> à rendre le{' '}
                    {new Date(assignment.dueAt).toLocaleDateString('fr-FR')}
                  </LabBadge>
                ) : null}
              </div>
              <h1 className="mt-2 font-display text-2xl font-bold text-night-900 md:text-3xl">
                {sim.title}
              </h1>
            </div>
          </div>
        </PanelCard>
      ) : (
        <PanelCard padding="lg">
          <div className="h-8 w-2/3 animate-pulse rounded-full bg-night-100" />
          <div className="mt-2 h-4 w-1/3 animate-pulse rounded-full bg-night-100" />
        </PanelCard>
      )}

      {error ? (
        <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {sim ? (
        <PanelCard padding="lg">
          <div className="space-y-4 text-center">
            {busy ? (
              <MoleculeLoader size={64} className="mx-auto" label="Démarrage du TP…" />
            ) : (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...EASE.spring, delay: 0.2 }}
                whileHover={{ scale: 1.08, rotate: [0, -5, 5, 0] }}
                className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lab-gradient text-white shadow-lab-glow"
              >
                <Beaker className="h-7 w-7" />
              </motion.span>
            )}
            <div>
              <h2 className="font-display text-xl font-bold text-night-900">
                Prêt·e à expérimenter ?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-night-600">
                Ce labo virtuel suit 5 étapes : <strong>Amorce → Hypothèse → Manipulation → Observation → Conclusion</strong>.
                Tu pourras manipuler en toute sécurité, noter tes mesures et soumettre ton rapport.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onStart}
              disabled={busy}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-lab-gradient px-6 text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {busy ? 'Démarrage…' : 'Commencer le TP'}
            </motion.button>
          </div>
        </PanelCard>
      ) : null}
    </PageTransition>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Completed view — après validation
// ─────────────────────────────────────────────────────────────────────
function CompletedView({
  sim,
  attempt,
  elapsed,
  isLocalAttempt,
  isCourseMode,
  formatTime,
  onReplay,
  onBack,
  user,
}: {
  sim: SimulationDto | null;
  attempt: AttemptDto | null;
  elapsed: number;
  isLocalAttempt: boolean;
  isCourseMode: boolean;
  formatTime: (s: number) => string;
  onReplay: () => void;
  onBack: () => void;
  user: { id: string; identifier: string; fullName: string; role: string } | null;
}) {
  return (
    <PageTransition className="mx-auto w-full max-w-2xl">
      <PanelCard padding="lg" className="relative overflow-hidden">
        <ParticleField count={20} variant="subtle" />
        <div className="relative z-10 space-y-4 text-center">
          <motion.span
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...EASE.spring, delay: 0.1 }}
            className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-mint text-mintInk"
          >
            <CheckCircle2 className="h-10 w-10" />
          </motion.span>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...EASE.smooth, delay: 0.3 }}
          >
            <h1 className="font-display text-3xl font-bold text-night-900">Bravo !</h1>
            <p className="mt-1 text-sm text-night-500">
              {sim?.title ? `Ton TP « ${sim.title} » est enregistré.` : 'Ton TP est enregistré.'}
            </p>
          </motion.div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...EASE.spring, delay: 0.5 }}
            className="mx-auto inline-flex items-baseline gap-1 rounded-3xl bg-lab-mesh px-8 py-4 ring-1 ring-lab-100"
          >
            <span className="font-display text-5xl font-bold text-lab-700">{attempt?.score ?? 0}</span>
            <span className="text-base font-medium text-lab-700/70">/100</span>
          </motion.div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-night-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Durée : {formatTime(elapsed)}
            </span>
            {isCourseMode ? (
              <LabBadge tone="certified">
                <BookOpen className="h-3 w-3" /> Mode cours
              </LabBadge>
            ) : null}
            {isLocalAttempt ? (
              <LabBadge tone="demand">
                <CloudOff className="h-3 w-3" />
                Sync au retour réseau
              </LabBadge>
            ) : null}
          </div>
          {isCourseMode ? (
            <p className="mx-auto max-w-md text-xs text-night-500">
              Score auto enregistré. Ton enseignant·e recevra le détail et publiera la note finale.
            </p>
          ) : null}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap justify-center gap-3 pt-2"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onBack}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-night-900 ring-1 ring-night-200 transition hover:bg-night-50"
            >
              Retour aux TPs
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onReplay}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-lab-gradient px-5 text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95"
            >
              <RotateCcw className="h-4 w-4" />
              Recommencer
            </motion.button>
            {!isLocalAttempt && attempt && sim && user && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={async () => {
                  const { generateAttemptReport } = await import('@/lib/pdf-report');
                  generateAttemptReport(attempt, sim, user);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-emerald-700"
                title="Télécharger le rapport en PDF"
              >
                📄 Télécharger PDF
              </motion.button>
            )}
          </motion.div>
        </div>
      </PanelCard>
    </PageTransition>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step content — colonne centrale, change selon l'étape
// ─────────────────────────────────────────────────────────────────────
function StepContent({
  stepId,
  sim,
  isCourseMode,
  assignment,
  Module,
  onComplete,
  onValidateFallback,
  busy,
  onNextStep,
  onPrevStep,
}: {
  stepId: StepId;
  sim: SimulationDto | null;
  isCourseMode: boolean;
  assignment: AssignmentDto | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Module: any;
  onComplete: (data: Record<string, unknown>, score: number) => Promise<void>;
  onValidateFallback: () => Promise<void>;
  busy: boolean;
  onNextStep: () => void;
  onPrevStep: () => void;
}) {
  const step = STEPS.find((s) => s.id === stepId)!;

  return (
    <PanelCard padding="lg">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lab-gradient text-white text-lg shadow-lab-glow">
          {step.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold text-night-900">{step.label}</h2>
          <p className="text-sm text-night-500">{step.description}</p>
        </div>
      </div>

      {stepId === 'engagement' ? (
        <EngagementStep sim={sim} isCourseMode={isCourseMode} assignment={assignment} />
      ) : stepId === 'hypothese' ? (
        <HypothesisStep sim={sim} />
      ) : stepId === 'manip' ? (
        <ManipStep sim={sim} Module={Module} onComplete={onComplete} onValidateFallback={onValidateFallback} busy={busy} />
      ) : stepId === 'mesures' ? (
        <ObservationStep sim={sim} />
      ) : (
        <ConclusionStep onValidate={onValidateFallback} busy={busy} />
      )}

      {/* Footer navigation */}
      <div className="mt-5 flex items-center justify-between border-t border-night-100 pt-4">
        <button
          type="button"
          onClick={onPrevStep}
          disabled={stepId === 'engagement'}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-medium text-night-700 ring-1 ring-night-200 transition hover:bg-night-50 disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          Étape précédente
        </button>
        <button
          type="button"
          onClick={onNextStep}
          disabled={stepId === 'conclusion'}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-lab-gradient px-4 text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95 disabled:opacity-30"
        >
          Étape suivante
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </PanelCard>
  );
}

function EngagementStep({
  sim,
  isCourseMode,
  assignment,
}: {
  sim: SimulationDto | null;
  isCourseMode: boolean;
  assignment: AssignmentDto | null;
}) {
  if (!sim) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-night-700">
        Bienvenue dans ton labo virtuel ! Avant de commencer, prends un moment pour comprendre ce que tu vas explorer.
      </p>
      <div className="rounded-2xl bg-lab-50 p-4 ring-1 ring-lab-100">
        <div className="text-xs font-semibold uppercase tracking-wider text-lab-700">
          Objectif pédagogique
        </div>
        <p className="mt-1 text-sm text-night-700">
          À la fin de ce TP, tu seras capable de comprendre et de manipuler les concepts liés à <strong>{sim.title}</strong>.
        </p>
      </div>
      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          Contexte sénégalais
        </div>
        <p className="mt-1 text-sm text-night-700">
          Ce concept te servira au quotidien — par exemple pour comprendre l&apos;installation électrique de ta maison,
          le compteur Woyofal, ou les phénomènes que tu observes autour de toi.
        </p>
      </div>
      {assignment?.dueAt ? (
        <p className="text-xs text-night-500">
          📅 À rendre avant le <strong>{new Date(assignment.dueAt).toLocaleDateString('fr-FR')}</strong>.
        </p>
      ) : null}
    </div>
  );
}

function HypothesisStep({ sim }: { sim: SimulationDto | null }) {
  const [hypothesis, setHypothesis] = useState('');
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-night-700">
        <strong>Avant de manipuler</strong>, formule une prédiction ! Que penses-tu qu&apos;il va se passer pendant cette
        expérience ? Pas besoin d&apos;avoir raison, l&apos;important est d&apos;activer tes connaissances.
      </p>
      <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          🤔 Question de prédiction
        </div>
        <p className="mt-1 text-sm text-night-700">
          {hypothesisQuestion(sim?.subject)}
        </p>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-night-700">Mon hypothèse</span>
        <textarea
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          rows={3}
          placeholder="Je pense que…"
          className="mt-1 w-full rounded-xl bg-white p-3 text-sm ring-1 ring-night-200 placeholder:text-night-300 focus:ring-2 focus:ring-lab-300 focus:outline-none"
        />
      </label>
      <p className="text-xs text-night-400">
        Ton hypothèse est sauvegardée localement. Elle ne sera pas notée — c&apos;est juste pour t&apos;aider à raisonner.
      </p>
    </div>
  );
}

function ManipStep({
  sim,
  Module,
  onComplete,
  onValidateFallback,
  busy,
}: {
  sim: SimulationDto | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Module: any;
  onComplete: (data: Record<string, unknown>, score: number) => Promise<void>;
  onValidateFallback: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-night-700">
        C&apos;est le cœur du TP. Manipule les éléments, observe les réactions, n&apos;aie pas peur de te tromper —
        l&apos;erreur fait partie de l&apos;apprentissage.
      </p>
      {Module && sim ? (
        <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
          <Module
            title={sim.title}
            subject={sim.subject}
            targetGrade={sim.targetGrade}
            onComplete={onComplete}
            busy={busy}
          />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-lab-200 bg-lab-50 p-8 text-center">
          <Beaker className="mx-auto h-10 w-10 text-lab-500" />
          <p className="mt-3 font-display text-lg font-semibold text-night-900">
            Module pédagogique en cours d&apos;intégration
          </p>
          <p className="mt-1 text-sm text-night-600">
            Ce TP n&apos;a pas encore son simulateur dédié. Tu peux passer à l&apos;étape suivante puis valider ta participation.
          </p>
          <button
            type="button"
            onClick={onValidateFallback}
            disabled={busy}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-lab-gradient px-4 text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy ? 'Envoi…' : 'Valider la manipulation'}
          </button>
        </div>
      )}
    </div>
  );
}

function ObservationStep({ sim }: { sim: SimulationDto | null }) {
  const [rows, setRows] = useState<Array<{ a: string; b: string }>>([
    { a: '', b: '' },
    { a: '', b: '' },
    { a: '', b: '' },
  ]);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-night-700">
        Note tes mesures dans le tableau ci-dessous. Sois précis·e — la qualité des données fait la qualité du TP.
      </p>
      <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
        <table className="w-full text-sm">
          <thead className="bg-lab-50 text-xs uppercase tracking-wider text-lab-700">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">{measureColLabel(sim?.subject, 'a')}</th>
              <th className="px-4 py-2 text-left font-semibold">{measureColLabel(sim?.subject, 'b')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-night-100">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.a}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], a: e.target.value };
                      setRows(next);
                    }}
                    placeholder="—"
                    className="h-9 w-full rounded-lg bg-white px-2 text-sm ring-1 ring-night-100 focus:ring-2 focus:ring-lab-300 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={row.b}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], b: e.target.value };
                      setRows(next);
                    }}
                    placeholder="—"
                    className="h-9 w-full rounded-lg bg-white px-2 text-sm ring-1 ring-night-100 focus:ring-2 focus:ring-lab-300 focus:outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => setRows([...rows, { a: '', b: '' }])}
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-lab-50 px-3 text-xs font-semibold text-lab-700 transition hover:bg-lab-100"
      >
        + Ajouter une ligne
      </button>
    </div>
  );
}

function ConclusionStep({ onValidate, busy }: { onValidate: () => Promise<void>; busy: boolean }) {
  const [conclusion, setConclusion] = useState('');
  const [hypothesisCheck, setHypothesisCheck] = useState<'true' | 'false' | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-night-700">
        Tu y es presque ! Récapitule ta démarche et vérifie ton hypothèse de départ.
      </p>
      <div className="rounded-2xl bg-lab-50 p-4 ring-1 ring-lab-100">
        <div className="text-sm font-semibold text-lab-700">Mon hypothèse de départ était-elle correcte ?</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setHypothesisCheck('true')}
            className={cn(
              'h-10 rounded-xl text-sm font-semibold transition',
              hypothesisCheck === 'true'
                ? 'bg-mint text-mintInk shadow-lab-soft'
                : 'bg-white text-night-700 ring-1 ring-night-200 hover:bg-night-50',
            )}
          >
            ✓ Oui, validée
          </button>
          <button
            type="button"
            onClick={() => setHypothesisCheck('false')}
            className={cn(
              'h-10 rounded-xl text-sm font-semibold transition',
              hypothesisCheck === 'false'
                ? 'bg-rose text-roseInk shadow-lab-soft'
                : 'bg-white text-night-700 ring-1 ring-night-200 hover:bg-night-50',
            )}
          >
            ✗ Non, à revoir
          </button>
        </div>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-night-700">Ma conclusion</span>
        <textarea
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          rows={4}
          placeholder="J&apos;ai observé que… Cela montre que…"
          className="mt-1 w-full rounded-xl bg-white p-3 text-sm ring-1 ring-night-200 placeholder:text-night-300 focus:ring-2 focus:ring-lab-300 focus:outline-none"
        />
      </label>
      <button
        type="button"
        onClick={onValidate}
        disabled={busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-lab-gradient text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95 disabled:opacity-50"
      >
        <ClipboardCheck className="h-4 w-4" />
        {busy ? 'Envoi…' : 'Soumettre mon rapport et terminer le TP'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sidebar droite — Guide / Chat / Controlling centre
// ─────────────────────────────────────────────────────────────────────
function GuidePanel({ sim, activeStep }: { sim: SimulationDto | null; activeStep: StepId }) {
  const tips: Record<StepId, string[]> = {
    engagement: [
      'Lis bien l\'objectif pour savoir ce qu\'on attend de toi.',
      'Repère le contexte sénégalais — ça t\'aidera à retenir.',
    ],
    hypothese: [
      'Pas de mauvaise réponse à cette étape.',
      'Appuie-toi sur ce que tu as appris en cours.',
    ],
    manip: [
      'Manipule lentement, observe avant de cliquer.',
      'Si tu te trompes, recommence — l\'erreur fait partie de l\'apprentissage.',
    ],
    mesures: [
      'Note avec précision (chiffres significatifs).',
      'Si une mesure semble bizarre, refais-la.',
    ],
    conclusion: [
      'Justifie ta conclusion avec tes mesures.',
      'Compare avec ton hypothèse de départ.',
    ],
  };

  return (
    <PanelCard padding="md">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-lab-100 text-lab-700">
          <BookOpen className="h-3.5 w-3.5" />
        </span>
        <h3 className="font-display text-sm font-semibold text-night-900">Guide du TP</h3>
      </div>
      {sim ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <LabBadge tone={subjectTone(sim.subject)}>{sim.subject ?? 'STEM'}</LabBadge>
          <LabBadge tone="virtual">Niveau {sim.targetGrade}</LabBadge>
        </div>
      ) : null}
      <ul className="mt-3 space-y-2">
        {tips[activeStep].map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-night-600">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lab-100 text-[10px] font-bold text-lab-700">
              {i + 1}
            </span>
            {tip}
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}

function MentorChatPanel({ mentorName }: { mentorName: string }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ from: 'me' | 'mentor'; text: string; ts: number }>>([
    {
      from: 'mentor',
      text: 'Salut ! 👋 Je suis là si tu as une question pendant le TP. N\'hésite pas !',
      ts: Date.now(),
    },
  ]);

  const send = () => {
    if (!message.trim()) return;
    const next = [
      ...messages,
      { from: 'me' as const, text: message.trim(), ts: Date.now() },
    ];
    setMessage('');
    setMessages(next);
    // Réponse simulée (placeholder — à remplacer par WS/API quand le service chat sera prêt)
    setTimeout(() => {
      setMessages((cur) => [
        ...cur,
        {
          from: 'mentor',
          text: 'Message bien reçu ! Je te réponds dès que possible 🙂',
          ts: Date.now(),
        },
      ]);
    }, 1500);
  };

  return (
    <PanelCard padding="md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LabAvatar size="sm" name={mentorName} online verified />
          <div>
            <div className="text-sm font-semibold text-night-900">{mentorName}</div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              En ligne
            </div>
          </div>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-lab-100 text-lab-700">
          <MessageSquare className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-xl bg-night-50 p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'rounded-xl px-3 py-2 text-xs leading-relaxed',
              m.from === 'me'
                ? 'ml-6 bg-lab-500 text-white'
                : 'mr-6 bg-white text-night-700 ring-1 ring-night-100',
            )}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Pose ta question…"
          className="h-9 flex-1 rounded-lg bg-night-50 px-3 text-xs ring-1 ring-night-100 placeholder:text-night-400 focus:ring-2 focus:ring-lab-300 focus:outline-none focus:bg-white"
        />
        <button
          type="button"
          onClick={send}
          disabled={!message.trim()}
          aria-label="Envoyer"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lab-500 text-white transition hover:bg-lab-600 disabled:opacity-30"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </PanelCard>
  );
}

function ControllingCentre({
  elapsed,
  onReset,
  busy,
}: {
  elapsed: string;
  onReset: () => void;
  busy: boolean;
}) {
  return (
    <PanelCard padding="md" className="bg-night-900 text-white ring-night-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
            Centre de contrôle
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{elapsed}</span>
          </div>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white/70">
          <HelpCircle className="h-3.5 w-3.5" />
        </span>
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={busy}
        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-30"
      >
        <RotateCcw className="h-3 w-3" />
        Recommencer le TP
      </button>
    </PanelCard>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
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

function subjectEmoji(subject?: string | null): string {
  const tone = subjectTone(subject);
  return {
    maths: '∑',
    physique: '⚛︎',
    svt: '🌱',
    info: '⌨︎',
    techno: '⚙︎',
    neutral: '🧪',
  }[tone];
}

function hypothesisQuestion(subject?: string | null): string {
  const tone = subjectTone(subject);
  return {
    maths: "Selon toi, comment va se comporter cette grandeur quand tu changeras une variable ?",
    physique:
      "À ton avis, si tu modifies un paramètre du circuit (résistance, tension), que va-t-il se passer ?",
    svt: "Que penses-tu observer si tu varies les conditions (lumière, eau, température) ?",
    info: "Quelle sera la sortie de l'algorithme si tu changes l'entrée ?",
    techno: "Comment ce système va-t-il réagir à une nouvelle contrainte ?",
    neutral: "Que penses-tu qu'il va se passer pendant cette expérience ?",
  }[tone];
}

function measureColLabel(subject: string | null | undefined, col: 'a' | 'b'): string {
  const tone = subjectTone(subject);
  if (col === 'a') {
    return {
      maths: 'Variable x',
      physique: 'Tension U (V)',
      svt: 'Temps (min)',
      info: 'Entrée',
      techno: 'Paramètre',
      neutral: 'Mesure 1',
    }[tone];
  }
  return {
    maths: 'Résultat f(x)',
    physique: 'Intensité I (A)',
    svt: 'Bulles observées',
    info: 'Sortie',
    techno: 'Réponse',
    neutral: 'Mesure 2',
  }[tone];
}
