'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Microscope } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const CellScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Kind = 'animale' | 'vegetale';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'paroi-chloro' | 'noyau' | 'mitochondries' | null;

export function CelluleAnimaleVegetale2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [k, setK] = useState<Kind>('animale');
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['animale']));
  const [rep, setRep] = useState<Rep>(null);
  function pick(x: Kind) { setK(x); setSeen(p => { const n=new Set(p); n.add(x); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 20 + (rep === 'paroi-chloro' ? 60 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'cellule-animale-vegetale-2nde', version: '1.0', steps: { k, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Microscope className="inline h-5 w-5 text-emerald-700" /> Cellule animale vs végétale</CardTitle><Badge tone="action">SVT · Seconde</Badge></CardHeader>
        <p className="text-ink/80">La <strong>cellule végétale</strong> a une paroi, des chloroplastes et une vacuole. La <strong>cellule animale</strong> non.</p>
        <div className="mt-3"><NarrationButton text="Toutes les cellules ont un noyau et des mitochondries. Mais les cellules végétales ont en plus une paroi rigide, des chloroplastes pour la photosynthèse et une grosse vacuole." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare les 2 cellules</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><CellScene kind={k} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{(['animale','vegetale'] as Kind[]).map(x => <Button key={x} variant={k===x?'gradient':'outline'} size="sm" onClick={() => pick(x)}>{x === 'animale' ? '🐑 Animale' : '🌿 Végétale'} {seen.has(x) && k!==x ? '✓' : ''}</Button>)}</div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 2} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="La cellule végétale possède en plus de l'animale :"
          options={[{ key: 'paroi-chloro', label: 'Une paroi, des chloroplastes et une vacuole.' }, { key: 'noyau', label: 'Un noyau (l\'animale n\'en a pas).' }, { key: 'mitochondries', label: 'Des mitochondries.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Végétale = animale + paroi + chloroplastes + vacuole.</p></Card>)}
    </div>
  );
}
