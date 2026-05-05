'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const MultimeterScene = dynamic(() => import('./multimeter-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'A' | 'V' | 'O' | null;

export function IntensiteTension4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [voltage, setVoltage] = useState(6);
  const [resistance, setResistance] = useState(20);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'A' ? 60 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'intensite-tension-4eme', version: '1.0', steps: { voltage, resistance, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Zap className="inline h-5 w-5 text-blue-700" /> Intensité et tension</CardTitle><Badge tone="science">PC · 4ème</Badge></CardHeader>
        <p className="text-ink/80"><strong>Tension</strong> (en Volts, V) = la « pression » électrique. <strong>Intensité</strong> (en Ampères, A) = le « débit » électrique.</p>
        <div className="mt-3"><NarrationButton text="Le voltmètre mesure la tension en volts. L'ampèremètre mesure l'intensité en ampères. Plus la tension est élevée, plus l'intensité du courant augmente." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec U et R</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><MultimeterScene voltage={voltage} resistance={resistance} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="v">Tension (V)</Label><span className="font-mono text-sm font-semibold text-blue-700">{voltage}</span></div>
            <input id="v" type="range" min={1} max={12} value={voltage} onChange={(e) => { setVoltage(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="r">Résistance (Ω)</Label><span className="font-mono text-sm font-semibold text-blue-700">{resistance}</span></div>
            <input id="r" type="range" min={5} max={100} value={resistance} onChange={(e) => { setResistance(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
          </div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Quelle unité ?</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="L'intensité du courant électrique se mesure en :"
          options={[
            { key: 'A', label: 'Ampères (A).' },
            { key: 'V', label: 'Volts (V).' },
            { key: 'O', label: 'Ohms (Ω).' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Tension = V. Intensité = A. Résistance = Ω.</p></Card>)}
    </div>
  );
}
