'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Dna } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const DnaScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'noyau' | 'sang' | 'cytoplasme' | null;

export function AdnExtraction2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [stage, setStage] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, stage * 10 + (rep === 'noyau' ? 60 : 0)), [stage, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'adn-extraction-2nde', version: '1.0', steps: { stage, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Dna className="inline h-5 w-5 text-pink-700" /> Extraction d&apos;ADN — banane</CardTitle><Badge tone="action">SVT · Seconde</Badge></CardHeader>
        <p className="text-ink/80">Avec une <strong>banane</strong>, du <strong>savon</strong> et de l&apos;<strong>alcool</strong>, on peut extraire l&apos;ADN à la maison !</p>
        <div className="mt-3"><NarrationButton text="L'ADN est dans le noyau de chaque cellule. Le savon casse les membranes et libère l'ADN. L'alcool le fait précipiter pour qu'il soit visible." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Suis le protocole</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><DnaScene stage={stage} /></div></div>
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={stage === 0} onClick={() => setStage(s => s - 1)}>← Précédent</Button>
          <Button variant="gradient" size="sm" disabled={stage === 3} onClick={() => setStage(s => s + 1)}>Suivant →</Button>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={stage < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Dans une cellule, l'ADN se trouve principalement dans :"
          options={[{ key: 'noyau', label: 'Le noyau.' }, { key: 'sang', label: 'Le sang.' }, { key: 'cytoplasme', label: 'Le cytoplasme uniquement.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">ADN = molécule de la vie, dans le noyau de chaque cellule.</p></Card>)}
    </div>
  );
}
