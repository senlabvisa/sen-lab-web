'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Trees } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';

/**
 * TP — Mangrove du Saloum (6ème, SVT)
 *
 * Lab Premium SVT : écosystème 3D explorable (palétuviers + faune
 * cliquable), narration FR pour intro et conclusion, QCM rôle de la
 * mangrove + impact de la déforestation. Contexte : delta du Saloum
 * (région de Foundiougne / Joal-Fadiouth).
 */

const MangroveScene = dynamic(() => import('./mangrove-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 text-sm text-ink/50">
      Chargement de l&apos;écosystème 3D…
    </div>
  ),
});

type Species = 'paletuvier' | 'poisson' | 'crabe' | 'oiseau';
type Step = 'intro' | 'explore' | 'role' | 'deforestation' | 'done';
type Role = 'pouponniere' | 'decoration' | 'cocotiers' | null;
type Defo = 'erosion-poissons' | 'rien' | 'plus-poissons' | null;

const INTRO_NARRATION =
  "Bienvenue dans la mangrove du Saloum ! Près de Foundiougne et de Joal-Fadiouth, " +
  "il existe une forêt très spéciale qui pousse les pieds dans l'eau salée. " +
  "Les arbres s'appellent des palétuviers : ils ont des racines aériennes en forme d'échasses. " +
  "Cette forêt abrite des centaines d'espèces : poissons, crabes, oiseaux, huîtres. " +
  "Tu vas l'explorer en 3D. Tourne la scène avec ta souris ou ton doigt, et clique sur chaque " +
  "créature pour l'identifier.";

const CONCLUSION_NARRATION =
  "Bravo, tu as exploré la mangrove du Saloum ! Cette forêt est une vraie pouponnière à poissons : " +
  "les jeunes poissons s'y cachent et grandissent en sécurité. Les racines des palétuviers retiennent " +
  "aussi le sable et protègent le rivage de l'érosion. Si on coupe les palétuviers, on perd les poissons " +
  "et la mer avance dans les villages. C'est pour ça que la mangrove est protégée au Sénégal.";

const SPECIES_LABEL: Record<Species, string> = {
  paletuvier: 'Palétuvier',
  poisson: 'Poisson',
  crabe: 'Crabe',
  oiseau: 'Oiseau',
};

export function MangroveSaloum6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [identified, setIdentified] = useState<Set<Species>>(new Set());
  const [role, setRole] = useState<Role>(null);
  const [defo, setDefo] = useState<Defo>(null);

  function handleIdentify(s: Species) {
    setIdentified((prev) => {
      if (prev.has(s)) return prev;
      const next = new Set(prev);
      next.add(s);
      return next;
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += identified.size * 8; // max 32 pts pour 4 espèces
    if (role === 'pouponniere') s += 35;
    if (defo === 'erosion-poissons') s += 33;
    return Math.max(0, Math.min(100, s));
  }, [identified, role, defo]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'mangrove-saloum-6eme',
        version: '1.0',
        steps: {
          identified: Array.from(identified),
          role,
          defo,
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Trees className="h-5 w-5" />
              </span>
              La mangrove du Saloum
            </CardTitle>
            <Badge tone="action">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À <strong>Foundiougne</strong> et <strong>Joal-Fadiouth</strong>, dans le delta du
              Saloum, pousse une forêt très spéciale : la <strong>mangrove</strong>. Ses arbres,
              les <strong>palétuviers</strong>, ont des racines en forme d&apos;échasses qui
              plongent dans l&apos;eau salée.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Mission :</strong> tourne la scène 3D, plonge sous l&apos;eau, et{' '}
              <strong>clique sur chaque créature</strong> que tu trouves pour l&apos;identifier.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('explore')}>
              Entrer dans la mangrove
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'explore' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trees className="h-5 w-5 text-emerald-700" />
              Étape 1 — Explore et identifie
            </CardTitle>
            <Badge tone="action">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais tourner la scène. Plonge sous la surface bleue de l&apos;eau pour voir les
            poissons. Clique sur chaque <strong>palétuvier</strong>, <strong>poisson</strong>,{' '}
            <strong>crabe</strong> et <strong>oiseau</strong> que tu rencontres.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <MangroveScene identified={identified} onIdentify={handleIdentify} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2 text-xs">
              {(Object.keys(SPECIES_LABEL) as Species[]).map((s) => (
                <Badge key={s} tone={identified.has(s) ? 'action' : 'neutral'} size="sm">
                  {identified.has(s) ? '✓ ' : ''}
                  {SPECIES_LABEL[s]}
                </Badge>
              ))}
            </div>
            <Badge tone={identified.size === 4 ? 'action' : 'neutral'} size="sm">
              {identified.size}/4 espèces
            </Badge>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="gradient"
              disabled={identified.size < 3}
              onClick={() => setStep('role')}
            >
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'role' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — À quoi sert la mangrove ?</CardTitle>
            <Badge tone="action">2/3</Badge>
          </CardHeader>
          <Qcm
            label="Quel est le rôle principal de la mangrove pour les poissons ?"
            options={[
              {
                key: 'pouponniere',
                label: "C'est leur pouponnière : les jeunes poissons s'y cachent et y grandissent en sécurité.",
              },
              {
                key: 'decoration',
                label: 'Elle sert juste de décoration : elle est belle.',
              },
              {
                key: 'cocotiers',
                label: 'Elle donne des noix de coco aux poissons.',
              },
            ]}
            value={role}
            onChange={(v) => setRole(v as Role)}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('explore')}>
              Revoir la mangrove
            </Button>
            <Button variant="gradient" disabled={!role} onClick={() => setStep('deforestation')}>
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'deforestation' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Et si on coupait les palétuviers ?</CardTitle>
            <Badge tone="action">3/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Imagine qu&apos;on coupe une grande partie de la mangrove pour faire du bois ou du
            charbon. Que va-t-il se passer ?
          </p>
          <Qcm
            label="Choisis la conséquence la plus probable :"
            options={[
              {
                key: 'erosion-poissons',
                label: 'La mer avance vers les villages (érosion) ET il y a moins de poissons.',
              },
              { key: 'rien', label: 'Rien de spécial.' },
              { key: 'plus-poissons', label: 'Il y aura plus de poissons.' },
            ]}
            value={defo}
            onChange={(v) => setDefo(v as Defo)}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('role')}>
              Revoir la question
            </Button>
            <Button variant="success" disabled={!defo || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Tu as découvert la <strong>mangrove du Saloum</strong> ! Elle est essentielle pour
              les poissons (pouponnière), pour les villages (protection contre l&apos;érosion)
              et pour la biodiversité (centaines d&apos;espèces).
            </p>
            <p>
              C&apos;est pour ça qu&apos;au Sénégal, la mangrove est protégée par des aires
              marines comme le <strong>Parc National du Delta du Saloum</strong>.
            </p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Qcm({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  value: string | null;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      <div className="grid gap-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={
              'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ' +
              (value === opt.key
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-ink/10 hover:border-emerald-200 hover:bg-emerald-50/50')
            }
          >
            <input
              type="radio"
              className="mt-0.5 accent-emerald-600"
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
