'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Pizza } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';

/**
 * TP — Fractions simples (6ème, Maths)
 *
 * Lab Premium Maths : pain de mil rond 3D découpé en N parts. L'élève
 * fait varier le découpage (dénominateur) et le nombre de parts mangées
 * (numérateur) pour comprendre la fraction.
 */

const BreadScene = dynamic(() => import('./bread-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-orange-50 text-sm text-ink/50">
      Chargement du pain 3D…
    </div>
  ),
});

type Step = 'intro' | 'play' | 'challenge' | 'compare' | 'done';
type Compare = 'plus-grande' | 'plus-petite' | 'egale' | null;

const INTRO_NARRATION =
  "À la maison, on partage souvent un pain de mil ou un gâteau en plusieurs parts. " +
  "Si tu coupes le pain en 4 et que tu manges 1 part, tu as mangé un quart : 1 sur 4, qu'on écrit 1/4. " +
  "Tu vas découvrir comment fonctionnent les fractions avec un pain de mil 3D.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu sais maintenant ce qu'est une fraction. Le nombre du bas s'appelle le dénominateur, c'est en combien de parts on coupe. " +
  "Le nombre du haut s'appelle le numérateur, c'est combien de parts on prend. " +
  "Plus le dénominateur est grand, plus les parts sont petites. C'est utile partout : pour partager un héritage, mesurer une recette, ou couper du tissu.";

const CHALLENGE_PARTS = 8;
const CHALLENGE_EATEN = 3;

export function FractionsSimples6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [parts, setParts] = useState(4);
  const [eaten, setEaten] = useState(1);
  const [tweaks, setTweaks] = useState(0);

  const [challengeAnswer, setChallengeAnswer] = useState('');
  const challengeCorrect = useMemo(() => {
    const m = challengeAnswer.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
    if (!m) return false;
    const num = Number(m[1]);
    const den = Number(m[2]);
    return num === CHALLENGE_PARTS - CHALLENGE_EATEN && den === CHALLENGE_PARTS;
  }, [challengeAnswer]);

  const [compare, setCompare] = useState<Compare>(null);

  function changeParts(v: number) {
    setParts(v);
    if (eaten > v) setEaten(v);
    setTweaks((n) => n + 1);
  }
  function changeEaten(v: number) {
    setEaten(Math.min(v, parts));
    setTweaks((n) => n + 1);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, tweaks * 2);
    if (challengeCorrect) s += 50;
    if (compare === 'plus-grande') s += 30; // 1/2 > 1/4
    return Math.max(0, Math.min(100, s));
  }, [tweaks, challengeCorrect, compare]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'fractions-simples-6eme',
        version: '1.0',
        steps: {
          parts,
          eaten,
          tweaks,
          challenge: { parts: CHALLENGE_PARTS, eaten: CHALLENGE_EATEN, answer: challengeAnswer, correct: challengeCorrect },
          compare,
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-amber" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <Pizza className="h-5 w-5" />
              </span>
              Partager un pain de mil
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Quand ta famille se réunit pour le repas, on partage souvent un pain de mil ou un
              gâteau. Si on est <strong>4</strong> et qu&apos;on prend chacun <strong>1 part</strong>,
              tu manges <strong>1/4</strong> du pain (un quart).
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Mission :</strong> tu vas couper un pain en différentes parts, voir ce qui
              reste après en avoir mangé, et comprendre comment lire une fraction.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('play')}>
              Couper le pain
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'play' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pizza className="h-5 w-5 text-amber-700" />
              Étape 1 — Joue avec le pain
            </CardTitle>
            <Badge tone="maths">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis combien de parts couper, et combien de parts ont déjà été mangées. Observe la
            fraction qui reste.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <BreadScene parts={parts} eaten={eaten} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="parts">Couper en (dénominateur)</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{parts}</span>
              </div>
              <input
                id="parts"
                type="range"
                min={2}
                max={12}
                step={1}
                value={parts}
                onChange={(e) => changeParts(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="eaten">Parts mangées (numérateur)</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{eaten}</span>
              </div>
              <input
                id="eaten"
                type="range"
                min={0}
                max={parts}
                step={1}
                value={eaten}
                onChange={(e) => changeEaten(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-center ring-1 ring-amber-100">
            <span className="text-sm text-ink/70">
              Tu as mangé <strong className="font-mono text-amber-700">{eaten}/{parts}</strong>{' '}
              du pain. Il reste{' '}
              <strong className="font-mono text-amber-700">{parts - eaten}/{parts}</strong>.
            </span>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('challenge')}>
              Défi
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'challenge' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Défi</CardTitle>
            <Badge tone="maths">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            On coupe un pain en <strong>{CHALLENGE_PARTS}</strong> parts égales. Tes amis en
            mangent <strong>{CHALLENGE_EATEN}</strong>. Quelle fraction du pain reste-t-il ?
          </p>
          <p className="mb-3 text-xs text-ink/50">
            Écris ta réponse au format : <code className="font-mono">numérateur/dénominateur</code>{' '}
            (ex : 3/4)
          </p>
          <div className="space-y-2">
            <Label htmlFor="cha">Fraction restante</Label>
            <Input
              id="cha"
              value={challengeAnswer}
              onChange={(e) => setChallengeAnswer(e.target.value)}
              placeholder="ex : 5/8"
              className="font-mono"
            />
            {challengeAnswer && (
              <p className={'text-xs ' + (challengeCorrect ? 'text-action-700' : 'text-alert-700')}>
                {challengeCorrect
                  ? `✓ Bravo ! ${CHALLENGE_PARTS} − ${CHALLENGE_EATEN} = ${CHALLENGE_PARTS - CHALLENGE_EATEN}, sur un total de ${CHALLENGE_PARTS}.`
                  : 'Réessaie. Indice : numérateur = parts qui restent, dénominateur = total.'}
              </p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('play')}>
              Revoir le pain
            </Button>
            <Button variant="gradient" disabled={!challengeCorrect} onClick={() => setStep('compare')}>
              Comparer 2 fractions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'compare' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Compare deux fractions</CardTitle>
            <Badge tone="maths">3/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Aïssa a mangé <strong>1/2</strong> de son pain. Mamadou a mangé <strong>1/4</strong>{' '}
            de son pain. Qui a mangé le plus ?
          </p>
          <Qcm
            label="La part d'Aïssa (1/2) est :"
            options={[
              { key: 'plus-grande', label: 'Plus grande que celle de Mamadou (1/4).' },
              { key: 'plus-petite', label: 'Plus petite que celle de Mamadou.' },
              { key: 'egale', label: 'Égale à celle de Mamadou.' },
            ]}
            value={compare}
            onChange={(v) => setCompare(v as Compare)}
          />
          <p className="mt-2 text-xs text-ink/50">
            Astuce : utilise le pain 3D pour vérifier (couper en 2, puis en 4).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('challenge')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!compare || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-amber">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Une <strong>fraction</strong> = numérateur sur dénominateur. Plus le dénominateur
              est grand, plus la part est petite. <strong>1/2 &gt; 1/4 &gt; 1/8</strong>.
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
                ? 'border-amber-500 bg-amber-50'
                : 'border-ink/10 hover:border-amber-200 hover:bg-amber-50/50')
            }
          >
            <input
              type="radio"
              className="mt-0.5 accent-amber-600"
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
