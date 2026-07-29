'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Layers, Sigma, Target, TrendingUp } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import {
  FN_KEYS,
  FUNCTIONS,
  N_VALUES,
  exactIntegral,
  riemannLeft,
  riemannRight,
  type FnKey,
} from './functions';

/**
 * TP — Intégration : sommes de Riemann, aire sous la courbe et primitives
 * (Terminale S, Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (n rectangles) →
 * mesures (convergence de Sₙ + lien F′ = f) → QCM → bilan.
 * Maths juste : les sommes de Riemann sont RÉELLEMENT calculées, la valeur
 * exacte vient du théorème fondamental ∫ₐ^b f = F(b) − F(a), et l'aire
 * ALGÉBRIQUE d'une fonction négative est négative (misconception traitée).
 * Contextes sénégalais : car rapide, canal de Richard-Toll, pirogue du Saloum.
 */

const IntegScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'rapproche' | 'eloigne' | 'fixe' | null;

const INTRO =
  "Ton compteur Woyofal n'affiche pas la puissance que tu consommes à chaque seconde : il affiche l'énergie CUMULÉE. " +
  "Cumuler, c'est additionner une infinité de petits morceaux : c'est exactement ce que fait une intégrale. " +
  "Pour trouver la distance parcourue par un car rapide, on cumule sa vitesse : la réponse est l'aire sous la courbe de vitesse. " +
  "Aujourd'hui tu vas découper cette aire en rectangles, de plus en plus fins, et voir la somme se rapprocher de la valeur exacte.";

const CONCLUSION =
  "Bravo ! L'intégrale de a à b de f, c'est l'aire ALGÉBRIQUE entre la courbe et l'axe des abscisses : " +
  "positive au-dessus de l'axe, négative en dessous. " +
  "On l'approche par des sommes de Riemann : on découpe en n rectangles, et quand n devient très grand la somme tend vers l'intégrale. " +
  "Mais on n'a pas besoin de compter des rectangles : si grand F est une primitive de f, alors l'intégrale de a à b de f vaut grand F de b moins grand F de a. " +
  "C'est le théorème fondamental. Et la fonction aire cumulée, elle, a pour dérivée f.";

export function IntegrationTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [fnKey, setFnKey] = useState<FnKey>('car');
  const [b, setB] = useState(2);
  const [nIdx, setNIdx] = useState(0);

  const [nTried, setNTried] = useState<Set<number>>(new Set([N_VALUES[0]]));
  const [fnTried, setFnTried] = useState<Set<FnKey>>(new Set<FnKey>(['car']));
  const [sawPrimitive, setSawPrimitive] = useState(false);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qTheo, setQTheo] = useState<string | null>(null);
  const [qSigne, setQSigne] = useState<string | null>(null);
  const [qAire, setQAire] = useState<string | null>(null);

  const spec = FUNCTIONS[fnKey];
  const n = N_VALUES[nIdx];

  const sumLeft = useMemo(() => riemannLeft(spec.f, 0, b, n), [spec, b, n]);
  const sumRight = useMemo(() => riemannRight(spec.f, 0, b, n), [spec, b, n]);
  const exact = useMemo(() => exactIntegral(spec, 0, b), [spec, b]);
  const gap = Math.abs(sumLeft - exact);

  /** Tableau de convergence : la somme est recalculée pour chaque n, pas inventée. */
  const convergence = useMemo(
    () =>
      N_VALUES.map((k) => {
        const s = riemannLeft(spec.f, 0, b, k);
        return { n: k, sum: s, gap: Math.abs(s - exact) };
      }),
    [spec, b, exact],
  );

  function pickN(idx: number) {
    setNIdx(idx);
    setNTried((prev) => new Set(prev).add(N_VALUES[idx]));
  }

  function pickFn(k: FnKey) {
    setFnKey(k);
    setFnTried((prev) => new Set(prev).add(k));
  }

  function goMesures() {
    setSawPrimitive(true);
    setStep('mesures');
  }

  const explored = nTried.size >= 3 && fnTried.size >= 2;

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, nTried.size * 5); // finesse du découpage explorée
    s += Math.min(10, fnTried.size * 5); // situations explorées
    if (sawPrimitive) s += 10; // avoir observé F et sa tangente
    if (hypo === 'rapproche') s += 10; // prédiction correcte
    if (qTheo === 'fb-fa') s += 20;
    if (qSigne === 'negative') s += 20;
    if (qAire === 'aprime-f') s += 10;
    return Math.min(100, Math.round(s));
  }, [nTried, fnTried, sawPrimitive, hypo, qTheo, qSigne, qAire]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'integration-terminale',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          functionsTried: Array.from(fnTried),
          nTried: Array.from(nTried).sort((x, y) => x - y),
          sawPrimitive,
          last: {
            fn: fnKey,
            expr: spec.expr,
            a: 0,
            b,
            n,
            riemannLeft: Number(sumLeft.toFixed(4)),
            riemannRight: Number(sumRight.toFixed(4)),
            exact: Number(exact.toFixed(4)),
            gap: Number(gap.toFixed(4)),
          },
          qcm: { qTheo, qSigne, qAire },
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
                <Sigma className="h-5 w-5" />
              </span>
              Cumuler l&apos;infiniment petit
            </CardTitle>
            <Badge tone="maths">Maths · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Ton compteur <strong>Woyofal</strong> n&apos;affiche pas la puissance instantanée : il affiche
              l&apos;énergie <strong>cumulée</strong>. Cumuler une grandeur qui varie, c&apos;est additionner une
              infinité de petits morceaux — c&apos;est le métier de l&apos;<strong>intégrale</strong>.
            </p>
            <p>
              Même idée pour un <strong>car rapide</strong> : la distance parcourue est l&apos;
              <strong>aire sous la courbe de vitesse</strong>. Reste à savoir calculer cette aire quand la courbe
              n&apos;est pas une droite.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> découper l&apos;aire en n rectangles (les <em>sommes de Riemann</em>),
              faire grandir n, et vérifier que la somme rejoint la valeur donnée par une primitive :
              <span className="ml-1 font-mono">∫ₐᵇ f = F(b) − F(a)</span>.
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
            On remplace l&apos;aire sous la courbe par <strong>n rectangles</strong> de même largeur. Avant de
            manipuler : que se passe-t-il quand on augmente n ?
          </p>
          <QcmStep
            label="Mon hypothèse : quand n augmente, la somme des aires des rectangles…"
            tone="violet"
            options={[
              { key: 'rapproche', label: "Se rapproche de plus en plus de l'aire exacte" },
              { key: 'eloigne', label: "S'éloigne de l'aire exacte (on empile trop d'erreurs)" },
              { key: 'fixe', label: 'Ne change pas du tout' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Découper ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-700" /> Étape 2 — Découpe l&apos;aire
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis une situation, règle la borne <strong>b</strong> puis le nombre <strong>n</strong> de
            rectangles. Les rectangles <span className="font-semibold text-violet-700">violets</span> comptent en
            positif, les <span className="font-semibold text-rose-600">rouges</span> (sous l&apos;axe) en négatif.
            Tourne la scène avec ta souris ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {FN_KEYS.map((k) => (
              <Button
                key={k}
                size="sm"
                variant={k === fnKey ? 'gradient' : 'outline'}
                onClick={() => pickFn(k)}
              >
                {FUNCTIONS[k].label}
              </Button>
            ))}
          </div>
          <p className="mb-3 rounded-xl bg-violet-50 p-3 text-xs text-violet-900 ring-1 ring-violet-100">
            {spec.context}
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <IntegScene fnKey={fnKey} b={b} n={n} mode="riemann" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="b">Borne supérieure b</Label>
                <span className="font-mono text-violet-700">
                  {b.toFixed(1)} {spec.xUnit}
                </span>
              </div>
              <input
                id="b"
                type="range"
                min={0.5}
                max={3}
                step={0.5}
                value={b}
                onChange={(e) => setB(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="n">Nombre de rectangles n</Label>
                <span className="font-mono text-violet-700">{n}</span>
              </div>
              <input
                id="n"
                type="range"
                min={0}
                max={N_VALUES.length - 1}
                step={1}
                value={nIdx}
                onChange={(e) => pickN(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label={`Somme Sₙ (n=${n})`} value={`${sumLeft.toFixed(3)} ${spec.unit}`} />
            <Stat label="Intégrale exacte" value={`${exact.toFixed(3)} ${spec.unit}`} />
            <Stat label="Écart |Sₙ − I|" value={gap.toFixed(3)} />
          </div>
          <p className="mt-2 text-xs text-ink/60">
            Encadrement : somme à gauche = <span className="font-mono">{sumLeft.toFixed(3)}</span> · somme à
            droite = <span className="font-mono">{sumRight.toFixed(3)}</span> · exacte ={' '}
            <span className="font-mono">
              F({b.toFixed(1)}) − F(0) = {exact.toFixed(3)}
            </span>{' '}
            avec <span className="font-mono">{spec.primExpr}</span>.
          </p>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="gradient" disabled={!explored} onClick={goMesures}>
              {explored
                ? 'Voir mes mesures'
                : nTried.size < 3
                  ? `Teste encore ${3 - nTried.size} valeur(s) de n`
                  : `Teste ${2 - fnTried.size} autre(s) situation(s)`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-700" /> Étape 3 — Convergence et primitive
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour <span className="font-mono">{spec.expr}</span> entre 0 et {b.toFixed(1)}, voici les sommes de
            Riemann réellement calculées. Regarde la colonne « écart » fondre.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">n rectangles</th>
                  <th className="px-4 py-2 text-left">Somme Sₙ</th>
                  <th className="px-4 py-2 text-left">Écart à l&apos;exacte</th>
                </tr>
              </thead>
              <tbody>
                {convergence.map((row) => (
                  <tr
                    key={row.n}
                    className={'border-t border-night-100 ' + (row.n === n ? 'bg-violet-50/60 font-semibold' : '')}
                  >
                    <td className="px-4 py-2 font-mono">{row.n}</td>
                    <td className="px-4 py-2 font-mono">{row.sum.toFixed(4)}</td>
                    <td className="px-4 py-2 font-mono">{row.gap.toFixed(4)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-violet-200 bg-emerald-50 font-semibold">
                  <td className="px-4 py-2">n → +∞</td>
                  <td className="px-4 py-2 font-mono">{exact.toFixed(4)}</td>
                  <td className="px-4 py-2 font-mono">0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            <strong>Théorème fondamental :</strong> pas besoin de compter des rectangles. Avec la primitive{' '}
            <span className="font-mono">{spec.primExpr}</span> :{' '}
            <span className="font-mono">
              ∫₀^{b.toFixed(1)} f = F({b.toFixed(1)}) − F(0) = {exact.toFixed(3)} {spec.unit}
            </span>{' '}
            ({spec.quantity}).
            {spec.hasNegative && exact < 0 && (
              <>
                {' '}
                Ici le résultat est <strong>négatif</strong> : sous l&apos;axe, l&apos;aire est comptée
                négativement. La pirogue a globalement <strong>reculé</strong>.
              </>
            )}
          </p>

          <p className="mb-2 mt-4 text-sm text-ink/70">
            Maintenant regarde la fonction <strong>aire cumulée</strong> F(x) = ∫₀ˣ f(t)dt tracée en violet à côté
            de f (en bleu). Le point violet glisse sur F : le segment vert est sa <strong>tangente</strong>, et sa
            pente vaut exactement f(x). Autrement dit <span className="font-mono">F′ = f</span>.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <IntegScene fnKey={fnKey} b={b} n={n} mode="primitive" />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner découper
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
              label="f est continue sur [a ; b] et F est une primitive de f. Alors ∫ₐᵇ f(x) dx vaut…"
              tone="violet"
              options={[
                { key: 'fb-fa', label: 'F(b) − F(a)' },
                { key: 'fa-fb', label: 'F(a) − F(b)' },
                { key: 'produit', label: 'F(b) × F(a)' },
              ]}
              value={qTheo}
              onChange={setQTheo}
              hint="C'est le théorème fondamental de l'analyse."
            />
            <QcmStep
              label="Pour la pirogue, v(t) = t² − 2t est négative sur ]0 ; 2[. Que vaut ∫₀² v(t) dt ?"
              tone="violet"
              options={[
                { key: 'negative', label: "Une valeur négative (= −4/3 m) : sous l'axe, l'aire est comptée en négatif" },
                { key: 'positive', label: 'Une valeur positive : une aire est toujours positive' },
                { key: 'nulle', label: 'Zéro, car la fonction est négative' },
              ]}
              value={qSigne}
              onChange={setQSigne}
              hint="Attention : aire ALGÉBRIQUE n'est pas aire géométrique."
            />
            <QcmStep
              label="On pose A(x) = ∫₀ˣ f(t) dt (l'aire cumulée depuis 0). Alors…"
              tone="violet"
              options={[
                { key: 'aprime-f', label: "A′(x) = f(x) : l'aire cumulée est une primitive de f" },
                { key: 'aprime-fprime', label: "A′(x) = f′(x)" },
                { key: 'a-fprime', label: 'A(x) = f′(x)' },
              ]}
              value={qAire}
              onChange={setQAire}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qTheo || !qSigne || !qAire || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              L&apos;intégrale <span className="font-mono">∫ₐᵇ f(x)dx</span> est l&apos;
              <strong>aire algébrique</strong> entre la courbe et l&apos;axe des abscisses : comptée{' '}
              <strong>positivement</strong> au-dessus, <strong>négativement</strong> en dessous.
            </p>
            <p>
              Les <strong>sommes de Riemann</strong> l&apos;approchent : plus n est grand, plus l&apos;écart est
              petit. Mais on n&apos;a pas besoin de rectangles : si F est une primitive de f, alors{' '}
              <span className="font-mono">∫ₐᵇ f = F(b) − F(a)</span>. Et l&apos;aire cumulée{' '}
              <span className="font-mono">A(x) = ∫ₐˣ f</span> vérifie <span className="font-mono">A′ = f</span> :
              intégrer, c&apos;est l&apos;opération inverse de dériver.
            </p>
            <div className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-violet-100">
              <div className="mb-1 text-xs uppercase tracking-wider text-violet-700/70">Détail du score</div>
              <ul className="space-y-0.5 font-mono text-xs text-ink/70">
                <li>Finesse du découpage explorée : {Math.min(20, nTried.size * 5)}/20</li>
                <li>Situations explorées : {Math.min(10, fnTried.size * 5)}/10</li>
                <li>Observation de F et de sa tangente : {sawPrimitive ? 10 : 0}/10</li>
                <li>Hypothèse de départ : {hypo === 'rapproche' ? 10 : 0}/10</li>
                <li>Théorème fondamental : {qTheo === 'fb-fa' ? 20 : 0}/20</li>
                <li>Aire algébrique négative : {qSigne === 'negative' ? 20 : 0}/20</li>
                <li>Aire cumulée A′ = f : {qAire === 'aprime-f' ? 10 : 0}/10</li>
              </ul>
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
