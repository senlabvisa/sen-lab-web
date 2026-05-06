'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ScaleScene = dynamic(() => import('./scale-scene'), { ssr: false, loading: () => <div className="h-80 bg-slate-900" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'pareille' | 'change' | 'inverse' | null;

export function PoidsMasse3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [mass, setMass] = useState(60);
  const [planet, setPlanet] = useState<'terre' | 'lune'>('terre');
  const [tested, setTested] = useState<Set<string>>(new Set(['terre']));
  const [rep, setRep] = useState<Rep>(null);

  function pick(p: 'terre' | 'lune') { setPlanet(p); setTested(s => { const n=new Set(s); n.add(p); return n; }); }

  const score = useMemo(() => Math.min(100, tested.size * 20 + (rep === 'pareille' ? 60 : 0)), [tested, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'poids-masse-3eme', version: '1.0', steps: { mass, planet, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Globe className="inline h-5 w-5 text-blue-700" /> Poids et masse</CardTitle><Badge tone="science">PC · 3ème</Badge></CardHeader>
        <p className="text-ink/80">La <strong>masse</strong> (kg) est la quantité de matière, elle ne change pas. Le <strong>poids</strong> (N) dépend de la gravité de l&apos;astre.</p>
        <div className="mt-3"><NarrationButton text="Sur la Terre, la pesanteur g vaut 9,81 newtons par kilogramme. Sur la Lune, seulement 1,62. Tu pèses 6 fois moins lourd sur la Lune, mais ta masse reste la même." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare Terre vs Lune</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><ScaleScene mass={mass} planet={planet} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="m">Ta masse (kg)</Label><span className="font-mono text-sm font-semibold text-blue-700">{mass}</span></div>
            <input id="m" type="range" min={20} max={120} value={mass} onChange={(e) => setMass(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <div className="flex items-end gap-2">
            <Button variant={planet === 'terre' ? 'gradient' : 'outline'} size="sm" onClick={() => pick('terre')}>🌍 Terre</Button>
            <Button variant={planet === 'lune' ? 'gradient' : 'outline'} size="sm" onClick={() => pick('lune')}>🌙 Lune</Button>
          </div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tested.size < 2} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Quand tu vas sur la Lune, ta masse :"
          options={[
            { key: 'pareille', label: 'Reste la même (mais ton poids change).' },
            { key: 'change', label: 'Diminue.' },
            { key: 'inverse', label: 'Devient nulle.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Masse = constante. Poids = m × g (varie selon l&apos;astre).</p></Card>)}
    </div>
  );
}
