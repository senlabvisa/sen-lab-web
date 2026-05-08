'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Cloud } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ClimatScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-slate-900" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'augmente' | 'diminue' | 'pareil' | null;

export function ClimatTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [co2, setCo2] = useState(420);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'augmente' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'climat-terminale', version: '1.0', steps: { co2, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Cloud className="inline h-5 w-5 text-blue-700" /> Climat — réchauffement au Sénégal 🎯</CardTitle><Badge tone="action">SVT · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">Plus on émet de <strong>CO₂</strong>, plus la <strong>T° moyenne</strong> augmente. Au Sénégal : sécheresses, érosion côtière.</p>
        <div className="mt-3"><NarrationButton text="L'augmentation du dioxyde de carbone dans l'atmosphère renforce l'effet de serre, ce qui réchauffe la planète. Au Sénégal, cela accentue les sécheresses et l'érosion côtière." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec le CO₂</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><ClimatScene co2={co2} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="c">CO₂ (ppm)</Label><span className="font-mono text-blue-700">{co2}</span></div><input id="c" type="range" min={280} max={800} step={10} value={co2} onChange={(e) => { setCo2(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Quand la concentration de CO₂ dans l'atmosphère augmente, la T° moyenne globale :"
          options={[{ key: 'augmente', label: 'Augmente (effet de serre renforcé).' }, { key: 'diminue', label: 'Diminue.' }, { key: 'pareil', label: 'Reste constante.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">CO₂ ↗ ⇒ effet de serre ↗ ⇒ T° ↗. Sénégal : Saint-Louis menacée par la mer.</p></Card>)}
    </div>
  );
}
