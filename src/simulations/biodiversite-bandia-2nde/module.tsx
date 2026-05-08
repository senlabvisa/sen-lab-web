'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, TreePine } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

const ParkScene = dynamic(() => import('./scene'), { ssr: false, loading: () => <div className="h-80 bg-amber-50" /> });

const ANIMAL_KEYS = ['rhino', 'girafe', 'gazelle', 'singe'];

type Step = 'intro' | 'play' | 'qcm' | 'done';
type Rep = 'diversite' | 'foret' | 'climat' | null;

export function BiodiversiteBandia2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [sel, setSel] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [rep, setRep] = useState<Rep>(null);
  function pick(k: string) { setSel(k); setSeen(p => { const n=new Set(p); n.add(k); return n; }); }
  const score = useMemo(() => Math.min(100, seen.size * 10 + (rep === 'diversite' ? 60 : 0)), [seen, rep]);
  async function handleValidate() {
    await onComplete({ shell: 'biodiversite-bandia-2nde', version: '1.0', steps: { seen: Array.from(seen), rep } }, score);
    setStep('done');
  }
  return (
    <div className="space-y-4">
      {step === 'intro' && (<Card variant="hero-svt" padding="lg">
        <CardHeader><CardTitle><TreePine className="inline h-5 w-5 text-amber-700" /> Biodiversité — Réserve de Bandia</CardTitle><Badge tone="action">SVT · Seconde</Badge></CardHeader>
        <p className="text-ink/80">La <strong>Réserve de Bandia</strong> (près de Mbour) abrite rhinocéros, girafes, gazelles, singes... C&apos;est la <strong>biodiversité</strong>.</p>
        <div className="mt-3"><NarrationButton text="La biodiversité, c'est la diversité des êtres vivants dans un milieu. La réserve de Bandia protège des espèces emblématiques d'Afrique." /></div>
        <div className="mt-5 flex justify-end"><Button variant="gradient" onClick={() => setStep('play')}>Voir <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'play' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 1 — Découvre les espèces</CardTitle><Badge tone="action">1/2</Badge></CardHeader>
        <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100"><div className="aspect-[4/3] w-full"><ParkScene selected={sel} /></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{ANIMAL_KEYS.map(k => <Button key={k} variant={sel===k?'gradient':'outline'} size="sm" onClick={() => pick(k)}>{k} {seen.has(k) && sel!==k ? '✓' : ''}</Button>)}</div>
        <div className="mt-4 flex justify-end"><Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('qcm')}>Continuer <ArrowRight className="h-4 w-4" /></Button></div>
      </Card>)}
      {step === 'qcm' && (<Card padding="lg">
        <CardHeader><CardTitle>Étape 2 — Question</CardTitle><Badge tone="action">2/2</Badge></CardHeader>
        <QcmStep label="La biodiversité, c'est :"
          options={[{ key: 'diversite', label: 'La diversité des espèces vivantes dans un milieu.' }, { key: 'foret', label: 'Uniquement les forêts.' }, { key: 'climat', label: 'Le climat d\'une région.' }]}
          value={rep} onChange={(v) => setRep(v as Rep)} tone="action" />
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setStep('play')}>Revoir</Button><Button variant="success" disabled={!rep || busy} onClick={handleValidate}><CheckCircle2 className="h-4 w-4" /> Valider</Button></div>
      </Card>)}
      {step === 'done' && (<Card variant="hero-svt"><CardHeader><CardTitle><CheckCircle2 className="inline h-5 w-5 text-action-700" /> TP terminé !</CardTitle></CardHeader><p className="text-ink/80">Biodiversité = variété du vivant. Bandia, Niokolo-Koba, Saloum sont des sanctuaires sénégalais.</p></Card>)}
    </div>
  );
}
