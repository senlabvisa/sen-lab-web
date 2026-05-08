'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Box, CheckCircle2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const SpaceScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Kind = 'cube' | 'sphere' | 'tetra';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'a3' | 'a2' | '6a' | null;

export function GeometrieEspaceTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [k, setK] = useState<Kind>('cube');
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['cube']));
  const [rep, setRep] = useState<Rep>(null);
  function pick(x: Kind) { setK(x); setSeen(p => { const n=new Set(p); n.add(x); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 15 + (rep === 'a3' ? 55 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'geometrie-espace-terminale', version: '1.0', steps: { k, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Box className="inline h-5 w-5 text-violet-700" /> Géométrie dans l&apos;espace 🎯</CardTitle><Badge tone="maths">Maths · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">Cube, sphère, tétraèdre : volumes 3D et calcul vectoriel.</p>
        <div className="mt-3"><NarrationButton text="La géométrie dans l'espace permet de calculer volumes, intersections et positions relatives de droites et plans dans l'espace 3D." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare 3 solides</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><SpaceScene kind={k} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{(['cube','sphere','tetra'] as Kind[]).map(x => <Button key={x} variant={k===x?'gradient':'outline'} size="sm" onClick={() => pick(x)}>{x} {seen.has(x) && k!==x ? '✓' : ''}</Button>)}</div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="Le volume d'un cube de côté a est :"
          options={[{ key: 'a3', label: 'V = a³' }, { key: 'a2', label: 'V = a² (c\'est l\'aire d\'une face)' }, { key: '6a', label: 'V = 6a' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Cube V=a³. Sphère V=4/3πr³. Tétraèdre V=a³√2/12.</p></Card>)}
    </div>
  );
}
