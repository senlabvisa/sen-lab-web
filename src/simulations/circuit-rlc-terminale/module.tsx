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

const RlcScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'oscille' | 'constant' | 'augmente' | null;

export function CircuitRlcTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [d, setD] = useState(0.3);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'oscille' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'circuit-rlc-terminale', version: '1.0', steps: { d, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-amber" padding="lg">
        <CardHeader><CardTitle><Zap className="inline h-5 w-5 text-amber-700" /> Circuit RLC — oscillations 🎯</CardTitle><Badge tone="science">PC · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">Un circuit RLC produit des <strong>oscillations</strong> amorties par la résistance.</p>
        <div className="mt-3"><NarrationButton text="Le circuit RLC associe résistance, inductance et condensateur. Il produit des oscillations électriques amorties par la résistance." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Amortissement</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><RlcScene damping={d} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="d">R (amortissement)</Label><span className="font-mono text-amber-700">{d.toFixed(2)}</span></div><input id="d" type="range" min={0.05} max={1} step={0.05} value={d} onChange={(e) => { setD(Number(e.target.value)); setTweaks(c=>c+1); }} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Dans un circuit RLC en régime libre, la tension :"
          options={[{ key: 'oscille', label: 'Oscille puis s\'amortit (sinusoïde décroissante).' }, { key: 'constant', label: 'Reste constante.' }, { key: 'augmente', label: 'Augmente sans cesse.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="amber" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">RLC = oscillations amorties. Plus R est grand, plus l&apos;amortissement est rapide.</p></Card>)}
    </div>
  );
}
