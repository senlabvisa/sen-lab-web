'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Gauge, MoveUpRight, Mountain, Target, TrendingUp } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Nombre dérivé et fonction dérivée (Première S).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (slider x₀) →
 * observation du signe de f' → QCM → bilan. Maths juste : f'(x₀) est le
 * coefficient directeur de la tangente en x₀ ; pour f(x)=x², f'(x)=2x ;
 * f'(x₀)=0 à l'extremum. Contexte : vitesse instantanée d'un car rapide,
 * pente d'une dune de Lompoul.
 */

const DerivScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-sky-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

const f = (x: number) => x * x - 2; // f(x) = x² − 2
const df = (x: number) => 2 * x; // f'(x) = 2x

type Step = 'intro' | 'hypo' | 'manip' | 'observe' | 'qcm' | 'done';
type HypoRep = 'monte' | 'plat' | 'descend' | null;

const INTRO =
  "Quand un car rapide accélère sur la route de Touba, son compteur affiche la vitesse à l'instant précis : " +
  "c'est une vitesse instantanée. En mathématiques, cette idée porte un nom : le nombre dérivé. " +
  "Le nombre dérivé d'une fonction en un point, c'est la pente de la tangente à la courbe en ce point. " +
  "Aujourd'hui tu vas glisser un point le long d'une courbe et regarder sa tangente pivoter.";

const CONCLUSION =
  "Bravo ! Le nombre dérivé f prime de x zéro est le coefficient directeur de la tangente en x zéro. " +
  "Là où la courbe monte, f prime est positif ; là où elle descend, f prime est négatif ; " +
  "et au sommet ou au creux, à l'extremum, f prime vaut zéro. Pour f de x égale x au carré, f prime de x vaut deux x.";

export function Derivees1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [x0, setX0] = useState(1);
  const [xsTried, setXsTried] = useState<Set<number>>(new Set([1]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qDef, setQDef] = useState<string | null>(null);
  const [qCroiss, setQCroiss] = useState<string | null>(null);
  const [qExtremum, setQExtremum] = useState<string | null>(null);

  const slope = useMemo(() => df(x0), [x0]);
  const y0 = useMemo(() => f(x0), [x0]);
  const sign = slope > 0.05 ? 'positive' : slope < -0.05 ? 'negative' : 'nulle';

  // A-t-on exploré une montée, une descente ET l'extremum ?
  const triedUp = useMemo(() => Array.from(xsTried).some((x) => df(x) > 0.05), [xsTried]);
  const triedDown = useMemo(() => Array.from(xsTried).some((x) => df(x) < -0.05), [xsTried]);
  const triedFlat = useMemo(() => Array.from(xsTried).some((x) => Math.abs(df(x)) <= 0.05), [xsTried]);
  const fullyExplored = triedUp && triedDown && triedFlat;

  function moveX0(v: number) {
    setX0(v);
    setXsTried((prev) => new Set(prev).add(Number(v.toFixed(1))));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, xsTried.size * 3); // exploration : variété des positions
    if (triedUp) s += 4;
    if (triedDown) s += 4;
    if (triedFlat) s += 7; // avoir trouvé l'extremum (f'=0) compte plus
    if (hypo === 'monte') s += 10; // bonne prédiction (en x₀=1 la courbe monte)
    if (qDef === 'tangente') s += 20;
    if (qCroiss === 'positive') s += 18;
    if (qExtremum === 'zero') s += 17;
    return Math.min(100, s);
  }, [xsTried, triedUp, triedDown, triedFlat, hypo, qDef, qCroiss, qExtremum]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'derivees-1ere',
        version: '2.0',
        steps: {
          xsTried: Array.from(xsTried),
          explored: { triedUp, triedDown, triedFlat },
          hypothesis: hypo,
          qcm: { qDef, qCroiss, qExtremum },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sky-700 shadow-soft ring-1 ring-sky-100">
                <TrendingUp className="h-5 w-5" />
              </span>
              Nombre dérivé et tangente
            </CardTitle>
            <Badge tone="maths">Maths · Première S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Sur la route de Touba, le compteur d&apos;un <strong>car rapide</strong> affiche la vitesse à un
              instant précis : une <strong>vitesse instantanée</strong>. C&apos;est exactement l&apos;idée du{' '}
              <strong>nombre dérivé</strong> : la pente de la courbe en un seul point.
            </p>
            <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
              <strong>Objectif :</strong> glisser un point le long de la courbe de f(x) = x² − 2 et observer la{' '}
              <strong>tangente</strong> pivoter. Sa pente, c&apos;est le nombre dérivé f&apos;(x₀).
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
            Imagine une <strong>dune de Lompoul</strong> dont le profil monte. Au point x₀ = 1, la courbe f(x) = x² − 2{' '}
            <strong>monte</strong> vers la droite. Selon toi, la tangente en ce point sera…
          </p>
          <QcmStep
            label="En un point où la courbe monte, la tangente est…"
            tone="violet"
            options={[
              { key: 'descend', label: 'Inclinée vers le bas (pente négative)' },
              { key: 'plat', label: 'Horizontale (pente nulle)' },
              { key: 'monte', label: 'Inclinée vers le haut (pente positive)' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-sky-700" /> Étape 2 — Glisse le point x₀
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Déplace x₀ : la <strong>tangente verte</strong> pivote et la sécante (pointillés) tend vers elle. Cherche un
            endroit où la courbe <strong>monte</strong>, un où elle <strong>descend</strong>, et le <strong>creux</strong>{' '}
            (extremum). Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-sky-100">
            <div className="aspect-[4/3] w-full">
              <DerivScene x0={x0} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="x">Abscisse x₀</Label>
              <span className="font-mono text-sky-700">{x0.toFixed(1)}</span>
            </div>
            <input
              id="x"
              type="range"
              min={-2.4}
              max={2.4}
              step={0.2}
              value={x0}
              onChange={(e) => moveX0(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="f(x₀)" value={y0.toFixed(2)} />
            <Stat label="f'(x₀) = 2x₀" value={slope.toFixed(1)} />
            <Stat
              label="La courbe…"
              value={sign === 'positive' ? 'monte ↗' : sign === 'negative' ? 'descend ↘' : 'plate →'}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              Exploré : {triedUp ? '↗' : '·'} {triedDown ? '↘' : '·'} {triedFlat ? '→ (f′=0)' : '·'}
            </span>
            <Button variant="gradient" disabled={!fullyExplored} onClick={() => setStep('observe')}>
              {fullyExplored ? 'Observer le signe' : 'Trouve montée, descente et creux'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MoveUpRight className="h-5 w-5 text-sky-700" /> Étape 3 — Le signe de f&apos;
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tu as fait pivoter la tangente partout. Voici la règle que ta manipulation vient de montrer :
          </p>
          <div className="space-y-2 text-sm">
            <SignRow tone="up" zone="Là où f croît (la courbe monte ↗)" verdict="f'(x) > 0" />
            <SignRow tone="flat" zone="À l'extremum (creux ou sommet de f)" verdict="f'(x) = 0" />
            <SignRow tone="down" zone="Là où f décroît (la courbe descend ↘)" verdict="f'(x) < 0" />
          </div>
          <div className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
            <Mountain className="mr-1 inline h-4 w-4" /> Pour f(x) = x² − 2, le creux est en x₀ = 0 : c&apos;est là que
            f&apos;(x₀) = 2 × 0 = <strong>0</strong>. À gauche f&apos; &lt; 0, à droite f&apos; &gt; 0.
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Remanipuler
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
              label="Le nombre dérivé f'(x₀) est :"
              tone="violet"
              options={[
                { key: 'tangente', label: 'Le coefficient directeur de la tangente en x₀' },
                { key: 'aire', label: "L'aire sous la courbe jusqu'à x₀" },
                { key: 'longueur', label: 'La longueur de la courbe' },
              ]}
              value={qDef}
              onChange={setQDef}
            />
            <QcmStep
              label="Si f est croissante sur un intervalle, alors f' y est :"
              tone="violet"
              options={[
                { key: 'positive', label: 'Positive (f′ > 0)' },
                { key: 'negative', label: 'Négative (f′ < 0)' },
                { key: 'nulle', label: 'Nulle (f′ = 0)' },
              ]}
              value={qCroiss}
              onChange={setQCroiss}
            />
            <QcmStep
              label="À un extremum (minimum ou maximum) de f, f' vaut :"
              tone="violet"
              options={[
                { key: 'zero', label: '0' },
                { key: 'un', label: '1' },
                { key: 'infini', label: 'Une valeur très grande' },
              ]}
              value={qExtremum}
              onChange={setQExtremum}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qDef || !qCroiss || !qExtremum || busy}
              onClick={handleValidate}
            >
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
              Le <strong>nombre dérivé f&apos;(x₀)</strong> est le coefficient directeur de la tangente en x₀. La
              tangente a pour équation y = f(x₀) + f&apos;(x₀)(x − x₀). Le signe de f&apos; donne le sens de
              variation : <strong>f&apos; &gt; 0</strong> quand f croît, <strong>f&apos; &lt; 0</strong> quand f
              décroît, <strong>f&apos; = 0</strong> à l&apos;extremum. Pour f(x) = x², f&apos;(x) = 2x.
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
    <div className="rounded-xl bg-sky-50 p-2 ring-1 ring-sky-100">
      <div className="text-[10px] uppercase tracking-wider text-sky-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-sky-800">{value}</div>
    </div>
  );
}

function SignRow({ tone, zone, verdict }: { tone: 'up' | 'flat' | 'down'; zone: string; verdict: string }) {
  const cls =
    tone === 'up'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
      : tone === 'down'
        ? 'bg-rose-50 text-rose-800 ring-rose-100'
        : 'bg-amber-50 text-amber-800 ring-amber-100';
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ${cls}`}>
      <span>{zone}</span>
      <span className="font-mono font-bold">{verdict}</span>
    </div>
  );
}
