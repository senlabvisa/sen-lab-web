'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Dice5, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Probabilités, loi des grands nombres (1ère, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (fréquence cumulée
 * de Pile qui converge vers 0,5) → QCM → bilan. Plus on répète une expérience
 * aléatoire, plus la fréquence observée se rapproche de la probabilité théorique.
 */

const ProbScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">Chargement de la scène 3D…</div>,
});

type Step = 'intro' | 'hypo' | 'manip' | 'qcm' | 'done';
type HypoRep = 'demi' | 'tiers' | 'imprevisible' | null;

const INTRO =
  "Quand on lance une pièce équilibrée, on ne peut pas prédire un lancer isolé : Pile ou Face, c'est le hasard. " +
  "Mais si on répète des centaines de fois, un ordre apparaît : la fréquence de Pile se rapproche de plus en plus de 1/2. " +
  "C'est la loi des grands nombres. Tu vas augmenter le nombre de lancers et regarder la courbe se resserrer autour de 0,5.";

const CONCLUSION =
  "Bravo ! Pour une pièce équilibrée, la probabilité de Pile est 1/2. Sur peu de lancers, la fréquence observée peut être loin de 50 %, " +
  "mais plus on répète, plus elle s'en rapproche : c'est la loi des grands nombres. La fréquence observée tend vers la probabilité théorique.";

export function Probabilites1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [trials, setTrials] = useState(20);
  const [tweaks, setTweaks] = useState(0);
  const [maxTrials, setMaxTrials] = useState(20);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qProba, setQProba] = useState<string | null>(null);
  const [qLoi, setQLoi] = useState<string | null>(null);

  function setN(v: number) {
    setTrials(v);
    setTweaks((c) => c + 1);
    setMaxTrials((m) => Math.max(m, v));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, tweaks * 5);
    if (maxTrials >= 500) s += 5; // a poussé jusqu'à un grand nombre de lancers
    if (hypo === 'demi') s += 10;
    if (qProba === 'demi') s += 30;
    if (qLoi === 'rapproche') s += 30;
    return Math.max(0, Math.min(100, s));
  }, [tweaks, maxTrials, hypo, qProba, qLoi]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'probabilites-1ere',
        version: '2.0',
        steps: { explore: { tweaks, maxTrials, lastTrials: trials }, hypothesis: hypo, qcm: { qProba, qLoi } },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Dice5 className="h-5 w-5" />
              </span>
              La loi des grands nombres
            </CardTitle>
            <Badge tone="maths">Maths · 1ère</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Un lancer de pièce isolé est imprévisible. Mais sur <strong>beaucoup</strong> de lancers, la <strong>fréquence</strong> de Pile se
              rapproche de la <strong>probabilité</strong> théorique.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> voir la fréquence observée converger vers <span className="font-mono">0,5</span> quand le nombre de
              lancers augmente.
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
              <Sparkles className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avec une pièce équilibrée et <strong>beaucoup</strong> de lancers, vers quelle fréquence de Pile va-t-on tendre ?
          </p>
          <QcmStep
            label="La fréquence de Pile va tendre vers…"
            tone="violet"
            options={[
              { key: 'demi', label: 'Environ 1/2 (50 %)' },
              { key: 'tiers', label: 'Environ 1/3' },
              { key: 'imprevisible', label: 'Ça reste totalement imprévisible' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dice5 className="h-5 w-5 text-violet-700" /> Étape 2 — Lance la pièce N fois
            </CardTitle>
            <Badge tone="maths">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Augmente le nombre de lancers. La courbe violette est la fréquence de Pile ; la ligne verte est 0,5.{' '}
            <strong>Monte vers 500-1000 lancers</strong> et observe la courbe se resserrer.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <ProbScene trials={trials} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="t">Nombre de lancers</Label>
              <span className="font-mono text-violet-700">{trials}</span>
            </div>
            <input id="t" type="range" min={5} max={1000} step={5} value={trials} onChange={(e) => setN(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-ink/70 ring-1 ring-violet-100">
            <strong>Observe :</strong> avec peu de lancers la fréquence saute beaucoup ; avec beaucoup de lancers elle colle à 0,5.
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>
              {tweaks < 4 ? `Essaie ${4 - tweaks} valeur(s) de plus` : 'Conclure'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Valide ta compréhension</CardTitle>
            <Badge tone="maths">3/3</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Avec une pièce équilibrée, la probabilité d'obtenir Pile est…"
              tone="violet"
              options={[
                { key: 'demi', label: '1/2 (50 %)' },
                { key: 'tiers', label: '1/3' },
                { key: 'quart', label: '1/4' },
              ]}
              value={qProba}
              onChange={setQProba}
            />
            <QcmStep
              label="Quand le nombre de lancers augmente, la fréquence observée…"
              tone="violet"
              options={[
                { key: 'rapproche', label: 'Se rapproche de la probabilité théorique' },
                { key: 'eloigne', label: "S'éloigne de la probabilité théorique" },
                { key: 'exact', label: 'Vaut exactement 50 % à chaque fois' },
              ]}
              value={qLoi}
              onChange={setQLoi}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la courbe
            </Button>
            <Button variant="success" disabled={!qProba || !qLoi || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pour une pièce équilibrée, <span className="font-mono">P(Pile) = 1/2</span>. La fréquence observée peut être loin de 50 % sur peu
              de lancers, mais elle <strong>se rapproche de 0,5</strong> quand on répète : c&apos;est la <strong>loi des grands nombres</strong>.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
