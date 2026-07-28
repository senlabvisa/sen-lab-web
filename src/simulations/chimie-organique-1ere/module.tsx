'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Atom, CheckCircle2, FlaskConical, Lightbulb, Microscope } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Chimie organique : alcanes et alcènes (Première S).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (modèle CPK) →
 * observation → QCM → bilan. L'élève compare une liaison simple C–C (alcanes :
 * méthane CH₄, éthane C₂H₆) à la double liaison C=C d'un alcène (éthylène C₂H₄).
 * Contexte : le gaz butane des bouteilles, le pétrole et le gaz naturel.
 */

const AlkaneScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'observ' | 'qcm' | 'done';
type Family = 'alcane' | 'alcene';
type HypoRep = 'pareil' | 'double' | 'triple' | null;

const INTRO =
  "Dans les bouteilles de gaz qui servent à cuisiner partout au Sénégal, il y a du butane : un alcane. " +
  "Le pétrole et le gaz naturel sont aussi faits d'hydrocarbures, des molécules de carbone et d'hydrogène. " +
  "Aujourd'hui tu vas comparer deux familles : les alcanes, avec uniquement des liaisons simples, et les alcènes, qui possèdent une double liaison entre deux carbones.";

const CONCLUSION =
  "Bravo ! Un alcane ne contient que des liaisons simples C–C : sa formule est CₙH₂ₙ₊₂, comme le méthane CH₄ ou le butane C₄H₁₀ des bouteilles de gaz. " +
  "Un alcène possède une double liaison C=C : sa formule est CₙH₂ₙ, comme l'éthylène C₂H₄ qui sert à fabriquer le polyéthylène, le plastique des sachets. " +
  "Et dans tous les cas, chaque atome de carbone forme toujours 4 liaisons.";

export function ChimieOrganique1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [family, setFamily] = useState<Family>('alcane');
  const [n, setN] = useState(1);
  const [seen, setSeen] = useState<Set<string>>(new Set(['alcane:1']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qSimple, setQSimple] = useState<string | null>(null);
  const [qAlcene, setQAlcene] = useState<string | null>(null);
  const [qCarbone, setQCarbone] = useState<string | null>(null);

  const sawAlcane = useMemo(() => Array.from(seen).some((k) => k.startsWith('alcane')), [seen]);
  const sawAlcene = useMemo(() => seen.has('alcene:0'), [seen]);
  const exploredBoth = sawAlcane && sawAlcene;

  function visit(f: Family, carbons: number) {
    setFamily(f);
    setSeen((prev) => new Set(prev).add(`${f}:${carbons}`));
  }

  const current = useMemo(() => {
    if (family === 'alcene') return { name: 'Éthylène', formula: 'C₂H₄', liaison: 'double C=C' };
    if (n >= 2) return { name: 'Éthane', formula: 'C₂H₆', liaison: 'simple C–C' };
    return { name: 'Méthane', formula: 'CH₄', liaison: 'simple C–C' };
  }, [family, n]);

  const score = useMemo(() => {
    let s = 0;
    if (sawAlcane) s += 10;
    if (sawAlcene) s += 10;
    if (exploredBoth) s += 10; // exploration complète
    if (hypo === 'double') s += 10;
    if (qSimple === 'simples') s += 20;
    if (qAlcene === 'double') s += 20;
    if (qCarbone === '4') s += 20;
    return Math.min(100, s);
  }, [sawAlcane, sawAlcene, exploredBoth, hypo, qSimple, qAlcene, qCarbone]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'chimie-organique-1ere',
        version: '2.0',
        steps: {
          explored: Array.from(seen),
          hypothesis: hypo,
          qcm: { qSimple, qAlcene, qCarbone },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <FlaskConical className="h-5 w-5" />
              </span>
              Alcanes &amp; alcènes : les hydrocarbures
            </CardTitle>
            <Badge tone="science">Physique-Chimie · Première S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le <strong>butane</strong> des bouteilles de gaz, le <strong>pétrole</strong> et le gaz naturel sont
              faits d&apos;<strong>hydrocarbures</strong> : des molécules de carbone (C) et d&apos;hydrogène (H).
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> comparer un <strong>alcane</strong> (liaisons simples C–C) et un{' '}
              <strong>alcène</strong> (une double liaison C=C) sur des molécules en 3D.
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
              <Lightbulb className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : selon toi, qu&apos;est-ce qui distingue un <strong>alcène</strong> d&apos;un alcane ?
          </p>
          <QcmStep
            label="Mon hypothèse : un alcène se reconnaît à…"
            tone="violet"
            options={[
              { key: 'pareil', label: 'Rien, c’est la même chose qu’un alcane' },
              { key: 'double', label: 'Une double liaison entre deux carbones (C=C)' },
              { key: 'triple', label: 'L’absence totale de carbone' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier en 3D <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Atom className="h-5 w-5 text-violet-700" /> Étape 2 — Manipule les molécules
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Bascule entre <strong>alcane</strong> et <strong>alcène</strong>, et observe les liaisons entre les
            carbones (en gris). Tourne la molécule avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <AlkaneScene family={family} n={n} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant={family === 'alcane' ? 'gradient' : 'outline'}
              size="sm"
              onClick={() => visit('alcane', n)}
            >
              Alcane (C–C simple)
            </Button>
            <Button
              variant={family === 'alcene' ? 'gradient' : 'outline'}
              size="sm"
              onClick={() => visit('alcene', 0)}
            >
              Alcène (C=C double)
            </Button>
          </div>

          {family === 'alcane' && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="n">Atomes de carbone (n)</Label>
                <span className="font-mono text-violet-700">{n === 1 ? 'CH₄' : 'C₂H₆'}</span>
              </div>
              <input
                id="n"
                type="range"
                min={1}
                max={2}
                value={n}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setN(v);
                  visit('alcane', v);
                }}
                className="slider-lab w-full"
              />
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Molécule" value={current.name} />
            <Stat label="Formule" value={current.formula} />
            <Stat label="Liaison C–C" value={current.liaison} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              {exploredBoth ? 'Alcane et alcène observés ✓' : 'Observe les deux familles pour continuer'}
            </span>
            <Button variant="gradient" disabled={!exploredBoth} onClick={() => setStep('observ')}>
              {exploredBoth ? 'Mes observations' : 'Vois l’autre famille'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observ' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-violet-700" /> Étape 3 — Ce que tu observes
            </CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">Compare les deux familles d&apos;hydrocarbures.</p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Famille</th>
                  <th className="px-4 py-2 text-left">Liaison C–C</th>
                  <th className="px-4 py-2 text-left">Formule</th>
                  <th className="px-4 py-2 text-left">Exemple</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2 font-semibold">Alcane</td>
                  <td className="px-4 py-2">Simple (C–C)</td>
                  <td className="px-4 py-2 font-mono">CₙH₂ₙ₊₂</td>
                  <td className="px-4 py-2">CH₄, C₂H₆, C₄H₁₀ (butane)</td>
                </tr>
                <tr className="border-t border-night-100 bg-violet-50/40">
                  <td className="px-4 py-2 font-semibold">Alcène</td>
                  <td className="px-4 py-2">Double (C=C)</td>
                  <td className="px-4 py-2 font-mono">CₙH₂ₙ</td>
                  <td className="px-4 py-2">C₂H₄ (éthylène)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            Dans les deux cas, chaque atome de <strong>carbone forme 4 liaisons</strong>. La double liaison de
            l&apos;alcène « consomme » deux de ces liaisons entre les mêmes carbones.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Re-manipuler
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
            <Badge tone="science">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Un alcane ne contient que des liaisons :"
              tone="violet"
              options={[
                { key: 'simples', label: 'Simples (C–C)' },
                { key: 'doubles', label: 'Doubles (C=C)' },
                { key: 'triples', label: 'Triples (C≡C)' },
              ]}
              value={qSimple}
              onChange={setQSimple}
            />
            <QcmStep
              label="La particularité d'un alcène est :"
              tone="violet"
              options={[
                { key: 'double', label: 'Une double liaison C=C' },
                { key: 'aucune', label: 'Aucune liaison entre carbones' },
                { key: 'metal', label: 'La présence d’un métal' },
              ]}
              value={qAlcene}
              onChange={setQAlcene}
            />
            <QcmStep
              label="Un atome de carbone forme toujours :"
              tone="violet"
              options={[
                { key: '2', label: '2 liaisons' },
                { key: '4', label: '4 liaisons' },
                { key: '6', label: '6 liaisons' },
              ]}
              value={qCarbone}
              onChange={setQCarbone}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observ')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qSimple || !qAlcene || !qCarbone || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Les <strong>alcanes</strong> (CₙH₂ₙ₊₂) n&apos;ont que des liaisons <strong>simples C–C</strong> :
              méthane CH₄, butane C₄H₁₀ du gaz de cuisine. Les <strong>alcènes</strong> (CₙH₂ₙ) ont une{' '}
              <strong>double liaison C=C</strong> : l&apos;éthylène C₂H₄ donne le polyéthylène (plastique). Le carbone
              forme toujours <strong>4 liaisons</strong>.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
      <div className="text-[10px] uppercase tracking-wider text-violet-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-violet-800">{value}</div>
    </div>
  );
}
