'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  Lightbulb,
  Power,
  Save,
  Sun,
} from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PlantDiagram } from './plant';

/**
 * TP — Photosynthèse (4ème, SVT)
 *
 * Élodée dans un bécher, on fait varier la lumière et on compte les bulles d'O2.
 * Relation attendue : croissance puis plateau.
 * "Vraie" valeur cachée : bubblesPerMin = min(12, floor(lightLevel / 8)).
 */

type Hypothesis = 'rien' | 'augmente' | 'diminue';
type Conclusion = 'chlorophylle-lumiere' | 'eau-seule' | 'terre-seule';
type Step = 'intro' | 'hypothese' | 'experience' | 'analyse' | 'done';

const LIGHT_LEVELS = [20, 40, 60, 80] as const;

function trueBubbles(light: number): number {
  return Math.min(12, Math.max(0, Math.floor(light / 8)));
}

export function Photosynthese4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [sliderLight, setSliderLight] = useState<number>(50);
  const [observing, setObserving] = useState(false);
  const [measurements, setMeasurements] = useState<Record<number, number | null>>(
    Object.fromEntries(LIGHT_LEVELS.map((l) => [l, null])),
  );
  const [conclusion, setConclusion] = useState<Conclusion | null>(null);

  const currentBubbles = trueBubbles(sliderLight);
  const allMeasured = LIGHT_LEVELS.every((l) => measurements[l] !== null);

  function recordMeasurement() {
    const noise = Math.floor(Math.random() * 3) - 1;
    const observed = Math.max(0, trueBubbles(sliderLight) + noise);
    setMeasurements((prev) => ({ ...prev, [sliderLight]: observed }));
  }

  const score = useMemo(() => {
    let s = 0;
    if (hypothesis === 'augmente') s += 20;
    const measuredCount = LIGHT_LEVELS.filter((l) => measurements[l] !== null).length;
    s += Math.round((measuredCount / LIGHT_LEVELS.length) * 40);
    if (conclusion === 'chlorophylle-lumiere') s += 40;
    return Math.max(0, Math.min(100, s));
  }, [hypothesis, measurements, conclusion]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'photosynthese-4eme',
        version: '1.0',
        steps: {
          hypothesis,
          measurements: LIGHT_LEVELS.map((l) => ({
            lightPct: l,
            bubblesPerMin: measurements[l],
          })),
          conclusion,
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-action-700 shadow-soft ring-1 ring-action-100">
                <Leaf className="h-5 w-5" />
              </span>
              Photosynthèse — Contexte
            </CardTitle>
            <Badge tone="svt">SVT · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Les plantes vertes — comme le baobab dans nos cours, ou l&apos;élodée qu&apos;on
              trouve dans les mares de Kaolack — produisent leur propre nourriture. Elles
              utilisent la lumière du soleil pour transformer le dioxyde de carbone et
              l&apos;eau en sucres, en rejetant de l&apos;oxygène.
            </p>
            <p>
              Dans ce TP, on va observer une plante aquatique plongée dans un bécher et
              mesurer combien de bulles d&apos;oxygène elle produit en fonction de la
              lumière reçue.
            </p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypothese')}>
              Commencer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'hypothese' && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 1 — Hypothèse</CardTitle>
            <Badge tone="science">1/3</Badge>
          </CardHeader>
          <p className="mb-4 text-ink/80">
            Si on augmente la quantité de lumière reçue par la plante, que se passe-t-il
            d&apos;après toi pour la production d&apos;oxygène (bulles) ?
          </p>
          <div className="space-y-2">
            {(
              [
                { key: 'augmente', label: 'La plante produit plus de bulles' },
                { key: 'diminue', label: 'La plante produit moins de bulles' },
                { key: 'rien', label: "La lumière n'a aucun effet" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                className={
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ' +
                  (hypothesis === opt.key
                    ? 'border-science-500 bg-science-50'
                    : 'border-ink/10 hover:border-science-200 hover:bg-science-50/50')
                }
              >
                <input
                  type="radio"
                  name="hypothesis"
                  className="accent-science-700"
                  checked={hypothesis === opt.key}
                  onChange={() => setHypothesis(opt.key)}
                />
                <span className="text-ink">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              variant="gradient"
              disabled={hypothesis === null}
              onClick={() => setStep('experience')}
            >
              Expérimenter
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'experience' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-alert-700" />
                Étape 2 — Expérience
              </CardTitle>
              <Badge tone="science">2/3</Badge>
            </CardHeader>
            <p className="mb-3 text-sm text-ink/70">
              Règle le niveau de lumière avec le curseur puis allume la lampe pour observer
              les bulles. Enregistre la mesure pour les 4 niveaux demandés.
            </p>

            <PlantDiagram lightLevel={sliderLight} showBubbles={observing} />

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sliderLight" className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-alert-700" />
                  Niveau de lumière
                </Label>
                <span className="font-mono text-sm font-semibold text-ink">
                  {sliderLight}%
                </span>
              </div>
              <input
                id="sliderLight"
                type="range"
                min={0}
                max={100}
                step={5}
                value={sliderLight}
                onChange={(e) => setSliderLight(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                variant={observing ? 'outline' : 'success'}
                size="sm"
                onClick={() => setObserving(!observing)}
              >
                <Power className="h-4 w-4" />
                {observing ? 'Éteindre' : 'Allumer'}
              </Button>
              <Button
                variant="gradient"
                size="sm"
                disabled={
                  !observing ||
                  !LIGHT_LEVELS.includes(sliderLight as (typeof LIGHT_LEVELS)[number])
                }
                onClick={recordMeasurement}
              >
                <Save className="h-4 w-4" />
                Enregistrer ({currentBubbles} bulles)
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tableau de mesures</CardTitle>
              <Badge tone={allMeasured ? 'action' : 'neutral'}>
                {LIGHT_LEVELS.filter((l) => measurements[l] !== null).length}/{LIGHT_LEVELS.length}
              </Badge>
            </CardHeader>
            <div className="overflow-hidden rounded-xl ring-1 ring-ink/5">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-ink/60">
                    <th className="px-4 py-2 font-medium">Lumière</th>
                    <th className="px-4 py-2 font-medium">Bulles / min</th>
                    <th className="px-4 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {LIGHT_LEVELS.map((l) => {
                    const recorded = measurements[l];
                    return (
                      <tr key={l} className="border-t border-ink/5">
                        <td className="px-4 py-3 font-mono font-semibold text-ink">
                          {l}%
                        </td>
                        <td className="px-4 py-3 font-mono text-ink">
                          {recorded !== null ? (
                            <Badge tone="action">{recorded}</Badge>
                          ) : (
                            <span className="text-ink/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSliderLight(l);
                              setObserving(true);
                            }}
                          >
                            Régler à {l}%
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="gradient"
                disabled={!allMeasured}
                onClick={() => setStep('analyse')}
              >
                Analyser
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </>
      )}

      {step === 'analyse' && (
        <Card>
          <CardHeader>
            <CardTitle>Étape 3 — Conclusion</CardTitle>
            <Badge tone="science">3/3</Badge>
          </CardHeader>
          <p className="mb-4 text-ink/80">
            D&apos;après tes mesures, les bulles d&apos;oxygène augmentent avec la lumière.
            Comment la plante parvient-elle à produire cet oxygène ?
          </p>
          <div className="space-y-2">
            {(
              [
                {
                  key: 'chlorophylle-lumiere',
                  label:
                    'La chlorophylle capte la lumière pour transformer CO₂ + eau → sucres + O₂',
                },
                { key: 'eau-seule', label: "L'eau du bécher produit naturellement l'oxygène" },
                {
                  key: 'terre-seule',
                  label: "La terre dans laquelle pousse la plante donne l'oxygène",
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                className={
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ' +
                  (conclusion === opt.key
                    ? 'border-action-500 bg-action-50'
                    : 'border-ink/10 hover:border-action-200 hover:bg-action-50/50')
                }
              >
                <input
                  type="radio"
                  name="conclusion"
                  className="accent-action-700"
                  checked={conclusion === opt.key}
                  onChange={() => setConclusion(opt.key)}
                />
                <span className="text-ink">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('experience')}>
              Revoir mes mesures
            </Button>
            <Button
              variant="success"
              disabled={conclusion === null || busy}
              onClick={handleValidate}
            >
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
          <p className="text-ink/70">
            Ton travail est enregistré. Tu peux consulter ton score et tes badges sur le
            tableau de bord.
          </p>
        </Card>
      )}
    </div>
  );
}
