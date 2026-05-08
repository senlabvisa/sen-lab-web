'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Train } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const TrainScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Step = 'intro' | 'play' | 'calc' | 'done';

export function MouvementVitesse2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [speed, setSpeed] = useState(80);
  // 100 km en 2h ⇒ 50 km/h
  const [g, setG] = useState('');
  const correct = Number(g) === 50;
  const score = useMemo(() => Math.min(100, (speed !== 80 ? 30 : 0) + (correct ? 70 : 0)), [speed, correct]);
  async function handleValidate() {
    await onComplete({ shell: 'mouvement-vitesse-2nde', version: '1.0', steps: { speed, correct } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Train className="inline h-5 w-5 text-blue-700" /> Mouvement et vitesse — TER Dakar</CardTitle><Badge tone="science">PC · Seconde</Badge></CardHeader>
        <p className="text-ink/80">Le <strong>TER de Dakar</strong> roule à 80 km/h en moyenne. v = d / t.</p>
        <div className="mt-3"><NarrationButton text="Le TER, train express régional, relie Dakar à Diamniadio. Sa vitesse moyenne est de 80 kilomètres par heure." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec la vitesse</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><TrainScene speed={speed} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="s">Vitesse (km/h)</Label><span className="font-mono text-blue-700">{speed}</span></div><input id="s" type="range" min={20} max={150} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" onClick={() => setStep('calc')}>Calcul <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'calc' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Défi</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <p className="mb-3 text-sm text-ink/70">Un train parcourt <strong>100 km en 2h</strong>. Quelle est sa vitesse moyenne en km/h ?</p>
        <div className="space-y-2"><Label htmlFor="g">Vitesse</Label><Input id="g" inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} placeholder="50" />{g && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? '✓ v = 100/2 = 50 km/h' : 'v = d / t'}</p>}</div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">v = d / t. 100 km / 2h = 50 km/h.</p></Card>)}
    </div>
  );
}
