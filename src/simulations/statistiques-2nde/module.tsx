'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BarChart3, CheckCircle2, Coins, Gauge, Sigma, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Indicateurs de position et de dispersion (Maths, Seconde).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures →
 * QCM → bilan. L'élève déplace le revenu du « patron » (valeur extrême) et
 * observe que la MOYENNE bondit alors que la MÉDIANE reste stable.
 * Contexte : revenus mensuels d'un atelier de couture à Pikine.
 */

const StatsScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'moyenne' | 'mediane' | 'aucune' | null;

/** Revenus mensuels des 7 employés de l'atelier (milliers de FCFA). La 8e barre est le patron (extrême). */
const EMPLOYES = [85, 90, 95, 100, 110, 115, 120];

const INTRO =
  "Dans un atelier de couture à Pikine, sept tailleurs gagnent à peu près le même salaire chaque mois. " +
  "Puis le patron ajoute son revenu, bien plus élevé, à la liste. " +
  "On veut un seul nombre qui résume « le salaire typique » de l'atelier. " +
  "La moyenne et la médiane donnent-elles la même réponse ? Tu vas le découvrir.";

const CONCLUSION =
  "La moyenne additionne tout et divise par l'effectif : une seule valeur très grande la tire vers le haut. " +
  "La médiane, elle, est la valeur du milieu de la série triée : elle ignore l'ampleur des extrêmes, donc elle résiste. " +
  "L'étendue, max moins min, mesure l'écart total. Pour des revenus très inégaux, la médiane décrit mieux le salaire typique.";

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const range = sorted[n - 1] - sorted[0];
  return { mean, median, range };
}

export function Statistiques2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [patron, setPatron] = useState(130); // revenu du patron, en milliers de FCFA
  const [patronsTried, setPatronsTried] = useState<Set<number>>(new Set([130]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qMediane, setQMediane] = useState<string | null>(null);
  const [qSensible, setQSensible] = useState<string | null>(null);
  const [qEtendue, setQEtendue] = useState<string | null>(null);

  const series = useMemo(() => [...EMPLOYES, patron], [patron]);
  const cur = useMemo(() => stats(series), [series]);
  // Repère pour mesurer l'exploration : amplitude des positions extrêmes testées.
  const spread = useMemo(() => {
    const arr = Array.from(patronsTried);
    return Math.max(...arr) - Math.min(...arr);
  }, [patronsTried]);

  function recordMeasure() {
    setPatronsTried((prev) => new Set(prev).add(patron));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(15, patronsTried.size * 5); // a manipulé plusieurs valeurs
    if (spread >= 120) s += 15; // a vraiment poussé la valeur extrême
    if (hypo === 'moyenne') s += 10;
    if (qMediane === 'deux') s += 20;
    if (qSensible === 'moyenne') s += 20;
    if (qEtendue === 'maxmin') s += 20;
    return Math.min(100, s);
  }, [patronsTried, spread, hypo, qMediane, qSensible, qEtendue]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'statistiques-2nde',
        version: '2.0',
        steps: {
          employes: EMPLOYES,
          patronsTried: Array.from(patronsTried),
          finalStats: { mean: Number(cur.mean.toFixed(2)), median: cur.median, range: cur.range },
          hypothesis: hypo,
          qcm: { qMediane, qSensible, qEtendue },
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
                <Coins className="h-5 w-5" />
              </span>
              Les salaires de l&apos;atelier
            </CardTitle>
            <Badge tone="maths">Maths · Seconde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans un atelier de couture à <strong>Pikine</strong>, sept tailleurs gagnent presque le même salaire. Puis
              on ajoute le revenu du <strong>patron</strong>, bien plus élevé.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> comparer la <strong>moyenne</strong> et la <strong>médiane</strong> et voir
              laquelle résiste à une valeur très grande.
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
            Avant de manipuler : si le patron gagne énormément, quel indicateur va le plus <strong>augmenter</strong> ?
          </p>
          <QcmStep
            label="Mon hypothèse : la valeur très grande fait surtout grimper…"
            tone="violet"
            options={[
              { key: 'moyenne', label: 'La moyenne' },
              { key: 'mediane', label: 'La médiane' },
              { key: 'aucune', label: 'Ni l’une ni l’autre' },
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
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Déplace la valeur extrême
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            La barre <span className="font-semibold text-amber-600">orange</span> est le revenu du patron. Fais-le varier
            et regarde le repère <span className="font-semibold text-red-600">rouge</span> (moyenne) et le repère{' '}
            <span className="font-semibold text-emerald-600">vert</span> (médiane). Tourne la scène avec ta souris ou ton
            doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <StatsScene values={series} mean={cur.mean} median={cur.median} extremeIndex={series.length - 1} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="patron">Revenu du patron</Label>
              <span className="font-mono text-violet-700">{patron} k FCFA</span>
            </div>
            <input
              id="patron"
              type="range"
              min={90}
              max={400}
              step={10}
              value={patron}
              onChange={(e) => setPatron(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Moyenne" value={`${cur.mean.toFixed(1)} k`} />
            <Stat label="Médiane" value={`${cur.median} k`} />
            <Stat label="Étendue" value={`${cur.range} k`} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordMeasure}>
              <Sigma className="h-4 w-4" /> Noter cet essai
            </Button>
            <Button variant="gradient" disabled={patronsTried.size < 3} onClick={() => setStep('mesures')}>
              {patronsTried.size < 3 ? `Note ${3 - patronsTried.size} essai(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
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
            Pour chaque revenu du patron que tu as noté, compare la moyenne et la médiane. Repère qui bouge… et qui
            reste presque fixe.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Patron</th>
                  <th className="px-4 py-2 text-left">Moyenne</th>
                  <th className="px-4 py-2 text-left">Médiane</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(patronsTried)
                  .sort((a, b) => a - b)
                  .map((p) => {
                    const st = stats([...EMPLOYES, p]);
                    return (
                      <tr key={p} className="border-t border-night-100">
                        <td className="px-4 py-2">{p} k</td>
                        <td className="px-4 py-2 font-semibold text-red-600">{st.mean.toFixed(1)} k</td>
                        <td className="px-4 py-2 font-semibold text-emerald-600">{st.median} k</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-violet-900 ring-1 ring-violet-100">
            La colonne rouge (moyenne) varie beaucoup, la colonne verte (médiane) reste quasi constante : la médiane est{' '}
            <strong>robuste</strong> aux valeurs extrêmes.
          </p>
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
              label="La médiane partage la série en…"
              tone="violet"
              options={[
                { key: 'deux', label: 'Deux groupes de même effectif' },
                { key: 'somme', label: 'Deux groupes de même somme' },
                { key: 'trois', label: 'Trois groupes égaux' },
              ]}
              value={qMediane}
              onChange={setQMediane}
            />
            <QcmStep
              label="L'indicateur le plus sensible à une valeur très grande est…"
              tone="violet"
              options={[
                { key: 'moyenne', label: 'La moyenne' },
                { key: 'mediane', label: 'La médiane' },
                { key: 'egal', label: 'Les deux autant' },
              ]}
              value={qSensible}
              onChange={setQSensible}
            />
            <QcmStep
              label="L'étendue est égale à…"
              tone="violet"
              options={[
                { key: 'maxmin', label: 'La plus grande valeur moins la plus petite' },
                { key: 'somme', label: 'La somme des valeurs' },
                { key: 'milieu', label: 'La valeur du milieu' },
              ]}
              value={qEtendue}
              onChange={setQEtendue}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qMediane || !qSensible || !qEtendue || busy} onClick={handleValidate}>
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
              La <strong>moyenne</strong> (somme ÷ effectif) est <strong>sensible</strong> aux valeurs extrêmes ; la{' '}
              <strong>médiane</strong> (valeur du milieu) les <strong>résiste</strong>. L&apos;<strong>étendue</strong> =
              max − min mesure la dispersion. Pour des revenus très inégaux, la médiane décrit mieux le salaire typique.
            </p>
            <div className="flex items-center gap-2 text-xs text-ink/60">
              <BarChart3 className="h-4 w-4 text-violet-700" /> Score = exploration (jusqu&apos;à 30) + QCM (jusqu&apos;à
              70).
            </div>
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
