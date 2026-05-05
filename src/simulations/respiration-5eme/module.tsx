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

const LungsScene = dynamic(() => import('./lungs-scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'oxygene' | 'co2' | 'azote' | null;

export function Respiration5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [rate, setRate] = useState(1.5);
  const [tested, setTested] = useState(false);
  const [rep, setRep] = useState<Rep>(null);

  function changeRate(v: number) { setRate(v); setTested(true); }

  const score = useMemo(() => Math.min(100, (tested ? 30 : 0) + (rep === 'oxygene' ? 70 : 0)), [tested, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'respiration-5eme', version: '1.0', steps: { rate, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader><CardTitle><Wind className="inline h-5 w-5 text-emerald-700" /> Respiration humaine</CardTitle><Badge tone="action">SVT · 5ème</Badge></CardHeader>
          <p className="text-ink/80">Tes <strong>poumons</strong> se gonflent et se dégonflent ~15 fois par minute. À l&apos;effort, le rythme s&apos;accélère.</p>
          <div className="mt-3"><NarrationButton text="Tu respires sans même y penser. Tes poumons aspirent l'air, en gardent l'oxygène pour ton corps, et rejettent le dioxyde de carbone. Quand tu cours, tu respires plus vite : tes muscles ont besoin de plus d'oxygène." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Le rythme respiratoire</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><LungsScene breathRate={rate} /></div></div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="r">Rythme (au repos / à l&apos;effort)</Label><span className="font-mono text-sm font-semibold text-pink-700">{Math.round(rate*10)} resp/min</span></div>
            <input id="r" type="range" min={0.8} max={4} step={0.1} value={rate} onChange={(e) => changeRate(Number(e.target.value))} className="slider-lab w-full" />
            <div className="mt-1 flex justify-between text-[10px] text-ink/40"><span>Sommeil</span><span>Repos</span><span>Marche</span><span>Course</span></div>
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!tested} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
          <QcmStep label="De l'air, nos poumons absorbent surtout :"
            options={[
              { key: 'oxygene', label: 'L\'oxygène (O₂), nécessaire à toutes les cellules.' },
              { key: 'co2', label: 'Le dioxyde de carbone (CO₂).' },
              { key: 'azote', label: 'L\'azote.' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">On absorbe l&apos;<strong>oxygène</strong>, on rejette le <strong>CO₂</strong>. À l&apos;effort, on respire plus vite.</p></Card>
      )}
    </div>
  );
}
