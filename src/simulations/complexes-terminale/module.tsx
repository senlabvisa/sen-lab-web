'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sigma } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ComplexScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'argand' | 'reel' | 'imag' | null;

export function ComplexesTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [r, setR] = useState(2);
  const [im, setIm] = useState(1);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'argand' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'complexes-terminale', version: '1.0', steps: { r, im, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Sigma className="inline h-5 w-5 text-violet-700" /> Nombres complexes</CardTitle><Badge tone="maths">Maths · Tle</Badge></CardHeader>
        <p className="text-ink/80">Un nombre complexe z = a + bi est représenté par un point dans le plan d&apos;<strong>Argand</strong>.</p>
        <div className="mt-3"><NarrationButton text="Les nombres complexes étendent les nombres réels en ajoutant l'unité imaginaire i, qui vérifie i au carré égale moins un." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Place un complexe</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><ComplexScene real={r} imag={im} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="r">Re(z)</Label><span className="font-mono text-violet-700">{r.toFixed(1)}</span></div><input id="r" type="range" min={-2.5} max={2.5} step={0.1} value={r} onChange={(e) => { setR(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="i">Im(z)</Label><span className="font-mono text-violet-700">{im.toFixed(1)}</span></div><input id="i" type="range" min={-2.5} max={2.5} step={0.1} value={im} onChange={(e) => { setIm(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="Le plan où on représente les nombres complexes s'appelle :"
          options={[{ key: 'argand', label: 'Le plan d\'Argand-Cauchy.' }, { key: 'reel', label: 'L\'axe des réels uniquement.' }, { key: 'imag', label: 'L\'axe des imaginaires uniquement.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">z = a + bi → point M(a, b) dans le plan d&apos;Argand. |z| = √(a²+b²).</p></Card>)}
    </div>
  );
}
