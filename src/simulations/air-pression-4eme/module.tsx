'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Wind } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const BalloonScene = dynamic(() => import('./balloon-scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'plus' | 'moins' | 'pareil' | null;

export function AirPression4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [pressure, setPressure] = useState(100);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 8) + (rep === 'plus' ? 60 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'air-pression-4eme', version: '1.0', steps: { pressure, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Wind className="inline h-5 w-5 text-blue-700" /> Air et pression</CardTitle><Badge tone="science">PC · 4ème</Badge></CardHeader>
        <p className="text-ink/80">Plus on souffle dans un ballon, plus la <strong>pression</strong> de l&apos;air augmente, et plus le ballon grossit.</p>
        <div className="mt-3"><NarrationButton text="L'air autour de nous a une pression. Quand tu souffles dans un ballon, tu augmentes cette pression à l'intérieur, et le ballon se gonfle." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Gonfle le ballon</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><BalloonScene pressure={pressure} /></div></div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs"><Label htmlFor="p">Pression interne</Label><span className="font-mono text-sm font-semibold text-blue-700">{pressure} hPa</span></div>
          <input id="p" type="range" min={0} max={300} value={pressure} onChange={(e) => { setPressure(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Quand on augmente la pression dans le ballon, son volume :"
          options={[
            { key: 'plus', label: 'Augmente (le ballon se gonfle).' },
            { key: 'moins', label: 'Diminue.' },
            { key: 'pareil', label: 'Reste le même.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Plus la pression interne est forte, plus le ballon grossit.</p></Card>)}
    </div>
  );
}
