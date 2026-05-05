'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ButterflyScene = dynamic(() => import('./butterfly-scene'), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center bg-pink-50 text-sm text-ink/50">Chargement…</div>,
});

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Reponse = 'pareil' | 'miroir' | 'aleatoire' | null;

export function SymetrieAxiale5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [spread, setSpread] = useState(0.7);
  const [symmetric, setSymmetric] = useState(true);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Reponse>(null);

  const score = useMemo(() => Math.min(100, Math.min(40, tweaks * 6) + (rep === 'miroir' ? 60 : 0)), [tweaks, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'symetrie-axiale-5eme', version: '1.0', steps: { spread, symmetric, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle><Sparkles className="inline h-5 w-5 text-violet-700" /> Symétrie axiale — papillon</CardTitle>
            <Badge tone="maths">Maths · 5ème</Badge>
          </CardHeader>
          <p className="text-ink/80">Un papillon a deux ailes <strong>identiques en miroir</strong>. C&apos;est la symétrie axiale.</p>
          <div className="mt-3"><NarrationButton text="Quand tu regardes un papillon, ses deux ailes sont exactement pareilles, mais inversées comme dans un miroir. C'est la symétrie axiale. L'axe imaginaire qui sépare les deux ailes s'appelle l'axe de symétrie." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 1 — Ouvre les ailes</CardTitle>
            <Badge tone="maths">1/2</Badge>
          </CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <ButterflyScene spread={spread} symmetric={symmetric} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="s">Ouverture des ailes</Label>
                <span className="font-mono text-sm font-semibold text-violet-700">{Math.round(spread * 100)}%</span>
              </div>
              <input id="s" type="range" min={0} max={1} step={0.05} value={spread}
                onChange={(e) => { setSpread(Number(e.target.value)); setTweaks(n=>n+1); }}
                className="slider-lab w-full" />
            </div>
            <div className="flex items-end">
              <Button variant={symmetric ? 'outline' : 'gradient'} onClick={() => { setSymmetric(s=>!s); setTweaks(n=>n+1); }}>
                {symmetric ? 'Casser la symétrie' : 'Restaurer la symétrie'}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="maths">2/2</Badge></CardHeader>
          <QcmStep
            label="Dans une figure symétrique par rapport à un axe, les deux côtés sont :"
            options={[
              { key: 'pareil', label: 'Exactement les mêmes (superposables sans retournement).' },
              { key: 'miroir', label: 'Identiques mais en miroir (inversés par rapport à l\'axe).' },
              { key: 'aleatoire', label: 'Différents.' },
            ]}
            value={rep} onChange={(v) => setRep(v as Reponse)} tone="violet"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> Valider
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader>
          <p className="text-ink/80">La symétrie axiale = miroir parfait par rapport à un axe. On la trouve partout dans la nature : papillons, feuilles, visages.</p>
        </Card>
      )}
    </div>
  );
}
