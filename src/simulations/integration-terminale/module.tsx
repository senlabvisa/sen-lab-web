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

const IntegScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'aire' | 'pente' | 'longueur' | null;

export function IntegrationTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [u, setU] = useState(2);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'aire' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'integration-terminale', version: '1.0', steps: { u, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Sigma className="inline h-5 w-5 text-violet-700" /> Intégration et calcul d&apos;aire 🎯</CardTitle><Badge tone="maths">Maths · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">L&apos;<strong>intégrale</strong> ∫f(x)dx = aire sous la courbe de f. Pour x², l&apos;intégrale est x³/3.</p>
        <div className="mt-3"><NarrationButton text="L'intégrale est l'opération inverse de la dérivée. Elle permet de calculer des aires et des volumes." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec la borne supérieure</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><IntegScene upper={u} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="u">Borne haute</Label><span className="font-mono text-violet-700">{u.toFixed(1)}</span></div><input id="u" type="range" min={0.5} max={3} step={0.1} value={u} onChange={(e) => { setU(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="Une intégrale ∫f(x)dx représente :"
          options={[{ key: 'aire', label: 'L\'aire sous la courbe.' }, { key: 'pente', label: 'La pente de la tangente.' }, { key: 'longueur', label: 'La longueur de la courbe.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">∫₀ᵘ x² dx = u³/3. C&apos;est l&apos;aire sous la courbe.</p></Card>)}
    </div>
  );
}
