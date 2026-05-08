'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const MitoScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'mitochondries' | 'noyau' | 'membrane' | null;

export function RespirationCellulaire1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [active, setActive] = useState(false);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, (active ? 30 : 0) + (rep === 'mitochondries' ? 70 : 0)), [active, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'respiration-cellulaire-1ere', version: '1.0', steps: { rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Zap className="inline h-5 w-5 text-pink-700" /> Respiration cellulaire</CardTitle><Badge tone="action">SVT · Première</Badge></CardHeader>
        <p className="text-ink/80">Dans les <strong>mitochondries</strong>, le glucose + O₂ produisent de l&apos;<strong>ATP</strong> (énergie cellulaire).</p>
        <div className="mt-3"><NarrationButton text="La respiration cellulaire transforme le glucose et l'oxygène en énergie utilisable par la cellule, l'ATP. Cela se passe dans les mitochondries." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Active la mitochondrie</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><MitoScene active={active} /></div></div>
        <div className="mt-4 flex justify-center"><Button variant={active?'success':'gradient'} onClick={() => setActive(a => !a)}>{active ? '⚡ Active (glucose + O₂ → ATP)' : 'Activer la respiration'}</Button></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!active} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="L'ATP (énergie cellulaire) est produite dans :"
          options={[{ key: 'mitochondries', label: 'Les mitochondries.' }, { key: 'noyau', label: 'Le noyau.' }, { key: 'membrane', label: 'La membrane.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Glucose + O₂ → ATP + CO₂ + H₂O. Dans les mitochondries.</p></Card>)}
    </div>
  );
}
