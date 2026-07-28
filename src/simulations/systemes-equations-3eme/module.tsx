'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Calculator, Crosshair, LineChart, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Systèmes de deux équations à deux inconnues (Mathématiques, 3ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → observation →
 * QCM → bilan. Résolution graphique : chaque équation est une droite
 * y = a·x + b ; la solution du système est le POINT D'INTERSECTION des deux
 * droites. Contexte sénégalais : comparer deux tarifs (forfait téléphone et
 * achat au marché) pour savoir à partir de quand l'un devient plus avantageux.
 */

const SystemScene = dynamic(() => import('./system-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-sky-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'intersection' | 'depart' | 'pente' | null;

const INTRO =
  "Au marché de Tilène, à Dakar, tu compares deux façons de payer ton crédit téléphone. " +
  "Chaque offre se traduit par une droite sur un graphique. Résoudre le système, c'est trouver le couple x et y " +
  "où les deux droites se croisent : ce point vérifie les deux équations à la fois.";

const CONCLUSION =
  "Bravo ! La solution graphique d'un système de deux équations, c'est le point d'intersection des deux droites : " +
  "ses coordonnées (x ; y) vérifient les deux équations en même temps. Si les droites sont parallèles distinctes, " +
  "il n'y a aucune solution ; si elles sont confondues, il y a une infinité de solutions.";

type Solution = { kind: 'unique'; x: number; y: number } | { kind: 'none' } | { kind: 'infinite' };

function solve(a1: number, b1: number, a2: number, b2: number): Solution {
  if (a1 === a2) return b1 === b2 ? { kind: 'infinite' } : { kind: 'none' };
  const x = (b2 - b1) / (a1 - a2);
  const y = a1 * x + b1;
  return { kind: 'unique', x, y };
}

export function SystemesEquations3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  // Droite 1 (tarif A) et droite 2 (tarif B) : y = a·x + b
  const [a1, setA1] = useState(1);
  const [b1, setB1] = useState(1);
  const [a2, setA2] = useState(-1);
  const [b2, setB2] = useState(5);

  // Exploration : a-t-on observé chacun des 3 cas ?
  const [sawUnique, setSawUnique] = useState(false);
  const [sawNone, setSawNone] = useState(false);
  const [sawInfinite, setSawInfinite] = useState(false);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qSolution, setQSolution] = useState<string | null>(null);
  const [qParallele, setQParallele] = useState<string | null>(null);
  const [qVerifie, setQVerifie] = useState<string | null>(null);

  const sol = useMemo(() => solve(a1, b1, a2, b2), [a1, b1, a2, b2]);

  function recordCase() {
    if (sol.kind === 'unique') setSawUnique(true);
    else if (sol.kind === 'none') setSawNone(true);
    else setSawInfinite(true);
  }

  const casesSeen = (sawUnique ? 1 : 0) + (sawNone ? 1 : 0) + (sawInfinite ? 1 : 0);

  const score = useMemo(() => {
    let s = 0;
    s += casesSeen * 10; // exploration : 30 max pour les 3 cas
    if (hypo === 'intersection') s += 10;
    if (qSolution === 'intersection') s += 20;
    if (qParallele === 'aucune') s += 20;
    if (qVerifie === 'deux') s += 20;
    return Math.min(100, s);
  }, [casesSeen, hypo, qSolution, qParallele, qVerifie]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'systemes-equations-3eme',
        version: '2.0',
        steps: {
          lines: { a1, b1, a2, b2 },
          solution: sol,
          casesSeen: { sawUnique, sawNone, sawInfinite },
          hypothesis: hypo,
          qcm: { qSolution, qParallele, qVerifie },
        },
      },
      score,
    );
    setStep('done');
  }

  const solText =
    sol.kind === 'unique'
      ? `solution unique : (${sol.x.toFixed(1)} ; ${sol.y.toFixed(1)})`
      : sol.kind === 'none'
        ? 'aucune solution (droites parallèles)'
        : 'infinité de solutions (droites confondues)';

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sky-700 shadow-soft ring-1 ring-sky-100">
                <Calculator className="h-5 w-5" />
              </span>
              Deux tarifs, deux droites
            </CardTitle>
            <Badge tone="maths">Mathématiques · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au <strong>marché de Tilène</strong>, tu compares deux offres de crédit téléphone. Chaque offre devient
              une <strong>droite</strong> sur un graphique : <span className="font-mono">y = a·x + b</span>.
            </p>
            <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
              <strong>Objectif :</strong> comprendre que résoudre le système, c&apos;est trouver le couple{' '}
              <span className="font-mono">(x ; y)</span> où les deux droites se croisent — le seul qui vérifie{' '}
              <strong>les deux équations à la fois</strong>.
            </p>
            <NarrationButton text={INTRO} label="Écouter l'introduction" />
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypo')}>
              Commencer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'hypo' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-sky-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Sur le graphique, où se trouve la <strong>solution</strong> d&apos;un système de deux équations à deux
            inconnues, selon toi ?
          </p>
          <QcmStep
            label="Je pense que la solution se lit…"
            tone="science"
            options={[
              { key: 'intersection', label: 'Au point où les deux droites se croisent' },
              { key: 'depart', label: 'Là où une droite part de l’axe (son ordonnée à l’origine)' },
              { key: 'pente', label: 'À l’endroit où une droite est la plus inclinée' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Tester ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-sky-700" /> Étape 2 — Règle les deux droites
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Modifie la pente <span className="font-mono">a</span> et l&apos;ordonnée à l&apos;origine{' '}
            <span className="font-mono">b</span> de chaque droite. Observe leur point d&apos;intersection. Tourne la
            scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-sky-100">
            <div className="aspect-[4/3] w-full">
              <SystemScene a1={a1} b1={b1} a2={a2} b2={b2} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-100">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-700">
                Tarif A : <span className="font-mono normal-case">y = {a1}x {b1 >= 0 ? `+ ${b1}` : `- ${-b1}`}</span>
              </div>
              <Slider id="a1" label="pente a₁" value={a1} min={-2} max={2} onChange={setA1} />
              <Slider id="b1" label="ordonnée b₁" value={b1} min={-3} max={3} onChange={setB1} />
            </div>
            <div className="rounded-2xl bg-orange-50/70 p-3 ring-1 ring-orange-100">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-700">
                Tarif B : <span className="font-mono normal-case">y = {a2}x {b2 >= 0 ? `+ ${b2}` : `- ${-b2}`}</span>
              </div>
              <Slider id="a2" label="pente a₂" value={a2} min={-2} max={2} onChange={setA2} accent="orange" />
              <Slider id="b2" label="ordonnée b₂" value={b2} min={-3} max={3} onChange={setB2} accent="orange" />
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-night-900/95 px-4 py-2 text-center font-mono text-sm text-emerald-300">
            Système actuel → {solText}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <CaseChip label="Sécantes" done={sawUnique} hint="1 solution" />
            <CaseChip label="Parallèles" done={sawNone} hint="0 solution" />
            <CaseChip label="Confondues" done={sawInfinite} hint="∞ solutions" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordCase}>
              <Crosshair className="h-4 w-4" /> Noter ce cas
            </Button>
            <Button variant="gradient" disabled={casesSeen < 2} onClick={() => setStep('mesures')}>
              {casesSeen < 2 ? `Observe ${2 - casesSeen} cas de plus` : 'Voir le bilan'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {casesSeen < 3 && (
            <p className="mt-2 text-center text-[11px] text-ink/50">
              Astuce : mets <span className="font-mono">a₁ = a₂</span> pour obtenir des droites parallèles (puis{' '}
              <span className="font-mono">b₁ = b₂</span> pour des droites confondues).
            </p>
          )}
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ce que tu as observé</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Trois positions possibles pour deux droites, donc trois types de systèmes :
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-xs uppercase tracking-wider text-sky-700">
                <tr>
                  <th className="px-4 py-2 text-left">Les deux droites…</th>
                  <th className="px-4 py-2 text-left">Le système a…</th>
                </tr>
              </thead>
              <tbody>
                <Row left="se croisent (sécantes)" right="une solution unique (x ; y)" seen={sawUnique} />
                <Row left="sont parallèles distinctes" right="aucune solution" seen={sawNone} />
                <Row left="sont confondues" right="une infinité de solutions" seen={sawInfinite} />
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
            La solution (x ; y) est le <strong>point d&apos;intersection</strong> : ses coordonnées vérifient en même
            temps <span className="font-mono">y = a₁x + b₁</span> et <span className="font-mono">y = a₂x + b₂</span>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retester
            </Button>
            <Button variant="gradient" onClick={() => setStep('qcm')}>
              Conclure <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 4 — Valide ta compréhension</CardTitle>
            <Badge tone="maths">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="La solution graphique d'un système de 2 équations est…"
              tone="science"
              options={[
                { key: 'intersection', label: 'Le point d’intersection des deux droites' },
                { key: 'milieu', label: 'Le milieu du segment entre les deux droites' },
                { key: 'origine', label: 'Toujours l’origine du repère (0 ; 0)' },
              ]}
              value={qSolution}
              onChange={setQSolution}
            />
            <QcmStep
              label="Si les deux droites sont parallèles (distinctes), le système a…"
              tone="science"
              options={[
                { key: 'aucune', label: 'Aucune solution' },
                { key: 'une', label: 'Une seule solution' },
                { key: 'infinite', label: 'Une infinité de solutions' },
              ]}
              value={qParallele}
              onChange={setQParallele}
            />
            <QcmStep
              label="Un couple (x ; y) est solution du système s'il vérifie…"
              tone="science"
              options={[
                { key: 'deux', label: 'Les deux équations à la fois' },
                { key: 'une', label: 'Au moins une des deux équations' },
                { key: 'somme', label: 'La somme des deux équations seulement' },
              ]}
              value={qVerifie}
              onChange={setQVerifie}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qSolution || !qParallele || !qVerifie || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Résoudre un système 2×2, c&apos;est trouver le couple <span className="font-mono">(x ; y)</span> qui
              vérifie les <strong>deux équations</strong> : c&apos;est le <strong>point d&apos;intersection</strong> des
              deux droites. Droites <strong>parallèles distinctes</strong> → aucune solution ;{' '}
              <strong>confondues</strong> → une infinité.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  onChange,
  accent = 'sky',
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accent?: 'sky' | 'orange';
}) {
  const ink = accent === 'orange' ? 'text-orange-700' : 'text-sky-700';
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <Label htmlFor={id}>{label}</Label>
        <span className={`font-mono font-semibold ${ink}`}>{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-lab w-full"
      />
    </div>
  );
}

function CaseChip({ label, done, hint }: { label: string; done: boolean; hint: string }) {
  return (
    <div className={'rounded-xl p-2 ring-1 ' + (done ? 'bg-emerald-50 ring-emerald-200' : 'bg-night-50 ring-night-100')}>
      <div className={'text-[11px] font-bold ' + (done ? 'text-emerald-700' : 'text-ink/60')}>
        {done ? '✓ ' : ''}
        {label}
      </div>
      <div className="text-[10px] text-ink/45">{hint}</div>
    </div>
  );
}

function Row({ left, right, seen }: { left: string; right: string; seen: boolean }) {
  return (
    <tr className={'border-t border-night-100 ' + (seen ? 'bg-emerald-50 font-semibold' : '')}>
      <td className="px-4 py-2">{left}</td>
      <td className="px-4 py-2">
        {right} {seen ? '✓' : ''}
      </td>
    </tr>
  );
}
