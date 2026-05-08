'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Mountain } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const IncScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'cinetique' | 'potentielle' | 'electrique' | null;

export function EnergieMecanique1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [m, setM] = useState(2);
  const [h, setH] = useState(1.5);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'cinetique' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'energie-mecanique-1ere', version: '1.0', steps: { m, h, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Mountain className="inline h-5 w-5 text-blue-700" /> Énergie mécanique — plan incliné</CardTitle><Badge tone="science">PC · Première</Badge></CardHeader>
        <p className="text-ink/80">Une balle qui descend transforme son <strong>énergie potentielle</strong> (mgh) en <strong>énergie cinétique</strong> (½mv²).</p>
        <div className="mt-3"><NarrationButton text="L'énergie potentielle de pesanteur dépend de la hauteur. Quand l'objet tombe, cette énergie se transforme en énergie cinétique : la vitesse." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec m et h</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><IncScene mass={m} height={h} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="m">m (kg)</Label><span className="font-mono text-blue-700">{m}</span></div><input id="m" type="range" min={0.5} max={10} step={0.5} value={m} onChange={(e) => { setM(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
          <div><div className="mb-1 flex justify-between text-xs"><Label htmlFor="h">h (m)</Label><span className="font-mono text-blue-700">{h.toFixed(1)}</span></div><input id="h" type="range" min={0.5} max={3} step={0.1} value={h} onChange={(e) => { setH(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Quand la balle descend, son énergie potentielle se transforme en :"
          options={[{ key: 'cinetique', label: 'Énergie cinétique (½mv²).' }, { key: 'potentielle', label: 'Plus d\'énergie potentielle.' }, { key: 'electrique', label: 'Énergie électrique.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">E_m = E_p + E_c. Conservation : E_p ↘ ⇒ E_c ↗.</p></Card>)}
    </div>
  );
}
