'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Sigma, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormulaInput, parseFormula } from '@/components/lab/formula-input';
import { MathPlot, type PlotCurve, type PlotPoint } from '@/components/lab/math-plot';

/**
 * TP — Fonctions affines, tarif Senelec (3ème, Maths)
 *
 * Démarche : l'élève joue librement avec une formule y = ax + b dans un éditeur
 * + grapheur en split-view, puis résout deux mini-problèmes basés sur la facture
 * d'électricité Senelec (abonnement mensuel + conso × prix kWh).
 */

type Step = 'intro' | 'sandbox' | 'enigme' | 'application' | 'done';

// Énigme : M. Diop a payé 5500 F pour 50 kWh, et 9000 F pour 120 kWh.
// → b (abonnement) = 3000, a (prix kWh) = 50 → y = 50x + 3000
const ENIG_X1 = 50;
const ENIG_Y1 = 5500;
const ENIG_X2 = 120;
const ENIG_Y2 = 9000;
const ENIG_A_TRUE = (ENIG_Y2 - ENIG_Y1) / (ENIG_X2 - ENIG_X1); // 50
const ENIG_B_TRUE = ENIG_Y1 - ENIG_A_TRUE * ENIG_X1; // 3000

const APP_X = 250;
const APP_Y_TRUE = ENIG_A_TRUE * APP_X + ENIG_B_TRUE; // 15500

const SANDBOX_COLORS = ['#7C3AED', '#0EA5E9', '#F59E0B'];

type SandboxSlot = { expr: string };

export function FonctionsAffines3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  // Sandbox libre
  const [slots, setSlots] = useState<SandboxSlot[]>([
    { expr: '50*x + 3000' },
    { expr: '' },
    { expr: '' },
  ]);
  const distinctTried = useMemo(() => {
    const set = new Set<string>();
    slots.forEach((s) => {
      const r = parseFormula(s.expr);
      if (r.fn) set.add(s.expr.trim());
    });
    return set.size;
  }, [slots]);

  // Énigme
  const [enigExpr, setEnigExpr] = useState('');
  const enigParsed = useMemo(() => parseFormula(enigExpr), [enigExpr]);
  const enigErr = useMemo(() => {
    if (!enigParsed.fn) return null;
    try {
      const e1 = Math.abs(enigParsed.fn(ENIG_X1) - ENIG_Y1) / ENIG_Y1;
      const e2 = Math.abs(enigParsed.fn(ENIG_X2) - ENIG_Y2) / ENIG_Y2;
      return Math.max(e1, e2);
    } catch {
      return null;
    }
  }, [enigParsed]);

  // Application
  const [appAnswer, setAppAnswer] = useState('');
  const appAnswerNum = Number(appAnswer.replace(',', '.'));
  const appValid = !Number.isNaN(appAnswerNum) && appAnswerNum > 0;
  const appErr = appValid ? Math.abs(appAnswerNum - APP_Y_TRUE) / APP_Y_TRUE : 1;

  const score = useMemo(() => {
    let s = 0;
    if (distinctTried >= 3) s += 15;
    else if (distinctTried >= 2) s += 8;
    if (enigErr !== null) {
      if (enigErr < 0.005) s += 50;
      else if (enigErr < 0.05) s += 35;
      else if (enigErr < 0.15) s += 18;
    }
    if (appValid) {
      if (appErr < 0.005) s += 35;
      else if (appErr < 0.05) s += 22;
      else if (appErr < 0.15) s += 10;
    }
    return Math.max(0, Math.min(100, s));
  }, [distinctTried, enigErr, appValid, appErr]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'fonctions-affines-3eme',
        version: '1.0',
        steps: {
          sandbox: {
            triedCount: distinctTried,
            formulas: slots.map((s) => s.expr).filter(Boolean),
          },
          enigme: {
            input: enigExpr,
            relativeError: enigErr,
            target: { a: ENIG_A_TRUE, b: ENIG_B_TRUE },
            points: [
              { x: ENIG_X1, y: ENIG_Y1 },
              { x: ENIG_X2, y: ENIG_Y2 },
            ],
          },
          application: {
            x: APP_X,
            answer: appValid ? appAnswerNum : null,
            target: APP_Y_TRUE,
          },
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
                <Zap className="h-5 w-5" />
              </span>
              Tarif Senelec — Contexte
            </CardTitle>
            <Badge tone="maths">Maths · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Quand ta famille reçoit la facture <strong>Senelec</strong>, elle paye deux choses :
              un <strong>abonnement mensuel</strong> fixe et la <strong>consommation</strong> en
              kilowattheures (kWh).
            </p>
            <p>
              Si on note <span className="font-mono">x</span> le nombre de kWh consommés et{' '}
              <span className="font-mono">y</span> le montant total, alors :
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-center font-mono text-base font-semibold text-violet-700 ring-1 ring-violet-100">
              y = a · x + b
            </p>
            <p className="text-sm text-ink/70">
              <strong>a</strong> = prix d&apos;un kWh (en F CFA) · <strong>b</strong> = abonnement
              fixe. C&apos;est une <strong>fonction affine</strong>. Tu vas l&apos;explorer dans un
              vrai labo math.
            </p>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('sandbox')}>
              Ouvrir le labo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'sandbox' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sigma className="h-5 w-5 text-violet-700" />
              Étape 1 — Labo libre
            </CardTitle>
            <Badge tone="science">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Saisis tes formules à gauche, observe le graphe à droite. Essaie au moins{' '}
            <strong>3 formules différentes</strong> pour comprendre le rôle de <em>a</em> (la
            pente) et <em>b</em> (l&apos;ordonnée à l&apos;origine).
          </p>

          <div className="grid gap-4 lg:grid-cols-[minmax(260px,2fr)_3fr]">
            <div className="space-y-3">
              {slots.map((slot, i) => (
                <FormulaInput
                  key={i}
                  value={slot.expr}
                  onChange={(v) =>
                    setSlots((prev) => prev.map((s, j) => (i === j ? { expr: v } : s)))
                  }
                  label={`Formule ${i + 1}`}
                  placeholder={i === 0 ? '50*x + 3000' : 'ex : 75*x + 5000'}
                  helpText={i === 0 ? 'Tarif Senelec exemple : 50 F/kWh + 3000 F d’abonnement' : undefined}
                />
              ))}
              <div className="rounded-xl bg-violet-50 p-3 text-xs text-ink/70 ring-1 ring-violet-100">
                <strong>Astuce :</strong> tu peux écrire <code className="font-mono">2x+1</code>,{' '}
                <code className="font-mono">-0.5*x + 4</code>, ou utiliser{' '}
                <code className="font-mono">x^2</code>, <code className="font-mono">sin(x)</code>{' '}
                (pour plus tard).
              </div>
              <div className="flex items-center justify-between text-xs text-ink/60">
                <span>Formules valides essayées : {distinctTried}</span>
                <Badge tone={distinctTried >= 3 ? 'action' : 'neutral'} size="sm">
                  {distinctTried >= 3 ? 'Bravo, prêt' : `Encore ${Math.max(0, 3 - distinctTried)}`}
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-science-50 p-3 ring-1 ring-violet-100">
              <MathPlot
                xMin={0}
                xMax={300}
                yMin={0}
                yMax={20000}
                xLabel="kWh"
                yLabel="F CFA"
                step={3}
                curves={slots
                  .map((s, i) => ({ s, i }))
                  .map(({ s, i }) => {
                    const r = parseFormula(s.expr);
                    return r.fn
                      ? ({
                          fn: r.fn,
                          color: SANDBOX_COLORS[i],
                          label: `Formule ${i + 1}`,
                        } as PlotCurve)
                      : null;
                  })
                  .filter((c): c is PlotCurve => c !== null)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={distinctTried < 2} onClick={() => setStep('enigme')}>
              Passer à l’énigme
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'enigme' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — L’énigme de M. Diop</CardTitle>
            <Badge tone="science">2/3</Badge>
          </CardHeader>
          <div className="mb-3 rounded-xl bg-violet-50 p-3 text-sm text-ink/80 ring-1 ring-violet-100">
            <strong>M. Diop</strong> habite à Pikine. Il observe deux factures Senelec :
            <ul className="mt-1.5 list-disc pl-5">
              <li>
                pour <strong>{ENIG_X1} kWh</strong>, il paye <strong>{ENIG_Y1} F CFA</strong>
              </li>
              <li>
                pour <strong>{ENIG_X2} kWh</strong>, il paye <strong>{ENIG_Y2} F CFA</strong>
              </li>
            </ul>
            <p className="mt-2">Trouve la formule de sa facture en fonction des kWh consommés.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(260px,2fr)_3fr]">
            <div className="space-y-3">
              <FormulaInput
                value={enigExpr}
                onChange={setEnigExpr}
                label="Ta formule"
                placeholder="ex : 60*x + 2000"
              />
              {enigParsed.fn && enigErr !== null && (
                <div
                  className={
                    'rounded-xl p-3 text-xs ring-1 ' +
                    (enigErr < 0.005
                      ? 'bg-action-50 text-action-700 ring-action-100'
                      : enigErr < 0.05
                        ? 'bg-violet-50 text-violet-700 ring-violet-100'
                        : 'bg-alert-50 text-alert-700 ring-alert-100')
                  }
                >
                  Au point ({ENIG_X1}, {ENIG_Y1}) ta formule donne{' '}
                  <strong>{Math.round(enigParsed.fn(ENIG_X1))}</strong> F CFA.
                  <br />
                  Au point ({ENIG_X2}, {ENIG_Y2}) elle donne{' '}
                  <strong>{Math.round(enigParsed.fn(ENIG_X2))}</strong> F CFA.
                  <br />
                  Erreur max : <strong>{(enigErr * 100).toFixed(1)} %</strong>
                  {enigErr < 0.005 && ' — parfait !'}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-science-50 p-3 ring-1 ring-violet-100">
              <MathPlot
                xMin={0}
                xMax={150}
                yMin={0}
                yMax={12000}
                xLabel="kWh"
                yLabel="F CFA"
                step={1.5}
                curves={
                  enigParsed.fn
                    ? [{ fn: enigParsed.fn, color: '#7C3AED', label: 'Ta formule' }]
                    : []
                }
                points={[
                  { x: ENIG_X1, y: ENIG_Y1, color: '#059669', label: `(${ENIG_X1}, ${ENIG_Y1})` },
                  { x: ENIG_X2, y: ENIG_Y2, color: '#059669', label: `(${ENIG_X2}, ${ENIG_Y2})` },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('sandbox')}>
              Revoir le labo
            </Button>
            <Button
              variant="gradient"
              disabled={enigErr === null || enigErr > 0.5}
              onClick={() => setStep('application')}
            >
              Appliquer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'application' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Calcule la facture</CardTitle>
            <Badge tone="science">3/3</Badge>
          </CardHeader>
          <p className="mb-4 text-ink/80">
            Tu viens de trouver le tarif de M. Diop. Selon ta formule (ou la vraie formule{' '}
            <span className="font-mono">y = {ENIG_A_TRUE}·x + {ENIG_B_TRUE}</span>), combien
            paiera-t-il pour <strong>{APP_X} kWh</strong> ?
          </p>

          <div className="space-y-2">
            <Label htmlFor="appAns">Montant en F CFA</Label>
            <Input
              id="appAns"
              inputMode="decimal"
              value={appAnswer}
              onChange={(e) => setAppAnswer(e.target.value)}
              placeholder={`ex : ${APP_Y_TRUE}`}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('enigme')}>
              Revoir l’énigme
            </Button>
            <Button
              variant="success"
              disabled={!appValid || busy}
              onClick={handleValidate}
            >
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
          <p className="text-ink/70">
            Ton travail est enregistré. La vraie formule était{' '}
            <span className="font-mono">y = {ENIG_A_TRUE}·x + {ENIG_B_TRUE}</span>, soit{' '}
            <strong>{APP_Y_TRUE} F CFA</strong> pour {APP_X} kWh. Tu retrouves ton score et tes
            badges sur le tableau de bord.
          </p>
        </Card>
      )}
    </div>
  );
}
