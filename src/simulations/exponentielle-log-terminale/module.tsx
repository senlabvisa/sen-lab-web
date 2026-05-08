'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ExpScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Kind = 'exp' | 'log';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'inverses' | 'pareilles' | 'opposees' | null;

export function ExponentielleLogTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [k, setK] = useState<Kind>('exp');
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['exp']));
  const [rep, setRep] = useState<Rep>(null);
  function pick(x: Kind) { setK(x); setSeen(p => { const n=new Set(p); n.add(x); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 20 + (rep === 'inverses' ? 60 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'exponentielle-log-terminale', version: '1.0', steps: { k, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><TrendingUp className="inline h-5 w-5 text-violet-700" /> Exponentielle et logarithme 🎯</CardTitle><Badge tone="maths">Maths · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">eˣ et ln(x) sont des <strong>fonctions inverses</strong> l&apos;une de l&apos;autre. eˣ croît très vite, ln(x) croît très lentement.</p>
        <div className="mt-3"><NarrationButton text="L'exponentielle modélise les croissances rapides comme la population. Le logarithme est sa fonction inverse." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><ExpScene kind={k} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{(['exp','log'] as Kind[]).map(x => <Button key={x} variant={k===x?'gradient':'outline'} size="sm" onClick={() => pick(x)}>{x === 'exp' ? 'eˣ' : 'ln(x)'} {seen.has(x) && k!==x ? '✓' : ''}</Button>)}</div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 2} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="ln(x) et eˣ sont :"
          options={[{ key: 'inverses', label: 'Fonctions inverses : ln(eˣ) = x.' }, { key: 'pareilles', label: 'Identiques.' }, { key: 'opposees', label: 'Opposées : ln(x) = -eˣ.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">eˣ et ln(x) inverses : ln(eˣ) = x.</p></Card>)}
    </div>
  );
}
