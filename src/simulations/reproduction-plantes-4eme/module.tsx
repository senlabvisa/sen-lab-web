'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Flower } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const FlowerScene = dynamic(() => import('./flower-scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'pollen' | 'nectar' | 'feuilles' | null;

export function ReproductionPlantes4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [pos, setPos] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (step !== 'play') return;
    tickRef.current = window.setInterval(() => setPos(p => (p + 1) % 100), 60);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [step]);

  const score = useMemo(() => Math.min(100, 30 + (rep === 'pollen' ? 70 : 0)), [rep]);

  async function handleValidate() {
    await onComplete({ shell: 'reproduction-plantes-4eme', version: '1.0', steps: { rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Flower className="inline h-5 w-5 text-pink-700" /> Reproduction des plantes — la pollinisation</CardTitle><Badge tone="action">SVT · 4ème</Badge></CardHeader>
        <p className="text-ink/80">Les abeilles transportent le <strong>pollen</strong> de fleur en fleur, et permettent à la plante de se reproduire.</p>
        <div className="mt-3"><NarrationButton text="Quand une abeille butine une fleur pour son nectar, elle se couvre de pollen. Elle l'apporte sur la fleur suivante, ce qui permet la fécondation et la formation des fruits et graines." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Observe l&apos;abeille butiner</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><FlowerScene beePosition={pos} /></div></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="L'abeille transporte d'une fleur à l'autre :"
          options={[
            { key: 'pollen', label: 'Du pollen — qui féconde la fleur suivante.' },
            { key: 'nectar', label: 'Uniquement du nectar.' },
            { key: 'feuilles', label: 'Des morceaux de feuilles.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Pollinisation = transport du pollen par les insectes. Sans abeilles, peu de fruits !</p></Card>)}
    </div>
  );
}
