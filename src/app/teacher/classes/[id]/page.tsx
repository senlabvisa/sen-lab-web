'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type {
  AssignmentDto,
  ClassDto,
  ClassStudentDto,
  SimulationDto,
  UserDto,
} from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { Badge, subjectTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton, SkeletonListRow } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function TeacherClassDetailPage({ params }: { params: { id: string } }) {
  return (
    <LabShell allowedRoles={['teacher', 'admin']}>
      <ClassDetailContent id={params.id} />
    </LabShell>
  );
}

function ClassDetailContent({ id }: { id: string }) {
  const { token, user } = useAuth();
  const [cls, setCls] = useState<ClassDto | null>(null);
  const [enrolled, setEnrolled] = useState<ClassStudentDto[] | null>(null);
  const [studentsIndex, setStudentsIndex] = useState<Map<string, UserDto>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !user) return;
    setError(null);
    try {
      const [classDto, enrolledLinks, allStudents] = await Promise.all([
        api.classes.get(token, id),
        api.classes.listStudents(token, id),
        user.role === 'admin' || user.role === 'teacher'
          ? api.users.list(token, { role: 'student' })
          : Promise.resolve<UserDto[]>([]),
      ]);
      setCls(classDto);
      setEnrolled(enrolledLinks);
      setStudentsIndex(new Map(allStudents.map((s) => [s.id, s])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token, user, id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function unenroll(studentId: string) {
    if (!token) return;
    setError(null);
    try {
      await api.classes.unenrollStudent(token, id, studentId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  const enrolledIds = new Set(enrolled?.map((e) => e.studentId) ?? []);
  const candidates = Array.from(studentsIndex.values()).filter((s) => !enrolledIds.has(s.id));
  const tone = subjectTone(cls?.subject);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-science-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux classes
      </Link>

      {cls ? (
        <Card variant="hero" padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {cls.subject ? <Badge tone={tone}>{cls.subject}</Badge> : null}
                {cls.gradeLevel ? <Badge tone="neutral">Niveau {cls.gradeLevel}</Badge> : null}
                <Badge tone="science">Année {cls.academicYear}</Badge>
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold text-ink md:text-4xl">
                {cls.name}
              </h1>
              <p className="mt-2 text-sm text-ink/70">
                {enrolled?.length ?? 0} élève{(enrolled?.length ?? 0) > 1 ? 's' : ''} inscrit
                {(enrolled?.length ?? 0) > 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href={`/teacher/classes/${id}/dashboard` as Route}
              className="hidden h-11 items-center gap-2 rounded-xl bg-science-gradient px-4 text-sm font-medium text-white shadow-glow transition hover:opacity-95 md:inline-flex"
            >
              Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
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

      <Link
        href={`/teacher/classes/${id}/dashboard` as Route}
        className="md:hidden inline-flex h-11 items-center gap-2 rounded-xl bg-science-gradient px-4 text-sm font-medium text-white shadow-glow"
      >
        Voir le dashboard
        <ArrowRight className="h-4 w-4" />
      </Link>

      {cls ? (
        <ClassAccessPanel cls={cls} onUpdated={(next) => setCls(next)} />
      ) : (
        <Card>
          <Skeleton className="h-32 w-full rounded-xl" />
        </Card>
      )}

      {cls ? <AssignmentsPanel classId={cls.id} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-science-700" />
            Élèves inscrits ({enrolled?.length ?? 0})
          </CardTitle>
          <Button
            size="sm"
            variant="gradient"
            onClick={() => setEnrollOpen(true)}
            disabled={candidates.length === 0}
          >
            <UserPlus className="h-4 w-4" />
            Inscrire un élève
          </Button>
        </CardHeader>

        {enrolled === null ? (
          <ul className="divide-y divide-ink/5">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonListRow key={i} />
            ))}
          </ul>
        ) : enrolled.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink/60">
            Aucun élève inscrit pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {enrolled.map((link) => {
              const student = studentsIndex.get(link.studentId);
              return (
                <li key={link.studentId} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-science-50 text-sm font-semibold text-science-700 ring-1 ring-science-100">
                      {initials(student?.fullName ?? '?')}
                    </div>
                    <div>
                      <div className="font-medium text-ink">
                        {student?.fullName ?? '(élève inconnu)'}
                      </div>
                      <div className="font-mono text-xs text-ink/60">
                        {student?.identifier ?? link.studentId}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unenroll(link.studentId)}
                    aria-label={`Désinscrire ${student?.fullName ?? link.studentId}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {enrollOpen ? (
        <EnrollDialog
          candidates={candidates}
          classId={id}
          onClose={() => setEnrollOpen(false)}
          onEnrolled={async () => {
            setEnrollOpen(false);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ClassAccessPanel({
  cls,
  onUpdated,
}: {
  cls: ClassDto;
  onUpdated: (next: ClassDto) => void;
}) {
  const { token } = useAuth();
  const [whitelistText, setWhitelistText] = useState((cls.whitelist ?? []).join('\n'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setWhitelistText((cls.whitelist ?? []).join('\n'));
  }, [cls]);

  async function regenerate() {
    if (!token) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const next = await api.classes.regenerateCode(token, cls.id);
      onUpdated(next);
      setFeedback('Nouveau code généré');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function saveWhitelist() {
    if (!token) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const lines = whitelistText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const next = await api.classes.updateWhitelist(token, cls.id, lines);
      onUpdated(next);
      setFeedback(`Liste enregistrée (${(next.whitelist ?? []).length} identifiants)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  async function handleCsvUpload(file: File) {
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.split(',')[0]?.trim() ?? '')
        .filter((s) => s.length > 0 && s.toLowerCase() !== 'identifier');
      setWhitelistText(lines.join('\n'));
      setFeedback(`CSV chargé (${lines.length} identifiants) — clique « Enregistrer » pour valider`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lecture CSV');
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(cls.joinCode).catch(() => undefined);
    setFeedback(`Code ${cls.joinCode} copié`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-science-700" />
          Inscription par code
        </CardTitle>
      </CardHeader>

      <p className="text-sm text-ink/70">
        Communique le code aux élèves de la classe. Ils l&apos;entreront sur la page «&nbsp;Rejoindre une classe&nbsp;».
        Seuls les identifiants présents dans la liste autorisée pourront s&apos;inscrire.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-hero-blue p-4 ring-1 ring-science-100">
        <span className="font-mono text-3xl font-bold tracking-wider text-science-700">
          {cls.joinCode}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copyCode}>
            <Copy className="h-4 w-4" />
            Copier
          </Button>
          <Button size="sm" variant="outline" onClick={regenerate} disabled={busy}>
            <RefreshCw className="h-4 w-4" />
            Régénérer
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="whitelist">
          Identifiants autorisés ({(cls.whitelist ?? []).length})
        </Label>
        <textarea
          id="whitelist"
          rows={6}
          value={whitelistText}
          onChange={(e) => setWhitelistText(e.target.value)}
          className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 font-mono text-xs transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
          placeholder={'lycee-limamou/moussa\nlycee-limamou/fatou'}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gradient" onClick={saveWhitelist} disabled={busy}>
            Enregistrer
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-ink/15 bg-white px-3.5 text-sm font-medium text-ink hover:border-science-300 hover:bg-science-50 hover:text-science-700">
            Importer un CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCsvUpload(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="text-xs text-ink/60">
          Format CSV attendu : 1 identifiant par ligne (la 1re colonne suffit).
        </p>
      </div>

      {error ? (
        <div role="alert" className="mt-3 rounded-xl bg-danger-50 p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {feedback ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-action-50 p-3 text-sm text-action-700">
          <CheckCircle2 className="h-4 w-4" />
          {feedback}
        </div>
      ) : null}
    </Card>
  );
}

function AssignmentsPanel({ classId }: { classId: string }) {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentDto[] | null>(null);
  const [simulations, setSimulations] = useState<SimulationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [list, sims] = await Promise.all([
        api.classes.listAssignments(token, classId),
        api.simulations.list(token),
      ]);
      setAssignments(list);
      setSimulations(sims);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token, classId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const simById = useMemo(() => new Map(simulations.map((s) => [s.id, s])), [simulations]);

  async function deleteOne(assignmentId: string) {
    if (!token) return;
    if (!window.confirm('Retirer ce TP de la classe ?')) return;
    setError(null);
    try {
      await api.classes.deleteAssignment(token, assignmentId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-science-700" />
          TPs assignés ({assignments?.length ?? 0})
        </CardTitle>
        <Button
          size="sm"
          variant="gradient"
          onClick={() => setOpen(true)}
          disabled={simulations.length === 0}
        >
          <Plus className="h-4 w-4" />
          Assigner un TP
        </Button>
      </CardHeader>

      {error ? (
        <div role="alert" className="mb-3 rounded-xl bg-danger-50 p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {assignments === null ? (
        <ul className="divide-y divide-ink/5">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonListRow key={i} />
          ))}
        </ul>
      ) : assignments.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink/60">
          Aucun TP assigné. Clique sur «&nbsp;Assigner un TP&nbsp;» pour en ajouter.
        </p>
      ) : (
        <ul className="divide-y divide-ink/5">
          {assignments.map((a) => {
            const sim = simById.get(a.simulationId);
            const simTone = subjectTone(sim?.subject);
            return (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-science-50 text-science-700 ring-1 ring-science-100">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-medium text-ink">{sim?.title ?? '(TP inconnu)'}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                      {sim ? <Badge tone={simTone} size="sm">{sim.subject}</Badge> : null}
                      {sim ? <span>Niveau {sim.targetGrade}</span> : null}
                      {a.dueAt ? (
                        <Badge tone="alert" size="sm">
                          à rendre {new Date(a.dueAt).toLocaleDateString('fr-FR')}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteOne(a.id)}
                  aria-label="Retirer ce TP"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {open ? (
        <AssignDialog
          classId={classId}
          existingSimIds={new Set(assignments?.map((a) => a.simulationId) ?? [])}
          simulations={simulations}
          onClose={() => setOpen(false)}
          onAssigned={async () => {
            setOpen(false);
            await refresh();
          }}
        />
      ) : null}
    </Card>
  );
}

function AssignDialog({
  classId,
  existingSimIds,
  simulations,
  onClose,
  onAssigned,
}: {
  classId: string;
  existingSimIds: Set<string>;
  simulations: SimulationDto[];
  onClose: () => void;
  onAssigned: () => Promise<void>;
}) {
  const { token } = useAuth();
  const candidates = simulations.filter((s) => !existingSimIds.has(s.id));
  const [simulationId, setSimulationId] = useState<string>(candidates[0]?.id ?? '');
  const [dueAt, setDueAt] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token || !simulationId) return;
    setBusy(true);
    setError(null);
    try {
      const dueIso = dueAt ? new Date(dueAt).toISOString() : undefined;
      await api.classes.createAssignment(token, classId, {
        simulationId,
        ...(dueIso ? { dueAt: dueIso } : {}),
      });
      await onAssigned();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Assigner un TP à cette classe">
      <div className="space-y-4">
        {candidates.length === 0 ? (
          <p className="text-sm text-ink/70">Tous les TPs du catalogue sont déjà assignés.</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="sim">TP à assigner</Label>
              <select
                id="sim"
                className="min-h-touch w-full rounded-xl border border-ink/15 bg-white px-3 transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
                value={simulationId}
                onChange={(e) => setSimulationId(e.target.value)}
              >
                {candidates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.subject} · {s.targetGrade})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueAt">Date limite (optionnel)</Label>
              <Input
                id="dueAt"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </>
        )}

        {error ? (
          <div role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="gradient"
            disabled={busy || !simulationId || candidates.length === 0}
            onClick={submit}
          >
            {busy ? 'Assignation…' : 'Assigner'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function EnrollDialog({
  candidates,
  classId,
  onClose,
  onEnrolled,
}: {
  candidates: UserDto[];
  classId: string;
  onClose: () => void;
  onEnrolled: () => Promise<void>;
}) {
  const { token } = useAuth();
  const [selected, setSelected] = useState<string>(candidates[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token || !selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.classes.enrollStudent(token, classId, selected);
      await onEnrolled();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Inscrire un élève">
      <div className="space-y-4">
        {candidates.length === 0 ? (
          <p className="text-sm text-ink/70">
            Tous les élèves sont déjà inscrits, ou aucun élève n&apos;a encore été créé.
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="student">Élève</Label>
            <select
              id="student"
              className="min-h-touch w-full rounded-xl border border-ink/15 bg-white px-3 transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {candidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.identifier})
                </option>
              ))}
            </select>
          </div>
        )}

        {error ? (
          <div role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" variant="gradient" disabled={busy || !selected} onClick={submit}>
            {busy ? 'Inscription…' : 'Inscrire'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
