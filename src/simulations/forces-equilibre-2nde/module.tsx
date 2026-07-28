'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Scale, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Forces et équilibre (2nde, Physique-Chimie).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (tir à la corde, deux
 * vecteurs forces opposés) → QCM → bilan. Un corps est en équilibre quand la
 * somme des forces est nulle : forces de même intensité, de sens opposés.
 * Contexte : tir à la corde d'une fête de village, pont de Foundiougne.
 */

const ForceScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center bg-blue-50 text-sm text-ink/50">Chargement de la scène 3D…</div>,
});

type Step = 'intro' | 'hypo' | 'manip' | 'qcm' | 'done';
type HypoRep = 'immobile' | 'gauche' | 'droite' | null;

const INTRO =
  "À la fête du village, on organise un tir à la corde. Deux équipes tirent la corde dans des sens opposés. " +
  "Tant qu'elles tirent aussi fort l'une que l'autre, le nœud rouge au milieu ne bouge pas : les forces se compensent. " +
  "On dit que le nœud est en équilibre. Tu vas régler la force de chaque équipe et trouver la condition de l'équilibre.";

const CONCLUSION =
  "Bravo ! Un corps est en équilibre quand la somme des forces qui s'exercent sur lui est nulle. " +
  "Pour deux forces, cela veut dire : même intensité et sens opposés. C'est pareil pour le pont de Foundiougne : " +
  "son poids vers le bas est exactement compensé par la réaction des piliers vers le haut.";

export function ForcesEquilibre2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [f1, setF1] = useState(5);
  const [f2, setF2] = useState(3);
  const [tweaks, setTweaks] = useState(0);
  const [reachedEq, setReachedEq] = useState(false);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qCond, setQCond] = useState<string | null>(null);
  const [qDesq, setQDesq] = useState<string | null>(null);

  function setForces(nf1: number, nf2: number) {
    setF1(nf1);
    setF2(nf2);
    setTweaks((t) => t + 1);
    if (nf1 === nf2) setReachedEq(true);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, tweaks * 5); // exploration
    if (reachedEq) s += 10; // a trouvé l'équilibre
    if (hypo === 'immobile') s += 10;
    if (qCond === 'opposees') s += 25;
    if (qDesq === 'droite') s += 25;
    return Math.max(0, Math.min(100, s));
  }, [tweaks, reachedEq, hypo, qCond, qDesq]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'forces-equilibre-2nde',
        version: '2.0',
        steps: {
          explore: { tweaks, reachedEquilibrium: reachedEq, last: { f1, f2 } },
          hypothesis: hypo,
          qcm: { qCond, qDesq },
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
              Le tir à la corde
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 2nde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À la fête du village, deux équipes s&apos;affrontent au <strong>tir à la corde</strong>. Le nœud au milieu de la corde
              ne bouge que si une équipe tire plus fort que l&apos;autre.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> trouver à quelle condition sur les forces F₁ et F₂ le nœud reste{' '}
              <strong>en équilibre</strong> (immobile).
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
              <Sparkles className="h-5 w-5 text-blue-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Si les deux équipes tirent avec <strong>exactement la même force</strong>, que fait le nœud du milieu ?
          </p>
          <QcmStep
            label="À forces égales, le nœud…"
            tone="science"
            options={[
              { key: 'immobile', label: 'Reste immobile (équilibre)' },
              { key: 'gauche', label: 'Part vers la gauche' },
              { key: 'droite', label: 'Part vers la droite' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-700" /> Étape 2 — Règle les deux forces
            </CardTitle>
            <Badge tone="physique">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais varier F₁ (équipe bleue, gauche) et F₂ (équipe verte, droite). Observe les vecteurs et le nœud.{' '}
            <strong>Trouve la position d&apos;équilibre</strong> (nœud vert, centré).
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <ForceScene f1={f1} f2={f2} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="f1">F₁ — équipe gauche</Label>
                <span className="font-mono text-blue-700">{f1} N</span>
              </div>
              <input id="f1" type="range" min={1} max={10} value={f1} onChange={(e) => setForces(Number(e.target.value), f2)} className="slider-lab w-full" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="f2">F₂ — équipe droite</Label>
                <span className="font-mono text-emerald-700">{f2} N</span>
              </div>
              <input id="f2" type="range" min={1} max={10} value={f2} onChange={(e) => setForces(f1, Number(e.target.value))} className="slider-lab w-full" />
            </div>
          </div>
          <div
            className={
              'mt-3 rounded-xl p-3 text-sm ring-1 ' +
              (f1 === f2 ? 'bg-action-50 text-action-700 ring-action-100' : 'bg-amber-50 text-amber-800 ring-amber-100')
            }
          >
            {f1 === f2 ? '⚖ Équilibre atteint : F₁ = F₂, la résultante est nulle, le nœud reste immobile.' : `Déséquilibre : la résultante vaut ${Math.abs(f2 - f1)} N vers ${f2 > f1 ? 'la droite' : 'la gauche'}.`}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 4 || !reachedEq} onClick={() => setStep('qcm')}>
              {!reachedEq ? "Trouve d'abord l'équilibre" : tweaks < 4 ? `Essaie ${4 - tweaks} réglage(s) de plus` : 'Conclure'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Valide ta compréhension</CardTitle>
            <Badge tone="physique">3/3</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Deux forces se compensent (corps en équilibre) si elles ont…"
              tone="science"
              options={[
                { key: 'opposees', label: 'La même intensité et des sens opposés' },
                { key: 'pareilles', label: 'La même intensité et le même sens' },
                { key: 'aucune', label: 'Aucune relation particulière' },
              ]}
              value={qCond}
              onChange={setQCond}
            />
            <QcmStep
              label="Si l'équipe de droite tire plus fort (F₂ > F₁), le nœud part…"
              tone="science"
              options={[
                { key: 'droite', label: 'Vers la droite (l’équipe la plus forte)' },
                { key: 'gauche', label: 'Vers la gauche' },
                { key: 'immobile', label: 'Il reste immobile' },
              ]}
              value={qDesq}
              onChange={setQDesq}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la corde
            </Button>
            <Button variant="success" disabled={!qCond || !qDesq || busy} onClick={handleValidate}>
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
              Un corps est en <strong>équilibre</strong> quand la somme des forces est nulle. Pour deux forces : <strong>même intensité</strong>,{' '}
              <strong>sens opposés</strong>. Sinon, le corps se déplace dans le sens de la force la plus grande (la résultante).
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
