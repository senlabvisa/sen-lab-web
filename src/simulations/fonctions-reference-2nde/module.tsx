'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sigma } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const FnScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Kind = 'carre' | 'inverse' | 'racine';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'parabole' | 'droite' | 'cercle' | null;

export function FonctionsReference2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [k, setK] = useState<Kind>('carre');
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['carre']));
  const [rep, setRep] = useState<Rep>(null);
  function pick(x: Kind) { setK(x); setSeen(p => { const n = new Set(p); n.add(x); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 15 + (rep === 'parabole' ? 55 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'fonctions-reference-2nde', version: '1.0', steps: { k, rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-maths" padding="lg">
        <CardHeader><CardTitle><Sigma className="inline h-5 w-5 text-violet-700" /> Fonctions de référence</CardTitle><Badge tone="maths">Maths · Seconde</Badge></CardHeader>
        <p className="text-ink/80">Les <strong>fonctions de référence</strong> : x² (parabole), 1/x (hyperbole), √x.</p>
        <div className="mt-3"><NarrationButton text="Trois fonctions à connaître par cœur en seconde : carré, inverse et racine carrée. Leurs courbes ont des allures très différentes." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare 3 fonctions</CardTitle><Badge tone="maths">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><FnScene kind={k} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['carre','inverse','racine'] as Kind[]).map(x => (
            <Button key={x} variant={k===x?'gradient':'outline'} size="sm" onClick={() => pick(x)}>
              {x === 'carre' ? 'x²' : x === 'inverse' ? '1/x' : '√x'} {seen.has(x) && k!==x ? '✓' : ''}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
        <QcmStep label="La courbe de y = x² s'appelle :"
          options={[{ key: 'parabole', label: 'Une parabole.' }, { key: 'droite', label: 'Une droite.' }, { key: 'cercle', label: 'Un cercle.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="violet" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-maths"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">x² = parabole. 1/x = hyperbole. √x = demi-parabole couchée.</p></Card>)}
    </div>
  );
}
