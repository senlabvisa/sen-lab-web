'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BarChart3, CheckCircle2, Dices, Grid2x2, Sprout, Table2, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { Geno, MendelView } from './punnett-scene';

/**
 * TP — Lois de Mendel : croisement monohybride (SVT, 3ème).
 *
 * Contexte : la sélection variétale du niébé (haricot cornille) à l'ISRA de
 * Bambey. Un seul gène, deux allèles : N (tégument noir, dominant) et
 * n (tégument blanc, récessif). Modèle monohybride classique, dominance
 * complète.
 *
 *   P  : NN × nn        → F1 : 100 % Nn, toutes les graines sont noires
 *   F1 × F1 : Nn × Nn   → F2 : 1/4 NN + 2/4 Nn + 1/4 nn
 *                              soit 3/4 de graines noires, 1/4 de blanches
 *   test : Nn × nn      → 1/2 Nn + 1/2 nn (le croisement-test des sélectionneurs)
 *
 * Flow Lab Premium : intro → hypothèse → manip 3D (échiquier de Punnett
 * rempli case par case + histogramme observé/attendu sur N croisements) →
 * mesures (tableau de comptage) → QCM → bilan.
 *
 * Les tirages au hasard sont faits ICI (dans un gestionnaire d'événement),
 * jamais au rendu de la scène : la scène reste déterministe.
 */

const PunnettScene = dynamic(() => import('./punnett-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de l&apos;échiquier de Punnett…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type CrossKey = 'P' | 'F1' | 'TEST';
type HypoRep = 'noires' | 'blanches' | 'moitie' | 'grises' | null;
type Counts = Record<Geno, number>;

const ZERO: Counts = { NN: 0, Nn: 0, nn: 0 };

const CROSSES: { key: CrossKey; p1: Geno; p2: Geno; label: string; sublabel: string; short: string }[] = [
  {
    key: 'P',
    p1: 'NN',
    p2: 'nn',
    label: 'NN × nn',
    sublabel: 'génération P : deux lignées pures',
    short: 'P : NN × nn',
  },
  {
    key: 'F1',
    p1: 'Nn',
    p2: 'Nn',
    label: 'Nn × Nn',
    sublabel: 'F1 × F1 → la génération F2',
    short: 'F1 × F1 : Nn × Nn',
  },
  {
    key: 'TEST',
    p1: 'Nn',
    p2: 'nn',
    label: 'Nn × nn',
    sublabel: 'croisement-test du sélectionneur',
    short: 'Test : Nn × nn',
  },
];

/** Les deux gamètes possibles d'un génotype (un allèle par gamète). */
function gametes(g: Geno): string[] {
  return [g[0], g[1]];
}

/** Réunion de deux allèles en un génotype écrit dominant d'abord. */
function combine(a: string, b: string): Geno {
  if (a === 'N' && b === 'N') return 'NN';
  if (a === 'n' && b === 'n') return 'nn';
  return 'Nn';
}

/** Les 4 cases de l'échiquier, ligne par ligne. */
function punnett(p1: Geno, p2: Geno): Geno[] {
  const g1 = gametes(p1);
  const g2 = gametes(p2);
  const out: Geno[] = [];
  for (const b of g2) for (const a of g1) out.push(combine(a, b));
  return out;
}

/** Fractions théoriques déduites de l'échiquier (chaque case vaut 1/4). */
function expectedOf(cells: Geno[]): Counts {
  const e: Counts = { NN: 0, Nn: 0, nn: 0 };
  for (const c of cells) e[c] += 0.25;
  return e;
}

const INTRO =
  "À l'ISRA de Bambey, les sélectionneurs cherchent à créer de meilleures variétés de niébé, le haricot cornille " +
  "que l'on cultive partout dans le bassin arachidier. Ils croisent deux lignées pures : l'une donne toujours des graines " +
  "à tégument noir, l'autre toujours des graines blanches. Surprise : à la première génération, tous les plants donnent " +
  "des graines noires. Le blanc a-t-il disparu ? Non : il réapparaît à la génération suivante, chez un quart des graines. " +
  "Gregor Mendel a expliqué ce mystère il y a plus de cent cinquante ans. Aujourd'hui tu vas refaire ses croisements " +
  "avec l'échiquier de Punnett, puis vérifier ses proportions en simulant des centaines de croisements.";

const CONCLUSION =
  "Bravo ! Tu as retrouvé les lois de Mendel. Chaque plant possède deux allèles pour un caractère, et chaque gamète n'en " +
  "reçoit qu'un seul : c'est la loi de disjonction. Quand on croise deux lignées pures NN et nn, toute la F1 est " +
  "hétérozygote Nn et montre le caractère dominant : toutes les graines sont noires. En croisant deux plants de la F1, " +
  "l'échiquier de Punnett donne un quart NN, deux quarts Nn et un quart nn, soit trois quarts de graines noires et " +
  "un quart de graines blanches. L'allèle blanc n'avait pas disparu : il était masqué chez les hétérozygotes. " +
  "Attention aussi : deux graines noires peuvent avoir des génotypes différents, NN ou Nn. Le phénotype, ce qu'on voit, " +
  "ne suffit pas à connaître le génotype ; c'est pour cela que les sélectionneurs font un croisement-test. " +
  "Enfin, tes tirages l'ont montré : sur dix croisements les proportions sont fantaisistes, sur mille elles collent " +
  "aux trois quarts et un quart. Les lois de Mendel sont des lois statistiques. C'est le même raisonnement qui sert " +
  "aux éleveurs de moutons Ladoum quand ils prévoient la robe des agneaux.";

export function GenetiqueMendel3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [view, setView] = useState<MendelView>('echiquier');
  const [crossKey, setCrossKey] = useState<CrossKey>('P');
  const [revealed, setRevealed] = useState(0);
  const [counts, setCounts] = useState<Record<CrossKey, Counts>>({ P: ZERO, F1: ZERO, TEST: ZERO });

  const [crossesTried, setCrossesTried] = useState<Set<CrossKey>>(new Set<CrossKey>(['P']));
  const [gridsCompleted, setGridsCompleted] = useState<Set<CrossKey>>(new Set<CrossKey>());
  const [maxTotal, setMaxTotal] = useState(0);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qProportion, setQProportion] = useState<string | null>(null);
  const [qGenotype, setQGenotype] = useState<string | null>(null);
  const [qCache, setQCache] = useState<string | null>(null);

  const cross = CROSSES.find((c) => c.key === crossKey) ?? CROSSES[0];
  const cells = useMemo(() => punnett(cross.p1, cross.p2), [cross.p1, cross.p2]);
  const expected = useMemo(() => expectedOf(cells), [cells]);

  const observed = counts[crossKey];
  const total = observed.NN + observed.Nn + observed.nn;

  /** Croisement affiché dans le tableau de mesures : celui le plus tiré. */
  const bestKey = useMemo<CrossKey>(() => {
    let best: CrossKey = crossKey;
    let bestN = -1;
    for (const c of CROSSES) {
      const n = counts[c.key].NN + counts[c.key].Nn + counts[c.key].nn;
      if (n > bestN) {
        bestN = n;
        best = c.key;
      }
    }
    return best;
  }, [counts, crossKey]);

  function pickCross(k: CrossKey) {
    setCrossKey(k);
    setRevealed(0);
    setView('echiquier');
    setCrossesTried((prev) => new Set(prev).add(k));
  }

  function revealNext() {
    const next = Math.min(4, revealed + 1);
    setRevealed(next);
    if (next === 4) setGridsCompleted((prev) => new Set(prev).add(crossKey));
  }

  /** Tire n croisements au hasard : un gamète de chaque parent. */
  function draw(n: number) {
    const g1 = gametes(cross.p1);
    const g2 = gametes(cross.p2);
    const cur = counts[crossKey];
    const next: Counts = { NN: cur.NN, Nn: cur.Nn, nn: cur.nn };
    for (let i = 0; i < n; i++) {
      const a = g1[Math.random() < 0.5 ? 0 : 1];
      const b = g2[Math.random() < 0.5 ? 0 : 1];
      next[combine(a, b)] += 1;
    }
    const nTotal = next.NN + next.Nn + next.nn;
    setCounts((prev) => ({ ...prev, [crossKey]: next }));
    setMaxTotal((m) => Math.max(m, nTotal));
    setView('proportions');
  }

  function resetDraws() {
    setCounts((prev) => ({ ...prev, [crossKey]: ZERO }));
  }

  const explored = crossesTried.size >= 2 && gridsCompleted.size >= 1 && maxTotal >= 100;

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(18, crossesTried.size * 6); // croisements explorés
    s += Math.min(12, gridsCompleted.size * 6); // échiquiers remplis en entier
    if (maxTotal >= 100) s += 5;
    if (maxTotal >= 1000) s += 5; // exploration = 40 points
    if (hypo === 'noires') s += 10;
    if (qProportion === 'un-quart') s += 20;
    if (qGenotype === 'deux') s += 15;
    if (qCache === 'masque') s += 15;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [crossesTried, gridsCompleted, maxTotal, hypo, qProportion, qGenotype, qCache]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'genetique-mendel-3eme',
        version: '2.0',
        steps: {
          crossesTried: Array.from(crossesTried),
          gridsCompleted: Array.from(gridsCompleted),
          maxTotal,
          counts,
          croisementFinal: crossKey,
          hypothesis: hypo,
          qcm: { qProportion, qGenotype, qCache },
        },
      },
      score,
    );
    setStep('done');
  }

  const bestCross = CROSSES.find((c) => c.key === bestKey) ?? CROSSES[0];
  const bestCounts = counts[bestKey];
  const bestTotal = bestCounts.NN + bestCounts.Nn + bestCounts.nn;
  const bestExpected = expectedOf(punnett(bestCross.p1, bestCross.p2));

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Sprout className="h-5 w-5" />
              </span>
              Le niébé de Bambey
            </CardTitle>
            <Badge tone="svt">SVT · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À l&apos;<strong>ISRA de Bambey</strong>, on croise deux <strong>lignées pures</strong> de niébé : l&apos;une
              donne toujours des graines à tégument <strong>noir</strong>, l&apos;autre toujours des graines{' '}
              <strong>blanches</strong>. Un seul gène commande cette couleur, avec deux <strong>allèles</strong> :{' '}
              <strong>N</strong> (noir) et <strong>n</strong> (blanc).
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> construire l&apos;<strong>échiquier de Punnett</strong> de ces croisements, puis
              vérifier par simulation les proportions annoncées par Mendel.
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
              <Target className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            On croise une lignée pure à graines noires (<strong>NN</strong>) avec une lignée pure à graines blanches (
            <strong>nn</strong>). Selon toi, de quelle couleur seront les graines de la première génération (la{' '}
            <strong>F1</strong>) ?
          </p>
          <QcmStep
            label="Mon hypothèse : les graines de la F1 seront…"
            tone="action"
            options={[
              { key: 'noires', label: 'Toutes noires' },
              { key: 'blanches', label: 'Toutes blanches' },
              { key: 'moitie', label: 'La moitié noires, la moitié blanches' },
              { key: 'grises', label: 'Toutes grises : les deux couleurs se mélangent' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
            hint="Un allèle peut en masquer un autre : on dit qu'il est dominant."
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Ouvrir l&apos;échiquier <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid2x2 className="h-5 w-5 text-emerald-700" /> Étape 2 — Croise et compte
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un croisement, remplis les <strong>4 cases</strong> de l&apos;échiquier, puis lance des centaines de
            croisements au hasard pour comparer l&apos;<strong>observé</strong> et l&apos;<strong>attendu</strong>. Tourne
            la scène avec ta souris ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {CROSSES.map((c) => (
              <Button key={c.key} variant={crossKey === c.key ? 'gradient' : 'outline'} size="sm" onClick={() => pickCross(c.key)}>
                {c.short} {gridsCompleted.has(c.key) && crossKey !== c.key ? '✓' : ''}
              </Button>
            ))}
            <Badge tone={crossesTried.size >= 3 ? 'action' : 'neutral'} size="sm">
              {crossesTried.size}/3 croisements
            </Badge>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant={view === 'echiquier' ? 'soft' : 'ghost'} size="sm" onClick={() => setView('echiquier')}>
              <Grid2x2 className="h-4 w-4" /> Échiquier
            </Button>
            <Button variant={view === 'proportions' ? 'soft' : 'ghost'} size="sm" onClick={() => setView('proportions')}>
              <BarChart3 className="h-4 w-4" /> Proportions
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <PunnettScene
                view={view}
                label={cross.label}
                sublabel={cross.sublabel}
                p1={cross.p1}
                p2={cross.p2}
                gam1={gametes(cross.p1)}
                gam2={gametes(cross.p2)}
                cells={cells}
                revealed={revealed}
                expected={expected}
                observed={observed}
                total={total}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Remplir l&apos;échiquier
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="gradient" size="sm" disabled={revealed >= 4} onClick={revealNext}>
                  <Grid2x2 className="h-4 w-4" /> {revealed >= 4 ? 'Grille complète' : `Remplir la case ${revealed + 1}`}
                </Button>
                <Button variant="ghost" size="sm" disabled={revealed === 0} onClick={() => setRevealed(0)}>
                  Effacer
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-ink/50">
                Chaque case = un gamète du parent 1 + un gamète du parent 2.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Simuler des croisements
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="soft" size="sm" onClick={() => draw(20)}>
                  <Dices className="h-4 w-4" /> +20
                </Button>
                <Button variant="soft" size="sm" onClick={() => draw(200)}>
                  <Dices className="h-4 w-4" /> +200
                </Button>
                <Button variant="soft" size="sm" onClick={() => draw(1000)}>
                  <Dices className="h-4 w-4" /> +1000
                </Button>
                <Button variant="ghost" size="sm" disabled={total === 0} onClick={resetDraws}>
                  Remettre à zéro
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-ink/50">
                {total === 0
                  ? 'Aucun tirage pour ce croisement.'
                  : `${total} graine(s) tirée(s) — regarde les barres se rapprocher.`}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Attendu noires" value={`${Math.round((expected.NN + expected.Nn) * 100)} %`} />
            <Stat
              label="Observé noires"
              value={total > 0 ? `${(((observed.NN + observed.Nn) / total) * 100).toFixed(1)} %` : '—'}
            />
            <Stat label="Tirages max" value={`${maxTotal}`} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              Remplis une grille entière, teste 2 croisements et tire au moins 100 graines.
            </span>
            <Button variant="gradient" disabled={!explored} onClick={() => setStep('mesures')}>
              {explored ? 'Voir mon tableau' : 'Continue à explorer'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5 text-emerald-700" /> Étape 3 — Tes comptages
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Croisement <strong>{bestCross.short}</strong> — {bestTotal} graine(s) tirée(s). Compare la colonne{' '}
            <strong>attendu</strong> (l&apos;échiquier) et la colonne <strong>observé</strong> (le hasard).
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Génotype</th>
                  <th className="px-3 py-2 text-left">Phénotype</th>
                  <th className="px-3 py-2 text-left">Attendu</th>
                  <th className="px-3 py-2 text-left">Observé</th>
                </tr>
              </thead>
              <tbody>
                {(['NN', 'Nn', 'nn'] as Geno[]).map((g) => {
                  const obs = bestCounts[g];
                  const pct = bestTotal > 0 ? (obs / bestTotal) * 100 : 0;
                  return (
                    <tr key={g} className="border-t border-night-100">
                      <td className="px-3 py-2 font-mono font-semibold">{g}</td>
                      <td className="px-3 py-2">{g === 'nn' ? 'graine blanche' : 'graine noire'}</td>
                      <td className="px-3 py-2">{Math.round(bestExpected[g] * 100)} %</td>
                      <td className="px-3 py-2">
                        {obs} <span className="text-ink/50">({pct.toFixed(1)} %)</span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-night-100 bg-emerald-50/60 font-semibold">
                  <td className="px-3 py-2" colSpan={2}>
                    Phénotype « graine noire »
                  </td>
                  <td className="px-3 py-2">{Math.round((bestExpected.NN + bestExpected.Nn) * 100)} %</td>
                  <td className="px-3 py-2">
                    {bestTotal > 0 ? (((bestCounts.NN + bestCounts.Nn) / bestTotal) * 100).toFixed(1) : '0,0'} %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            Plus tu tires de graines, plus l&apos;observé colle à l&apos;attendu : les proportions de Mendel sont des{' '}
            <strong>lois statistiques</strong>, valables sur de grands effectifs.
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
            <Badge tone="svt">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="En croisant deux plants de la F1 (Nn × Nn), quelle part des graines est blanche ?"
              tone="action"
              options={[
                { key: 'un-quart', label: '1/4 (un quart)' },
                { key: 'un-demi', label: '1/2 (la moitié)' },
                { key: 'trois-quarts', label: '3/4 (trois quarts)' },
                { key: 'aucune', label: 'Aucune : le blanc a disparu' },
              ]}
              value={qProportion}
              onChange={setQProportion}
            />
            <QcmStep
              label="Un plant donne des graines noires. Quel est son génotype ?"
              tone="action"
              options={[
                { key: 'deux', label: 'NN ou Nn : on ne peut pas trancher sans croisement-test' },
                { key: 'nn-seul', label: 'Forcément NN' },
                { key: 'hn', label: 'Forcément Nn' },
              ]}
              value={qGenotype}
              onChange={setQGenotype}
              hint="Phénotype = ce que l'on voit. Génotype = les deux allèles portés."
            />
            <QcmStep
              label="Pourquoi la couleur blanche réapparaît-elle en F2 alors qu'aucune graine de F1 n'était blanche ?"
              tone="action"
              options={[
                { key: 'masque', label: "L'allèle n était présent chez les Nn, simplement masqué par N" },
                { key: 'mutation', label: 'Une nouvelle mutation a recréé le blanc en F2' },
                { key: 'melange', label: 'Le noir et le blanc se sont mélangés puis séparés' },
              ]}
              value={qCache}
              onChange={setQCache}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qProportion || !qGenotype || !qCache || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
            <Badge tone="svt">SVT · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Chaque gamète ne reçoit qu&apos;<strong>un seul</strong> des deux allèles : c&apos;est la{' '}
              <strong>loi de disjonction</strong>. D&apos;où : <strong>NN × nn</strong> donne une F1{' '}
              <strong>100 % Nn</strong>, toute noire ; <strong>Nn × Nn</strong> donne en F2 les génotypes{' '}
              <strong>1 NN : 2 Nn : 1 nn</strong>, soit <strong>3/4</strong> de graines noires et <strong>1/4</strong> de
              blanches.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              À retenir : <strong>phénotype ≠ génotype</strong>. Une graine noire peut être NN ou Nn — d&apos;où le{' '}
              <strong>croisement-test</strong> (Nn × nn → 1/2 noires, 1/2 blanches) utilisé par les sélectionneurs de
              l&apos;ISRA, et par les éleveurs de moutons <strong>Ladoum</strong> pour la robe des agneaux.
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
    <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
      <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-emerald-800">{value}</div>
    </div>
  );
}
