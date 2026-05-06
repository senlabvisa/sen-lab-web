'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ImmuneScene = dynamic(() => import('./immune-scene'), { ssr: false, loading: () => <div className="h-80 bg-pink-50" /> });

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'globules' | 'sang' | 'foie' | null;

export function SystemeImmunitaire3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [defending, setDefending] = useState(false);
  const [tested, setTested] = useState(false);
  const [rep, setRep] = useState<Rep>(null);
  const score = useMemo(() => Math.min(100, (tested ? 30 : 0) + (rep === 'globules' ? 70 : 0)), [tested, rep]);

  async function handleValidate() {
    await onComplete({ shell: 'systeme-immunitaire-3eme', version: '1.0', steps: { defending, rep } }, score);
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><Shield className="inline h-5 w-5 text-pink-700" /> Système immunitaire — défense paludisme</CardTitle><Badge tone="action">SVT · 3ème</Badge></CardHeader>
        <p className="text-ink/80">Quand un parasite (palu) entre dans le sang, les <strong>globules blancs</strong> attaquent et détruisent l&apos;intrus.</p>
        <div className="mt-3"><NarrationButton text="Au Sénégal, le paludisme est transmis par les moustiques. Le parasite entre dans le sang, mais nos globules blancs le détectent et l'attaquent. C'est la réponse immunitaire." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Active la défense</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100"><div className="aspect-[4/3] w-full"><ImmuneScene defending={defending} /></div></div>
        <div className="mt-4 flex justify-center">
          <Button variant={defending?'success':'gradient'} onClick={() => { setDefending(d=>!d); setTested(true); }}>
            {defending ? '🛡 Défense active' : 'Activer la défense'}
          </Button>
        </div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={!tested} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="Les cellules qui défendent le corps contre les microbes sont :"
          options={[
            { key: 'globules', label: 'Les globules blancs (lymphocytes).' },
            { key: 'sang', label: 'Tout le sang.' },
            { key: 'foie', label: 'Le foie.' },
          ]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Globules blancs = soldats du système immunitaire. Pour le palu, on utilise aussi des moustiquaires + médicaments.</p></Card>)}
    </div>
  );
}
