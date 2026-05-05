'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sandwich } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const DigestiveScene = dynamic(() => import('./digestive-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'intestin' | 'estomac' | 'colon' | null;

export function Digestion5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [progress, setProgress] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const reachedEnd = progress >= 90;

  const score = useMemo(() => Math.min(100, (reachedEnd ? 30 : Math.min(20, progress / 5)) + (rep === 'intestin' ? 70 : 0)), [progress, reachedEnd, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'digestion-5eme', version: '1.0', steps: { progress, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-amber" padding="lg">
          <CardHeader><CardTitle><Sandwich className="inline h-5 w-5 text-amber-700" /> Digestion — du mil au glucose</CardTitle><Badge tone="action">SVT · 5ème</Badge></CardHeader>
          <p className="text-ink/80">Le mil que tu manges fait un long voyage : <strong>bouche → œsophage → estomac → intestin → côlon</strong>.</p>
          <div className="mt-3"><NarrationButton text="Quand tu manges du mil, ta nourriture commence par être broyée par tes dents et mélangée à la salive. Puis elle descend dans l'œsophage jusqu'à l'estomac, où elle est transformée. Enfin, dans l'intestin grêle, les nutriments passent dans le sang." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Suis le bol alimentaire</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><DigestiveScene progress={progress} /></div></div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="p">Avancement digestif</Label><span className="font-mono text-sm font-semibold text-amber-700">{progress}%</span></div>
            <input id="p" type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!reachedEnd} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
          <QcmStep label="Dans quel organe les nutriments (glucose, etc.) passent-ils dans le sang ?"
            options={[
              { key: 'intestin', label: 'L\'intestin grêle (à travers ses parois fines).' },
              { key: 'estomac', label: 'L\'estomac.' },
              { key: 'colon', label: 'Le côlon.' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="amber" />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Bouche → estomac → intestin grêle (où le sang absorbe les nutriments) → côlon.</p></Card>
      )}
    </div>
  );
}
