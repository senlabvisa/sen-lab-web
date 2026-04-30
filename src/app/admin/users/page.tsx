'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Plus, Upload, Users } from 'lucide-react';
import type { CreateUserDto, SchoolDto, UserDto } from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonRow } from '@/components/ui/skeleton';
import { api, type BulkImportResultDto } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type DialogState =
  | { mode: 'create' }
  | { mode: 'bulk' }
  | { mode: 'bulkResult'; result: BulkImportResultDto }
  | { mode: 'reset'; user: UserDto; newPassword: string | null }
  | null;

type RoleFilter = '' | 'sysadmin' | 'admin' | 'teacher' | 'student';

const ROLE_TONE: Record<string, 'science' | 'action' | 'alert' | 'maths' | 'neutral'> = {
  sysadmin: 'alert',
  admin: 'maths',
  teacher: 'science',
  student: 'action',
};

export default function AdminUsersPage() {
  return (
    <LabShell allowedRoles={['sysadmin', 'admin']}>
      <AdminUsersContent />
    </LabShell>
  );
}

function AdminUsersContent() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserDto[] | null>(null);
  const [schools, setSchools] = useState<SchoolDto[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [userList, schoolList] = await Promise.all([
        api.users.list(token, roleFilter ? { role: roleFilter } : {}),
        api.schools.list(token),
      ]);
      setUsers(userList);
      setSchools(schoolList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token, roleFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const schoolName = (id?: string) => (id ? schools.find((s) => s.id === id)?.name ?? id : '—');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <Card variant="hero" padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="science" className="mb-3">
              <Users className="h-3 w-3" />
              Administration
            </Badge>
            <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
              Utilisateurs
            </h1>
            <p className="mt-2 max-w-xl text-base text-ink/70">
              Crée des comptes individuels ou importe une classe entière en CSV.
            </p>
          </div>
          <div className="hidden gap-2 md:flex">
            <Button variant="outline" onClick={() => setDialog({ mode: 'bulk' })}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
            <Button variant="gradient" onClick={() => setDialog({ mode: 'create' })}>
              <Plus className="h-4 w-4" />
              Nouvel utilisateur
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 md:hidden">
        <Button variant="outline" onClick={() => setDialog({ mode: 'bulk' })}>
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
        <Button variant="gradient" onClick={() => setDialog({ mode: 'create' })}>
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des comptes ({users?.length ?? 0})</CardTitle>
          <select
            aria-label="Filtrer par rôle"
            className="h-10 rounded-xl border border-ink/15 bg-white px-3 text-sm transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          >
            <option value="">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Enseignant</option>
            <option value="student">Élève</option>
          </select>
        </CardHeader>

        {error ? (
          <div role="alert" className="mb-4 rounded-xl bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {users !== null && users.length === 0 ? (
          <p className="py-6 text-center text-ink/60">
            Aucun utilisateur. Créez-en un pour démarrer.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl ring-1 ring-ink/5">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr className="text-left text-ink/60">
                  <th className="px-4 py-2 font-medium">Identifiant</th>
                  <th className="px-4 py-2 font-medium">Nom complet</th>
                  <th className="px-4 py-2 font-medium">Rôle</th>
                  <th className="px-4 py-2 font-medium">École</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users === null
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={5} />)
                  : null}
                {users?.map((u) => (
                  <tr key={u.id} className="border-t border-ink/5 transition hover:bg-science-50/40">
                    <td className="px-4 py-3 font-mono text-xs text-ink">{u.identifier}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-science-50 text-xs font-semibold text-science-700 ring-1 ring-science-100">
                          {initials(u.fullName)}
                        </div>
                        <span className="font-medium text-ink">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ROLE_TONE[u.role] ?? 'neutral'} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink/70">{schoolName(u.schoolId)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDialog({ mode: 'reset', user: u, newPassword: null })}
                        aria-label={`Réinitialiser mot de passe de ${u.fullName}`}
                      >
                        <KeyRound className="h-4 w-4" />
                        <span className="hidden sm:inline">Réinit. mdp</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {dialog?.mode === 'create' ? (
        <CreateUserDialog
          schools={schools}
          onClose={() => setDialog(null)}
          onCreated={async () => {
            setDialog(null);
            await refresh();
          }}
        />
      ) : null}

      {dialog?.mode === 'reset' ? (
        <ResetPasswordDialog
          user={dialog.user}
          initialNewPassword={dialog.newPassword}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog?.mode === 'bulk' ? (
        <BulkImportDialog
          onClose={() => setDialog(null)}
          onImported={(result) => setDialog({ mode: 'bulkResult', result })}
        />
      ) : null}

      {dialog?.mode === 'bulkResult' ? (
        <BulkResultDialog
          result={dialog.result}
          onClose={async () => {
            setDialog(null);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function BulkImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (result: BulkImportResultDto) => void;
}) {
  const { token } = useAuth();
  const [csv, setCsv] = useState('');
  const [defaultRole, setDefaultRole] = useState<'student' | 'teacher'>('student');
  const [defaultGradeLevel, setDefaultGradeLevel] = useState('3eme');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(file: File) {
    setError(null);
    try {
      const text = await file.text();
      setCsv(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lecture');
    }
  }

  async function submit() {
    if (!token || !csv.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const lines = csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));
      const startIdx = lines[0]?.toLowerCase().includes('identifier') ? 1 : 0;
      const rows = lines.slice(startIdx).map((line) => {
        const [identifier, fullName, role, gradeLevel] = line.split(',').map((c) => c?.trim());
        return {
          identifier: identifier ?? '',
          fullName: fullName ?? identifier ?? '',
          role: ((role || defaultRole) as 'student' | 'teacher' | 'admin' | 'sysadmin'),
          ...(gradeLevel || defaultGradeLevel
            ? { gradeLevel: gradeLevel || defaultGradeLevel }
            : {}),
        };
      });
      if (rows.length === 0) {
        setError('Aucune ligne valide trouvée.');
        setBusy(false);
        return;
      }
      const result = await api.users.bulkImport(token, rows);
      onImported(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Importer des utilisateurs (CSV)">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="default-role">Rôle par défaut</Label>
            <select
              id="default-role"
              className="min-h-touch w-full rounded-xl border border-ink/15 bg-white px-3 transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value as 'student' | 'teacher')}
            >
              <option value="student">Élève</option>
              <option value="teacher">Enseignant</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-grade">Niveau par défaut (élèves)</Label>
            <select
              id="default-grade"
              className="min-h-touch w-full rounded-xl border border-ink/15 bg-white px-3 transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
              value={defaultGradeLevel}
              onChange={(e) => setDefaultGradeLevel(e.target.value)}
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

        <div className="space-y-2">
          <Label htmlFor="csv">Contenu CSV</Label>
          <textarea
            id="csv"
            rows={8}
            className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 font-mono text-xs transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={'identifier,fullName,role,gradeLevel\nlycee-x/moussa,Moussa Diop,student,3eme\nlycee-x/fatou,Fatou Sall,student,3eme'}
          />
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-ink/15 bg-white px-3.5 text-sm font-medium text-ink hover:border-science-300 hover:bg-science-50 hover:text-science-700">
            <Upload className="h-4 w-4" />
            Charger un fichier CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileChange(f);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-xs text-ink/60">
            Colonnes attendues :{' '}
            <code className="rounded bg-ink/5 px-1 font-mono text-[11px]">
              identifier, fullName, role?, gradeLevel?
            </code>
            . Header facultatif. Mots de passe générés automatiquement.
          </p>
        </div>

        {error ? (
          <div role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" variant="gradient" onClick={submit} disabled={busy || !csv.trim()}>
            {busy ? 'Import…' : 'Importer'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function BulkResultDialog({
  result,
  onClose,
}: {
  result: BulkImportResultDto;
  onClose: () => void;
}) {
  function downloadCSV() {
    const lines = ['identifier,generated_password'];
    for (const c of result.created) {
      lines.push(`${c.identifier},${c.generatedPassword}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `senlabvisa-passwords-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open onClose={onClose} title="Résultat de l'import">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="action">
            <CheckCircle2 className="h-3 w-3" />
            {result.created.length} créé{result.created.length > 1 ? 's' : ''}
          </Badge>
          {result.failed.length > 0 ? (
            <Badge tone="danger">
              {result.failed.length} échec{result.failed.length > 1 ? 's' : ''}
            </Badge>
          ) : null}
        </div>

        {result.created.length > 0 ? (
          <>
            <p className="rounded-xl bg-alert-50 p-3 text-xs text-alert-700">
              Les mots de passe générés ne sont visibles qu&apos;une seule fois. Télécharge le CSV
              pour les communiquer aux élèves.
            </p>
            <div className="max-h-60 overflow-auto rounded-xl border border-ink/10">
              <table className="w-full text-xs">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-3 py-2 text-left">Identifiant</th>
                    <th className="px-3 py-2 text-left">Mot de passe</th>
                  </tr>
                </thead>
                <tbody>
                  {result.created.map((c) => (
                    <tr key={c.id} className="border-t border-ink/5">
                      <td className="px-3 py-2 font-mono">{c.identifier}</td>
                      <td className="px-3 py-2 font-mono">{c.generatedPassword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {result.failed.length > 0 ? (
          <div className="space-y-1 rounded-xl bg-danger-50 p-3 text-xs">
            <div className="font-semibold text-danger">Échecs :</div>
            <ul className="space-y-1">
              {result.failed.map((f, i) => (
                <li key={i} className="font-mono">
                  {f.identifier} — {f.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          {result.created.length > 0 ? (
            <Button type="button" variant="outline" onClick={downloadCSV}>
              Télécharger les mots de passe (CSV)
            </Button>
          ) : null}
          <Button type="button" variant="gradient" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function CreateUserDialog({
  schools,
  onClose,
  onCreated,
}: {
  schools: SchoolDto[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { token } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<CreateUserDto['role']>('teacher');
  const [schoolId, setSchoolId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await api.users.create(token, {
        identifier,
        fullName,
        password,
        role,
        ...(schoolId ? { schoolId } : {}),
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
    <Dialog open onClose={onClose} title="Nouvel utilisateur">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier">Identifiant (ex : lycee-limamou/moussa)</Label>
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <select
              id="role"
              className="min-h-touch w-full rounded-xl border border-ink/15 bg-white px-3 transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
              value={role}
              onChange={(e) => setRole(e.target.value as CreateUserDto['role'])}
            >
              <option value="student">Élève</option>
              <option value="teacher">Enseignant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe initial</Label>
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="schoolId">École (optionnel)</Label>
            <select
              id="schoolId"
              className="min-h-touch w-full rounded-xl border border-ink/15 bg-white px-3 transition focus:border-science-500 focus:outline-none focus:ring-4 focus:ring-science-100"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">—</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.region})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gradeLevel">Niveau (optionnel)</Label>
            <Input
              id="gradeLevel"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="3eme, Terminale S2…"
            />
          </div>
        </div>

        {error ? (
          <div role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="gradient" disabled={saving}>
            {saving ? 'Création…' : 'Créer'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  initialNewPassword,
  onClose,
}: {
  user: UserDto;
  initialNewPassword: string | null;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [mode, setMode] = useState<'generate' | 'custom'>('generate');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(initialNewPassword);

  async function submit() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.users.resetPassword(
        token,
        user.id,
        mode === 'custom' ? custom : undefined,
      );
      setNewPassword(res.newPassword);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Réinit. — ${user.fullName}`}>
      {newPassword ? (
        <div className="space-y-4">
          <p className="text-sm text-ink/80">
            Nouveau mot de passe pour{' '}
            <span className="rounded bg-ink/5 px-1 font-mono text-xs">{user.identifier}</span> —
            communique-le, il ne sera plus visible après fermeture.
          </p>
          <div className="rounded-xl bg-hero-blue p-4 font-mono text-2xl font-bold tracking-wider text-science-700 ring-1 ring-science-100">
            {newPassword}
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="gradient" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mode</Label>
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink/10 px-3 py-2 hover:bg-science-50">
                <input
                  type="radio"
                  className="accent-science-700"
                  checked={mode === 'generate'}
                  onChange={() => setMode('generate')}
                />
                Générer automatiquement
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink/10 px-3 py-2 hover:bg-science-50">
                <input
                  type="radio"
                  className="accent-science-700"
                  checked={mode === 'custom'}
                  onChange={() => setMode('custom')}
                />
                Spécifier manuellement
              </label>
            </div>
          </div>

          {mode === 'custom' ? (
            <div className="space-y-2">
              <Label htmlFor="newpw">Nouveau mot de passe</Label>
              <Input
                id="newpw"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                minLength={6}
                required
              />
            </div>
          ) : null}

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
              onClick={submit}
              disabled={busy || (mode === 'custom' && custom.length < 6)}
            >
              {busy ? 'Réinit…' : 'Confirmer'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
