'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Play, Car } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const MotionScene = dynamic(() => import('./motion-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'calc' | 'done';

export function Cinematique3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [speed, setSpeed] = useState(2);
  const [running, setRunning] = useState(false);
  // v = d/t : pour 100m en 5s, v = 20 m/s
  const [g, setG] = useState('');
  const correct = Number(g) === 20;
  const score = useMemo(() => Math.min(100, (running ? 30 : 0) + (correct ? 70 : 0)), [running, correct]);

  async function handleValidate() {
    await onComplete({ shell: 'cinematique-3eme', version: '1.0', steps: { speed, correct } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Car className="inline h-5 w-5 text-amber-700" /> Cinématique — vitesse</CardTitle><Badge tone="science">PC · 3ème</Badge></CardHeader>
        <p className="text-ink/80"><strong>Vitesse = distance / temps</strong>. Une voiture qui parcourt 60 km en 1h roule à 60 km/h.</p>
        <div className="mt-3"><NarrationButton text="La vitesse est la distance parcourue divisée par le temps mis. Si tu cours 100 mètres en 20 secondes, ta vitesse est de 5 mètres par seconde." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Lance la voiture</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><MotionScene speed={speed} running={running} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="s">Vitesse</Label><span className="font-mono text-sm font-semibold text-amber-700">{speed.toFixed(1)} m/s</span></div>
            <input id="s" type="range" min={0.5} max={8} step={0.5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <Button variant="gradient" onClick={() => setRunning(r => !r)}><Play className="h-3.5 w-3.5" />{running ? 'Stop' : 'Démarrer'}</Button>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!running} onClick={() => setStep('calc')}>Calculer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'calc' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Défi</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <p className="mb-3 text-sm text-ink/70">Une moto parcourt <strong>100 m en 5 s</strong>. Quelle est sa vitesse en m/s ?</p>
        <div className="space-y-2"><Label htmlFor="g">Vitesse (m/s)</Label><Input id="g" inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} placeholder="ex : 20" />
          {g && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? '✓ v = 100/5 = 20 m/s' : 'Astuce : v = d ÷ t'}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">v = d/t. 100 m / 5 s = 20 m/s.</p></Card>)}
    </div>
  );
}
