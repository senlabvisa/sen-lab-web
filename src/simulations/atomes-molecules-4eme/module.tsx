'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Atom } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const MoleculesScene = dynamic(() => import('./molecules-scene'), { ssr: false, loading: () => <div className="h-80 bg-blue-50" /> });

type Kind = 'co2' | 'h2o' | 'nacl';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'atomes' | 'cellules' | 'minéraux' | null;

export function AtomesMolecules4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [kind, setKind] = useState<Kind>('co2');
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['co2']));
  const [rep, setRep] = useState<Rep>(null);

  function pick(k: Kind) { setKind(k); setSeen(p => { const n=new Set(p); n.add(k); return n; }); }

  const score = useMemo(() => Math.min(100, seen.size * 15 + (rep === 'atomes' ? 55 : 0)), [seen, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'atomes-molecules-4eme', version: '1.0', steps: { kind, seen: Array.from(seen), rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero" padding="lg">
        <CardHeader><CardTitle><Atom className="inline h-5 w-5 text-blue-700" /> Atomes et molécules</CardTitle><Badge tone="science">PC · 4ème</Badge></CardHeader>
        <p className="text-ink/80">Tout est fait d&apos;<strong>atomes</strong>. Quand des atomes s&apos;assemblent, ils forment des <strong>molécules</strong> (eau, CO₂…).</p>
        <div className="mt-3"><NarrationButton text="Imagine que les atomes sont les briques du monde. Quand tu en assembles plusieurs, tu obtiens une molécule. Une molécule d'eau, c'est deux atomes d'hydrogène et un d'oxygène." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Compare 3 molécules</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><MoleculesScene kind={kind} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['co2','h2o','nacl'] as Kind[]).map(k => (
            <Button key={k} variant={kind===k?'gradient':'outline'} size="sm" onClick={() => pick(k)}>
              {k === 'co2' ? 'CO₂' : k === 'h2o' ? 'H₂O' : 'NaCl'} {seen.has(k) && kind !== k ? '✓' : ''}
            </Button>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <QcmStep label="Une molécule est composée de :"
          options={[
            { key: 'atomes', label: 'Plusieurs atomes assemblés.' },
            { key: 'cellules', label: 'Plusieurs cellules.' },
            { key: 'minéraux', label: 'Petits minéraux.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Atomes = briques. Molécules = assemblages d&apos;atomes. <strong>H₂O = 2 H + 1 O</strong>.</p></Card>)}
    </div>
  );
}
