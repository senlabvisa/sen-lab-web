'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Bug, CheckCircle2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const CycleScene = dynamic(() => import('./cycle-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'metamorphose' | 'reproduction' | 'transport' | null;

export function ReproductionAnimale4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [stage, setStage] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));
  const [rep, setRep] = useState<Rep>(null);

  function gotoStage(s: number) { setStage(s); setSeen(p => { const n=new Set(p); n.add(s); return n; }); }

  const score = useMemo(() => Math.min(100, seen.size * 20 + (rep === 'metamorphose' ? 20 : 0)), [seen, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'reproduction-animale-4eme', version: '1.0', steps: { stage, seen: Array.from(seen), rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Bug className="inline h-5 w-5 text-amber-700" /> Reproduction animale — cycle de la mouche</CardTitle><Badge tone="action">SVT · 4ème</Badge></CardHeader>
        <p className="text-ink/80">La mouche passe par 4 étapes très différentes : <strong>œuf → larve → pupe → adulte</strong>. C&apos;est la métamorphose.</p>
        <div className="mt-3"><NarrationButton text="La mouche commence sa vie sous forme d'œuf, devient une larve, puis une pupe immobile, et enfin un adulte ailé. C'est ce qu'on appelle la métamorphose complète." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Parcours les 4 stades</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><CycleScene stage={stage} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 1, 2, 3].map(s => (
            <Button key={s} variant={stage===s?'gradient':'outline'} size="sm" onClick={() => gotoStage(s)}>
              {s === 0 ? '🥚 Œuf' : s === 1 ? '🐛 Larve' : s === 2 ? '🟫 Pupe' : '🪰 Adulte'} {seen.has(s) && stage !== s ? '✓' : ''}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Quand un animal change complètement de forme entre les stades, c'est :"
          options={[
            { key: 'metamorphose', label: 'La métamorphose.' },
            { key: 'reproduction', label: 'La reproduction.' },
            { key: 'transport', label: 'Le transport.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Mouche : œuf → larve → pupe → adulte = <strong>métamorphose</strong>.</p></Card>)}
    </div>
  );
}
