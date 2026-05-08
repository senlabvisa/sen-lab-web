'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const VihScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'cd4' | 'glr' | 'plaq' | null;

export function VihImmuniteTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [y, setY] = useState(0);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'cd4' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'vih-immunite-terminale', version: '1.0', steps: { y, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Shield className="inline h-5 w-5 text-pink-700" /> VIH et système immunitaire 🎯</CardTitle><Badge tone="action">SVT · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">Le <strong>VIH</strong> attaque les <strong>lymphocytes T CD4</strong>, qui dirigent la réponse immunitaire. Sans traitement, leur taux chute.</p>
        <div className="mt-3"><NarrationButton text="Le VIH cible les cellules CD4, gardiens du système immunitaire. Sans traitement antirétroviral, ce taux s'effondre et le SIDA se déclare." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Évolution du taux de CD4</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><VihScene years={y} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="y">Années post-infection</Label><span className="font-mono text-pink-700">{y}</span></div><input id="y" type="range" min={0} max={12} value={y} onChange={(e) => { setY(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Le VIH attaque principalement :"
          options={[{ key: 'cd4', label: 'Les lymphocytes T CD4 (cellules immunitaires).' }, { key: 'glr', label: 'Les globules rouges.' }, { key: 'plaq', label: 'Les plaquettes.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">VIH cible CD4. Sans traitement (ART), CD4 ↘ ⇒ SIDA. Avec ART : CD4 stables, espérance de vie normale.</p></Card>)}
    </div>
  );
}
