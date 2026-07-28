'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, CheckCircle2, Crosshair, Gauge, Target, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Circuit RLC série : oscillations libres et régimes d'amortissement
 * (Terminale S, entraînement Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (slider R) →
 * observation des régimes → QCM → bilan. Physique réelle du RLC série :
 * λ = R/(2L), ω₀ = 1/√(LC), Rc = 2√(L/C). Plus R augmente, plus
 * l'amortissement λ est fort. Contexte : la qualité du courant à Dakar.
 */

const RlcScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-blue-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

// Constantes physiques du circuit (cohérentes avec la scène)
const L = 0.1; // H
const CAP = 1e-6; // F
const RC = 2 * Math.sqrt(L / CAP); // résistance critique ≈ 632 Ω

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'augmente' | 'diminue' | 'rien' | null;
type Regime = 'pseudo' | 'critique' | 'aperiodique';

const INTRO =
  "Quand l'électricité revient après une coupure à Dakar, la tension n'est jamais parfaitement stable : elle oscille un instant avant de se calmer. " +
  "Un circuit qui associe une bobine, un condensateur et une résistance — un circuit RLC — fait exactement cela : il oscille puis s'amortit. " +
  "Aujourd'hui tu vas régler la résistance R et découvrir les trois régimes possibles de ces oscillations.";

const CONCLUSION =
  "Bravo ! Dans un RLC série en oscillations libres, l'amortissement vaut lambda égale R sur deux L. " +
  "Quand on augmente R, l'amortissement augmente. Pour R faible, le régime est pseudo-périodique : la tension oscille en s'affaiblissant. " +
  "Pour R égale à la résistance critique, le retour à l'équilibre est le plus rapide sans oscillation. " +
  "Pour R grand, le régime est apériodique : le système revient lentement à l'équilibre, sans jamais osciller.";

/** Régime du RLC série selon R (par rapport à la résistance critique Rc). */
function regimeOf(r: number): Regime {
  if (r < RC * 0.9) return 'pseudo';
  if (r > RC * 1.1) return 'aperiodique';
  return 'critique';
}

function regimeLabel(reg: Regime): string {
  return reg === 'pseudo' ? 'Pseudo-périodique' : reg === 'critique' ? 'Critique' : 'Apériodique';
}

export function CircuitRlcTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [r, setR] = useState(80); // résistance en ohms
  const [regimesSeen, setRegimesSeen] = useState<Set<Regime>>(new Set(['pseudo']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qAmort, setQAmort] = useState<string | null>(null);
  const [qPseudo, setQPseudo] = useState<string | null>(null);
  const [qAperio, setQAperio] = useState<string | null>(null);

  const lambda = useMemo(() => r / (2 * L), [r]);
  const reg = useMemo(() => regimeOf(r), [r]);

  function changeR(next: number) {
    setR(next);
    setRegimesSeen((prev) => new Set(prev).add(regimeOf(next)));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, regimesSeen.size * 10); // exploration : 3 régimes → 30
    if (hypo === 'augmente') s += 10;
    if (qAmort === 'augmente') s += 20;
    if (qPseudo === 'faible') s += 20;
    if (qAperio === 'sans-osciller') s += 20;
    return Math.min(100, s);
  }, [regimesSeen, hypo, qAmort, qPseudo, qAperio]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'circuit-rlc-terminale',
        version: '2.0',
        steps: {
          regimesSeen: Array.from(regimesSeen),
          lastR: r,
          hypothesis: hypo,
          qcm: { qAmort, qPseudo, qAperio },
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
                <Zap className="h-5 w-5" />
              </span>
              Le circuit RLC qui oscille
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Après une coupure à <strong>Dakar</strong>, la tension oscille un instant avant de se stabiliser. Un
              circuit <strong>RLC série</strong> (bobine + condensateur + résistance) fait pareil : il oscille puis
              s&apos;<strong>amortit</strong>.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> régler la résistance R et reconnaître les trois régimes des oscillations
              libres — pseudo-périodique, critique et apériodique.
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
            La résistance R <em>freine</em> les oscillations. Avant de manipuler : selon toi, si tu{' '}
            <strong>augmentes R</strong>, l&apos;amortissement des oscillations…
          </p>
          <QcmStep
            label="Mon hypothèse : en augmentant R, l'amortissement…"
            tone="science"
            options={[
              { key: 'augmente', label: 'Augmente (les oscillations disparaissent plus vite)' },
              { key: 'diminue', label: 'Diminue (les oscillations durent plus longtemps)' },
              { key: 'rien', label: 'Ne change pas' },
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
              <Gauge className="h-5 w-5 text-blue-700" /> Étape 2 — Règle la résistance
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Déplace le curseur R et observe l&apos;oscillogramme u(t) à droite. Le point rouge parcourt la courbe.
            Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <RlcScene r={r} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="r">Résistance R</Label>
              <span className="font-mono text-blue-700">{Math.round(r)} Ω</span>
            </div>
            <input
              id="r"
              type="range"
              min={40}
              max={1500}
              step={20}
              value={r}
              onChange={(e) => changeR(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink/40">
              <span>R faible → oscille</span>
              <span>R ≈ {Math.round(RC)} Ω → critique</span>
              <span>R grand → amorti</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Régime" value={regimeLabel(reg)} />
            <Stat label="Amortissement λ" value={`${lambda.toFixed(0)} s⁻¹`} />
            <Stat label="Rc (critique)" value={`${Math.round(RC)} Ω`} />
          </div>
          <div className="mt-3 rounded-xl bg-blue-50 p-2 text-center text-[11px] text-blue-800 ring-1 ring-blue-100">
            Régimes explorés : <strong>{regimesSeen.size}/3</strong> (pseudo-périodique, critique, apériodique)
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink/50">
              <Crosshair className="h-4 w-4 text-blue-600" /> Balaie R pour voir les 3 régimes
            </span>
            <Button variant="gradient" disabled={regimesSeen.size < 3} onClick={() => setStep('mesures')}>
              {regimesSeen.size < 3
                ? `Explore ${3 - regimesSeen.size} régime(s) de plus`
                : 'Voir les régimes'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-700" /> Étape 3 — Les trois régimes
            </CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Selon la valeur de R par rapport à la résistance critique Rc = {Math.round(RC)} Ω, le RLC change de
            comportement.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-4 py-2 text-left">Résistance R</th>
                  <th className="px-4 py-2 text-left">Régime</th>
                  <th className="px-4 py-2 text-left">Comportement de u(t)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2 font-mono">R faible (&lt; Rc)</td>
                  <td className="px-4 py-2 font-semibold text-blue-700">Pseudo-périodique</td>
                  <td className="px-4 py-2">Oscille en s&apos;amortissant</td>
                </tr>
                <tr className="border-t border-night-100 bg-amber-50">
                  <td className="px-4 py-2 font-mono">R = Rc</td>
                  <td className="px-4 py-2 font-semibold text-amber-700">Critique</td>
                  <td className="px-4 py-2">Retour le plus rapide, sans osciller</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2 font-mono">R grand (&gt; Rc)</td>
                  <td className="px-4 py-2 font-semibold text-emerald-700">Apériodique</td>
                  <td className="px-4 py-2">Retour lent, sans osciller</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 ring-1 ring-blue-100">
            L&apos;amortissement <strong>λ = R / (2L)</strong> augmente avec R. En régime pseudo-périodique, la
            pseudo-période T augmente légèrement quand R augmente.
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
            <Badge tone="physique">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Quand on augmente la résistance R, l'amortissement :"
              tone="science"
              options={[
                { key: 'augmente', label: 'Augmente' },
                { key: 'diminue', label: 'Diminue' },
                { key: 'rien', label: 'Reste identique' },
              ]}
              value={qAmort}
              onChange={setQAmort}
            />
            <QcmStep
              label="Le régime pseudo-périodique apparaît pour une résistance :"
              tone="science"
              options={[
                { key: 'faible', label: 'Faible (R < Rc)' },
                { key: 'critique', label: 'Égale à la résistance critique' },
                { key: 'forte', label: 'Très forte (R > Rc)' },
              ]}
              value={qPseudo}
              onChange={setQPseudo}
            />
            <QcmStep
              label="En régime apériodique, le système :"
              tone="science"
              options={[
                { key: 'sans-osciller', label: "Revient à l'équilibre sans osciller" },
                { key: 'oscille', label: 'Oscille indéfiniment' },
                { key: 'diverge', label: 'S\'éloigne de plus en plus de l\'équilibre' },
              ]}
              value={qAperio}
              onChange={setQAperio}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qAmort || !qPseudo || !qAperio || busy}
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
              Dans un RLC série libre, l&apos;amortissement <strong>λ = R/(2L)</strong> augmente avec R. À{' '}
              <strong>R faible</strong> : régime <strong>pseudo-périodique</strong> (oscillations amorties). À{' '}
              <strong>R = Rc</strong> : régime <strong>critique</strong> (retour le plus rapide). À{' '}
              <strong>R grand</strong> : régime <strong>apériodique</strong> (retour lent, sans osciller).
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Score :</strong> exploration des 3 régimes ({regimesSeen.size}/3) + bonnes réponses au QCM.
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
