'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Eye } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const MirrorScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Kind = 'concave' | 'convexe';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'concave' | 'convexe' | 'plat' | null;

export function OptiqueMiroirs1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [k, setK] = useState<Kind>('concave');
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['concave']));
  const [rep, setRep] = useState<Rep>(null);
  function pick(x: Kind) { setK(x); setSeen(p => { const n=new Set(p); n.add(x); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 20 + (rep === 'concave' ? 60 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'optique-miroirs-1ere', version: '1.0', steps: { k, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Eye className="inline h-5 w-5 text-blue-700" /> Miroirs sphériques 🎯</CardTitle><Badge tone="science">PC · Première · Bac</Badge></CardHeader>
        <p className="text-ink/80">Le miroir <strong>concave</strong> converge la lumière (télescope). Le <strong>convexe</strong> la diverge (rétroviseur).</p>
        <div className="mt-3"><NarrationButton text="Le miroir concave concentre la lumière en un point appelé foyer. Le miroir convexe au contraire la disperse, ce qui agrandit le champ de vision." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare les 2 miroirs</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><MirrorScene kind={k} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{(['concave','convexe'] as Kind[]).map(x => <Button key={x} variant={k===x?'gradient':'outline'} size="sm" onClick={() => pick(x)}>{x} {seen.has(x) && k!==x ? '✓' : ''}</Button>)}</div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 2} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Quel miroir converge les rayons (utilisé dans les télescopes) ?"
          options={[{ key: 'concave', label: 'Concave (convergent).' }, { key: 'convexe', label: 'Convexe (divergent).' }, { key: 'plat', label: 'Plat.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Concave = convergent (télescope). Convexe = divergent (rétroviseur).</p></Card>)}
    </div>
  );
}
