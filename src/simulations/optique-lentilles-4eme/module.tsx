'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Eye } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const LensScene = dynamic(() => import('./lens-scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'inversee' | 'identique' | 'plus-grande' | null;

export function OptiqueLentilles4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [focal, setFocal] = useState(1.2);
  const [objDist, setObjDist] = useState(2.5);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(30, tweaks * 4) + (rep === 'inversee' ? 70 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'optique-lentilles-4eme', version: '1.0', steps: { focal, objDist, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Eye className="inline h-5 w-5 text-blue-700" /> Lentilles convergentes 🎯</CardTitle><Badge tone="science">PC · 4ème · BFEM</Badge></CardHeader>
        <p className="text-ink/80">Une lentille forme une <strong>image inversée</strong> de l&apos;objet : c&apos;est ce qui se passe dans ton œil et dans un appareil photo.</p>
        <div className="mt-3"><NarrationButton text="Une lentille convergente, comme celle de tes lunettes ou d'un appareil photo, fait converger les rayons lumineux. L'image qu'elle forme est inversée." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Focale et position de l&apos;objet</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><LensScene focal={focal} objectDist={objDist} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="f">Distance focale</Label><span className="font-mono text-sm font-semibold text-blue-700">{focal.toFixed(2)}</span></div>
            <input id="f" type="range" min={0.5} max={2.5} step={0.1} value={focal} onChange={(e) => { setFocal(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="o">Distance objet</Label><span className="font-mono text-sm font-semibold text-blue-700">{objDist.toFixed(2)}</span></div>
            <input id="o" type="range" min={1.5} max={4} step={0.1} value={objDist} onChange={(e) => { setObjDist(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
          </div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="L'image formée par une lentille convergente est :"
          options={[
            { key: 'inversee', label: 'Inversée par rapport à l\'objet (haut/bas).' },
            { key: 'identique', label: 'Identique à l\'objet.' },
            { key: 'plus-grande', label: 'Toujours plus grande que l\'objet.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Lentille convergente ⇒ image <strong>inversée</strong>. C&apos;est le principe de l&apos;œil et de l&apos;appareil photo.</p></Card>)}
    </div>
  );
}
