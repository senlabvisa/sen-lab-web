'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const TectoScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-slate-900" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'plaques' | 'noyau' | 'atmosphere' | null;

export function TectoniquePlaques1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [t, setT] = useState(0.3);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'plaques' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'tectonique-plaques-1ere', version: '1.0', steps: { t, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Globe className="inline h-5 w-5 text-emerald-700" /> Tectonique des plaques</CardTitle><Badge tone="action">SVT · Première</Badge></CardHeader>
        <p className="text-ink/80">La <strong>croûte terrestre</strong> est divisée en plaques qui se déplacent. Leurs frottements provoquent séismes et volcans.</p>
        <div className="mt-3"><NarrationButton text="Les plaques tectoniques se déplacent de quelques centimètres par an. Quand elles se frottent ou s'écartent, elles libèrent une énergie énorme : ce sont les séismes." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Tension à la faille</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100"><div className="aspect-[4/3] w-full"><TectoScene tension={t} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="t">Tension</Label><span className="font-mono text-emerald-700">{(t * 100).toFixed(0)}%</span></div><input id="t" type="range" min={0} max={1} step={0.05} value={t} onChange={(e) => { setT(Number(e.target.value)); setTweaks(c=>c+1); }} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Les séismes sont causés par :"
          options={[{ key: 'plaques', label: 'Les frottements entre plaques tectoniques.' }, { key: 'noyau', label: 'Le noyau de la Terre.' }, { key: 'atmosphere', label: 'L\'atmosphère.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Plaques tectoniques se déplacent ⇒ séismes + volcans aux frontières.</p></Card>)}
    </div>
  );
}
