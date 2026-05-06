'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, FlaskConical } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const PhScene = dynamic(() => import('./ph-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'acide' | 'basique' | 'neutre' | null;

export function PhSolutions3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [ph, setPh] = useState(7);
  const [tested, setTested] = useState<Set<number>>(new Set([7]));
  const [rep, setRep] = useState<Rep>(null);

  function set(v: number) { setPh(v); setTested(s => { const n=new Set(s); n.add(Math.round(v)); return n; }); }

  const score = useMemo(() => Math.min(100, Math.min(40, tested.size * 8) + (rep === 'acide' ? 60 : 0)), [tested, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'ph-solutions-3eme', version: '1.0', steps: { ph, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-amber" padding="lg">
        <CardHeader><CardTitle><FlaskConical className="inline h-5 w-5 text-amber-700" /> pH des solutions</CardTitle><Badge tone="science">PC · 3ème</Badge></CardHeader>
        <p className="text-ink/80">Le <strong>pH</strong> mesure si une solution est acide (pH&lt;7), neutre (pH=7) ou basique (pH&gt;7).</p>
        <div className="mt-3"><NarrationButton text="Le citron a un pH de 2, c'est très acide. L'eau pure a un pH de 7, c'est neutre. Le savon a un pH de 10, c'est basique." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Indicateur universel</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><PhScene ph={ph} /></div></div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs"><Label htmlFor="p">pH</Label><span className="font-mono text-sm font-semibold text-amber-700">{ph}</span></div>
          <input id="p" type="range" min={1} max={14} value={ph} onChange={(e) => set(Number(e.target.value))} className="slider-lab w-full" />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tested.size < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Une solution de pH 3 (jus de citron) est :"
          options={[
            { key: 'acide', label: 'Acide.' },
            { key: 'basique', label: 'Basique.' },
            { key: 'neutre', label: 'Neutre.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="amber" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">pH &lt; 7 = acide. pH = 7 = neutre. pH &gt; 7 = basique.</p></Card>)}
    </div>
  );
}
