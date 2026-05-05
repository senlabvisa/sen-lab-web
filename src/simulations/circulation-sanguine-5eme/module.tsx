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

const HeartScene = dynamic(() => import('./heart-scene'), { ssr: false, loading: () => <div className="h-80 bg-red-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'pompe' | 'filtre' | 'nettoie' | null;

export function CirculationSanguine5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [bpm, setBpm] = useState(70);
  const [tested, setTested] = useState(false);
  const [rep, setRep] = useState<Rep>(null);

  const score = useMemo(() => Math.min(100, (tested ? 30 : 0) + (rep === 'pompe' ? 70 : 0)), [tested, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'circulation-sanguine-5eme', version: '1.0', steps: { bpm, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader><CardTitle><Heart className="inline h-5 w-5 text-red-700" /> Le cœur et la circulation sanguine</CardTitle><Badge tone="action">SVT · 5ème</Badge></CardHeader>
          <p className="text-ink/80">Le <strong>cœur</strong> est une pompe qui envoie le sang dans tout le corps. Au repos, il bat ~70 fois par minute.</p>
          <div className="mt-3"><NarrationButton text="Le cœur est un muscle qui pompe le sang en permanence, jour et nuit. Il envoie l'oxygène et la nourriture à tous les organes via les vaisseaux sanguins. À l'effort, il bat beaucoup plus vite pour donner plus d'énergie aux muscles." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Le rythme cardiaque</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-red-100"><div className="aspect-[4/3] w-full"><HeartScene bpm={bpm} /></div></div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="b">Rythme</Label><span className="font-mono text-sm font-semibold text-red-700">{bpm} bpm</span></div>
            <input id="b" type="range" min={50} max={180} value={bpm} onChange={(e) => { setBpm(Number(e.target.value)); setTested(true); }} className="slider-lab w-full" />
            <div className="mt-1 flex justify-between text-[10px] text-ink/40"><span>Sommeil</span><span>Repos</span><span>Sport</span><span>Sprint</span></div>
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!tested} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
          <QcmStep label="Quel est le rôle principal du cœur ?"
            options={[
              { key: 'pompe', label: 'Pomper le sang dans tout le corps.' },
              { key: 'filtre', label: 'Filtrer le sang.' },
              { key: 'nettoie', label: 'Nettoyer l\'air respiré.' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Le cœur = <strong>pompe</strong>. Bat ~70/min au repos, jusqu&apos;à 180+ à l&apos;effort.</p></Card>
      )}
    </div>
  );
}
