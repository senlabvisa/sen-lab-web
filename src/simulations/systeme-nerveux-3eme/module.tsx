'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Brain } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ReflexScene = dynamic(() => import('./reflex-scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'moelle' | 'cerveau' | 'cœur' | null;

export function SystemeNerveux3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [trig, setTrig] = useState(false);
  const [tested, setTested] = useState(false);
  const [rep, setRep] = useState<Rep>(null);

  function fire() { setTrig(true); setTested(true); setTimeout(() => setTrig(false), 800); }

  const score = useMemo(() => Math.min(100, (tested ? 30 : 0) + (rep === 'moelle' ? 70 : 0)), [tested, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'systeme-nerveux-3eme', version: '1.0', steps: { rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Brain className="inline h-5 w-5 text-pink-700" /> Système nerveux — réflexe rotulien</CardTitle><Badge tone="action">SVT · 3ème</Badge></CardHeader>
        <p className="text-ink/80">Quand le médecin tape sous ton genou, ta jambe se lève. C&apos;est un <strong>réflexe</strong> : la moelle épinière réagit sans passer par le cerveau.</p>
        <div className="mt-3"><NarrationButton text="Le réflexe est une réaction automatique très rapide. Quand on touche un objet brûlant, la main se retire avant même qu'on ait le temps de réfléchir." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Tape avec le marteau</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><ReflexScene triggered={trig} /></div></div>
        <div className="mt-4 flex justify-center"><Button variant="gradient" onClick={fire}>🔨 Frapper</Button></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!tested} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Le réflexe rotulien passe par :"
          options={[
            { key: 'moelle', label: 'La moelle épinière (sans le cerveau).' },
            { key: 'cerveau', label: 'Le cerveau seulement.' },
            { key: 'cœur', label: 'Le cœur.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Réflexe = boucle moelle épinière, sans le cerveau. Très rapide pour la sécurité.</p></Card>)}
    </div>
  );
}
