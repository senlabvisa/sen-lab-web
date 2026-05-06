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

const CycleScene = dynamic(() => import('./cycle-scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = '14' | '7' | '21' | null;

export function ProcreationHumaine3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [day, setDay] = useState(1);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 4) + (rep === '14' ? 60 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'procreation-humaine-3eme', version: '1.0', steps: { day, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Heart className="inline h-5 w-5 text-pink-700" /> Procréation — cycle menstruel</CardTitle><Badge tone="action">SVT · 3ème</Badge></CardHeader>
        <p className="text-ink/80">Le cycle menstruel féminin dure environ <strong>28 jours</strong>. L&apos;ovulation arrive vers le <strong>jour 14</strong>.</p>
        <div className="mt-3"><NarrationButton text="Chez la femme, un ovule mûrit chaque mois et est libéré vers le quatorzième jour du cycle. C'est l'ovulation. Si rencontre avec un spermatozoïde, il y a fécondation et début de grossesse." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Trouve l&apos;ovulation</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><CycleScene day={day} /></div></div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs"><Label htmlFor="d">Jour</Label><span className="font-mono text-sm font-semibold text-pink-700">{day}</span></div>
          <input id="d" type="range" min={1} max={28} value={day} onChange={(e) => { setDay(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 5} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Dans un cycle menstruel de 28 jours, l'ovulation a lieu vers le jour :"
          options={[
            { key: '7', label: '7' },
            { key: '14', label: '14' },
            { key: '21', label: '21' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Cycle ≈ 28 j. Ovulation jour 14. Période fertile autour de l&apos;ovulation.</p></Card>)}
    </div>
  );
}
