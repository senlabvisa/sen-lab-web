'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BarChart3, CheckCircle2, CloudRain, Minus, Plus, Sigma, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Statistiques : effectifs, fréquences, diagramme en barres, moyenne (4ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (diagramme en barres
 * éditable) → lecture des mesures → QCM → bilan. Contexte sénégalais : relevés
 * de pluie (mm) par mois à Dakar. Science juste : fréquence = effectif/total,
 * moyenne pondérée = Σ(valeur×effectif)/total.
 */

const HistoScene = dynamic(() => import('./histo-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'aout' | 'reparti' | 'janvier' | null;

// Pluviométrie moyenne à Dakar (mm) — saison des pluies (hivernage) Juin→Octobre.
const MONTHS = ['Juin', 'Juil', 'Août', 'Sep', 'Oct'];
const INIT: number[] = [15, 90, 250, 160, 40];

const INTRO =
  "À Dakar, presque toute la pluie tombe pendant l'hivernage, de juin à octobre. " +
  "Un relevé donne, pour chaque mois, une hauteur de pluie en millimètres : ce sont les effectifs de notre série statistique. " +
  "En les rangeant dans un diagramme en barres, on lit d'un coup d'œil le mois le plus pluvieux, puis on calcule la moyenne du trimestre.";

const CONCLUSION =
  "Bravo ! L'effectif, c'est le nombre relevé pour une valeur. La fréquence, c'est l'effectif divisé par l'effectif total : la somme de toutes les fréquences vaut 1 (ou 100 %). " +
  "Et la moyenne pondérée, c'est la somme des valeurs multipliées par leurs effectifs, divisée par l'effectif total. À Dakar, c'est en août qu'il pleut le plus.";

function stats(data: number[]) {
  const total = data.reduce((a, b) => a + b, 0);
  const mean = total / data.length; // moyenne des relevés mensuels (mm/mois)
  // moyenne « pondérée » sur l'échelle des mois (mois 1..N pondérés par la pluie)
  const weighted =
    total > 0 ? data.reduce((acc, v, i) => acc + (i + 1) * v, 0) / total : 0;
  const maxIdx = data.indexOf(Math.max(...data));
  return { total, mean, weighted, maxIdx };
}

export function Statistiques4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [data, setData] = useState<number[]>(INIT);
  const [sel, setSel] = useState<number | null>(null);
  const [edits, setEdits] = useState(0); // compteur d'exploration

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qFreq, setQFreq] = useState<string | null>(null);
  const [qSomme, setQSomme] = useState<string | null>(null);
  const [qMoy, setQMoy] = useState<string | null>(null);

  const { total, mean, weighted, maxIdx } = useMemo(() => stats(data), [data]);

  function setVal(i: number, v: number) {
    setData((prev) => {
      const next = [...prev];
      next[i] = Math.max(0, Math.min(300, v));
      return next;
    });
    setSel(i);
    setEdits((n) => n + 1);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, edits * 5); // exploration : avoir modifié les effectifs
    if (sel !== null) s += 5; // avoir lu une catégorie
    if (hypo === 'aout') s += 10;
    if (qFreq === 'eff_total') s += 20;
    if (qSomme === 'un') s += 20;
    if (qMoy === 'pondere') s += 20;
    return Math.min(100, s);
  }, [edits, sel, hypo, qFreq, qSomme, qMoy]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'statistiques-4eme',
        version: '2.0',
        steps: {
          months: MONTHS,
          effectifs: data,
          total,
          moyenneMensuelle: mean,
          moisLePlusPluvieux: MONTHS[maxIdx],
          hypothesis: hypo,
          qcm: { qFreq, qSomme, qMoy },
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
                <CloudRain className="h-5 w-5" />
              </span>
              La pluie de l&apos;hivernage à Dakar
            </CardTitle>
            <Badge tone="maths">Mathématiques · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À <strong>Dakar</strong>, la pluie tombe surtout pendant l&apos;<strong>hivernage</strong> (de juin à
              octobre). Pour chaque mois, on relève une hauteur de pluie en <strong>millimètres (mm)</strong> : ce sont
              les <strong>effectifs</strong> de notre série.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> dresser le diagramme en barres, comprendre <strong>effectif</strong> et{' '}
              <strong>fréquence</strong>, puis calculer la <strong>moyenne</strong>.
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
            Avant de tracer le diagramme : selon toi, à Dakar, <strong>quand</strong> pleut-il le plus ?
          </p>
          <QcmStep
            label="Mon hypothèse : le mois le plus pluvieux est…"
            tone="violet"
            options={[
              { key: 'aout', label: 'En août (cœur de l’hivernage)' },
              { key: 'reparti', label: 'La pluie est répartie également sur l’année' },
              { key: 'janvier', label: 'En janvier (saison sèche)' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Construire le diagramme <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-700" /> Étape 2 — Le diagramme en barres
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Chaque barre est un mois ; sa hauteur est l&apos;effectif (mm de pluie). Modifie un relevé : la{' '}
            <strong>moyenne</strong> (ligne bleue) se recalcule. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <HistoScene data={data} labels={MONTHS} mean={mean} unit=" mm" selected={sel} onSelect={setSel} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.map((v, i) => {
              const freq = total > 0 ? (v / total) * 100 : 0;
              return (
                <div key={i} className="rounded-xl bg-violet-50/60 p-2 ring-1 ring-violet-100">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <Label htmlFor={`m${i}`}>{MONTHS[i]}</Label>
                    <span className="font-mono text-violet-700">
                      {v} mm · {freq.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="soft" size="sm" onClick={() => setVal(i, v - 10)} aria-label={`Diminuer ${MONTHS[i]}`}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <input
                      id={`m${i}`}
                      type="range"
                      min={0}
                      max={300}
                      step={5}
                      value={v}
                      onChange={(e) => setVal(i, Number(e.target.value))}
                      className="slider-lab w-full"
                    />
                    <Button variant="soft" size="sm" onClick={() => setVal(i, v + 10)} aria-label={`Augmenter ${MONTHS[i]}`}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Effectif total" value={`${total} mm`} />
            <Stat label="Moyenne / mois" value={`${mean.toFixed(1)} mm`} />
            <Stat label="Mois le + pluvieux" value={MONTHS[maxIdx]} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-ink/50">
              {edits === 0 ? 'Modifie au moins un relevé pour explorer.' : `${edits} modification(s) effectuée(s)`}
            </p>
            <Button variant="gradient" disabled={edits < 1} onClick={() => setStep('mesures')}>
              {edits < 1 ? 'Explore le diagramme' : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sigma className="h-5 w-5 text-violet-700" /> Étape 3 — Effectifs et fréquences
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour chaque mois : <strong>fréquence = effectif ÷ effectif total</strong> (en %). La somme des fréquences
            vaut <strong>100 %</strong>. La moyenne mensuelle est {total} ÷ {MONTHS.length} = {mean.toFixed(1)} mm.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Mois</th>
                  <th className="px-4 py-2 text-left">Effectif (mm)</th>
                  <th className="px-4 py-2 text-left">Fréquence</th>
                </tr>
              </thead>
              <tbody>
                {data.map((v, i) => {
                  const freq = total > 0 ? (v / total) * 100 : 0;
                  const isBest = i === maxIdx;
                  return (
                    <tr key={i} className={'border-t border-violet-100 ' + (isBest ? 'bg-emerald-50 font-semibold' : '')}>
                      <td className="px-4 py-2">{MONTHS[i]}</td>
                      <td className="px-4 py-2">
                        {v} mm {isBest ? '🌧️' : ''}
                      </td>
                      <td className="px-4 py-2">{freq.toFixed(1)} %</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-violet-200 bg-violet-50/70 font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2">{total} mm</td>
                  <td className="px-4 py-2">100 %</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retoucher
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
              label="La fréquence d'une valeur est :"
              tone="violet"
              options={[
                { key: 'eff_total', label: 'Son effectif divisé par l’effectif total' },
                { key: 'eff_seul', label: 'Son effectif tout seul' },
                { key: 'total_eff', label: 'L’effectif total divisé par son effectif' },
              ]}
              value={qFreq}
              onChange={setQFreq}
            />
            <QcmStep
              label="La somme de toutes les fréquences vaut :"
              tone="violet"
              options={[
                { key: 'un', label: '1 (soit 100 %)' },
                { key: 'total', label: 'L’effectif total' },
                { key: 'zero', label: '0' },
              ]}
              value={qSomme}
              onChange={setQSomme}
            />
            <QcmStep
              label="La moyenne pondérée se calcule par :"
              tone="violet"
              options={[
                { key: 'pondere', label: 'somme(valeur × effectif) ÷ effectif total' },
                { key: 'simple', label: 'somme des valeurs ÷ nombre de valeurs distinctes' },
                { key: 'max', label: 'la plus grande valeur de la série' },
              ]}
              value={qMoy}
              onChange={setQMoy}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qFreq || !qSomme || !qMoy || busy} onClick={handleValidate}>
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
              L&apos;<strong>effectif</strong> est le nombre relevé pour une valeur ; la <strong>fréquence</strong> est
              l&apos;effectif ÷ l&apos;effectif total (la somme des fréquences fait <strong>1</strong>). La{' '}
              <strong>moyenne pondérée</strong> = Σ(valeur × effectif) ÷ effectif total. À Dakar, le pic de pluie est en{' '}
              <strong>août</strong>. (Repère « moyenne sur les mois » ≈ {weighted.toFixed(1)}.)
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
