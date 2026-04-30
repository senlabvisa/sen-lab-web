'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, GraduationCap, Plus, Users } from 'lucide-react';
import type { ClassDto } from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { LabBadge } from '@/components/lab/lab-badge';
import { LabBreadcrumb } from '@/components/lab/breadcrumb';
import { PanelCard } from '@/components/lab/section';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

export default function TeacherClassesPage() {
  return (
    <LabShell allowedRoles={['teacher', 'admin']}>
      <TeacherClassesContent />
    </LabShell>
  );
}

function TeacherClassesContent() {
  const { user, token } = useAuth();
  const [classes, setClasses] = useState<ClassDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !user) return;
    setError(null);
    try {
      const filters = user.role === 'teacher' ? { teacherId: user.id } : {};
      setClasses(await api.classes.list(token, filters));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-5">
      <LabBreadcrumb
        items={[
          { label: 'Tableau de bord', href: '/dashboard' as Route },
          { label: 'Mes classes' },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-night-900">Mes classes</h1>
          <p className="mt-1 text-sm text-night-500">
            Gère tes groupes, assigne des TPs et suis la progression des élèves.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-lab-gradient px-4 text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          Nouvelle classe
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {classes === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl bg-night-100" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <PanelCard padding="lg" className="text-center">
          <Users className="mx-auto h-10 w-10 text-night-300" />
          <p className="mt-3 text-sm text-night-500">Aucune classe pour le moment.</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-lab-gradient px-4 text-sm font-semibold text-white shadow-lab-glow"
          >
            <Plus className="h-4 w-4" />
            Créer ma première classe
          </button>
        </PanelCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c, i) => (
            <ClassCard key={c.id} cls={c} highlighted={i === 0} />
          ))}
        </div>
      )}

      {createOpen ? (
        <CreateClassDialog
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ClassCard({ cls, highlighted }: { cls: ClassDto; highlighted?: boolean }) {
  const tone = subjectTone(cls.subject);
  const dark = highlighted;

  return (
    <Link
      href={`/teacher/classes/${cls.id}` as Route}
      className={cn(
        'group flex flex-col gap-3 rounded-3xl p-5 ring-1 transition',
        dark
          ? 'bg-night-900 text-white ring-night-800 hover:ring-lab-500'
          : 'bg-white text-night-900 ring-night-100 hover:shadow-lab-card hover:ring-lab-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'grid h-12 w-12 place-items-center rounded-2xl text-lg',
            dark ? 'bg-white/10 text-white' : 'bg-lab-100 text-lab-700',
          )}
        >
          <GraduationCap className="h-5 w-5" />
        </span>
        {cls.subject ? <LabBadge tone={tone}>{cls.subject}</LabBadge> : null}
      </div>

      <div>
        <h3
          className={cn(
            'font-display text-lg font-semibold',
            dark ? 'text-white' : 'text-night-900',
          )}
        >
          {cls.name}
        </h3>
        <p className={cn('text-sm', dark ? 'text-white/60' : 'text-night-500')}>
          Année {cls.academicYear}
          {cls.gradeLevel ? ` · ${cls.gradeLevel}` : ''}
        </p>
      </div>

      <div
        className={cn(
          'mt-auto flex items-center justify-between border-t pt-3 text-xs',
          dark ? 'border-white/10' : 'border-night-100',
        )}
      >
        <span className={cn('font-mono', dark ? 'text-white/70' : 'text-night-500')}>
          {cls.joinCode}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-medium transition group-hover:gap-1',
            dark ? 'text-white' : 'text-lab-700',
          )}
        >
          Ouvrir
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function CreateClassDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { user, token } = useAuth();
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [subject, setSubject] = useState<'' | 'Maths' | 'Physique-Chimie' | 'SVT'>('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !user) return;
    setSaving(true);
    setError(null);
    try {
      await api.classes.create(token, {
        teacherId: user.id,
        name,
        academicYear,
        ...(subject ? { subject } : {}),
        ...(gradeLevel ? { gradeLevel } : {}),
      });
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Nouvelle classe">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom (ex : 3ème A)</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academicYear">Année académique (YYYY-YYYY)</Label>
          <Input
            id="academicYear"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            pattern="\d{4}-\d{4}"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="subject">Matière</Label>
            <select
              id="subject"
              className="min-h-touch w-full rounded-xl border border-night-200 bg-white px-3 transition focus:border-lab-500 focus:outline-none focus:ring-4 focus:ring-lab-100"
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value as '' | 'Maths' | 'Physique-Chimie' | 'SVT')
              }
            >
              <option value="">— (aucune)</option>
              <option value="Maths">Maths</option>
              <option value="Physique-Chimie">Physique-Chimie</option>
              <option value="SVT">SVT</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gradeLevel">Niveau</Label>
            <select
              id="gradeLevel"
              className="min-h-touch w-full rounded-xl border border-night-200 bg-white px-3 transition focus:border-lab-500 focus:outline-none focus:ring-4 focus:ring-lab-100"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            >
              <option value="">— (aucun)</option>
              <option value="6eme">6ème</option>
              <option value="5eme">5ème</option>
              <option value="4eme">4ème</option>
              <option value="3eme">3ème</option>
              <option value="seconde">Seconde</option>
              <option value="premiere">Première</option>
              <option value="terminale">Terminale</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-night-500">
          La matière et le niveau servent à générer un code de classe lisible (ex : PHY3EM-XK42).
        </p>

        {error ? (
          <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-lab-gradient px-5 text-sm font-semibold text-white shadow-lab-glow transition hover:opacity-95 disabled:opacity-50"
          >
            {saving ? 'Création…' : 'Créer la classe'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function defaultAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
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
