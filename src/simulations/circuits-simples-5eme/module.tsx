'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const CircuitScene = dynamic(() => import('./circuit-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'ferme' | 'ouvert' | 'rien' | null;

export function CircuitsSimples5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [closed, setClosed] = useState(false);
  const [toggles, setToggles] = useState(0);
  const [rep, setRep] = useState<Rep>(null);

  const score = useMemo(() => Math.min(100, Math.min(40, toggles * 10) + (rep === 'ferme' ? 60 : 0)), [toggles, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'circuits-simples-5eme', version: '1.0', steps: { closed, toggles, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero" padding="lg">
          <CardHeader><CardTitle><Zap className="inline h-5 w-5 text-blue-700" /> Circuit électrique simple</CardTitle><Badge tone="science">PC · 5ème</Badge></CardHeader>
          <p className="text-ink/80">Pour qu&apos;une <strong>ampoule</strong> s&apos;allume, il faut un <strong>circuit fermé</strong> : pile + fils + ampoule + interrupteur.</p>
          <div className="mt-3"><NarrationButton text="Une ampoule a besoin d'électricité pour briller. Cette électricité doit faire le tour complet du circuit, de la pile à l'ampoule et retour. Si l'interrupteur est ouvert, le circuit est cassé et l'ampoule ne s'allume pas." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Allume l&apos;ampoule</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
          <p className="mb-3 text-sm text-ink/70">Ferme l&apos;interrupteur pour allumer l&apos;ampoule.</p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><CircuitScene closed={closed} /></div></div>
          <div className="mt-4 flex justify-center">
            <Button variant={closed?'success':'gradient'} onClick={() => { setClosed(c => !c); setToggles(n=>n+1); }}>
              {closed ? '⚡ Ouvrir l\'interrupteur' : '⚡ Fermer l\'interrupteur'}
            </Button>
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={toggles < 2} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
          <QcmStep label="Pour que le courant circule et que l'ampoule s'allume, le circuit doit être :"
            options={[
              { key: 'ferme', label: 'Fermé (l\'interrupteur ferme la boucle).' },
              { key: 'ouvert', label: 'Ouvert (l\'interrupteur ouvre la boucle).' },
              { key: 'rien', label: 'Sans interrupteur.' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Circuit <strong>fermé</strong> = courant circule = ampoule allumée. <strong>Ouvert</strong> = pas de courant.</p></Card>
      )}
    </div>
  );
}
