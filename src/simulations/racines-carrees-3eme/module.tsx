'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sigma } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const SquareScene = dynamic(() => import('./square-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'challenge' | 'done';

export function RacinesCarrees3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [side, setSide] = useState(2);
  const [tweaks, setTweaks] = useState(0);
  // √144 = 12
  const [g, setG] = useState('');
  const correct = Number(g) === 12;
  const score = useMemo(() => Math.min(100, Math.min(30, tweaks * 5) + (correct ? 70 : 0)), [tweaks, correct]);

  async function handleValidate() {
    await onComplete({ shell: 'racines-carrees-3eme', version: '1.0', steps: { side, correct } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Sigma className="inline h-5 w-5 text-violet-700" /> Racines carrées</CardTitle><Badge tone="maths">Maths · 3ème</Badge></CardHeader>
        <p className="text-ink/80">√25 = 5 car 5² = 25. La racine carrée est l&apos;opération inverse du carré.</p>
        <div className="mt-3"><NarrationButton text="Si tu connais l'aire d'un terrain carré, par exemple 144 mètres carrés, sa racine carrée te donne le côté : 12 mètres." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Le carré et son aire</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><SquareScene side={side} /></div></div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs"><Label htmlFor="s">Côté</Label><span className="font-mono text-sm font-semibold text-violet-700">{side.toFixed(1)}</span></div>
          <input id="s" type="range" min={1} max={5} step={0.1} value={side} onChange={(e) => { setSide(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('challenge')}>Défi <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'challenge' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — √144 = ?</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <p className="mb-3 text-sm text-ink/70">Un terrain carré a une aire de 144 m². Quel est son côté ?</p>
        <div className="space-y-2"><Label htmlFor="g">Côté (m)</Label><Input id="g" inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} placeholder="12" />
          {g && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? '✓ √144 = 12 (car 12² = 144)' : 'Astuce : quel nombre × lui-même = 144 ?'}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">√144 = 12. La racine carrée est la longueur du côté à partir de l&apos;aire.</p></Card>)}
    </div>
  );
}
