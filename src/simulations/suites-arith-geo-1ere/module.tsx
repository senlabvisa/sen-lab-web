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

const StairsScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Kind = 'arith' | 'geo';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'multiplie' | 'ajoute' | 'divise' | null;

export function SuitesArithGeo1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [k, setK] = useState<Kind>('arith');
  const [q, setQ] = useState(2);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'multiplie' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'suites-arith-geo-1ere', version: '1.0', steps: { k, q, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Sigma className="inline h-5 w-5 text-violet-700" /> Suites arithmétiques et géométriques</CardTitle><Badge tone="maths">Maths · Première</Badge></CardHeader>
        <p className="text-ink/80"><strong>Arithmétique</strong> : on AJOUTE r à chaque terme. <strong>Géométrique</strong> : on MULTIPLIE par q.</p>
        <div className="mt-3"><NarrationButton text="Une suite arithmétique progresse en ajoutant la même valeur. Une suite géométrique progresse en multipliant par la même valeur. Cette dernière croît beaucoup plus vite." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare les 2 types</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><StairsScene kind={k} q={q} /></div></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-1">{(['arith','geo'] as Kind[]).map(x => <Button key={x} variant={k===x?'gradient':'outline'} size="sm" onClick={() => { setK(x); setTweaks(t=>t+1); }}>{x === 'arith' ? 'Arith' : 'Géo'}</Button>)}</div>
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="q">{k === 'arith' ? 'Raison r' : 'Raison q'}</Label><span className="font-mono text-violet-700">{q}</span></div><input id="q" type="range" min={k === 'arith' ? -3 : 0.5} max={k === 'arith' ? 5 : 3} step={0.5} value={q} onChange={(e) => { setQ(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="Dans une suite géométrique, on passe d'un terme au suivant en :"
          options={[{ key: 'multiplie', label: 'Multipliant par la raison q.' }, { key: 'ajoute', label: 'Ajoutant la raison.' }, { key: 'divise', label: 'Divisant par la raison.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Arithm. = +r. Géom. = ×q. uₙ = u₀ + nr ou u₀×qⁿ.</p></Card>)}
    </div>
  );
}
