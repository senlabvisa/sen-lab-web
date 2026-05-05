'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BarChart3, CheckCircle2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';

/**
 * TP — Lecture de graphiques (météo Dakar) — 6ème, Maths.
 *
 * Lab Premium Maths : graphique 3D des précipitations mensuelles à
 * Dakar (12 barres bleues) + soleil. L'élève lit les valeurs en
 * cliquant sur les barres, puis répond à des questions sur les
 * extrêmes et les saisons.
 */

const MeteoScene = dynamic(() => import('./meteo-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-blue-50 text-sm text-ink/50">
      Chargement du graphique 3D…
    </div>
  ),
});

type Step = 'intro' | 'observe' | 'qpic' | 'qsaison' | 'done';
type MaxMonth = 'juillet' | 'aout' | 'septembre' | 'octobre' | null;
type Saison = 'hivernage' | 'seche-fraiche' | 'seche-chaude' | null;

const DAKAR_DATA = [
  { month: 'Jan', rain: 0, temp: 21 },
  { month: 'Fév', rain: 1, temp: 21 },
  { month: 'Mar', rain: 0, temp: 22 },
  { month: 'Avr', rain: 0, temp: 22 },
  { month: 'Mai', rain: 1, temp: 23 },
  { month: 'Juin', rain: 18, temp: 26 },
  { month: 'Juil', rain: 88, temp: 27 },
  { month: 'Août', rain: 250, temp: 27 },
  { month: 'Sep', rain: 163, temp: 27 },
  { month: 'Oct', rain: 38, temp: 27 },
  { month: 'Nov', rain: 3, temp: 25 },
  { month: 'Déc', rain: 6, temp: 22 },
];

const INTRO_NARRATION =
  "Au Sénégal, on parle souvent de la saison sèche et de l'hivernage. Mais quelle est exactement la différence ? " +
  "Combien tombe-t-il de pluie à Dakar dans une année ? Tu vas lire un graphique en 3D des précipitations mois par mois.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu as découvert que la pluie à Dakar tombe surtout entre juin et octobre, c'est l'hivernage. " +
  "Le reste de l'année, c'est la saison sèche. Le mois le plus pluvieux est août, avec environ 250 mm. " +
  "Lire un graphique te permet de comprendre des données en un coup d'œil.";

export function GraphiquesMeteo6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [selected, setSelected] = useState<number | null>(null);
  const [explored, setExplored] = useState<Set<number>>(new Set());

  const [maxMonth, setMaxMonth] = useState<MaxMonth>(null);
  const [saison, setSaison] = useState<Saison>(null);

  function handleSelect(i: number) {
    setSelected(i);
    setExplored((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(40, explored.size * 4); // max 40
    if (maxMonth === 'aout') s += 30;
    if (saison === 'hivernage') s += 30;
    return Math.max(0, Math.min(100, s));
  }, [explored, maxMonth, saison]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'graphiques-meteo-6eme',
        version: '1.0',
        steps: {
          explored: Array.from(explored),
          maxMonth,
          saison,
          data: DAKAR_DATA,
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
                <BarChart3 className="h-5 w-5" />
              </span>
              La pluie à Dakar, mois par mois
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À <strong>Dakar</strong>, certains mois il pleut beaucoup, d&apos;autres pas du
              tout. Tu vas lire un graphique 3D pour savoir quand pleuvoir, et comprendre la
              différence entre la <strong>saison sèche</strong> et l&apos;<strong>hivernage</strong>.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Mission :</strong> clique sur chaque barre pour lire la pluie et la
              température du mois. Trouve le mois le plus pluvieux !
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('observe')}>
              Voir le graphique
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-700" />
              Étape 1 — Explore le graphique
            </CardTitle>
            <Badge tone="maths">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Clique sur les barres bleues pour voir la pluie (mm) et la température (°C) de chaque
            mois.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <MeteoScene data={DAKAR_DATA} selectedIndex={selected} onSelect={handleSelect} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ink/60">
              Explorés : <strong>{explored.size}/12</strong> mois
            </span>
            <Badge tone={explored.size >= 5 ? 'action' : 'neutral'} size="sm">
              {explored.size >= 5 ? 'Bien exploré' : 'Encore quelques mois'}
            </Badge>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={explored.size < 5} onClick={() => setStep('qpic')}>
              Question 1
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qpic' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Le mois le plus pluvieux</CardTitle>
            <Badge tone="maths">2/3</Badge>
          </CardHeader>
          <Qcm
            label="Quel est le mois où il tombe le plus de pluie à Dakar ?"
            options={[
              { key: 'juillet', label: 'Juillet' },
              { key: 'aout', label: 'Août' },
              { key: 'septembre', label: 'Septembre' },
              { key: 'octobre', label: 'Octobre' },
            ]}
            value={maxMonth}
            onChange={(v) => setMaxMonth(v as MaxMonth)}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir le graphique
            </Button>
            <Button variant="gradient" disabled={!maxMonth} onClick={() => setStep('qsaison')}>
              Question 2
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qsaison' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Et la saison ?</CardTitle>
            <Badge tone="maths">3/3</Badge>
          </CardHeader>
          <Qcm
            label="La période de juin à octobre, quand il pleut beaucoup, s'appelle :"
            options={[
              { key: 'hivernage', label: "L'hivernage (saison des pluies)" },
              { key: 'seche-fraiche', label: 'La saison sèche fraîche' },
              { key: 'seche-chaude', label: 'La saison sèche chaude' },
            ]}
            value={saison}
            onChange={(v) => setSaison(v as Saison)}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('qpic')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!saison || busy} onClick={handleValidate}>
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
              Bravo ! À Dakar, le mois le plus pluvieux est <strong>août</strong> (~250 mm) et la
              saison des pluies (juin-octobre) s&apos;appelle l&apos;<strong>hivernage</strong>.
            </p>
            <p>
              Lire un graphique te permet de comprendre des données en un coup d&apos;œil — c&apos;est
              une compétence très utile en sciences, en sport, et dans la vie quotidienne.
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
