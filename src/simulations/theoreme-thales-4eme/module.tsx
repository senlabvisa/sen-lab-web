'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Triangle } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ThalesScene = dynamic(() => import('./thales-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'parallele' | 'perpendiculaire' | 'aleatoire' | null;

export function TheoremeThales4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [ratio, setRatio] = useState(0.5);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);

  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'parallele' ? 60 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'theoreme-thales-4eme', version: '1.0', steps: { ratio, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader><CardTitle><Triangle className="inline h-5 w-5 text-violet-700" /> Théorème de Thalès</CardTitle><Badge tone="maths">Maths · 4ème</Badge></CardHeader>
          <p className="text-ink/80">Quand une droite parallèle à un côté d&apos;un triangle coupe les deux autres, elle crée des longueurs <strong>proportionnelles</strong>.</p>
          <div className="mt-3"><NarrationButton text="Si tu traces une droite parallèle à un côté d'un triangle, elle coupe les deux autres côtés en créant des proportions identiques. C'est le théorème de Thalès, utilisé partout en géométrie et en architecture." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Déplace la droite parallèle</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><ThalesScene ratio={ratio} /></div></div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="r">Position D-E (de A à B-C)</Label><span className="font-mono text-sm font-semibold text-violet-700">{(ratio * 100).toFixed(0)}%</span></div>
            <input id="r" type="range" min={0.1} max={0.9} step={0.05} value={ratio} onChange={(e) => { setRatio(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
          <QcmStep label="Pour appliquer le théorème de Thalès, la droite (DE) doit être :"
            options={[
              { key: 'parallele', label: 'Parallèle au côté (BC) opposé.' },
              { key: 'perpendiculaire', label: 'Perpendiculaire à (BC).' },
              { key: 'aleatoire', label: 'Quelconque.' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">DE // BC ⇒ AD/AB = AE/AC = DE/BC.</p></Card>
      )}
    </div>
  );
}
