'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Scale } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import type { ObjectKey } from './density-scene';

/**
 * TP — Masse, volume, densité (6ème, Physique-Chimie)
 *
 * Lab Premium PC : 4 objets dans une cuve d'eau 3D, l'élève les clique
 * pour observer leur position d'équilibre (flotte ou coule). Une mini-
 * sandbox calcule la densité (m/V) avec deux sliders. Final : règle de
 * flottaison (densité < eau ⇒ flotte).
 */

const DensityScene = dynamic(() => import('./density-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-blue-50 via-white to-violet-50 text-sm text-ink/50">
      Chargement de la cuve 3D…
    </div>
  ),
});

type Step = 'intro' | 'observe' | 'sandbox' | 'rule' | 'done';
type Rule = 'flotte' | 'coule' | 'depend' | null;

const OBJECT_DATA: Record<ObjectKey, { label: string; mass: number; volume: number; density: number; floats: boolean }> = {
  bois: { label: 'Bois', mass: 175, volume: 250, density: 0.7, floats: true },
  polystyrene: { label: 'Polystyrène', mass: 5, volume: 100, density: 0.05, floats: true },
  glacon: { label: 'Glaçon', mass: 92, volume: 100, density: 0.92, floats: true },
  fer: { label: 'Bille de fer', mass: 31.5, volume: 4, density: 7.87, floats: false },
};

const INTRO_NARRATION =
  "Pourquoi un morceau de bois flotte sur l'eau, alors qu'une bille de fer coule au fond ? " +
  "Pourquoi les bateaux flottent même s'ils sont en métal ? Le secret s'appelle la densité. " +
  "Tu vas comparer 4 objets dans une cuve d'eau et découvrir la règle qui décide si un objet flotte ou coule.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu as compris la règle : un objet flotte si sa densité est plus petite que celle de l'eau. " +
  "Le bois et le polystyrène ont une densité plus petite que 1 : ils flottent. La bille de fer a une densité de 7,87 : elle coule. " +
  "Le glaçon a une densité de 0,92 : il flotte juste sous la surface. C'est ce qui explique aussi les icebergs.";

export function MasseVolumeDensite6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [selected, setSelected] = useState<ObjectKey | null>(null);
  const [observed, setObserved] = useState<Set<ObjectKey>>(new Set());

  // Sandbox densité
  const [mass, setMass] = useState(80);
  const [volume, setVolume] = useState(100);
  const computedDensity = mass / volume;
  const floats = computedDensity < 1;

  const [rule, setRule] = useState<Rule>(null);

  function handleSelect(k: ObjectKey) {
    setSelected(k);
    setObserved((prev) => {
      if (prev.has(k)) return prev;
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += observed.size * 10; // max 40 pts
    if (computedDensity < 5 && computedDensity > 0.05) s += 20; // a manipulé sandbox
    if (rule === 'depend') s += 40;
    return Math.max(0, Math.min(100, s));
  }, [observed, computedDensity, rule]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'masse-volume-densite-6eme',
        version: '1.0',
        steps: {
          observed: Array.from(observed),
          sandbox: { mass, volume, density: computedDensity, floats },
          rule,
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-700 shadow-soft ring-1 ring-blue-100">
                <Scale className="h-5 w-5" />
              </span>
              Flotter ou couler ? La densité
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Quand tu jettes un caillou dans le fleuve <strong>Sénégal</strong>, il coule. Quand
              tu jettes un morceau de bois, il flotte. Pourquoi ?
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Mission :</strong> tu vas observer 4 objets dans une cuve d&apos;eau, et
              découvrir la règle qui décide si un objet flotte ou coule.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('observe')}>
              Ouvrir la cuve
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-700" />
              Étape 1 — Observe les objets dans l&apos;eau
            </CardTitle>
            <Badge tone="science">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tourne la cuve et <strong>clique sur chaque objet</strong> pour voir sa masse, son
            volume et sa densité. Tu remarqueras que certains flottent à des hauteurs
            différentes.
          </p>

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
              <div className="aspect-[4/3] w-full">
                <DensityScene selected={selected} onSelect={handleSelect} />
              </div>
            </div>

            {/* Fiche d'identité de l'objet sélectionné */}
            <div className="rounded-2xl border border-blue-100 bg-white p-4">
              {selected ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {OBJECT_DATA[selected].label}
                    </h3>
                    <Badge tone={OBJECT_DATA[selected].floats ? 'action' : 'alert'} size="sm">
                      {OBJECT_DATA[selected].floats ? 'Flotte' : 'Coule'}
                    </Badge>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                      <dt className="text-ink/60">Masse (m)</dt>
                      <dd className="font-mono font-semibold text-blue-700">
                        {OBJECT_DATA[selected].mass} g
                      </dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                      <dt className="text-ink/60">Volume (V)</dt>
                      <dd className="font-mono font-semibold text-blue-700">
                        {OBJECT_DATA[selected].volume} cm³
                      </dd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2 ring-1 ring-violet-100">
                      <dt className="text-ink/60">
                        <strong>Densité</strong> (m / V)
                      </dt>
                      <dd className="font-mono font-bold text-violet-700">
                        {OBJECT_DATA[selected].density}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <div className="grid h-full place-items-center text-center text-sm text-ink/50">
                  Clique sur un objet dans la cuve pour voir ses propriétés.
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(Object.keys(OBJECT_DATA) as ObjectKey[]).map((k) => (
                <Badge key={k} tone={observed.has(k) ? 'action' : 'neutral'} size="sm">
                  {observed.has(k) ? '✓ ' : ''}
                  {OBJECT_DATA[k].label}
                </Badge>
              ))}
            </div>
            <Badge tone={observed.size >= 4 ? 'action' : 'neutral'} size="sm">
              {observed.size}/4 observés
            </Badge>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={observed.size < 3} onClick={() => setStep('sandbox')}>
              Calculer une densité
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'sandbox' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Mini labo densité</CardTitle>
            <Badge tone="science">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Imagine un objet quelconque. Choisis sa masse et son volume, et regarde si la densité
            le ferait flotter dans l&apos;eau (densité &lt; 1) ou couler (densité &gt; 1).
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="mass">Masse</Label>
                <span className="font-mono text-sm font-semibold text-violet-700">{mass} g</span>
              </div>
              <input
                id="mass"
                type="range"
                min={5}
                max={500}
                step={5}
                value={mass}
                onChange={(e) => setMass(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="vol">Volume</Label>
                <span className="font-mono text-sm font-semibold text-violet-700">{volume} cm³</span>
              </div>
              <input
                id="vol"
                type="range"
                min={5}
                max={500}
                step={5}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div
            className={
              'mt-4 rounded-2xl p-4 text-center ring-1 ' +
              (floats
                ? 'bg-action-50 text-action-700 ring-action-100'
                : 'bg-alert-50 text-alert-700 ring-alert-100')
            }
          >
            <div className="text-xs uppercase tracking-wider opacity-60">Densité = m / V</div>
            <div className="mt-1 font-display text-3xl font-bold">
              {computedDensity.toFixed(2)}
            </div>
            <div className="mt-1 text-sm font-semibold">
              {floats ? '✓ Flotte sur l’eau' : '⚠ Coule au fond'}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir la cuve
            </Button>
            <Button variant="gradient" onClick={() => setStep('rule')}>
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'rule' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — La règle</CardTitle>
            <Badge tone="science">3/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tu as observé 4 objets et calculé toi-même des densités. Quelle est la règle ?
          </p>
          <Qcm
            label="Un objet…"
            options={[
              { key: 'flotte', label: 'flotte si sa masse est petite.' },
              { key: 'coule', label: 'coule si son volume est grand.' },
              { key: 'depend', label: 'flotte si sa densité est plus petite que celle de l’eau (1 g/cm³).' },
            ]}
            value={rule}
            onChange={(v) => setRule(v as Rule)}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('sandbox')}>
              Revoir le labo
            </Button>
            <Button variant="success" disabled={!rule || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Tu connais maintenant la <strong>règle de flottaison</strong> : un objet{' '}
              <strong>flotte</strong> si sa densité est plus petite que celle de l&apos;eau (1 g/cm³),
              et <strong>coule</strong> si elle est plus grande.
            </p>
            <p>
              Et le bateau ? Il est en métal mais flotte parce que sa <strong>forme creuse</strong>{' '}
              augmente son volume sans ajouter de masse — la densité globale du bateau (acier +
              air) reste plus petite que 1.
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
                ? 'border-blue-500 bg-blue-50'
                : 'border-ink/10 hover:border-blue-200 hover:bg-blue-50/50')
            }
          >
            <input
              type="radio"
              className="mt-0.5 accent-blue-600"
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
