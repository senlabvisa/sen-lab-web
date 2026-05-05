'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Compass } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import type { AnimalKey } from './niokolo-scene';

/**
 * TP — Classification du vivant, faune du Niokolo-Koba (6ème, SVT)
 *
 * Lab Premium SVT : safari 3D dans le Parc National du Niokolo-Koba
 * (Sénégal oriental, créé en 1954, ~9 130 km²). L'élève rencontre 5
 * animaux emblématiques en cliquant dessus, puis les classe par groupe
 * (mammifère / oiseau / reptile / poisson).
 */

const NiokoloScene = dynamic(() => import('./niokolo-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 text-sm text-ink/50">
      Chargement de la savane 3D…
    </div>
  ),
});

type Step = 'intro' | 'safari' | 'classify' | 'criteres' | 'done';
type AnimalClass = 'mammifere' | 'oiseau' | 'reptile' | 'poisson';
type Critere = 'poils' | 'plumes' | 'ecailles' | null;

const ANIMALS: AnimalKey[] = ['lion', 'antilope', 'hippopotame', 'crocodile', 'calao'];
const ANIMAL_LABELS: Record<AnimalKey, string> = {
  lion: 'Lion',
  antilope: 'Antilope',
  hippopotame: 'Hippopotame',
  crocodile: 'Crocodile',
  calao: 'Calao (oiseau)',
};
const CORRECT_CLASS: Record<AnimalKey, AnimalClass> = {
  lion: 'mammifere',
  antilope: 'mammifere',
  hippopotame: 'mammifere',
  crocodile: 'reptile',
  calao: 'oiseau',
};

const CLASS_LABELS: Record<AnimalClass, string> = {
  mammifere: 'Mammifère',
  oiseau: 'Oiseau',
  reptile: 'Reptile',
  poisson: 'Poisson',
};

const INTRO_NARRATION =
  "Bienvenue au Parc National du Niokolo-Koba ! C'est l'un des plus grands parcs d'Afrique de l'Ouest, " +
  "créé en 1954, dans la région orientale du Sénégal. Il abrite des centaines d'espèces. " +
  "Aujourd'hui, tu vas faire un safari virtuel : tourne la scène pour explorer la savane et clique " +
  "sur chaque animal que tu rencontres pour l'identifier.";

const CONCLUSION_NARRATION =
  "Bravo, tu as appris à classer les animaux ! Les mammifères ont des poils et nourrissent leurs petits avec du lait. " +
  "Les oiseaux ont des plumes et un bec. Les reptiles, comme le crocodile, ont des écailles. " +
  "Au Niokolo-Koba, on protège ces animaux pour qu'ils continuent à vivre dans leur habitat naturel.";

export function ClassificationVivant6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [metAnimals, setMetAnimals] = useState<Set<AnimalKey>>(new Set());
  const [classifications, setClassifications] = useState<Partial<Record<AnimalKey, AnimalClass>>>({});
  const [critere, setCritere] = useState<Critere>(null);

  function handleMeet(a: AnimalKey) {
    setMetAnimals((prev) => {
      if (prev.has(a)) return prev;
      const next = new Set(prev);
      next.add(a);
      return next;
    });
  }

  const correctClassifications = useMemo(
    () =>
      Object.entries(classifications).filter(([k, v]) => v === CORRECT_CLASS[k as AnimalKey]).length,
    [classifications],
  );

  const allClassified = ANIMALS.every((a) => classifications[a] !== undefined);

  const score = useMemo(() => {
    let s = 0;
    s += metAnimals.size * 4; // max 20 pts
    s += correctClassifications * 12; // max 60 pts
    if (critere === 'poils') s += 20;
    return Math.max(0, Math.min(100, s));
  }, [metAnimals, correctClassifications, critere]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'classification-vivant-6eme',
        version: '1.0',
        steps: {
          metAnimals: Array.from(metAnimals),
          classifications,
          critere,
          correctCount: correctClassifications,
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <Compass className="h-5 w-5" />
              </span>
              Safari au Niokolo-Koba
            </CardTitle>
            <Badge tone="action">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le <strong>Parc National du Niokolo-Koba</strong>, dans la région de Tambacounda, est
              l&apos;un des plus grands parcs d&apos;Afrique de l&apos;Ouest. Créé en 1954, il
              s&apos;étend sur près de <strong>9 130 km²</strong> — plus grand que la Gambie !
            </p>
            <p>
              On y trouve des <strong>lions</strong>, <strong>antilopes</strong>,{' '}
              <strong>hippopotames</strong>, <strong>crocodiles</strong>,
              <strong> oiseaux</strong> rares… mais comment classer tous ces animaux ? Tu vas
              découvrir les <strong>grands groupes du vivant</strong>.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('safari')}>
              Commencer le safari
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'safari' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-amber-700" />
              Étape 1 — Rencontre les animaux
            </CardTitle>
            <Badge tone="action">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tourne la scène avec ta souris ou ton doigt. <strong>Clique sur chaque animal</strong>{' '}
            pour le rencontrer. Il y en a 5 à trouver.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <NiokoloScene metAnimals={metAnimals} onMeet={handleMeet} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {ANIMALS.map((a) => (
                <Badge key={a} tone={metAnimals.has(a) ? 'action' : 'neutral'} size="sm">
                  {metAnimals.has(a) ? '✓ ' : ''}
                  {ANIMAL_LABELS[a]}
                </Badge>
              ))}
            </div>
            <Badge tone={metAnimals.size === 5 ? 'action' : 'neutral'} size="sm">
              {metAnimals.size}/5 rencontrés
            </Badge>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="gradient"
              disabled={metAnimals.size < 5}
              onClick={() => setStep('classify')}
            >
              Classer les animaux
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'classify' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — À quel groupe appartient chaque animal ?</CardTitle>
            <Badge tone="action">2/3</Badge>
          </CardHeader>
          <p className="mb-4 text-sm text-ink/70">
            Pour chaque animal, choisis son groupe : mammifère, oiseau, reptile ou poisson.
          </p>

          <div className="space-y-3">
            {ANIMALS.map((a) => (
              <div
                key={a}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-3"
              >
                <span className="font-semibold text-ink">{ANIMAL_LABELS[a]}</span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CLASS_LABELS) as AnimalClass[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setClassifications((prev) => ({ ...prev, [a]: c }))
                      }
                      className={
                        'rounded-full px-3 py-1 text-xs font-semibold transition ' +
                        (classifications[a] === c
                          ? 'bg-emerald-600 text-white shadow-soft'
                          : 'bg-ink/5 text-ink/70 hover:bg-emerald-50 hover:text-emerald-700')
                      }
                    >
                      {CLASS_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('safari')}>
              Revoir le safari
            </Button>
            <Button variant="gradient" disabled={!allClassified} onClick={() => setStep('criteres')}>
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'criteres' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Comment reconnaître un mammifère ?</CardTitle>
            <Badge tone="action">3/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le lion, l&apos;hippopotame et l&apos;antilope appartiennent au même groupe : les{' '}
            <strong>mammifères</strong>. Quel est leur point commun le plus visible ?
          </p>
          <Qcm
            label="Choisis la bonne réponse :"
            options={[
              { key: 'poils', label: 'Ils ont tous des poils sur le corps.' },
              { key: 'plumes', label: 'Ils ont tous des plumes.' },
              { key: 'ecailles', label: 'Ils ont tous des écailles.' },
            ]}
            value={critere}
            onChange={(v) => setCritere(v as Critere)}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('classify')}>
              Revoir les classements
            </Button>
            <Button variant="success" disabled={!critere || busy} onClick={handleValidate}>
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
              Tu as classé <strong>{correctClassifications}/5</strong> animaux correctement. Les
              critères pour classer le vivant sont nombreux : <strong>poils</strong> (mammifères),{' '}
              <strong>plumes</strong> (oiseaux), <strong>écailles</strong> (reptiles et poissons),{' '}
              type de respiration, etc.
            </p>
            <p>
              Au <strong>Niokolo-Koba</strong>, ces animaux vivent ensemble et forment un
              écosystème fragile que le Sénégal protège.
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
