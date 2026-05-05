'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, FlaskConical } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const BeakerScene = dynamic(() => import('./beaker-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Liquid = 'eau' | 'bissap' | 'cafe' | 'lait';
type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'homogene' | 'heterogene' | 'pur' | null;

export function MelangesSolutions5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [liquid, setLiquid] = useState<Liquid>('eau');
  const [tested, setTested] = useState<Set<Liquid>>(new Set(['eau']));
  const [rep, setRep] = useState<Rep>(null);

  function pick(l: Liquid) { setLiquid(l); setTested(p => { const n=new Set(p); n.add(l); return n; }); }

  const score = useMemo(() => Math.min(100, tested.size * 10 + (rep === 'homogene' ? 60 : 0)), [tested, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'melanges-solutions-5eme', version: '1.0', steps: { tested: Array.from(tested), rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-amber" padding="lg">
          <CardHeader><CardTitle><FlaskConical className="inline h-5 w-5 text-amber-700" /> Mélanges et solutions</CardTitle><Badge tone="science">PC · 5ème</Badge></CardHeader>
          <p className="text-ink/80">Le <strong>bissap</strong>, le <strong>café Touba</strong>, le lait : ce sont des mélanges. Mais sont-ils <em>homogènes</em> ou <em>hétérogènes</em> ?</p>
          <div className="mt-3"><NarrationButton text="Quand tu prépares un bissap, tu mélanges l'eau avec des fleurs séchées et du sucre. Le résultat est rouge, transparent : c'est un mélange homogène, on ne distingue pas les morceaux. Tu vas explorer plusieurs liquides." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Compare 4 liquides</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><BeakerScene liquid={liquid} mixed={true} /></div></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['eau','bissap','cafe','lait'] as Liquid[]).map(l => (
              <Button key={l} variant={liquid===l?'gradient':'outline'} size="sm" onClick={() => pick(l)}>
                {l === 'eau' ? 'Eau pure' : l === 'bissap' ? 'Bissap' : l === 'cafe' ? 'Café Touba' : 'Lait'}
                {tested.has(l) && liquid !== l ? ' ✓' : ''}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={tested.size < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Quel type de mélange ?</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
          <QcmStep label="Le bissap, où on ne voit plus les fleurs séchées (filtrées), est un mélange :"
            options={[
              { key: 'homogene', label: 'Homogène (on ne distingue qu\'une seule phase, tout est uniforme).' },
              { key: 'heterogene', label: 'Hétérogène (on distingue plusieurs phases différentes).' },
              { key: 'pur', label: 'Un corps pur (pas un mélange).' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="amber" />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Mélange <strong>homogène</strong> = uniforme. <strong>Hétérogène</strong> = on distingue les composants (ex : bissap non filtré).</p></Card>
      )}
    </div>
  );
}
