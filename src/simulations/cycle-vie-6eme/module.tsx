'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, RefreshCcw, Egg } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import type { StageKey } from './lifecycle-scene';

/**
 * TP — Cycle de vie (6ème, SVT)
 *
 * Lab Premium SVT : cycle de vie de la poule (œuf → poussin → poulet
 * → poule adulte → œuf). L'élève clique dans l'ordre, des flèches
 * apparaissent et bouclent le cycle.
 */

const LifecycleScene = dynamic(() => import('./lifecycle-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 text-sm text-ink/50">
      Chargement de la cour 3D…
    </div>
  ),
});

type Step = 'intro' | 'build' | 'cycle' | 'done';
type CycleAnswer = 'circulaire' | 'lineaire' | 'aleatoire' | null;

const ORDER: StageKey[] = ['oeuf', 'poussin', 'poulet', 'poule'];
const STAGE_LABELS: Record<StageKey, string> = {
  oeuf: 'Œuf',
  poussin: 'Poussin',
  poulet: 'Poulet',
  poule: 'Poule adulte',
};

const INTRO_NARRATION =
  "Dans la cour de tes grands-parents au village, il y a sûrement des poules. " +
  "Mais d'où viennent-elles ? Et qu'est-ce qui se passe avant qu'une poule devienne grande ? " +
  "Tu vas reconstruire le cycle de vie d'une poule. Clique sur les stades dans l'ordre.";

const CONCLUSION_NARRATION =
  "Bravo ! Le cycle de vie de la poule est circulaire : œuf → poussin → poulet → poule adulte → qui pond un nouvel œuf. " +
  "C'est le même principe pour la plupart des êtres vivants : ils naissent, grandissent, se reproduisent, puis meurent. " +
  "C'est ce qui permet à la vie de continuer génération après génération.";

export function CycleVie6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [clicked, setClicked] = useState<StageKey[]>([]);
  const [errors, setErrors] = useState(0);
  const [cycleAnswer, setCycleAnswer] = useState<CycleAnswer>(null);

  const currentIndex = clicked.length;
  const isComplete = clicked.length === ORDER.length;

  function handleClick(k: StageKey) {
    if (isComplete) return;
    if (k === ORDER[currentIndex]) {
      setClicked((prev) => [...prev, k]);
    } else if (!clicked.includes(k)) {
      setErrors((e) => e + 1);
    }
  }

  function reset() {
    setClicked([]);
    setErrors(0);
  }

  const score = useMemo(() => {
    let s = 0;
    if (isComplete) s += 60 - Math.min(40, errors * 8);
    else s += clicked.length * 10;
    if (cycleAnswer === 'circulaire') s += 40;
    return Math.max(0, Math.min(100, s));
  }, [isComplete, clicked, errors, cycleAnswer]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'cycle-vie-6eme',
        version: '1.0',
        steps: {
          orderClicked: clicked,
          errors,
          completed: isComplete,
          cycleAnswer,
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Egg className="h-5 w-5" />
              </span>
              Le cycle de vie de la poule
            </CardTitle>
            <Badge tone="action">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans la cour de tes grands-parents au village, il y a souvent des poules. Mais
              d&apos;où viennent-elles ? Une poule, est-ce que ça naît directement avec des plumes
              et une crête ?
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Mission :</strong> reconstruis le <strong>cycle de vie</strong> de la poule
              en cliquant sur les stades dans le bon ordre. Ensuite, observe la flèche qui boucle
              le cycle.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('build')}>
              Voir la cour
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'build' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Egg className="h-5 w-5 text-emerald-700" />
              Étape 1 — Reconstruis le cycle
            </CardTitle>
            <Badge tone="action">1/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Clique sur les 4 stades dans l&apos;ordre du temps : commence par le tout début (un
            œuf qui n&apos;a pas encore éclos).
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <LifecycleScene clicked={clicked} currentIndex={currentIndex} onClick={handleClick} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {ORDER.map((k, i) => (
                <Badge
                  key={k}
                  tone={clicked.indexOf(k) === i ? 'action' : currentIndex > i ? 'maths' : 'neutral'}
                  size="sm"
                >
                  {clicked.indexOf(k) >= 0 ? `${clicked.indexOf(k) + 1}. ` : ''}
                  {STAGE_LABELS[k]}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {errors > 0 && <span className="text-xs text-alert-700">{errors} erreur(s)</span>}
              {clicked.length > 0 && !isComplete && (
                <Button variant="outline" size="sm" onClick={reset}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Recommencer
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={!isComplete} onClick={() => setStep('cycle')}>
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'cycle' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Le cycle est-il…</CardTitle>
            <Badge tone="action">2/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tu as vu que la poule adulte pond un nouvel œuf, qui devient un nouveau poussin, etc.
            Comment est ce cycle ?
          </p>
          <Qcm
            label="Le cycle de vie est :"
            options={[
              { key: 'circulaire', label: 'Circulaire : il revient toujours à son point de départ.' },
              { key: 'lineaire', label: 'Linéaire : il s’arrête à la poule adulte.' },
              { key: 'aleatoire', label: 'Aléatoire : il varie selon les jours.' },
            ]}
            value={cycleAnswer}
            onChange={(v) => setCycleAnswer(v as CycleAnswer)}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('build')}>
              Revoir la cour
            </Button>
            <Button variant="success" disabled={!cycleAnswer || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le cycle de vie de la poule est <strong>circulaire</strong> :{' '}
              <strong>œuf → poussin → poulet → poule adulte → nouvel œuf</strong>. C&apos;est ce
              qui permet à l&apos;espèce de se perpétuer.
            </p>
            <p>
              Ce principe vaut pour presque tous les êtres vivants : naissance → croissance →
              reproduction → mort. Et la nouvelle génération recommence.
            </p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Qcm({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  value: string | null;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      <div className="grid gap-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={
              'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ' +
              (value === opt.key
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-ink/10 hover:border-emerald-200 hover:bg-emerald-50/50')
            }
          >
            <input
              type="radio"
              className="mt-0.5 accent-emerald-600"
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
