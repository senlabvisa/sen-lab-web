'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Sun } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const EclipseScene = dynamic(() => import('./eclipse-scene'), { ssr: false, loading: () => <div className="h-80 bg-slate-900" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'lune-passe' | 'soleil-bouge' | 'terre-roule' | null;

export function SourcesLumiere5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [pos, setPos] = useState(20);
  const [tweaks, setTweaks] = useState(0);
  const [rep, setRep] = useState<Rep>(null);
  const eclipsed = Math.abs(pos - 50) < 8;
  const [seenEclipse, setSeenEclipse] = useState(false);

  function move(v: number) {
    setPos(v); setTweaks(n=>n+1);
    if (Math.abs(v - 50) < 8) setSeenEclipse(true);
  }

  const score = useMemo(() => Math.min(100, Math.min(20, tweaks * 2) + (seenEclipse ? 20 : 0) + (rep === 'lune-passe' ? 60 : 0)), [tweaks, seenEclipse, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'sources-lumiere-5eme', version: '1.0', steps: { pos, eclipsed, seenEclipse, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero" padding="lg">
          <CardHeader><CardTitle><Sun className="inline h-5 w-5 text-yellow-600" /> Sources de lumière + éclipse</CardTitle><Badge tone="science">PC · 5ème</Badge></CardHeader>
          <p className="text-ink/80">Le <strong>Soleil</strong> émet de la lumière. La <strong>Lune</strong> ne brille pas par elle-même : elle reflète la lumière du Soleil. Quand la Lune passe entre Soleil et Terre, c&apos;est une <strong>éclipse</strong>.</p>
          <div className="mt-3"><NarrationButton text="Le Soleil est la source de lumière qui éclaire notre Terre. La Lune n'émet pas sa propre lumière, elle nous renvoie celle du Soleil. Mais parfois, la Lune passe juste devant le Soleil et nous fait de l'ombre : c'est une éclipse solaire." /></div>
          <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Observer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 1 — Déplace la Lune</CardTitle><Badge tone="science">1/2</Badge></CardHeader>
          <p className="mb-3 text-sm text-ink/70">Glisse la Lune jusqu&apos;à ce qu&apos;elle masque le Soleil (vers 50%).</p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100"><div className="aspect-[4/3] w-full"><EclipseScene moonPosition={pos} /></div></div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs"><Label htmlFor="m">Position de la Lune</Label><span className="font-mono text-sm font-semibold text-blue-700">{pos}%</span></div>
            <input id="m" type="range" min={0} max={100} value={pos} onChange={(e) => move(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!seenEclipse} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="science">2/2</Badge></CardHeader>
          <QcmStep label="Une éclipse de Soleil se produit quand :"
            options={[
              { key: 'lune-passe', label: 'La Lune passe entre le Soleil et la Terre, masquant le Soleil.' },
              { key: 'soleil-bouge', label: 'Le Soleil se cache derrière les nuages.' },
              { key: 'terre-roule', label: 'La Terre tourne plus vite.' },
            ]}
            value={rep} onChange={(v) => setRep(v as Rep)} tone="science" />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>Revoir</Button>
            <Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Soleil = source. Lune = miroir. Éclipse = Lune devant Soleil.</p></Card>
      )}
    </div>
  );
}
