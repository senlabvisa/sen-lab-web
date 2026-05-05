'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Pizza } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Fractions et nombres décimaux (5ème, Maths)
 * Réutilise BreadScene de fractions-simples-6eme avec un focus décimaux.
 */

const BreadScene = dynamic(() => import('@/simulations/fractions-simples-6eme/bread-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement…
    </div>
  ),
});

type Step = 'intro' | 'play' | 'convert' | 'done';

const INTRO =
  "Une fraction comme 1/2 peut aussi s'écrire en nombre décimal : 0,5. " +
  "Tu vas découvrir comment passer d'une fraction à son équivalent décimal grâce à un pain de mil 3D.";

const CONCLUSION =
  "Pour passer d'une fraction à un nombre décimal, on divise le numérateur par le dénominateur. " +
  "1/2 = 0,5. 1/4 = 0,25. 3/4 = 0,75. C'est très utile pour les calculs de prix ou de mesures.";

export function FractionsDecimaux5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [parts, setParts] = useState(4);
  const [eaten, setEaten] = useState(1);
  const [tweaks, setTweaks] = useState(0);

  const decimal = eaten / parts;

  const [convertGuess, setConvertGuess] = useState('');
  const correctConvert = 0.75; // 3/4
  const guessNum = Number(convertGuess.replace(',', '.').replace(/[^\d.]/g, ''));
  const convertCorrect = Math.abs(guessNum - correctConvert) < 0.01;

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, tweaks * 5);
    if (convertCorrect) s += 70;
    return Math.max(0, Math.min(100, s));
  }, [tweaks, convertCorrect]);

  async function handleValidate() {
    await onComplete(
      { shell: 'fractions-decimaux-5eme', version: '1.0', steps: { parts, eaten, decimal, convertCorrect } },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-amber" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pizza className="h-5 w-5 text-amber-700" /> Fractions ↔ décimaux
            </CardTitle>
            <Badge tone="maths">Maths · 5ème</Badge>
          </CardHeader>
          <p className="text-ink/80">
            La fraction <strong>1/2</strong> peut aussi s&apos;écrire <strong>0,5</strong>. Tu
            vas comprendre comment passer de l&apos;un à l&apos;autre.
          </p>
          <div className="mt-3"><NarrationButton text={INTRO} /></div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('play')}>
              Jouer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 1 — La fraction et son décimal</CardTitle>
            <Badge tone="maths">1/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Modifie le pain. Observe que <strong>{eaten}/{parts} = {decimal.toFixed(3)}</strong>.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <BreadScene parts={parts} eaten={eaten} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="p">Parts</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{parts}</span>
              </div>
              <input id="p" type="range" min={2} max={10} value={parts}
                onChange={(e) => { setParts(Number(e.target.value)); setTweaks(n=>n+1); }}
                className="slider-lab w-full" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="e">Mangées</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{eaten}</span>
              </div>
              <input id="e" type="range" min={0} max={parts} value={Math.min(eaten,parts)}
                onChange={(e) => { setEaten(Number(e.target.value)); setTweaks(n=>n+1); }}
                className="slider-lab w-full" />
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-center font-mono ring-1 ring-violet-100">
            <span className="text-amber-700 font-bold">{eaten}/{parts}</span> = <span className="text-violet-700 font-bold">{decimal.toFixed(3)}</span>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('convert')}>
              Défi <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'convert' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Convertir 3/4 en décimal</CardTitle>
            <Badge tone="maths">2/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Si tu manges <strong>3 parts sur 4</strong>, tu as mangé combien en décimal ?
          </p>
          <div className="space-y-2">
            <Label htmlFor="c">Réponse (ex : 0,5)</Label>
            <Input id="c" value={convertGuess} onChange={(e) => setConvertGuess(e.target.value)} placeholder="0,75" />
            {convertGuess && (
              <p className={'text-xs ' + (convertCorrect ? 'text-action-700' : 'text-alert-700')}>
                {convertCorrect ? '✓ Bravo ! 3 ÷ 4 = 0,75.' : 'Astuce : divise 3 par 4.'}
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!convertCorrect || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> Valider
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-amber">
          <CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader>
          <p className="text-ink/80">Une fraction = numérateur ÷ dénominateur. <strong>3/4 = 0,75</strong>.</p>
          <div className="mt-3"><NarrationButton text={CONCLUSION} /></div>
        </Card>
      )}
    </div>
  );
}
