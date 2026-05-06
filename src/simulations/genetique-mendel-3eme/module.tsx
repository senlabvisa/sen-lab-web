'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Dna } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const PunnettScene = dynamic(() => import('./punnett-scene'), { ssr: false, loading: () => <div className="h-80 bg-violet-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Allele = 'AA' | 'Aa' | 'aa';
type Rep = 'allele' | 'gene' | 'cellule' | null;

export function GenetiqueMendel3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [p1, setP1] = useState<Allele>('Aa');
  const [p2, setP2] = useState<Allele>('Aa');
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'allele' ? 60 : 0)), [tweaks, rep]);

  function set1(v: Allele) { setP1(v); setTweaks(n=>n+1); }
  function set2(v: Allele) { setP2(v); setTweaks(n=>n+1); }

  async function handleValidate() {
    await onComplete({ shell: 'genetique-mendel-3eme', version: '1.0', steps: { p1, p2, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Dna className="inline h-5 w-5 text-emerald-700" /> Génétique — lois de Mendel</CardTitle><Badge tone="action">SVT · 3ème</Badge></CardHeader>
        <p className="text-ink/80">Chaque caractère est porté par 2 <strong>allèles</strong> (un de papa, un de maman). Les enfants reçoivent une combinaison.</p>
        <div className="mt-3"><NarrationButton text="Mendel a découvert que chaque caractère, comme la couleur des yeux, est transmis par deux allèles. Si l'enfant reçoit deux allèles dominants ou un seul, il aura le caractère dominant." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Croise 2 parents</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100"><div className="aspect-[4/3] w-full"><PunnettScene parent1={p1} parent2={p2} /></div></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-xs text-ink/60 mb-1">Parent 1</div>
            <div className="flex gap-1">{(['AA','Aa','aa'] as Allele[]).map(a => <Button key={a} variant={p1===a?'gradient':'outline'} size="sm" onClick={() => set1(a)}>{a}</Button>)}</div>
          </div>
          <div>
            <div className="text-xs text-ink/60 mb-1">Parent 2</div>
            <div className="flex gap-1">{(['AA','Aa','aa'] as Allele[]).map(a => <Button key={a} variant={p2===a?'gradient':'outline'} size="sm" onClick={() => set2(a)}>{a}</Button>)}</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Vocabulaire</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Une variante d'un gène (par ex. A ou a) s'appelle :"
          options={[
            { key: 'allele', label: 'Un allèle.' },
            { key: 'gene', label: 'Un gène.' },
            { key: 'cellule', label: 'Une cellule.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Allèle = variante d&apos;un gène. Aa × Aa ⇒ 1/4 AA, 2/4 Aa, 1/4 aa.</p></Card>)}
    </div>
  );
}
