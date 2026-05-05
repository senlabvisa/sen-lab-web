'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Hash } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const CubesScene = dynamic(() => import('./cubes-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'challenge' | 'done';

export function Puissances4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [exp, setExp] = useState(2);
  const [tweaks, setTweaks] = useState(0);
  const [g, setG] = useState('');
  const correctAnswer = 1000000; // 10^6
  const correct = Number(g.replace(/[^\d]/g, '')) === correctAnswer;

  const score = useMemo(() => Math.min(100, Math.min(30, tweaks * 5) + (correct ? 70 : 0)), [tweaks, correct]);

  async function handleValidate() {
    await onComplete({ shell: 'puissances-4eme', version: '1.0', steps: { exp, correct } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader><CardTitle><Hash className="inline h-5 w-5 text-violet-700" /> Puissances de 10</CardTitle><Badge tone="maths">Maths · 4ème</Badge></CardHeader>
          <p className="text-ink/80"><strong>10² = 100</strong>, <strong>10⁶ = 1 000 000</strong>. La puissance multiplie 10 par lui-même.</p>
          <div className="mt-3"><NarrationButton text="Quand on parle de la population du Sénégal, environ 18 millions, on peut écrire 18 fois 10 puissance 6. C'est plus court que d'écrire tous les zéros." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}
      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Joue avec l&apos;exposant</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><CubesScene exponent={exp} /></div></div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="e">Exposant</Label><span className="font-mono text-sm font-semibold text-violet-700">10^{exp}</span></div>
            <input id="e" type="range" min={0} max={9} value={exp} onChange={(e) => { setExp(Number(e.target.value)); setTweaks(n=>n+1); }} className="slider-lab w-full" />
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('challenge')}>Défi <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}
      {step === 'challenge' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Calcule 10⁶</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
          <p className="mb-3 text-sm text-ink/70">Combien vaut <strong>10⁶</strong> ? (Astuce : 1 suivi de combien de zéros ?)</p>
          <div className="space-y-2"><Label htmlFor="g">Valeur</Label><Input id="g" inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} placeholder="ex : 1000000" />
            {g && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? '✓ 10⁶ = 1 000 000 (1 million)' : 'Indice : 6 zéros après le 1.'}</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
        </Card>
      )}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">10ⁿ = 1 suivi de n zéros. <strong>10⁶ = 1 000 000</strong>.</p></Card>)}
    </div>
  );
}
