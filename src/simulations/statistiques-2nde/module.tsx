'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BarChart3, CheckCircle2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const StatsScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

const NOTES = [10, 12, 15, 8, 14, 11, 13, 16, 9, 12, 11, 14];
const MEDIANE = 12;

type Step = 'intro' | 'play' | 'done';

export function Statistiques2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [g, setG] = useState('');
  const correct = Number(g) === MEDIANE;
  const score = useMemo(() => correct ? 100 : 30, [correct]);
  async function handleValidate() {
    await onComplete({ shell: 'statistiques-2nde', version: '1.0', steps: { correct } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><BarChart3 className="inline h-5 w-5 text-violet-700" /> Statistiques — médiane d&apos;un sondage</CardTitle><Badge tone="maths">Maths · Seconde</Badge></CardHeader>
        <p className="text-ink/80">La <strong>médiane</strong> partage les données en deux moitiés égales.</p>
        <div className="mt-3"><NarrationButton text="La médiane est la valeur du milieu d'une série triée. C'est plus représentative que la moyenne quand il y a des valeurs extrêmes." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Trouve la médiane</CardTitle><Badge tone="maths">1/1</Badge></CardHeader>
        <p className="mb-3 text-sm text-ink/70">Notes triées : {[...NOTES].sort((a,b)=>a-b).join(', ')}. Quelle est la médiane ?</p>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><StatsScene values={NOTES} /></div></div>
        <div className="mt-3 space-y-2"><Label htmlFor="g">Médiane</Label><Input id="g" inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} placeholder="ex : 12" />
          {g && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? '✓ Médiane = 12' : 'Astuce : valeur du milieu'}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Médiane = valeur centrale d&apos;une série triée.</p></Card>)}
    </div>
  );
}
