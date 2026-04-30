'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Cpu, Lightbulb, Save, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CircuitDiagram } from './circuit';

/**
 * TP — Loi d'Ohm (3ème, Physique-Chimie)
 * R fixée à 20 Ω (cachée). L'élève mesure I = U/R pour 4 valeurs de U,
 * puis calcule R via U/I.
 */

const R_REEL = 20;
const MIN_MEASUREMENTS = 4;
const U_VALUES_SUGGESTED = [3, 6, 9, 12];

type Hypothesis = 'augmente' | 'diminue' | 'identique';
type Step = 'intro' | 'hypothese' | 'experience' | 'analyse' | 'done';

type Measurement = { u: number; i: number | null };

export function LoiDohm3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  const [sliderU, setSliderU] = useState(6);
  const [measurements, setMeasurements] = useState<Measurement[]>(
    U_VALUES_SUGGESTED.map((u) => ({ u, i: null })),
  );
  const [guessedR, setGuessedR] = useState('');

  const currentForSlider = sliderU / R_REEL;

  function recordMeasurement(idx: number) {
    setMeasurements((prev) =>
      prev.map((m, i) => (i === idx ? { u: prev[idx].u, i: prev[idx].u / R_REEL } : m)),
    );
  }

  const allMeasured = measurements.every((m) => m.i !== null);
  const measuredCount = measurements.filter((m) => m.i !== null).length;
  const guessedRNum = Number(guessedR.replace(',', '.'));
  const validGuess =
    !Number.isNaN(guessedRNum) && guessedRNum > 0 && guessedRNum < 1000;

  const score = useMemo(() => {
    let s = 0;
    if (hypothesis === 'augmente') s += 20;
    s += Math.min(40, (measuredCount / MIN_MEASUREMENTS) * 40);
    if (validGuess) {
      const err = Math.abs(guessedRNum - R_REEL) / R_REEL;
      if (err <= 0.05) s += 40;
      else if (err <= 0.15) s += 25;
      else if (err <= 0.3) s += 10;
    }
    return Math.round(s);
  }, [hypothesis, measuredCount, guessedRNum, validGuess]);

  async function handleValidate() {
    const dataJson: Record<string, unknown> = {
      shell: 'loi-dohm-3eme',
      version: '1.0',
      steps: {
        hypothesis,
        measurements: measurements.map((m) => ({ u: m.u, i: m.i })),
        computedR: validGuess ? guessedRNum : null,
        trueR: R_REEL,
      },
    };
    await onComplete(dataJson, Math.max(0, Math.min(100, score)));
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-physique" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-science-700 shadow-soft ring-1 ring-science-100">
                <Cpu className="h-5 w-5" />
              </span>
              Loi d&apos;Ohm — Contexte
            </CardTitle>
            <Badge tone="physique">PC · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Chez toi, le compteur <strong>Woyofal</strong> livre une tension alternative de
              220 V. Une ampoule LED branchée dessus consomme un courant qui dépend de sa
              résistance. Plus la résistance est grande, plus le courant est faible.
            </p>
            <p>
              Dans ce TP, on travaille sur un montage simple : une pile, un fil, une résistance R
              inconnue et deux instruments (ampèremètre A et voltmètre V). Objectif : découvrir la
              relation entre U, I et R — la <strong>loi d&apos;Ohm</strong>.
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
            Si on augmente la tension U délivrée par la pile (sans changer la résistance),
            qu&apos;arrive-t-il à l&apos;intensité I mesurée par l&apos;ampèremètre ?
          </p>
          <div className="space-y-2">
            {(
              [
                { key: 'augmente', label: 'I augmente aussi' },
                { key: 'diminue', label: 'I diminue' },
                { key: 'identique', label: 'I reste identique' },
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
                <Zap className="h-5 w-5 text-science-700" />
                Étape 2 — Expérience
              </CardTitle>
              <Badge tone="science">2/3</Badge>
            </CardHeader>
            <p className="mb-3 text-sm text-ink/70">
              Règle la tension U avec le curseur. Lis l&apos;intensité sur l&apos;ampèremètre,
              puis enregistre chaque ligne du tableau.
            </p>
            <CircuitDiagram voltage={sliderU} current={currentForSlider} resistance={R_REEL} />

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sliderU" className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-science-700" />
                  Tension U
                </Label>
                <span className="font-mono text-sm font-semibold text-ink">{sliderU} V</span>
              </div>
              <input
                id="sliderU"
                type="range"
                min={1}
                max={12}
                step={1}
                value={sliderU}
                onChange={(e) => setSliderU(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tableau de mesures</CardTitle>
              <Badge tone={allMeasured ? 'action' : 'neutral'}>
                {measuredCount}/{MIN_MEASUREMENTS}
              </Badge>
            </CardHeader>
            <div className="overflow-hidden rounded-xl ring-1 ring-ink/5">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-ink/60">
                    <th className="px-4 py-2 font-medium">U (V)</th>
                    <th className="px-4 py-2 font-medium">I (mA)</th>
                    <th className="px-4 py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m, idx) => (
                    <tr key={m.u} className="border-t border-ink/5">
                      <td className="px-4 py-3 font-mono font-semibold text-ink">{m.u}</td>
                      <td className="px-4 py-3 font-mono">
                        {m.i !== null ? (
                          <Badge tone="science">{(m.i * 1000).toFixed(0)} mA</Badge>
                        ) : (
                          <span className="text-ink/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {sliderU === m.u ? (
                          <Button size="sm" variant="gradient" onClick={() => recordMeasurement(idx)}>
                            <Save className="h-4 w-4" />
                            Mesurer
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setSliderU(m.u)}>
                            Régler à {m.u} V
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
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
            <CardTitle>Étape 3 — Analyse</CardTitle>
            <Badge tone="science">3/3</Badge>
          </CardHeader>
          <p className="mb-4 text-ink/80">
            Tu remarques que I croît proportionnellement à U. C&apos;est la loi d&apos;Ohm :{' '}
            <strong>U = R · I</strong>. Calcule R à partir de tes mesures (ex :{' '}
            <span className="font-mono">U / I</span> pour une ligne) et saisis la valeur en
            ohms.
          </p>

          <div className="space-y-2">
            <Label htmlFor="guessedR">Valeur de R (Ω)</Label>
            <Input
              id="guessedR"
              inputMode="decimal"
              value={guessedR}
              onChange={(e) => setGuessedR(e.target.value)}
              placeholder="ex : 20"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('experience')}>
              Revoir mes mesures
            </Button>
            <Button variant="success" disabled={!validGuess || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-physique">
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
