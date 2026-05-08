'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Dna } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const CellScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Kind = 'mitose' | 'meiose';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'gametes' | 'somatique' | 'cancer' | null;

export function MeioseMitoseTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [k, setK] = useState<Kind>('mitose');
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['mitose']));
  const [rep, setRep] = useState<Rep>(null);
  function pick(x: Kind) { setK(x); setSeen(p => { const n=new Set(p); n.add(x); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 20 + (rep === 'gametes' ? 60 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'meiose-mitose-terminale', version: '1.0', steps: { k, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Dna className="inline h-5 w-5 text-pink-700" /> Méiose vs Mitose</CardTitle><Badge tone="action">SVT · Tle</Badge></CardHeader>
        <p className="text-ink/80"><strong>Mitose</strong> = duplication identique (2 cellules à 2n). <strong>Méiose</strong> = production de gamètes (4 cellules à n).</p>
        <div className="mt-3"><NarrationButton text="La mitose produit deux cellules identiques pour la croissance. La méiose produit quatre cellules à demi-chromosomes pour la reproduction sexuée." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><CellScene kind={k} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{(['mitose','meiose'] as Kind[]).map(x => <Button key={x} variant={k===x?'gradient':'outline'} size="sm" onClick={() => pick(x)}>{x} {seen.has(x) && k!==x ? '✓' : ''}</Button>)}</div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 2} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="La méiose produit :"
          options={[{ key: 'gametes', label: '4 gamètes à n chromosomes (reproduction sexuée).' }, { key: 'somatique', label: '2 cellules identiques (croissance).' }, { key: 'cancer', label: 'Des cellules cancéreuses.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Mitose : 2n → 2n + 2n. Méiose : 2n → n + n + n + n (gamètes).</p></Card>)}
    </div>
  );
}
