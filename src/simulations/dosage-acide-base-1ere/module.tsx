'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, FlaskConical } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const DosageScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'equiv' | 'debut' | 'fin' | null;

export function DosageAcideBase1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [vol, setVol] = useState(0);
  const [reachedEq, setReachedEq] = useState(false);
  const [rep, setRep] = useState<Rep>(null);
  function setV(v: number) { setVol(v); if (Math.abs(v - 10) < 0.5) setReachedEq(true); }
  const score = useMemo(() => Math.min(100, (reachedEq ? 30 : 0) + (rep === 'equiv' ? 70 : 0)), [reachedEq, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'dosage-acide-base-1ere', version: '1.0', steps: { vol, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-amber" padding="lg">
        <CardHeader><CardTitle><FlaskConical className="inline h-5 w-5 text-amber-700" /> Dosage acide-base</CardTitle><Badge tone="science">PC · Première</Badge></CardHeader>
        <p className="text-ink/80">Verse de la base dans un acide. À l&apos;<strong>équivalence</strong>, l&apos;acide est entièrement neutralisé.</p>
        <div className="mt-3"><NarrationButton text="Le dosage permet de connaître la concentration d'un acide en lui ajoutant une base de concentration connue. À l'équivalence, le pH change brutalement." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Trouve le volume d&apos;équivalence</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><DosageScene volumeAdded={vol} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="v">Volume base (mL)</Label><span className="font-mono text-amber-700">{vol.toFixed(1)}</span></div><input id="v" type="range" min={0} max={20} step={0.5} value={vol} onChange={(e) => setV(Number(e.target.value))} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!reachedEq} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="L'équivalence d'un dosage est atteinte quand :"
          options={[{ key: 'equiv', label: 'Le saut de pH est observé (acide entièrement neutralisé).' }, { key: 'debut', label: 'On commence à verser la base.' }, { key: 'fin', label: 'À la fin de l\'expérience.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="amber" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">À l&apos;équivalence : n(acide) = n(base versée). Saut de pH brutal.</p></Card>)}
    </div>
  );
}
