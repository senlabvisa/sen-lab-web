'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Heart } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const HormoneScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'puberté' | 'enfance' | 'vieillesse' | null;

export function Hormones1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [age, setAge] = useState(8);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, (age > 8 ? 30 : 0) + (rep === 'puberté' ? 70 : 0)), [age, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'hormones-1ere', version: '1.0', steps: { age, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Heart className="inline h-5 w-5 text-pink-700" /> Hormones — la puberté</CardTitle><Badge tone="action">SVT · Première</Badge></CardHeader>
        <p className="text-ink/80">À la <strong>puberté</strong> (10-14 ans), les hormones (testostérone, œstrogènes) déclenchent la maturité sexuelle.</p>
        <div className="mt-3"><NarrationButton text="La puberté est le passage de l'enfance à l'âge adulte. Elle est déclenchée par des hormones produites par les glandes : testostérone chez le garçon, œstrogènes chez la fille." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Suis l&apos;évolution</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><HormoneScene age={age} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="a">Âge</Label><span className="font-mono text-pink-700">{age} ans</span></div><input id="a" type="range" min={5} max={20} value={age} onChange={(e) => setAge(Number(e.target.value))} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={age < 12} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Les hormones sexuelles déclenchent :"
          options={[{ key: 'puberté', label: 'La puberté (entre 10 et 14 ans).' }, { key: 'enfance', label: 'L\'enfance.' }, { key: 'vieillesse', label: 'La vieillesse uniquement.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Puberté : 10-14 ans. Hormones = testostérone (♂) / œstrogènes (♀).</p></Card>)}
    </div>
  );
}
