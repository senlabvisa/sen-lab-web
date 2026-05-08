'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, MoveRight } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const VectorScene = dynamic(() => import('./vector-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'somme' | 'produit' | 'difference' | null;

export function Vecteurs2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [u, setU] = useState({ x: 1.5, y: 1 });
  const [v, setV] = useState({ x: 1, y: -0.5 });
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 5) + (rep === 'somme' ? 60 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'vecteurs-2nde', version: '1.0', steps: { u, v, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><MoveRight className="inline h-5 w-5 text-violet-700" /> Vecteurs et translations</CardTitle><Badge tone="maths">Maths · Seconde</Badge></CardHeader>
        <p className="text-ink/80">Un <strong>vecteur</strong> représente un déplacement. La <strong>somme de deux vecteurs</strong> = enchaîner deux déplacements.</p>
        <div className="mt-3"><NarrationButton text="Un vecteur a une direction et une longueur. Quand on additionne deux vecteurs, on les met bout à bout : c'est la relation de Chasles." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Additionne deux vecteurs</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><VectorScene ux={u.x} uy={u.y} vx={v.x} vy={v.y} /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="ux">u.x</Label><span className="font-mono text-blue-700">{u.x.toFixed(1)}</span></div>
            <input id="ux" type="range" min={-2} max={2} step={0.5} value={u.x} onChange={(e) => { setU(p => ({...p, x: Number(e.target.value)})); setTweaks(n=>n+1); }} className="slider-lab w-full" />
            <div className="mb-1 flex justify-between text-xs mt-2"><Label htmlFor="uy">u.y</Label><span className="font-mono text-blue-700">{u.y.toFixed(1)}</span></div>
            <input id="uy" type="range" min={-2} max={2} step={0.5} value={u.y} onChange={(e) => { setU(p => ({...p, y: Number(e.target.value)})); setTweaks(n=>n+1); }} className="slider-lab w-full" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="vx">v.x</Label><span className="font-mono text-emerald-700">{v.x.toFixed(1)}</span></div>
            <input id="vx" type="range" min={-2} max={2} step={0.5} value={v.x} onChange={(e) => { setV(p => ({...p, x: Number(e.target.value)})); setTweaks(n=>n+1); }} className="slider-lab w-full" />
            <div className="mb-1 flex justify-between text-xs mt-2"><Label htmlFor="vy">v.y</Label><span className="font-mono text-emerald-700">{v.y.toFixed(1)}</span></div>
            <input id="vy" type="range" min={-2} max={2} step={0.5} value={v.y} onChange={(e) => { setV(p => ({...p, y: Number(e.target.value)})); setTweaks(n=>n+1); }} className="slider-lab w-full" />
          </div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="Le vecteur violet (résultante) représente :"
          options={[
            { key: 'somme', label: 'La somme u + v (mise bout à bout des 2 vecteurs).' },
            { key: 'produit', label: 'Le produit scalaire u·v.' },
            { key: 'difference', label: 'La différence u - v.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">u + v = on enchaîne u puis v (relation de Chasles).</p></Card>)}
    </div>
  );
}
