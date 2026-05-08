'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Rocket } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ProjScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'parabole' | 'droite' | 'cercle' | null;

export function MecaniqueNewtonTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [v0, setV0] = useState(8);
  const [angle, setAngle] = useState(45);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'parabole' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'mecanique-newton-terminale', version: '1.0', steps: { v0, angle, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Rocket className="inline h-5 w-5 text-amber-700" /> Newton — chute libre du baobab 🎯</CardTitle><Badge tone="science">PC · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">Un projectile lancé suit une <strong>trajectoire parabolique</strong> sous l&apos;effet de la gravité.</p>
        <div className="mt-3"><NarrationButton text="Galilée et Newton ont décrit le mouvement des projectiles. La trajectoire est une parabole, déterminée par la vitesse initiale et l'angle de tir." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Lance le projectile</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><ProjScene v0={v0} angle={angle} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="v">v₀ (m/s)</Label><span className="font-mono text-amber-700">{v0}</span></div><input id="v" type="range" min={3} max={15} value={v0} onChange={(e) => { setV0(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="a">Angle (°)</Label><span className="font-mono text-amber-700">{angle}</span></div><input id="a" type="range" min={20} max={75} value={angle} onChange={(e) => { setAngle(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="La trajectoire d'un projectile (sans frottement) est :"
          options={[{ key: 'parabole', label: 'Une parabole.' }, { key: 'droite', label: 'Une droite.' }, { key: 'cercle', label: 'Un cercle.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="amber" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Trajectoire parabolique. Portée max à 45°.</p></Card>)}
    </div>
  );
}
