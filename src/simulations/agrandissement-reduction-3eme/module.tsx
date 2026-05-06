'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Maximize2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ScaleScene = dynamic(() => import('./scale-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'agrandissement' | 'reduction' | 'identique' | null;

export function AgrandissementReduction3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [ratio, setRatio] = useState(1);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, (ratio !== 1 ? 30 : 0) + (rep === 'reduction' ? 70 : 0)), [ratio, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'agrandissement-reduction-3eme', version: '1.0', steps: { ratio, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Maximize2 className="inline h-5 w-5 text-violet-700" /> Agrandissement et réduction — carte du Sénégal</CardTitle><Badge tone="maths">Maths · 3ème</Badge></CardHeader>
        <p className="text-ink/80">Une carte à l&apos;échelle 1/1000 000 = la réalité divisée par 1 000 000. C&apos;est une <strong>réduction</strong>.</p>
        <div className="mt-3"><NarrationButton text="Sur une carte du Sénégal au 1 sur 1 million, 1 cm représente 10 km dans la réalité. C'est une réduction." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec l&apos;échelle</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><ScaleScene ratio={ratio} /></div></div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs"><Label htmlFor="r">Ratio</Label><span className="font-mono text-sm font-semibold text-violet-700">×{ratio.toFixed(1)}</span></div>
          <input id="r" type="range" min={0.3} max={2.5} step={0.1} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} className="slider-lab w-full" />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={ratio === 1} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="Une carte 1/100 000 de la région de Dakar correspond à :"
          options={[
            { key: 'reduction', label: 'Une réduction (la carte est plus petite que la réalité).' },
            { key: 'agrandissement', label: 'Un agrandissement.' },
            { key: 'identique', label: 'La taille réelle.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Échelle &lt; 1 = réduction. Échelle &gt; 1 = agrandissement.</p></Card>)}
    </div>
  );
}
