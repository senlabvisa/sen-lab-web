'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Atom, CheckCircle2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const AtomScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type El = 'Na' | 'Cl' | 'H' | 'O';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'NaCl' | 'NaH' | 'OCl' | null;

export function TableauPeriodique2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [el, setEl] = useState<El>('Na');
  const [seen, setSeen] = useState<Set<El>>(new Set(['Na']));
  const [rep, setRep] = useState<Rep>(null);
  function pick(x: El) { setEl(x); setSeen(p => { const n = new Set(p); n.add(x); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 12 + (rep === 'NaCl' ? 52 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'tableau-periodique-2nde', version: '1.0', steps: { el, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Atom className="inline h-5 w-5 text-blue-700" /> Tableau périodique — éléments du sel marin</CardTitle><Badge tone="science">PC · Seconde</Badge></CardHeader>
        <p className="text-ink/80">Le sel marin de Joal-Fadiouth = <strong>NaCl</strong> (sodium + chlore). Découvre 4 éléments clés.</p>
        <div className="mt-3"><NarrationButton text="Le tableau périodique classe les atomes selon leur numéro atomique. Le sel marin est composé de sodium et de chlore." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare 4 atomes</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><AtomScene element={el} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{(['Na','Cl','H','O'] as El[]).map(x => <Button key={x} variant={el===x?'gradient':'outline'} size="sm" onClick={() => pick(x)}>{x} {seen.has(x) && el!==x ? '✓' : ''}</Button>)}</div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Le sel marin</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Quelle est la formule du sel de cuisine ?"
          options={[{ key: 'NaCl', label: 'NaCl (sodium + chlore)' }, { key: 'NaH', label: 'NaH' }, { key: 'OCl', label: 'OCl' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Sel = NaCl. Sodium (Na, Z=11) + Chlore (Cl, Z=17).</p></Card>)}
    </div>
  );
}
