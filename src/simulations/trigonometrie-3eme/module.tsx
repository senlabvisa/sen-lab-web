'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sigma } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const TrigScene = dynamic(() => import('./trig-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'opp-hyp' | 'adj-hyp' | 'opp-adj' | null;

export function Trigonometrie3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [angle, setAngle] = useState(30);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'opp-hyp' ? 60 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'trigonometrie-3eme', version: '1.0', steps: { angle, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Sigma className="inline h-5 w-5 text-violet-700" /> Trigonométrie 🎯</CardTitle><Badge tone="maths">Maths · 3ème · BFEM</Badge></CardHeader>
        <p className="text-ink/80">Dans un triangle rectangle : <strong>sin = opposé / hypoténuse</strong>, <strong>cos = adjacent / hypoténuse</strong>, <strong>tan = opposé / adjacent</strong>.</p>
        <div className="mt-3"><NarrationButton text="La trigonométrie permet de calculer des longueurs et des angles. Avec sinus, cosinus, tangente, tu peux résoudre n'importe quel triangle rectangle." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Le cercle trigonométrique</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><TrigScene angle={angle} /></div></div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs"><Label htmlFor="a">Angle</Label><span className="font-mono text-sm font-semibold text-violet-700">{angle}°</span></div>
          <input id="a" type="range" min={0} max={89} value={angle} onChange={(e) => { setAngle(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Définition du sinus</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="Dans un triangle rectangle, sin(angle) = ?"
          options={[
            { key: 'opp-hyp', label: 'côté opposé / hypoténuse' },
            { key: 'adj-hyp', label: 'côté adjacent / hypoténuse' },
            { key: 'opp-adj', label: 'côté opposé / côté adjacent' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">SOH-CAH-TOA : <strong>sin = opp/hyp</strong>, cos = adj/hyp, tan = opp/adj.</p></Card>)}
    </div>
  );
}
