'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Maximize2, Ruler, Sparkles, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Agrandissement et réduction : effet du coefficient k (Maths, 3ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures →
 * QCM → bilan. On agrandit/réduit une maquette de maison par un coefficient k
 * et on observe : longueurs ×k, aires ×k², volume ×k³.
 * Contexte : la maquette de la ville de Diamniadio et les photos agrandies.
 */

const ScaleScene = dynamic(() => import('./scale-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'meme' | 'k2' | 'k3' | null;

const INTRO =
  "Pour présenter la nouvelle ville de Diamniadio, les architectes construisent une maquette : " +
  "une maison réelle est réduite par un coefficient k. À l'inverse, quand tu agrandis une photo sur ton téléphone, " +
  "tu la multiplies par un coefficient k plus grand que 1. Aujourd'hui tu vas découvrir comment k change les longueurs, " +
  "les aires et le volume d'un solide.";

const CONCLUSION =
  "Bravo ! Dans un agrandissement ou une réduction de rapport k : les longueurs sont multipliées par k, " +
  "les aires par k au carré, et les volumes par k au cube. Si k est plus grand que 1, c'est un agrandissement ; " +
  "si k est entre 0 et 1, c'est une réduction.";

export function AgrandissementReduction3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [ratio, setRatio] = useState(1);
  const [ksTried, setKsTried] = useState<Set<number>>(new Set());
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qAire, setQAire] = useState<string | null>(null);
  const [qVol, setQVol] = useState<string | null>(null);
  const [qDemi, setQDemi] = useState<string | null>(null);

  const aire = useMemo(() => ratio * ratio, [ratio]);
  const volume = useMemo(() => ratio * ratio * ratio, [ratio]);

  function recordRatio(v: number) {
    setRatio(v);
    if (Math.abs(v - 1) > 0.001) setKsTried((prev) => new Set(prev).add(Number(v.toFixed(1))));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, ksTried.size * 7); // exploration : agrandir ET réduire
    if (hypo === 'k2') s += 10;
    if (qAire === '9') s += 25;
    if (qVol === '27') s += 25;
    if (qDemi === 'reduction') s += 15;
    return Math.min(100, s);
  }, [ksTried, hypo, qAire, qVol, qDemi]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'agrandissement-reduction-3eme',
        version: '2.0',
        steps: {
          ratiosTried: Array.from(ksTried),
          hypothesis: hypo,
          qcm: { qAire, qVol, qDemi },
        },
      },
      score,
    );
    setStep('done');
  }

  const aGrandi = Array.from(ksTried).some((k) => k > 1);
  const aReduit = Array.from(ksTried).some((k) => k < 1);

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Maximize2 className="h-5 w-5" />
              </span>
              La maquette de Diamniadio
            </CardTitle>
            <Badge tone="maths">Maths · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pour la maquette d&apos;une ville comme <strong>Diamniadio</strong>, on <strong>réduit</strong> les
              bâtiments par un coefficient k. Quand tu <strong>agrandis</strong> une photo, tu la multiplies par un k
              plus grand que 1.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> régler le coefficient k et observer son effet sur les{' '}
              <strong>longueurs</strong>, les <strong>aires</strong> et le <strong>volume</strong> d&apos;une maison.
            </p>
            <NarrationButton text={INTRO} label="Écouter l'introduction" />
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypo')}>
              Commencer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'hypo' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si on multiplie toutes les <strong>longueurs</strong> d&apos;une figure par k, par
            combien penses-tu que son <strong>aire</strong> est multipliée ?
          </p>
          <QcmStep
            label="Mon hypothèse : quand les longueurs sont ×k, l'aire est multipliée par…"
            tone="violet"
            options={[
              { key: 'meme', label: 'k (le même coefficient)' },
              { key: 'k2', label: 'k² (k au carré)' },
              { key: 'k3', label: 'k³ (k au cube)' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Tester ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-violet-700" /> Étape 2 — Règle le coefficient k
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Déplace le curseur k. L&apos;image (à droite) grandit ou rétrécit. Observe les afficheurs : longueurs ×k,
            aire ×k², volume ×k³. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <ScaleScene ratio={ratio} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="k">Coefficient k</Label>
              <span className="font-mono text-sm font-semibold text-violet-700">×{ratio.toFixed(1)}</span>
            </div>
            <input
              id="k"
              type="range"
              min={0.3}
              max={2.5}
              step={0.1}
              value={ratio}
              onChange={(e) => recordRatio(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Longueurs" value={`×${ratio.toFixed(1)}`} />
            <Stat label="Aire (×k²)" value={`×${aire.toFixed(2)}`} />
            <Stat label="Volume (×k³)" value={`×${volume.toFixed(2)}`} />
          </div>
          <div className="mt-2 text-center text-xs text-ink/60">
            {ratio > 1 ? 'k > 1 → agrandissement' : ratio < 1 ? '0 < k < 1 → réduction' : 'k = 1 → figure identique'}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/55">
              {aGrandi && aReduit
                ? 'Bien : tu as agrandi et réduit.'
                : 'Essaie un k > 1 (agrandir) ET un k < 1 (réduire).'}
            </span>
            <Button variant="gradient" disabled={!(aGrandi && aReduit)} onClick={() => setStep('mesures')}>
              Voir mes mesures <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour chaque coefficient k que tu as testé : l&apos;aire est ×k² et le volume ×k³. Remarque comme le volume
            grandit (ou diminue) bien plus vite que les longueurs.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">k (longueurs)</th>
                  <th className="px-4 py-2 text-left">Aire ×k²</th>
                  <th className="px-4 py-2 text-left">Volume ×k³</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(ksTried)
                  .sort((a, b) => a - b)
                  .map((k) => (
                    <tr key={k} className="border-t border-night-100">
                      <td className="px-4 py-2 font-mono">×{k.toFixed(1)}</td>
                      <td className="px-4 py-2 font-mono">×{(k * k).toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono">×{(k * k * k).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retester
            </Button>
            <Button variant="gradient" onClick={() => setStep('qcm')}>
              Conclure <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 4 — Valide ta compréhension</CardTitle>
            <Badge tone="maths">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Si on multiplie les longueurs par 3, l'aire est multipliée par :"
              tone="violet"
              options={[
                { key: '3', label: '3' },
                { key: '9', label: '9 (= 3²)' },
                { key: '27', label: '27' },
              ]}
              value={qAire}
              onChange={setQAire}
            />
            <QcmStep
              label="Le volume est alors multiplié par :"
              tone="violet"
              options={[
                { key: '9', label: '9' },
                { key: '27', label: '27 (= 3³)' },
                { key: '3', label: '3' },
              ]}
              value={qVol}
              onChange={setQVol}
            />
            <QcmStep
              label="Un coefficient k = 0,5 correspond à :"
              tone="violet"
              options={[
                { key: 'agrandissement', label: 'Un agrandissement' },
                { key: 'reduction', label: 'Une réduction' },
                { key: 'identique', label: 'La même figure' },
              ]}
              value={qDemi}
              onChange={setQDemi}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qAire || !qVol || !qDemi || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans un rapport k : les <strong>longueurs sont ×k</strong>, les <strong>aires ×k²</strong> et les{' '}
              <strong>volumes ×k³</strong>. Si <strong>k &gt; 1</strong> c&apos;est un agrandissement ; si{' '}
              <strong>0 &lt; k &lt; 1</strong> c&apos;est une réduction (comme la maquette de Diamniadio).
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
      <div className="text-[10px] uppercase tracking-wider text-violet-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-violet-800">{value}</div>
    </div>
  );
}
