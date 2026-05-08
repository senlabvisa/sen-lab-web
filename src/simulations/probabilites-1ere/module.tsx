'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Dice5 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ProbScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'demi' | 'tiers' | 'quart' | null;

export function Probabilites1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [trials, setTrials] = useState(10);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'demi' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'probabilites-1ere', version: '1.0', steps: { trials, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Dice5 className="inline h-5 w-5 text-violet-700" /> Probabilités — loi des grands nombres</CardTitle><Badge tone="maths">Maths · Première</Badge></CardHeader>
        <p className="text-ink/80">Avec beaucoup de lancers, la <strong>fréquence</strong> tend vers la <strong>probabilité</strong> théorique.</p>
        <div className="mt-3"><NarrationButton text="Plus on lance une pièce, plus la fréquence d'apparition de pile s'approche de un demi. C'est la loi des grands nombres." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Lance une pièce N fois</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><ProbScene trials={trials} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="t">Lancers</Label><span className="font-mono text-violet-700">{trials}</span></div><input id="t" type="range" min={5} max={1000} step={5} value={trials} onChange={(e) => { setTrials(Number(e.target.value)); setTweaks(c=>c+1); }} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="Avec une pièce équilibrée, la probabilité d'obtenir Pile est :"
          options={[{ key: 'demi', label: '1/2 (50%)' }, { key: 'tiers', label: '1/3' }, { key: 'quart', label: '1/4' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">P(Pile) = 1/2. Plus de lancers ⇒ fréquence ↗ probabilité théorique.</p></Card>)}
    </div>
  );
}
