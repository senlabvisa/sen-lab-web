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

type Stage = 'adn' | 'arn' | 'proteine';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'transcription-traduction' | 'reproduction' | 'meiose' | null;

export function GenetiqueMoleculaireTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [s, setS] = useState<Stage>('adn');
  const [seen, setSeen] = useState<Set<Stage>>(new Set(['adn']));
  const [rep, setRep] = useState<Rep>(null);
  function pick(x: Stage) { setS(x); setSeen(p => { const n=new Set(p); n.add(x); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 15 + (rep === 'transcription-traduction' ? 55 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'genetique-moleculaire-terminale', version: '1.0', steps: { s, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Dna className="inline h-5 w-5 text-pink-700" /> Génétique moléculaire — du gène à la protéine 🎯</CardTitle><Badge tone="action">SVT · Tle · Bac</Badge></CardHeader>
        <p className="text-ink/80">L&apos;<strong>ADN</strong> est transcrit en <strong>ARNm</strong>, puis traduit en <strong>protéine</strong>.</p>
        <div className="mt-3"><NarrationButton text="Le code génétique inscrit dans l'ADN est transcrit en ARN messager, puis traduit en protéines par les ribosomes. C'est le dogme central de la biologie moléculaire." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Suis le flux d&apos;information</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><DnaScene stage={s} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{(['adn','arn','proteine'] as Stage[]).map(x => <Button key={x} variant={s===x?'gradient':'outline'} size="sm" onClick={() => pick(x)}>{x === 'adn' ? 'ADN' : x === 'arn' ? 'ARNm' : 'Protéine'} {seen.has(x) && s!==x ? '✓' : ''}</Button>)}</div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="ADN → ARNm → Protéine s'appelle :"
          options={[{ key: 'transcription-traduction', label: 'Transcription puis traduction.' }, { key: 'reproduction', label: 'La reproduction cellulaire.' }, { key: 'meiose', label: 'La méiose.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Dogme central : ADN ⇒ (transcription) ⇒ ARNm ⇒ (traduction) ⇒ Protéine.</p></Card>)}
    </div>
  );
}
