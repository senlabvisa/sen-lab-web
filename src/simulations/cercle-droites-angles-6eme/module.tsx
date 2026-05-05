'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

/**
 * TP — Cercle, droites et angles (6ème, Maths)
 *
 * Lab Premium Maths : rapporteur 3D pour mesurer et classer un angle
 * (aigu / droit / obtus). L'élève ajuste l'angle via slider, observe
 * la valeur en direct, puis classe 4 angles donnés.
 */

const ProtractorScene = dynamic(() => import('./protractor-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-violet-50 via-white to-amber-50 text-sm text-ink/50">
      Chargement du rapporteur 3D…
    </div>
  ),
});

type Step = 'intro' | 'play' | 'classify' | 'done';
type AngleType = 'aigu' | 'droit' | 'obtus';

const CHALLENGE_ANGLES: Array<{ deg: number; correct: AngleType }> = [
  { deg: 35, correct: 'aigu' },
  { deg: 90, correct: 'droit' },
  { deg: 135, correct: 'obtus' },
  { deg: 60, correct: 'aigu' },
];

const INTRO_NARRATION =
  "Dans la cour de l'école, le maître a tracé un grand carré pour le terrain de basket. Comment savoir si les coins sont bien droits ? " +
  "Il faut mesurer les angles ! Un angle, c'est l'écart entre deux droites qui se croisent. " +
  "Tu vas jouer avec un rapporteur 3D pour mesurer et reconnaître les angles.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu sais maintenant qu'un angle plus petit que 90° est aigu, qu'un angle de 90° est droit, et qu'un angle plus grand que 90° est obtus. " +
  "Le rapporteur permet de mesurer précisément. C'est utile pour construire des bâtiments, des terrains, ou même tracer une pyramide.";

export function CercleDroitesAngles6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [angle, setAngle] = useState(45);
  const [tweaks, setTweaks] = useState(0);

  const [classifications, setClassifications] = useState<(AngleType | null)[]>([null, null, null, null]);
  const correctCount = useMemo(
    () => classifications.filter((c, i) => c === CHALLENGE_ANGLES[i].correct).length,
    [classifications],
  );
  const allClassified = classifications.every((c) => c !== null);

  function changeAngle(v: number) {
    setAngle(v);
    setTweaks((n) => n + 1);
  }
  function setClassification(i: number, c: AngleType) {
    setClassifications((prev) => prev.map((p, j) => (j === i ? c : p)));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, tweaks * 2); // max 20 pour avoir manipulé
    s += correctCount * 20; // max 80 pour 4 réponses
    return Math.max(0, Math.min(100, s));
  }, [tweaks, correctCount]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'cercle-droites-angles-6eme',
        version: '1.0',
        steps: {
          finalAngle: angle,
          tweaks,
          classifications,
          correctCount,
          challenge: CHALLENGE_ANGLES,
        },
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
                <Circle className="h-5 w-5" />
              </span>
              Mesurer un angle
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans la cour de l&apos;école, on trace souvent des terrains, des cercles, des carrés.
              Pour que tout soit parfait, il faut mesurer les <strong>angles</strong> avec un{' '}
              <strong>rapporteur</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Mission :</strong> joue avec le rapporteur 3D, puis classe 4 angles dans la
              bonne catégorie (aigu, droit, obtus).
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('play')}>
              Ouvrir le rapporteur
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 1 — Joue avec le rapporteur</CardTitle>
            <Badge tone="maths">1/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais varier l&apos;angle avec le slider. Observe : sous 90°, l&apos;angle est{' '}
            <strong>aigu</strong>. À 90°, il est <strong>droit</strong>. Au-dessus, il est{' '}
            <strong>obtus</strong>.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <ProtractorScene angle={angle} />
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="angle">Angle</Label>
              <span className="font-mono text-sm font-semibold text-violet-700">{angle}°</span>
            </div>
            <input
              id="angle"
              type="range"
              min={0}
              max={180}
              step={5}
              value={angle}
              onChange={(e) => changeAngle(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink/40">
              <span>0°</span>
              <span>90° (droit)</span>
              <span>180°</span>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 5} onClick={() => setStep('classify')}>
              Classer 4 angles
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'classify' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Classe ces angles</CardTitle>
            <Badge tone="maths">2/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour chacun de ces angles, choisis sa catégorie : aigu, droit ou obtus.
          </p>

          <div className="space-y-3">
            {CHALLENGE_ANGLES.map((c, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-3"
              >
                <span className="font-mono text-base font-bold text-violet-700">{c.deg}°</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['aigu', 'droit', 'obtus'] as AngleType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setClassification(i, t)}
                      className={
                        'rounded-full px-3 py-1 text-xs font-semibold capitalize transition ' +
                        (classifications[i] === t
                          ? 'bg-violet-600 text-white'
                          : 'bg-ink/5 text-ink/70 hover:bg-violet-50 hover:text-violet-700')
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {allClassified && (
            <p className="mt-3 text-xs">
              <strong>{correctCount}</strong>/{CHALLENGE_ANGLES.length} bonnes réponses
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>
              Revoir le rapporteur
            </Button>
            <Button variant="success" disabled={!allClassified || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              <strong>{correctCount}/4</strong> angles classés correctement. Aigu &lt; 90° &lt;
              droit &lt; obtus &lt; 180°.
            </p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
