'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Scale } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const BalanceScene = dynamic(() => import('./balance-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'solve' | 'done';

export function CalculLitteral4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [x, setX] = useState(2);
  // Eq : 2x + 3 = 11 ⇒ x = 4
  const left = 2 * x + 3;
  const right = 11;

  const [solution, setSolution] = useState('');
  const correct = Number(solution) === 4;
  const score = useMemo(() => Math.min(100, (x !== 2 ? 30 : 0) + (correct ? 70 : 0)), [x, correct]);

  async function handleValidate() {
    await onComplete({ shell: 'calcul-litteral-4eme', version: '1.0', steps: { x, correct } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader><CardTitle><Scale className="inline h-5 w-5 text-violet-700" /> Calcul littéral — résoudre une équation</CardTitle><Badge tone="maths">Maths · 4ème</Badge></CardHeader>
          <p className="text-ink/80">Une équation comme <strong>2x + 3 = 11</strong> peut être vue comme une balance qu&apos;il faut équilibrer en trouvant x.</p>
          <div className="mt-3"><NarrationButton text="Une équation est comme une balance. Pour la résoudre, on doit trouver la valeur de x qui équilibre les deux côtés." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}
      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Trouve x pour équilibrer</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
          <p className="mb-3 text-sm text-ink/70">Équation : <strong className="font-mono">2x + 3 = 11</strong>. Trouve la valeur de x qui équilibre la balance.</p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><BalanceScene left={left} right={right} /></div></div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="x">x =</Label><span className="font-mono text-sm font-semibold text-violet-700">{x}</span></div>
            <input id="x" type="range" min={0} max={10} value={x} onChange={(e) => setX(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={x === 2} onClick={() => setStep('solve')}>Confirmer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}
      {step === 'solve' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Quelle est la valeur de x ?</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
          <p className="mb-3 text-sm text-ink/70">2x + 3 = 11 ⇒ 2x = 8 ⇒ x = ?</p>
          <div className="space-y-2"><Label htmlFor="s">x</Label><Input id="s" inputMode="numeric" value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="ex : 4" />
            {solution && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? '✓ 2×4 + 3 = 11. Bravo !' : 'Réessaie : 8 ÷ 2 = ?'}</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
        </Card>
      )}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">2x + 3 = 11 ⇒ x = 4.</p></Card>)}
    </div>
  );
}
