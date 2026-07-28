'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Gauge, Target, Wind, Crosshair } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — L'air est de la matière : pression d'un gaz (PC, 4ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures → QCM →
 * bilan. L'élève comprime un gaz dans une seringue (slider volume) et observe
 * que les particules cognent plus souvent les parois quand le volume diminue :
 * la pression augmente (loi de Boyle-Mariotte, P·V = constante, T fixe).
 * Contexte sénégalais : pompe à vélo, pneu, bouteille de gaz.
 */

const BalloonScene = dynamic(() => import('./balloon-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-blue-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'augmente' | 'diminue' | 'pareil' | null;

// P·V = constante (loi de Boyle-Mariotte) : à V = 1 (100 %), P = 1 bar.
// On exprime le volume du slider en % (40 → 100) et P = 1 / V.
const PV = 1; // constante (bar × volume_relatif)
const pressureOf = (volPct: number) => PV / (volPct / 100);

const INTRO =
  "Quand tu gonfles le pneu de ton vélo avec une pompe, tu pousses de l'air dans la chambre à air. " +
  "L'air n'est pas du vide : c'est de la matière, faite de minuscules particules qui bougent sans arrêt. " +
  "En les serrant dans un plus petit volume, elles cognent plus souvent les parois et la pression monte. " +
  "Aujourd'hui tu comprimes un gaz dans une seringue et tu regardes la pression augmenter.";

const CONCLUSION =
  "Bravo ! L'air est de la matière : il est fait de particules en mouvement qui exercent une pression en heurtant les parois. " +
  "À température constante, quand tu diminues le volume, la pression augmente : c'est la loi de Boyle-Mariotte, P × V reste constant. " +
  "C'est pour ça qu'une pompe à vélo durcit quand tu pousses, et qu'une bouteille de gaz contient beaucoup d'air dans peu de place.";

export function AirPression4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [vol, setVol] = useState(100); // volume du gaz en % (40 → 100)
  const [volsTried, setVolsTried] = useState<Set<number>>(new Set([100]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qMatiere, setQMatiere] = useState<string | null>(null);
  const [qPression, setQPression] = useState<string | null>(null);
  const [qOrigine, setQOrigine] = useState<string | null>(null);

  const pressure = useMemo(() => pressureOf(vol), [vol]);

  function recordMeasure() {
    setVolsTried((prev) => new Set(prev).add(vol));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, volsTried.size * 6); // exploration
    if (hypo === 'augmente') s += 10;
    if (qMatiere === 'matiere') s += 20;
    if (qPression === 'augmente') s += 25;
    if (qOrigine === 'chocs') s += 20;
    return Math.min(100, s);
  }, [volsTried, hypo, qMatiere, qPression, qOrigine]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'air-pression-4eme',
        version: '2.0',
        steps: {
          volumesTried: Array.from(volsTried),
          hypothesis: hypo,
          qcm: { qMatiere, qPression, qOrigine },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-physique" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-700 shadow-soft ring-1 ring-blue-100">
                <Wind className="h-5 w-5" />
              </span>
              L&apos;air, la pompe et le pneu
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Avec une <strong>pompe à vélo</strong>, tu pousses de l&apos;air dans le pneu. L&apos;air n&apos;est pas du
              vide : c&apos;est de la <strong>matière</strong>, faite de particules qui bougent sans arrêt et qui ont une{' '}
              <strong>masse</strong>.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> comprimer un gaz dans une seringue et comprendre pourquoi sa{' '}
              <strong>pression</strong> (en bar) augmente quand son volume diminue.
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
              <Target className="h-5 w-5 text-blue-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si tu bouches une seringue pleine d&apos;air et que tu pousses le piston (le volume
            diminue), selon toi la <strong>pression</strong> du gaz va…
          </p>
          <QcmStep
            label="Mon hypothèse : en comprimant le gaz, la pression…"
            tone="violet"
            options={[
              { key: 'augmente', label: 'Augmente' },
              { key: 'diminue', label: 'Diminue' },
              { key: 'pareil', label: 'Ne change pas' },
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
              <Gauge className="h-5 w-5 text-blue-700" /> Étape 2 — Comprime le gaz
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pousse le piston pour réduire le volume. Regarde les particules cogner plus souvent les parois et la
            pression monter. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <BalloonScene volume={vol / 100} pressure={pressure} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="v">Volume du gaz</Label>
              <span className="font-mono text-blue-700">{vol} %</span>
            </div>
            {/* min à droite : pousser le piston = réduire le volume */}
            <input
              id="v"
              type="range"
              min={40}
              max={100}
              step={5}
              value={vol}
              onChange={(e) => setVol(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Volume" value={`${vol} %`} />
            <Stat label="Pression" value={`${pressure.toFixed(2)} bar`} />
            <Stat label="P × V" value={(pressure * (vol / 100)).toFixed(2)} />
          </div>
          <p className="mt-2 text-center text-[11px] text-ink/50">
            Remarque : P × V reste constant (≈ {PV.toFixed(2)}) — c&apos;est la loi de Boyle-Mariotte.
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordMeasure}>
              <Crosshair className="h-4 w-4" /> Noter cette mesure
            </Button>
            <Button variant="gradient" disabled={volsTried.size < 3} onClick={() => setStep('mesures')}>
              {volsTried.size < 3 ? `Note ${3 - volsTried.size} volume(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures</CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici les pressions que tu as relevées. Plus le volume est <strong>petit</strong>, plus la pression est{' '}
            <strong>grande</strong> : le produit P × V, lui, ne bouge presque pas.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-4 py-2 text-left">Volume</th>
                  <th className="px-4 py-2 text-left">Pression</th>
                  <th className="px-4 py-2 text-left">P × V</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(volsTried)
                  .sort((a, b) => b - a)
                  .map((v) => {
                    const p = pressureOf(v);
                    return (
                      <tr key={v} className="border-t border-night-100">
                        <td className="px-4 py-2">{v} %</td>
                        <td className="px-4 py-2 font-semibold text-blue-700">{p.toFixed(2)} bar</td>
                        <td className="px-4 py-2 text-ink/60">{(p * (v / 100)).toFixed(2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
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
            <Badge tone="physique">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="L'air est :"
              tone="violet"
              options={[
                { key: 'matiere', label: 'De la matière (des particules, il a une masse)' },
                { key: 'vide', label: 'Du vide (il n’y a rien)' },
                { key: 'energie', label: "Uniquement de l'énergie, sans masse" },
              ]}
              value={qMatiere}
              onChange={setQMatiere}
            />
            <QcmStep
              label="Quand on comprime un gaz (à température constante), sa pression :"
              tone="violet"
              options={[
                { key: 'augmente', label: 'Augmente' },
                { key: 'diminue', label: 'Diminue' },
                { key: 'pareil', label: 'Ne change pas' },
              ]}
              value={qPression}
              onChange={setQPression}
            />
            <QcmStep
              label="La pression d'un gaz vient :"
              tone="violet"
              options={[
                { key: 'chocs', label: 'Des chocs des particules sur les parois' },
                { key: 'poids', label: 'Du poids du récipient' },
                { key: 'couleur', label: 'De la couleur du gaz' },
              ]}
              value={qOrigine}
              onChange={setQOrigine}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qMatiere || !qPression || !qOrigine || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-physique">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              L&apos;air est de la <strong>matière</strong> : des particules en mouvement qui pressent les parois par
              leurs <strong>chocs</strong>. À température constante, comprimer le gaz (↓ volume) fait{' '}
              <strong>augmenter la pression</strong> (↑ P) : c&apos;est la loi de Boyle-Mariotte, P × V = constante. La
              pression se mesure en pascals (Pa) ou en bar.
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
    <div className="rounded-xl bg-blue-50 p-2 ring-1 ring-blue-100">
      <div className="text-[10px] uppercase tracking-wider text-blue-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-blue-800">{value}</div>
    </div>
  );
}
