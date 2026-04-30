'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Ruler, Sigma } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TriangleDiagram } from './triangle';

/**
 * TP — Théorème de Pythagore (4ème, Maths)
 * L'élève manipule a et b, observe a² + b² = c², puis calcule c pour (3, 4) → 5.
 */

type Hypothesis = 'somme' | 'produit' | 'egal';
type Step = 'intro' | 'hypothese' | 'experience' | 'analyse' | 'done';

const CHALLENGE_A = 3;
const CHALLENGE_B = 4;
const CHALLENGE_C_TRUE = 5;

export function Pythagore4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [a, setA] = useState(4);
  const [b, setB] = useState(3);
  const [guessedC, setGuessedC] = useState('');
  const [observationsCount, setObservationsCount] = useState(0);

  const guessedCNum = Number(guessedC.replace(',', '.'));
  const validGuess =
    !Number.isNaN(guessedCNum) && guessedCNum > 0 && guessedCNum < 100;

  const score = useMemo(() => {
    let s = 0;
    if (hypothesis === 'somme') s += 20;
    s += Math.min(30, observationsCount * 10);
    if (validGuess) {
      const err = Math.abs(guessedCNum - CHALLENGE_C_TRUE) / CHALLENGE_C_TRUE;
      if (err < 0.01) s += 50;
      else if (err <= 0.05) s += 35;
      else if (err <= 0.15) s += 20;
    }
    return Math.max(0, Math.min(100, s));
  }, [hypothesis, observationsCount, guessedCNum, validGuess]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'theoreme-pythagore-4eme',
        version: '1.0',
        steps: {
          hypothesis,
          observationsCount,
          challenge: { a: CHALLENGE_A, b: CHALLENGE_B, trueC: CHALLENGE_C_TRUE },
          guessedC: validGuess ? guessedCNum : null,
        },
      },
      score,
    );
    setStep('done');
  }

  function changeAB(newA: number, newB: number) {
    setA(newA);
    setB(newB);
    setObservationsCount((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Sigma className="h-5 w-5" />
              </span>
              Théorème de Pythagore — Contexte
            </CardTitle>
            <Badge tone="maths">Maths · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Les maçons qui bâtissent les maisons de Dakar ou de Thiès tracent souvent un angle
              droit parfait au sol. L&apos;astuce la plus ancienne : une corde à 12 nœuds qui forme
              un triangle 3-4-5. Pourquoi ça marche ?
            </p>
            <p>
              Dans un triangle rectangle, il existe une relation entre la longueur des trois côtés
              — c&apos;est le <strong>théorème de Pythagore</strong>.
            </p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypothese')}>
              Commencer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'hypothese' && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 1 — Hypothèse</CardTitle>
            <Badge tone="science">1/3</Badge>
          </CardHeader>
          <p className="mb-4 text-ink/80">
            Dans un triangle rectangle de côtés a, b (les côtés de l&apos;angle droit) et c
            (l&apos;hypoténuse), quelle relation te semble la plus plausible ?
          </p>
          <div className="space-y-2">
            {(
              [
                { key: 'somme', label: 'a² + b² = c² (somme des carrés)' },
                { key: 'produit', label: 'a × b = c (produit des côtés)' },
                { key: 'egal', label: 'a + b = c (somme des côtés)' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                className={
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ' +
                  (hypothesis === opt.key
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-ink/10 hover:border-violet-200 hover:bg-violet-50/50')
                }
              >
                <input
                  type="radio"
                  name="hypothesis"
                  className="accent-violet-700"
                  checked={hypothesis === opt.key}
                  onChange={() => setHypothesis(opt.key)}
                />
                <span className="text-ink">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              variant="gradient"
              disabled={hypothesis === null}
              onClick={() => setStep('experience')}
            >
              Vérifier
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'experience' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-violet-700" />
              Étape 2 — Expérimenter
            </CardTitle>
            <Badge tone="science">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Change les longueurs a et b. Observe les trois carrés : la somme du carré bleu (a²)
            et du carré orange (b²) correspond-elle au carré vert (c²) ?
          </p>
          <TriangleDiagram a={a} b={b} />

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sliderA">Côté a</Label>
                <span className="font-mono text-sm font-semibold text-science-700">{a}</span>
              </div>
              <input
                id="sliderA"
                type="range"
                min={1}
                max={10}
                step={1}
                value={a}
                onChange={(e) => changeAB(Number(e.target.value), b)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sliderB">Côté b</Label>
                <span className="font-mono text-sm font-semibold text-alert-700">{b}</span>
              </div>
              <input
                id="sliderB"
                type="range"
                min={1}
                max={10}
                step={1}
                value={b}
                onChange={(e) => changeAB(a, Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-ink/60">
            <span>Observations : {observationsCount}</span>
            <Badge tone={observationsCount >= 2 ? 'action' : 'neutral'} size="sm">
              {observationsCount >= 2 ? 'Prêt à appliquer' : 'Au moins 2 essais'}
            </Badge>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="gradient"
              disabled={observationsCount < 2}
              onClick={() => setStep('analyse')}
            >
              Appliquer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'analyse' && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 3 — Appliquer le théorème</CardTitle>
            <Badge tone="science">3/3</Badge>
          </CardHeader>
          <p className="mb-2 text-ink/80">
            Tu viens de vérifier que <strong>a² + b² = c²</strong>. Pour un triangle rectangle dont
            les côtés mesurent :
          </p>
          <div className="my-3 flex items-center justify-center gap-6 rounded-xl bg-violet-50 p-4 ring-1 ring-violet-100">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-ink/50">Côté a</div>
              <div className="font-display text-3xl font-bold text-science-700">{CHALLENGE_A}</div>
            </div>
            <span className="font-display text-2xl text-ink/40">·</span>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-ink/50">Côté b</div>
              <div className="font-display text-3xl font-bold text-alert-700">{CHALLENGE_B}</div>
            </div>
          </div>
          <p className="mb-4 text-ink/80">Calcule la longueur de l&apos;hypoténuse c.</p>

          <div className="space-y-2">
            <Label htmlFor="guessedC">Valeur de c</Label>
            <Input
              id="guessedC"
              inputMode="decimal"
              value={guessedC}
              onChange={(e) => setGuessedC(e.target.value)}
              placeholder="ex : 5"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('experience')}>
              Revoir l&apos;expérience
            </Button>
            <Button variant="success" disabled={!validGuess || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <p className="text-ink/70">
            Ton travail est enregistré. Tu peux consulter ton score et tes badges sur le tableau
            de bord.
          </p>
        </Card>
      )}
    </div>
  );
}
