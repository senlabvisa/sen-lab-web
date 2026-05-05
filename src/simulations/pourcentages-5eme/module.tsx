'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Tag } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const StoreScene = dynamic(() => import('./store-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'challenge' | 'done';

const ORIG = 5000;
const RED = 30;
const TARGET = ORIG * (1 - RED / 100); // 3500

export function Pourcentages5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [orig, setOrig] = useState(8000);
  const [red, setRed] = useState(20);
  const [tweaks, setTweaks] = useState(0);
  const [guess, setGuess] = useState('');
  const guessNum = Number(guess.replace(/[^\d]/g, ''));
  const correct = guessNum === TARGET;

  const score = useMemo(() => Math.min(100, Math.min(30, tweaks * 5) + (correct ? 70 : 0)), [tweaks, correct]);

  async function handleValidate() {
    await onComplete({ shell: 'pourcentages-5eme', version: '1.0', steps: { orig, red, challenge: { orig: ORIG, red: RED, target: TARGET, guess: guessNum, correct } } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-amber" padding="lg">
          <CardHeader><CardTitle><Tag className="inline h-5 w-5 text-amber-700" /> Pourcentages — Soldes Auchan</CardTitle><Badge tone="maths">Maths · 5ème</Badge></CardHeader>
          <p className="text-ink/80">À <strong>Auchan</strong>, on voit souvent <strong>−20%</strong>, <strong>−50%</strong>… Comment calculer le prix final ?</p>
          <div className="mt-3"><NarrationButton text="Quand un produit est en solde à 30% de réduction, ça veut dire qu'on enlève 30 sur 100 du prix. Tu vas voir comment ça marche avec un produit en magasin." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Joue avec les sliders</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><StoreScene originalPrice={orig} reduction={red} /></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs"><Label htmlFor="o">Prix d&apos;origine</Label><span className="font-mono text-sm font-semibold text-amber-700">{orig} F</span></div>
              <input id="o" type="range" min={1000} max={20000} step={500} value={orig} onChange={(e) => { setOrig(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs"><Label htmlFor="r">Réduction</Label><span className="font-mono text-sm font-semibold text-amber-700">{red}%</span></div>
              <input id="r" type="range" min={0} max={70} step={5} value={red} onChange={(e) => { setRed(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
            </div>
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('challenge')}>Défi <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'challenge' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Calcule sans regarder</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
          <p className="mb-3 text-sm text-ink/70">Un sac coûte <strong>{ORIG} F</strong>. Il est soldé à <strong>−{RED}%</strong>. Combien coûte-t-il après réduction ?</p>
          <div className="space-y-2">
            <Label htmlFor="g">Prix final (F CFA)</Label>
            <Input id="g" inputMode="numeric" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="ex : 3500" />
            {guess && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? `✓ Bravo ! ${ORIG} − (${ORIG} × ${RED}/100) = ${TARGET}` : `Indice : enlève ${RED}% du prix.`}</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">−30% = enlever 30 F sur 100. <strong>{ORIG} − 30% = {TARGET} F.</strong></p></Card>
      )}
    </div>
  );
}
