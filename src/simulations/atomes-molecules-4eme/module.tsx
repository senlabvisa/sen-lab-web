'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Atom, FlaskConical, Sparkles, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { MolKey } from './molecules-scene';

/**
 * TP — Atomes & molécules : la matière est faite d'atomes (Physique-Chimie, 4ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (modèle moléculaire CPK)
 * → observation/composition → QCM → bilan. Science juste : atome = plus petite
 * partie d'un élément, molécule = atomes liés. Contexte : l'eau qu'on boit (H₂O),
 * l'air qu'on respire (O₂, N₂, CO₂).
 */

const MoleculesScene = dynamic(() => import('./molecules-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'atomes' | 'grains' | 'rien' | null;

const MOLS: { key: MolKey; label: string }[] = [
  { key: 'atome', label: 'Atome O' },
  { key: 'H2O', label: 'H₂O' },
  { key: 'O2', label: 'O₂' },
  { key: 'CO2', label: 'CO₂' },
  { key: 'CH4', label: 'CH₄' },
  { key: 'H2', label: 'H₂' },
];

const COMPO: Record<MolKey, string> = {
  atome: 'Atome d’oxygène seul — élément O (boule rouge). C’est la plus petite brique.',
  H2O: 'Eau : 2 atomes d’hydrogène (H, blanc) + 1 atome d’oxygène (O, rouge).',
  O2: 'Dioxygène : 2 atomes d’oxygène (O). C’est le gaz vital de l’air.',
  CO2: 'Dioxyde de carbone : 1 atome de carbone (C, noir) + 2 atomes d’oxygène (O).',
  CH4: 'Méthane : 1 atome de carbone (C) + 4 atomes d’hydrogène (H).',
  H2: 'Dihydrogène : 2 atomes d’hydrogène (H).',
};

const INTRO =
  "L'eau que tu bois à la fontaine, l'air que tu respires à Dakar, le gaz du biodigesteur au village : " +
  "tout est fait de minuscules briques appelées atomes. Quand des atomes se lient, ils forment une molécule. " +
  "L'eau, c'est la molécule H2O : deux atomes d'hydrogène et un atome d'oxygène. Aujourd'hui tu vas observer " +
  "ces molécules en 3D et compter leurs atomes.";

const CONCLUSION =
  "Bravo ! Un atome est la plus petite partie d'un élément, comme l'hydrogène ou l'oxygène. " +
  "Une molécule, c'est un assemblage d'atomes liés. L'eau H2O contient deux atomes d'hydrogène et un d'oxygène, " +
  "le dioxygène O2 contient deux atomes d'oxygène. Avec les couleurs CPK, tu reconnais chaque atome d'un coup d'oeil.";

export function AtomesMolecules4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [molKey, setMolKey] = useState<MolKey>('atome');
  const [seen, setSeen] = useState<Set<MolKey>>(new Set(['atome']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qEau, setQEau] = useState<string | null>(null);
  const [qMol, setQMol] = useState<string | null>(null);
  const [qO2, setQO2] = useState<string | null>(null);

  function pick(k: MolKey) {
    setMolKey(k);
    setSeen((prev) => new Set(prev).add(k));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, seen.size * 5); // exploration : observer les molécules
    if (hypo === 'atomes') s += 10;
    if (qEau === 'eau') s += 20;
    if (qMol === 'liés') s += 20;
    if (qO2 === 'deuxO') s += 20;
    return Math.min(100, s);
  }, [seen, hypo, qEau, qMol, qO2]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'atomes-molecules-4eme',
        version: '2.0',
        steps: {
          seen: Array.from(seen),
          hypothesis: hypo,
          qcm: { qEau, qMol, qO2 },
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
                <Atom className="h-5 w-5" />
              </span>
              La matière est faite d’atomes
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              L’eau que tu bois, l’air que tu respires : tout est fait de minuscules briques, les{' '}
              <strong>atomes</strong>. Quand des atomes se lient, ils forment une <strong>molécule</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> observer des molécules en 3D (H₂O, O₂, CO₂, CH₄, H₂), reconnaître les
              atomes à leur couleur CPK et compter leur composition.
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
              <Target className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant d’observer : selon toi, de quoi est faite une goutte d’eau, tout au fond&nbsp;?
          </p>
          <QcmStep
            label="Mon hypothèse : la matière est faite de…"
            tone="violet"
            options={[
              { key: 'atomes', label: 'Petits atomes assemblés en molécules' },
              { key: 'grains', label: 'Grains de sable invisibles' },
              { key: 'rien', label: 'Rien, c’est continu et plein' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-violet-700" /> Étape 2 — Explore le modèle moléculaire
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis une molécule : elle tourne en modèle boules-bâtonnets. Commence par l’<strong>atome seul</strong>{' '}
            (une boule), puis compare avec une <strong>molécule</strong> (atomes liés). Tourne la scène avec ta souris
            / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <MoleculesScene molKey={molKey} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {MOLS.map((m) => (
              <Button key={m.key} variant={molKey === m.key ? 'gradient' : 'outline'} size="sm" onClick={() => pick(m.key)}>
                {m.label} {seen.has(m.key) && molKey !== m.key ? '✓' : ''}
              </Button>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            <Sparkles className="mr-1 inline h-4 w-4" />
            {COMPO[molKey]}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">Observées : {seen.size}/6</span>
            <Button variant="gradient" disabled={seen.size < 4} onClick={() => setStep('mesures')}>
              {seen.size < 4 ? `Observe ${4 - seen.size} de plus` : 'Récapituler'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Composition des molécules</CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici la composition de chaque molécule observée. Repère bien le nombre d’atomes de chaque élément.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Formule</th>
                  <th className="px-4 py-2 text-left">Composition</th>
                </tr>
              </thead>
              <tbody>
                {MOLS.filter((m) => seen.has(m.key)).map((m) => (
                  <tr key={m.key} className="border-t border-night-100">
                    <td className="px-4 py-2 font-mono font-semibold text-violet-800">{m.label}</td>
                    <td className="px-4 py-2 text-ink/80">{COMPO[m.key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir en 3D
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
              label="La molécule d’eau H₂O contient :"
              tone="violet"
              options={[
                { key: 'eau', label: '2 atomes d’hydrogène et 1 atome d’oxygène' },
                { key: 'inverse', label: '1 atome d’hydrogène et 2 atomes d’oxygène' },
                { key: 'troisO', label: '3 atomes d’oxygène' },
              ]}
              value={qEau}
              onChange={setQEau}
            />
            <QcmStep
              label="Une molécule est :"
              tone="violet"
              options={[
                { key: 'liés', label: 'Un assemblage d’atomes liés' },
                { key: 'cellule', label: 'Un assemblage de cellules' },
                { key: 'mineral', label: 'Un petit grain de minéral' },
              ]}
              value={qMol}
              onChange={setQMol}
            />
            <QcmStep
              label="La molécule de dioxygène O₂ est formée de :"
              tone="violet"
              options={[
                { key: 'deuxO', label: '2 atomes d’oxygène' },
                { key: 'unO', label: '1 atome d’oxygène' },
                { key: 'OH', label: '1 atome d’oxygène et 1 d’hydrogène' },
              ]}
              value={qO2}
              onChange={setQO2}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qEau || !qMol || !qO2 || busy} onClick={handleValidate}>
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
              Un <strong>atome</strong> est la plus petite partie d’un élément (H, O, C…). Une <strong>molécule</strong>{' '}
              est un assemblage d’atomes liés : <strong>H₂O = 2 H + 1 O</strong>, <strong>CO₂ = 1 C + 2 O</strong>,{' '}
              <strong>O₂ = 2 O</strong>. Couleurs CPK : O rouge, H blanc, C noir, N bleu.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
