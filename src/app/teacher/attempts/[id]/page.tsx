'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, MessageSquare, Save, Send } from 'lucide-react';
import type {
  AttemptDto,
  RubricCriterion,
  RubricEvaluation,
  RubricTemplate,
  SimulationDto,
  UserDto,
} from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { Badge, subjectTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AttemptDetailPage({ params }: { params: { id: string } }) {
  return (
    <LabShell allowedRoles={['teacher', 'admin', 'sysadmin']}>
      <AttemptDetailContent id={params.id} />
    </LabShell>
  );
}

function AttemptDetailContent({ id }: { id: string }) {
  const { token } = useAuth();
  const [attempt, setAttempt] = useState<AttemptDto | null>(null);
  const [sim, setSim] = useState<SimulationDto | null>(null);
  const [student, setStudent] = useState<UserDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const a = await api.attempts.findById(token, id);
      setAttempt(a);
      setComment(a.teacherComment ?? '');
      if (a.teacherRubric) setScores(a.teacherRubric);
      const sims = await api.simulations.list(token);
      const matched = sims.find((s) => s.id === a.simulationId);
      setSim(matched ?? null);
      const users = await api.users.list(token, { role: 'student' }).catch(() => [] as UserDto[]);
      setStudent(users.find((u) => u.id === a.studentId) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token, id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rubricTemplate: RubricTemplate | undefined = sim?.rubricTemplate ?? undefined;
  const criteria: RubricCriterion[] = useMemo(() => {
    if (rubricTemplate?.criteria.length) return rubricTemplate.criteria;
    return [
      { id: 'demarche', label: 'Démarche scientifique', maxScore: 5 },
      { id: 'mesures', label: 'Mesures et observations', maxScore: 5 },
      { id: 'analyse', label: 'Analyse et calculs', maxScore: 5 },
      { id: 'conclusion', label: 'Conclusion', maxScore: 5 },
    ];
  }, [rubricTemplate]);

  const totalScore = criteria.reduce((acc, c) => acc + (scores[c.id] ?? 0), 0);
  const totalMax = criteria.reduce((acc, c) => acc + c.maxScore, 0);
  const tone = subjectTone(sim?.subject);

  async function saveDraft() {
    if (!token) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const next = await api.attempts.evaluate(token, id, {
        teacherComment: comment,
        teacherRubric: scores as RubricEvaluation,
      });
      setAttempt(next);
      setFeedback('Brouillon enregistré');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!token) return;
    if (!window.confirm("Publier la note à l'élève ?")) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await api.attempts.evaluate(token, id, {
        teacherComment: comment,
        teacherRubric: scores as RubricEvaluation,
      });
      const next = await api.attempts.publish(token, id);
      setAttempt(next);
      setFeedback("Note publiée à l'élève");
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <Link
        href="/teacher/attempts"
        className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-science-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux tentatives
      </Link>

      {attempt ? (
        <Card variant="hero" padding="lg">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {sim ? <Badge tone={tone}>{sim.subject}</Badge> : null}
              <Badge
                tone={
                  attempt.status === 'completed'
                    ? 'action'
                    : attempt.status === 'started'
                      ? 'alert'
                      : 'neutral'
                }
              >
                {attempt.status}
              </Badge>
              {attempt.publishedAt ? (
                <Badge tone="science">
                  Publiée {new Date(attempt.publishedAt).toLocaleDateString('fr-FR')}
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold text-ink md:text-3xl">
              {sim?.title ?? '(TP inconnu)'}
            </h1>
            <p className="mt-1 text-base text-ink/70">
              {student?.fullName ?? attempt.studentId.slice(0, 8)}
              {student?.identifier ? (
                <span className="ml-2 rounded bg-white/60 px-2 py-0.5 font-mono text-xs">
                  {student.identifier}
                </span>
              ) : null}
            </p>
            {attempt.score !== null ? (
              <div className="mt-3 inline-flex items-baseline gap-1 rounded-xl bg-white/80 px-3 py-2 shadow-soft ring-1 ring-action-100 backdrop-blur-sm">
                <span className="text-xs font-medium text-ink/60">Score auto</span>
                <span className="ml-2 font-display text-xl font-bold text-action-700">
                  {attempt.score}
                </span>
                <span className="text-xs text-action-700/70">/100</span>
              </div>
            ) : null}
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
      {feedback ? (
        <div className="inline-flex items-center gap-2 rounded-xl bg-action-50 p-3 text-sm text-action-700">
          <CheckCircle2 className="h-4 w-4" />
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-science-700" />
                Évaluation par critères
              </CardTitle>
              <Badge tone={totalScore >= totalMax * 0.5 ? 'action' : 'neutral'}>
                {totalScore} / {totalMax}
              </Badge>
            </CardHeader>

            <ul className="space-y-4">
              {criteria.map((c) => {
                const v = scores[c.id] ?? 0;
                const pct = (v / c.maxScore) * 100;
                return (
                  <li key={c.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{c.label}</span>
                      <span className="font-mono font-semibold text-ink">
                        {v} / {c.maxScore}
                      </span>
                    </div>
                    {c.description ? (
                      <p className="text-xs text-ink/60">{c.description}</p>
                    ) : null}
                    <div className="relative">
                      <input
                        type="range"
                        min={0}
                        max={c.maxScore}
                        step={1}
                        value={v}
                        onChange={(e) =>
                          setScores((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))
                        }
                        className="w-full"
                      />
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-science-50">
                        <div
                          className="h-full bg-science-gradient transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="mt-4 rounded-lg bg-surface p-3 text-xs text-ink/60 ring-1 ring-ink/5">
              {rubricTemplate?.criteria.length
                ? 'Rubrique standard du TP (gabarit sysadmin).'
                : 'Rubrique générique. Le sysadmin peut définir un gabarit propre via /admin/simulations.'}
            </p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-science-700" />
                Commentaire pour l&apos;élève
              </CardTitle>
            </CardHeader>
            <textarea
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
              placeholder="Bien analysé, attention aux unités lors des calculs…"
            />
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveDraft} disabled={busy || !attempt}>
              <Save className="h-4 w-4" />
              Enregistrer brouillon
            </Button>
            <Button variant="gradient" onClick={publish} disabled={busy || !attempt}>
              <Send className="h-4 w-4" />
              Publier la note
            </Button>
          </div>
        </div>

        <aside>
          <div className="sticky top-24 space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Détail</CardTitle>
              </CardHeader>

              {attempt ? (
                <>
                  <dl className="space-y-2 text-sm">
                    <Row label="Élève" value={student?.identifier ?? '—'} />
                    <Row label="TP (slug)" value={sim?.slug ?? '—'} />
                    <Row label="Status" value={attempt.status} />
                    <Row
                      label="Score auto"
                      value={attempt.score !== null ? `${attempt.score}/100` : '—'}
                    />
                    <Row
                      label="Démarrée"
                      value={new Date(attempt.createdAt).toLocaleString('fr-FR')}
                    />
                    <Row
                      label="Note publiée"
                      value={
                        attempt.publishedAt
                          ? new Date(attempt.publishedAt).toLocaleString('fr-FR')
                          : '— (brouillon)'
                      }
                    />
                  </dl>

                  <details className="mt-3 rounded-xl border border-ink/10 bg-surface p-3 text-xs">
                    <summary className="cursor-pointer font-medium text-ink/80">
                      dataJson (réponses brutes)
                    </summary>
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-ink/80">
                      {JSON.stringify(attempt.dataJson, null, 2)}
                    </pre>
                  </details>
                </>
              ) : (
                <Skeleton className="h-24 w-full" />
              )}
            </Card>

            {attempt?.publishedAt ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-action-50 p-3 text-xs text-action-700 ring-1 ring-action-100">
                <CheckCircle2 className="h-4 w-4" />
                Note visible pour l&apos;élève
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink/60">{label}</dt>
      <dd className="text-right text-ink/80">{value}</dd>
    </div>
  );
}
