'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Scale } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ForceScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'opposees' | 'pareilles' | 'aucune' | null;

export function ForcesEquilibre2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [f1, setF1] = useState(5);
  const [f2, setF2] = useState(3);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'opposees' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'forces-equilibre-2nde', version: '1.0', steps: { f1, f2, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Scale className="inline h-5 w-5 text-blue-700" /> Forces et équilibre — pont de Foundiougne</CardTitle><Badge tone="science">PC · Seconde</Badge></CardHeader>
        <p className="text-ink/80">Un objet est en <strong>équilibre</strong> quand les forces qui s&apos;exercent sur lui se compensent.</p>
        <div className="mt-3"><NarrationButton text="Le pont de Foundiougne reste en équilibre car les forces qui le poussent vers le bas sont compensées par les forces qui le supportent vers le haut." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Équilibre la poutre</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><ForceScene f1={f1} f2={f2} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="f1">F₁ (gauche)</Label><span className="font-mono text-blue-700">{f1} N</span></div><input id="f1" type="range" min={1} max={10} value={f1} onChange={(e) => { setF1(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="f2">F₂ (droite)</Label><span className="font-mono text-emerald-700">{f2} N</span></div><input id="f2" type="range" min={1} max={10} value={f2} onChange={(e) => { setF2(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="2 forces se compensent (objet en équilibre) si elles ont :"
          options={[{ key: 'opposees', label: 'Même intensité, sens opposés.' }, { key: 'pareilles', label: 'Même sens, même intensité.' }, { key: 'aucune', label: 'Aucune relation particulière.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Équilibre = forces de même intensité, sens opposés.</p></Card>)}
    </div>
  );
}
