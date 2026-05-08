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

const KineticScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'rapide' | 'lente' | 'pareille' | null;

export function CinetiqueChimiqueTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [t, setT] = useState(25);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'rapide' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'cinetique-chimique-terminale', version: '1.0', steps: { t, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-amber" padding="lg">
        <CardHeader><CardTitle><FlaskConical className="inline h-5 w-5 text-amber-700" /> Cinétique chimique 🎯</CardTitle><Badge tone="science">PC · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">La <strong>vitesse de réaction</strong> dépend de la température (loi d&apos;Arrhenius).</p>
        <div className="mt-3"><NarrationButton text="La cinétique étudie la vitesse des réactions chimiques. Plus la température est élevée, plus la réaction est rapide." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec T°</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><KineticScene temperature={t} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="t">Température (°C)</Label><span className="font-mono text-amber-700">{t}</span></div><input id="t" type="range" min={5} max={100} value={t} onChange={(e) => { setT(Number(e.target.value)); setTweaks(c=>c+1); }} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Quand la température augmente, la vitesse de réaction :"
          options={[{ key: 'rapide', label: 'Augmente fortement.' }, { key: 'lente', label: 'Diminue.' }, { key: 'pareille', label: 'Reste la même.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="amber" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Loi d&apos;Arrhenius : T° ↗ ⇒ k ↗ ⇒ vitesse ↗.</p></Card>)}
    </div>
  );
}
