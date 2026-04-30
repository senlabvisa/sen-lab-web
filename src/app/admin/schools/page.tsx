'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { SchoolDto } from '@senlabvisa/shared-types';
import { LabShell } from '@/components/lab/lab-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SkeletonRow } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; school: SchoolDto }
  | { mode: 'delete'; school: SchoolDto }
  | null;

export default function AdminSchoolsPage() {
  return (
    <LabShell allowedRoles={['admin']}>
      <AdminSchoolsContent />
    </LabShell>
  );
}

function AdminSchoolsContent() {
  const { token } = useAuth();
  const [schools, setSchools] = useState<SchoolDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      setSchools(await api.schools.list(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Card variant="hero" padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge tone="science" className="mb-3">
              <Building2 className="h-3 w-3" />
              Administration
            </Badge>
            <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
              Écoles
            </h1>
            <p className="mt-2 max-w-xl text-base text-ink/70">
              Gère les établissements partenaires et leur région.
            </p>
          </div>
          <Button
            variant="gradient"
            onClick={() => setDialog({ mode: 'create' })}
            className="hidden md:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Nouvelle école
          </Button>
        </div>
      </Card>

      <div className="flex justify-end md:hidden">
        <Button variant="gradient" onClick={() => setDialog({ mode: 'create' })}>
          <Plus className="h-4 w-4" />
          Nouvelle école
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des écoles ({schools?.length ?? 0})</CardTitle>
        </CardHeader>

        {error ? (
          <div role="alert" className="mb-4 rounded-xl bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {schools !== null && schools.length === 0 ? (
          <div className="space-y-3 py-6 text-center">
            <Building2 className="mx-auto h-10 w-10 text-ink/30" />
            <p className="text-ink/60">Aucune école pour le moment.</p>
            <Button variant="gradient" onClick={() => setDialog({ mode: 'create' })}>
              <Plus className="h-4 w-4" />
              Créer une école
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl ring-1 ring-ink/5">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr className="text-left text-ink/60">
                  <th className="px-4 py-2 font-medium">Nom</th>
                  <th className="px-4 py-2 font-medium">Région</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools === null
                  ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} columns={3} />)
                  : null}
                {schools?.map((s) => (
                  <tr key={s.id} className="border-t border-ink/5 transition hover:bg-science-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-science-50 text-science-700 ring-1 ring-science-100">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="font-medium text-ink">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral" size="sm">
                        {s.region}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialog({ mode: 'edit', school: s })}
                          aria-label={`Modifier ${s.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDialog({ mode: 'delete', school: s })}
                          aria-label={`Supprimer ${s.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {dialog?.mode === 'create' || dialog?.mode === 'edit' ? (
        <SchoolFormDialog
          initial={dialog.mode === 'edit' ? dialog.school : null}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await refresh();
          }}
        />
      ) : null}

      {dialog?.mode === 'delete' ? (
        <DeleteSchoolDialog
          school={dialog.school}
          onClose={() => setDialog(null)}
          onDeleted={async () => {
            setDialog(null);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function SchoolFormDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: SchoolDto | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { token } = useAuth();
  const [name, setName] = useState(initial?.name ?? '');
  const [region, setRegion] = useState(initial?.region ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await api.schools.update(token, initial.id, { name, region });
      } else {
        await api.schools.create(token, { name, region });
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={initial ? "Modifier l'école" : 'Nouvelle école'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lycée Limamou Laye"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">Région</Label>
          <Input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Dakar"
            required
            minLength={2}
          />
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
            {saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteSchoolDialog({
  school,
  onClose,
  onDeleted,
}: {
  school: SchoolDto;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.schools.remove(token, school.id);
      await onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Supprimer l'école ?">
      <div className="space-y-4">
        <p className="rounded-xl bg-danger-50 p-3 text-sm text-danger">
          L&apos;école <strong>{school.name}</strong> ({school.region}) sera supprimée
          définitivement. Cette action ne peut pas être annulée.
        </p>

        {error ? (
          <div role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" variant="danger" disabled={busy} onClick={confirm}>
            {busy ? 'Suppression…' : 'Confirmer la suppression'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
