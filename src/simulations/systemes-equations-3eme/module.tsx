'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Calculator } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const SystemScene = dynamic(() => import('./system-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'done';

export function SystemesEquations3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const correct = x === 2 && y === 3;
  const score = useMemo(() => correct ? 100 : Math.min(80, (x + y) * 10), [x, y, correct]);

  async function handleValidate() {
    await onComplete({ shell: 'systemes-equations-3eme', version: '1.0', steps: { x, y, correct } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Calculator className="inline h-5 w-5 text-violet-700" /> Systèmes 2 équations 2 inconnues</CardTitle><Badge tone="maths">Maths · 3ème</Badge></CardHeader>
        <p className="text-ink/80">Trouve x et y qui vérifient les <strong>2 équations en même temps</strong>.</p>
        <div className="mt-3"><NarrationButton text="Un système d'équations à deux inconnues a une seule solution : un couple x et y qui satisfait les deux équations en même temps." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Trouve la solution</CardTitle><Badge tone="maths">1/1</Badge></CardHeader>
        <p className="mb-3 text-sm text-ink/70">Système : <strong className="font-mono">x + y = 5</strong> et <strong className="font-mono">2x − y = 1</strong></p>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><SystemScene x={x} y={y} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="x">x</Label><span className="font-mono text-sm font-semibold text-violet-700">{x}</span></div>
            <input id="x" type="range" min={0} max={5} value={x} onChange={(e) => setX(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="y">y</Label><span className="font-mono text-sm font-semibold text-violet-700">{y}</span></div>
            <input id="y" type="range" min={0} max={5} value={y} onChange={(e) => setY(Number(e.target.value))} className="slider-lab w-full" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
        </div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Solution : <strong>x = 2, y = 3</strong>.</p></Card>)}
    </div>
  );
}
