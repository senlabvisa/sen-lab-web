'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Triangle } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const TriangleScene = dynamic(() => import('./triangle-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

function classify(a: number, b: number, c: number): string {
  if (a + b <= c || a + c <= b || b + c <= a) return 'impossible';
  if (a === b && b === c) return 'Équilatéral';
  if (a === b || b === c || a === c) return 'Isocèle';
  return 'Scalène';
}

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'equilateral' | 'isocele' | 'scalene' | null;

export function Triangles5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [c, setC] = useState(5);
  const [tweaks, setTweaks] = useState(0);
  const type = useMemo(() => classify(a, b, c), [a, b, c]);

  const [rep, setRep] = useState<Rep>(null);

  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'equilateral' ? 60 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'triangles-5eme', version: '1.0', steps: { a, b, c, type, rep } }, score);
    setStep('done');
  }

  function setSide(setter: (v: number) => void, v: number) { setter(v); setTweaks(n=>n+1); }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader><CardTitle><Triangle className="inline h-5 w-5 text-violet-700" /> Classer les triangles</CardTitle><Badge tone="maths">Maths · 5ème</Badge></CardHeader>
          <p className="text-ink/80">Selon les longueurs de leurs 3 côtés, les triangles ont des noms : équilatéral, isocèle, ou scalène.</p>
          <div className="mt-3"><NarrationButton text="Un triangle équilatéral a ses trois côtés égaux. Un triangle isocèle a deux côtés égaux. Un triangle scalène a trois côtés différents. Tu vas explorer ces différences." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Modifie les 3 côtés</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><TriangleScene a={a} b={b} c={c} type={type} /></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {([['a',a,setA],['b',b,setB],['c',c,setC]] as const).map(([n,v,fn]) => (
              <div key={n}>
                <div className="mb-1 flex justify-between text-xs"><Label htmlFor={n}>Côté {n}</Label><span className="font-mono text-sm font-semibold text-violet-700">{v}</span></div>
                <input id={n} type="range" min={1} max={8} value={v} onChange={(e) => setSide(fn, Number(e.target.value))} className="slider-lab w-full" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
          <QcmStep label="Comment s'appelle un triangle dont les 3 côtés sont égaux ?"
            options={[
              { key: 'equilateral', label: 'Équilatéral' },
              { key: 'isocele', label: 'Isocèle' },
              { key: 'scalene', label: 'Scalène' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="violet"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80"><strong>Équilatéral</strong> = 3 côtés égaux. <strong>Isocèle</strong> = 2 côtés égaux. <strong>Scalène</strong> = aucun côté égal.</p></Card>
      )}
    </div>
  );
}
