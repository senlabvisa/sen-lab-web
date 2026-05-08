'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Atom } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const DecayScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'demi-vie' | 'duree' | 'masse' | null;

export function DesintegrationRadioactiveTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [t, setT] = useState(0);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'demi-vie' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'desintegration-radioactive-terminale', version: '1.0', steps: { t, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-amber" padding="lg">
        <CardHeader><CardTitle><Atom className="inline h-5 w-5 text-amber-700" /> Désintégration radioactive — Carbone 14</CardTitle><Badge tone="science">PC · Tle</Badge></CardHeader>
        <p className="text-ink/80">Le <strong>Carbone 14</strong> a une demi-vie de 5730 ans. Sert à dater les fossiles (archéologie).</p>
        <div className="mt-3"><NarrationButton text="La radioactivité est utilisée en archéologie pour dater les vestiges. Tous les 5730 ans, la moitié des atomes de carbone 14 se désintègrent." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec le temps</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><DecayScene time={t} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="t">Temps (ans)</Label><span className="font-mono text-amber-700">{t}</span></div><input id="t" type="range" min={0} max={30000} step={500} value={t} onChange={(e) => { setT(Number(e.target.value)); setTweaks(c=>c+1); }} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="La demi-vie d'un noyau radioactif est :"
          options={[{ key: 'demi-vie', label: 'Le temps au bout duquel la moitié des atomes se sont désintégrés.' }, { key: 'duree', label: 'La durée totale de désintégration.' }, { key: 'masse', label: 'La masse divisée par 2.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="amber" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Carbone 14 : T₁/₂ = 5730 ans. Datation jusqu&apos;à ~50 000 ans.</p></Card>)}
    </div>
  );
}
