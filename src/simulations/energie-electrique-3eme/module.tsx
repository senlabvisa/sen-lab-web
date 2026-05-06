'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

const MeterScene = dynamic(() => import('./meter-scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

type Step = 'intro' | 'play' | 'calc' | 'done';

export function EnergieElectrique3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [kwh, setKwh] = useState(50);
  const [g, setG] = useState('');
  // 30 kWh × 100 F/kWh = 3000 F
  const correct = Number(g.replace(/[^\d]/g, '')) === 3000;
  const score = useMemo(() => Math.min(100, (kwh !== 50 ? 30 : 0) + (correct ? 70 : 0)), [kwh, correct]);

  async function handleValidate() {
    await onComplete({ shell: 'energie-electrique-3eme', version: '1.0', steps: { kwh, correct } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-amber" padding="lg">
        <CardHeader><CardTitle><Zap className="inline h-5 w-5 text-amber-700" /> Énergie électrique — facture Senelec</CardTitle><Badge tone="science">PC · 3ème</Badge></CardHeader>
        <p className="text-ink/80">L&apos;énergie électrique se mesure en <strong>kWh</strong> (kilowattheures). 1 kWh ≈ 100 F CFA chez Senelec.</p>
        <div className="mt-3"><NarrationButton text="Quand tu utilises une lampe pendant longtemps, ou un climatiseur, tu consommes des kilowattheures. Plus tu en consommes, plus la facture est élevée." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Le compteur Woyofal</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><MeterScene kwh={kwh} /></div></div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs"><Label htmlFor="k">Consommation (kWh)</Label><span className="font-mono text-sm font-semibold text-amber-700">{kwh}</span></div>
          <input id="k" type="range" min={0} max={300} value={kwh} onChange={(e) => setKwh(Number(e.target.value))} className="slider-lab w-full" />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" onClick={() => setStep('calc')}>Calcul <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'calc' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Coût de 30 kWh</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
        <p className="mb-3 text-sm text-ink/70">Si tu consommes <strong>30 kWh</strong> à <strong>100 F/kWh</strong>, combien paies-tu ?</p>
        <div className="space-y-2"><Label htmlFor="g">Coût (F CFA)</Label><Input id="g" inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} placeholder="3000" />
          {g && <p className={'text-xs ' + (correct ? 'text-action-700' : 'text-alert-700')}>{correct ? '✓ 30 × 100 = 3000 F' : 'Indice : multiplie par 100.'}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!correct || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-amber"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Coût = consommation × tarif. 30 kWh × 100 F = 3000 F.</p></Card>)}
    </div>
  );
}
