'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sigma } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ParabolaScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'positif' | 'nul' | 'negatif' | null;

export function EquationsSecondDegre2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(-1);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'positif' ? 60 : 0)), [tweaks, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'equations-second-degre-2nde', version: '1.0', steps: { a, b, c, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Sigma className="inline h-5 w-5 text-violet-700" /> Équations du second degré</CardTitle><Badge tone="maths">Maths · Seconde</Badge></CardHeader>
        <p className="text-ink/80">Une équation <strong>ax² + bx + c = 0</strong> a 0, 1 ou 2 solutions selon le discriminant Δ = b² - 4ac.</p>
        <div className="mt-3"><NarrationButton text="Le discriminant détermine le nombre de solutions. Si delta est positif, 2 solutions. Si delta est nul, 1 solution double. Si delta est négatif, aucune solution réelle." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Joue avec a, b, c</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><ParabolaScene a={a} b={b} c={c} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {([['a',a,setA,-2,2],['b',b,setB,-3,3],['c',c,setC,-3,3]] as const).map(([n,v,fn,mn,mx]) => (
            <div key={n}>
              <div className="mb-1 flex justify-between text-xs"><Label htmlFor={n}>{n}</Label><span className="font-mono text-violet-700">{v}</span></div>
              <input id={n} type="range" min={mn} max={mx} step={0.5} value={v} onChange={(e) => { fn(Number(e.target.value)); setTweaks(t=>t+1); }} className="slider-lab w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="L'équation a 2 solutions distinctes quand Δ est :"
          options={[
            { key: 'positif', label: 'Δ > 0 (positif).' },
            { key: 'nul', label: 'Δ = 0.' },
            { key: 'negatif', label: 'Δ < 0.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Δ &gt; 0 ⇒ 2 racines. Δ = 0 ⇒ 1 racine. Δ &lt; 0 ⇒ 0 racine réelle.</p></Card>)}
    </div>
  );
}
