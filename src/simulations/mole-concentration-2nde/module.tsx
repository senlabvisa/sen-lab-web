'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, FlaskConical } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const MoleScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'masse-vol' | 'masse-mol' | 'mol-vol' | null;

export function MoleConcentration2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [mass, setMass] = useState(5.85);
  const [vol, setVol] = useState(100);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'mol-vol' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'mole-concentration-2nde', version: '1.0', steps: { mass, vol, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><FlaskConical className="inline h-5 w-5 text-blue-700" /> Mole et concentration</CardTitle><Badge tone="science">PC · Seconde</Badge></CardHeader>
        <p className="text-ink/80">La <strong>concentration</strong> = moles ÷ volume. Permet de comparer des solutions.</p>
        <div className="mt-3"><NarrationButton text="Pour préparer une solution salée à concentration précise, on dissout une masse donnée de sel dans un volume donné d'eau." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Prépare une solution NaCl</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><MoleScene mass={mass} volume={vol} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="m">Masse (g)</Label><span className="font-mono text-blue-700">{mass}</span></div><input id="m" type="range" min={0.5} max={20} step={0.5} value={mass} onChange={(e) => { setMass(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="v">Volume (mL)</Label><span className="font-mono text-blue-700">{vol}</span></div><input id="v" type="range" min={50} max={500} step={10} value={vol} onChange={(e) => { setVol(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="La concentration molaire c d'une solution se calcule par :"
          options={[{ key: 'mol-vol', label: 'c = n / V (moles ÷ volume).' }, { key: 'masse-vol', label: 'c = m / V (masse ÷ volume).' }, { key: 'masse-mol', label: 'c = m / n.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">c = n / V. n = m / M (masse molaire).</p></Card>)}
    </div>
  );
}
