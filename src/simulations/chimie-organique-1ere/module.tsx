'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Atom, CheckCircle2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const AlkaneScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'CnH2n2' | 'CnHn' | 'C2nHn' | null;

export function ChimieOrganique1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [n, setN] = useState(1);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, (n > 1 ? 30 : 0) + (rep === 'CnH2n2' ? 70 : 0)), [n, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'chimie-organique-1ere', version: '1.0', steps: { n, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Atom className="inline h-5 w-5 text-blue-700" /> Chimie organique — alcanes</CardTitle><Badge tone="science">PC · Première</Badge></CardHeader>
        <p className="text-ink/80">Les <strong>alcanes</strong> ont la formule CₙH₂ₙ₊₂ : méthane (CH₄), éthane (C₂H₆)…</p>
        <div className="mt-3"><NarrationButton text="Le gaz butane utilisé pour la cuisine au Sénégal est un alcane. Sa formule chimique est C4H10." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Construis l&apos;alcane</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><AlkaneScene n={n} /></div></div>
        <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><Label htmlFor="n">Atomes de C (n)</Label><span className="font-mono text-blue-700">{n}</span></div><input id="n" type="range" min={1} max={5} value={n} onChange={(e) => setN(Number(e.target.value))} className="slider-lab w-full" /></div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={n < 2} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="La formule générale d'un alcane est :"
          options={[{ key: 'CnH2n2', label: 'CₙH₂ₙ₊₂' }, { key: 'CnHn', label: 'CₙHₙ' }, { key: 'C2nHn', label: 'C₂ₙHₙ' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Alcanes : CₙH₂ₙ₊₂. Méthane CH₄, butane C₄H₁₀ (gaz cuisine).</p></Card>)}
    </div>
  );
}
