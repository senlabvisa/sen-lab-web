'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sprout } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const SoilScene = dynamic(() => import('./soil-scene'), { ssr: false, loading: () => <div className="h-80 bg-emerald-50" /> });

type Element = 'vers' | 'racines' | 'feuilles' | 'champignons';
type Step = 'intro' | 'explore' | 'qcm' | 'done';
type Rep = 'mort' | 'vivant' | 'minéral' | null;

export function SolVivant5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [selected, setSelected] = useState<Element | null>(null);
  const [seen, setSeen] = useState<Set<Element>>(new Set());
  const [rep, setRep] = useState<Rep>(null);

  function pick(e: Element) { setSelected(e); setSeen(p => { const n=new Set(p); n.add(e); return n; }); }

  const score = useMemo(() => Math.min(100, seen.size * 10 + (rep === 'vivant' ? 60 : 0)), [seen, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'sol-vivant-5eme', version: '1.0', steps: { seen: Array.from(seen), rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader><CardTitle><Sprout className="inline h-5 w-5 text-emerald-700" /> Le sol est vivant !</CardTitle><Badge tone="action">SVT · 5ème</Badge></CardHeader>
          <p className="text-ink/80">Sous le sable et la terre, il y a des <strong>vers</strong>, des <strong>racines</strong>, des <strong>champignons</strong>, et plein d&apos;êtres vivants invisibles.</p>
          <div className="mt-3"><NarrationButton text="Quand tu marches sur la terre, tu marches sur un monde fourmillant de vie. Sous tes pieds, des vers de terre creusent des galeries, des racines puisent l'eau, des champignons décomposent les feuilles mortes." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('explore')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'explore' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Explore le sol</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100"><div className="aspect-[4/3] w-full"><SoilScene selected={selected} /></div></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['vers','racines','feuilles','champignons'] as Element[]).map(e => (
              <Button key={e} variant={selected===e?'gradient':'outline'} size="sm" onClick={() => pick(e)}>
                {e === 'vers' ? '🪱 Vers' : e === 'racines' ? '🌱 Racines' : e === 'feuilles' ? '🍃 Feuilles' : '🍄 Champignons'}
                {seen.has(e) && selected !== e ? ' ✓' : ''}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
          <QcmStep label="Le sol est-il :"
            options={[
              { key: 'mort', label: 'Mort, juste de la terre minérale.' },
              { key: 'vivant', label: 'Vivant : il abrite vers, racines, champignons et microbes.' },
              { key: 'minéral', label: 'Uniquement composé de pierres et de sable.' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('explore')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Le sol est un <strong>écosystème vivant</strong>, pas juste de la terre. Sa fertilité dépend de tous ces êtres vivants.</p></Card>
      )}
    </div>
  );
}
