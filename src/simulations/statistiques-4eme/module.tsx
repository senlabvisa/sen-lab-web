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

const HistoScene = dynamic(() => import('./histo-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

const NOTES = [12, 8, 15, 10, 14, 11, 7, 13, 18, 9]; // 10 notes
const MOY = NOTES.reduce((a, b) => a + b) / NOTES.length;

type Step = 'intro' | 'play' | 'mean' | 'done';

export function Statistiques4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [sel, setSel] = useState<number | null>(null);
  const [g, setG] = useState('');
  const correct = Math.abs(Number(g.replace(',', '.')) - MOY) < 0.5;
  const score = useMemo(() => Math.min(100, (sel !== null ? 30 : 0) + (correct ? 70 : 0)), [sel, correct]);

  async function handleValidate() {
    await onComplete({ shell: 'statistiques-4eme', version: '1.0', steps: { notes: NOTES, moy: MOY, correct } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader><CardTitle><BarChart3 className="inline h-5 w-5 text-violet-700" /> Statistiques — moyenne de classe</CardTitle><Badge tone="maths">Maths · 4ème</Badge></CardHeader>
          <p className="text-ink/80">Voici les notes (sur 20) de 10 élèves. Calcule la moyenne.</p>
          <div className="mt-3"><NarrationButton text="La moyenne d'une série de notes, c'est la somme des notes divisée par le nombre d'élèves. C'est ce que ton professeur calcule pour ton bulletin." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}
      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Lis les notes</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><HistoScene data={NOTES} selected={sel} onSelect={setSel} /></div></div>
          {sel !== null && <p className="mt-2 text-xs text-violet-700">Élève {sel + 1} : <strong>{NOTES[sel]}/20</strong></p>}
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={sel === null} onClick={() => setStep('mean')}>Calculer la moyenne <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}
      {step === 'mean' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — La moyenne</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
          <p className="mb-3 text-sm text-ink/70">Notes : {NOTES.join(', ')}. Quelle est la moyenne ? (somme ÷ 10)</p>
          <div className="space-y-2"><Label htmlFor="g">Moyenne</Label><Input id="g" value={g} onChange={(e) => setG(e.target.value)} placeholder="ex : 11,7" />
            {g && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? `✓ Moyenne = ${MOY.toFixed(1)}/20` : `Astuce : ${NOTES.reduce((a,b)=>a+b)} ÷ 10`}</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
        </Card>
      )}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Moyenne = somme des notes ÷ nombre. <strong>{NOTES.reduce((a,b)=>a+b)} ÷ 10 = {MOY.toFixed(1)}</strong>.</p></Card>)}
    </div>
  );
}
