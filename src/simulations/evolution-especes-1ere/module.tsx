'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Bird } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const EvolScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'selection' | 'choix' | 'hasard' | null;

export function EvolutionEspeces1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [g, setG] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(30, g * 5) + (rep === 'selection' ? 70 : 0)), [g, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'evolution-especes-1ere', version: '1.0', steps: { g, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Bird className="inline h-5 w-5 text-amber-700" /> Évolution — climat aride</CardTitle><Badge tone="action">SVT · Première</Badge></CardHeader>
        <p className="text-ink/80">Au fil des générations, les <strong>individus mieux adaptés</strong> au climat aride survivent et se reproduisent : c&apos;est la <strong>sélection naturelle</strong>.</p>
        <div className="mt-3"><NarrationButton text="Au Sahel, les espèces qui résistent à la sécheresse survivent mieux. À chaque génération, leurs caractéristiques se transmettent : c'est l'évolution par sélection naturelle." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Avance les générations</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><EvolScene generation={g} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="g">Génération</Label><span className="font-mono text-amber-700">{g}</span></div><input id="g" type="range" min={0} max={8} value={g} onChange={(e) => setG(Number(e.target.value))} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={g < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Le mécanisme de l'évolution s'appelle :"
          options={[{ key: 'selection', label: 'La sélection naturelle (Darwin).' }, { key: 'choix', label: 'Le choix des espèces.' }, { key: 'hasard', label: 'Le hasard pur.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Sélection naturelle = adaptation au milieu sur des générations.</p></Card>)}
    </div>
  );
}
