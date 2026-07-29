'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, LineChart, Repeat, Sigma, Sparkles, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Limite d'une suite récurrente uₙ₊₁ = f(uₙ) (Terminale S, Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (diagramme en toile
 * d'araignée) → mesures (encadrement + récurrence + gendarmes) → QCM → bilan.
 *
 * Maths justes — modèle affine f(x) = a·x + b :
 *   • point fixe l = f(l) = b/(1−a) (a ≠ 1) ;
 *   • uₙ − l = aⁿ (u₀ − l)  → se démontre par récurrence ;
 *   • |uₙ − l| = |a|ⁿ·|u₀ − l| ≤ |a|ⁿ·|u₀ − l| → 0 quand |a| < 1 (gendarmes) ;
 *   • si 0 < a < 1 et u₀ < l : suite croissante et majorée par l ⇒ converge ;
 *   • si |a| > 1 : la suite diverge (l'escalier sort du cadre).
 *
 * Contextes sénégalais : dose d'antipaludique à Ziguinchor, croissance de
 * Diamniadio, prix de l'arachide dans le bassin arachidier.
 */

const CobwebScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type CtxKey = 'medoc' | 'ville' | 'arachide';
type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'monte' | 'stabilise' | 'zero' | null;

type Ctx = {
  short: string;
  title: string;
  unit: string;
  dec: number;
  b: number;
  a0: number;
  u0: number;
  u0Min: number;
  u0Max: number;
  u0Step: number;
  aLabel: string;
  story: string;
};

const CONTEXTS: Record<CtxKey, Ctx> = {
  medoc: {
    short: 'Médicament',
    title: 'Antipaludique à Ziguinchor',
    unit: 'mg',
    dec: 0,
    b: 200,
    a0: 0.5,
    u0: 100,
    u0Min: 0,
    u0Max: 800,
    u0Step: 50,
    aLabel: 'fraction qui reste après 24 h',
    story:
      "Un patient prend 200 mg d'antipaludique chaque matin. En 24 h son corps en élimine une partie : il reste la fraction a de la veille. uₙ = quantité présente dans le sang le matin du jour n, juste après la prise.",
  },
  ville: {
    short: 'Diamniadio',
    title: 'La population de Diamniadio',
    unit: 'milliers hab.',
    dec: 1,
    b: 4,
    a0: 1.05,
    u0: 150,
    u0Min: 50,
    u0Max: 400,
    u0Step: 10,
    aLabel: 'multiplicateur naturel par an',
    story:
      "Diamniadio grandit vite. Chaque année la population est multipliée par a (naissances moins décès), puis 4 000 personnes arrivent des régions. uₙ = population l'année n, en milliers d'habitants.",
  },
  arachide: {
    short: 'Arachide',
    title: "Le prix de l'arachide",
    unit: 'F CFA/kg',
    dec: 0,
    b: 340,
    a0: -0.7,
    u0: 400,
    u0Min: 120,
    u0Max: 460,
    u0Step: 20,
    aLabel: 'effet du prix sur la campagne suivante',
    story:
      "Dans le bassin arachidier, quand le prix monte une campagne, tous les producteurs sèment davantage : l'année suivante la récolte est abondante et le prix chute. Le coefficient a est donc négatif — le prix rebondit d'une campagne à l'autre.",
  },
};

const N_MAX = 12;

const INTRO =
  "À l'hôpital de Ziguinchor, un patient prend chaque matin la même dose d'antipaludique. Entre deux prises, son corps en élimine une partie. " +
  "La quantité présente dans son sang forme une suite définie par récurrence : chaque terme se calcule à partir du précédent. " +
  "Le médecin a besoin de savoir si cette quantité finit par se stabiliser, ou si elle grimpe sans fin — donc de connaître la limite de la suite. " +
  "Tu vas la trouver avec un outil très visuel : le diagramme en toile d'araignée.";

const CONCLUSION =
  "Bravo ! Pour une suite récurrente u n plus un égale f de u n, la limite éventuelle est forcément un point fixe de f : elle vérifie l égale f de l. " +
  "Avec f affine de coefficient a, l'écart à la limite est multiplié par a à chaque étape, donc la suite converge si et seulement si la valeur absolue de a est plus petite que 1. " +
  "Sur le diagramme, la toile d'araignée s'enroule autour du point fixe quand ça converge, et s'échappe du cadre quand ça diverge. " +
  "Retiens aussi le théorème de la limite monotone : toute suite croissante et majorée converge.";

// ── Analyse mathématique du régime ────────────────────────────────────────
type Regime = 'conv' | 'conv-osc' | 'const' | 'div' | 'cycle' | 'div-osc';

function analyse(a: number, b: number) {
  const eps = 1e-9;
  if (Math.abs(a - 1) < eps) {
    return {
      regime: 'div' as Regime,
      limit: null as number | null,
      verdict: b >= 0 ? 'Divergente vers +∞ (suite arithmétique)' : 'Divergente vers −∞',
    };
  }
  const l = b / (1 - a);
  if (Math.abs(a) < 1) {
    if (Math.abs(a) < eps) return { regime: 'const' as Regime, limit: l, verdict: 'Constante dès u₁ : uₙ = b' };
    return a > 0
      ? { regime: 'conv' as Regime, limit: l, verdict: "Convergente — l'escalier monte vers l" }
      : { regime: 'conv-osc' as Regime, limit: l, verdict: 'Convergente — la toile s’enroule autour de l' };
  }
  if (Math.abs(a + 1) < eps) {
    return { regime: 'cycle' as Regime, limit: null, verdict: 'Aucune limite — la suite oscille entre 2 valeurs' };
  }
  return a > 1
    ? { regime: 'div' as Regime, limit: null, verdict: "Divergente vers +∞ — l'escalier sort du cadre" }
    : { regime: 'div-osc' as Regime, limit: null, verdict: 'Divergente — les oscillations explosent' };
}

function fr(x: number, d = 0) {
  return x.toFixed(d).replace('.', ',');
}

export function SuitesTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [ctxKey, setCtxKey] = useState<CtxKey>('medoc');
  const [u0, setU0] = useState(CONTEXTS.medoc.u0);
  const [a, setA] = useState(CONTEXTS.medoc.a0);
  const [seen, setSeen] = useState<Set<string>>(new Set(['medoc']));
  const [regimes, setRegimes] = useState<Set<Regime>>(new Set());

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qFixe, setQFixe] = useState<string | null>(null);
  const [qCritere, setQCritere] = useState<string | null>(null);
  const [qMonotone, setQMonotone] = useState<string | null>(null);

  const ctx = CONTEXTS[ctxKey];
  const res = useMemo(() => analyse(a, ctx.b), [a, ctx.b]);

  // Termes u₀ … u₁₂ calculés par récurrence (jamais devinés).
  const terms = useMemo(() => {
    const t = [u0];
    for (let n = 1; n <= N_MAX; n++) t.push(a * t[n - 1] + ctx.b);
    return t;
  }, [u0, a, ctx.b]);

  useEffect(() => {
    setRegimes((prev) => (prev.has(res.regime) ? prev : new Set(prev).add(res.regime)));
  }, [res.regime]);

  function touch(tag: string) {
    setSeen((prev) => (prev.has(tag) ? prev : new Set(prev).add(tag)));
  }

  function pickCtx(k: CtxKey) {
    setCtxKey(k);
    setU0(CONTEXTS[k].u0);
    setA(CONTEXTS[k].a0);
    touch(k);
  }

  const converge = res.limit !== null;
  const sens =
    !converge || Math.abs(u0 - (res.limit as number)) < 1e-9
      ? null
      : a > 0
        ? u0 < (res.limit as number)
          ? 'croissante et majorée par l'
          : 'décroissante et minorée par l'
        : 'alternée autour de l';

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, seen.size * 4); // exploration : 3 contextes + u₀ + a
    s += Math.min(10, regimes.size * 5); // avoir vu au moins 2 régimes
    if (hypo === 'stabilise') s += 10;
    if (qFixe === 'pointfixe') s += 25;
    if (qCritere === 'abs') s += 20;
    if (qMonotone === 'converge') s += 15;
    return Math.min(100, Math.round(s));
  }, [seen, regimes, hypo, qFixe, qCritere, qMonotone]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'suites-terminale',
        version: '2.0',
        steps: {
          explored: Array.from(seen),
          regimes: Array.from(regimes),
          settings: { context: ctxKey, u0, a, b: ctx.b },
          result: { limit: res.limit, verdict: res.verdict, u12: terms[N_MAX] },
          hypothesis: hypo,
          qcm: { qFixe, qCritere, qMonotone },
        },
      },
      score,
    );
    setStep('done');
  }

  const canAdvance = seen.size >= 4 && regimes.size >= 2;

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Sigma className="h-5 w-5" />
              </span>
              La dose qui se stabilise
            </CardTitle>
            <Badge tone="maths">Maths · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À l&apos;hôpital de Ziguinchor, un patient prend <strong>200 mg</strong> d&apos;antipaludique chaque
              matin. En 24 h son corps en élimine une partie. La quantité présente dans son sang est une{' '}
              <strong>suite récurrente</strong> : uₙ₊₁ = f(uₙ), chaque terme se calcule à partir du précédent.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> décider si la suite <strong>converge</strong> (elle s&apos;approche d&apos;une
              limite finie l) ou <strong>diverge</strong>, et trouver l — grâce au{' '}
              <strong>diagramme en toile d&apos;araignée</strong> : la courbe de f, la droite y = x, et un escalier qui
              part de u₀.
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
            Le patient reprend <strong>200 mg</strong> chaque matin, et son corps élimine <strong>la moitié</strong> du
            médicament en 24 h : uₙ₊₁ = 0,5 × uₙ + 200. Au bout de plusieurs semaines, que devient la quantité dans le
            sang ?
          </p>
          <QcmStep
            label="Mon hypothèse : au fil des jours, la quantité de médicament…"
            tone="violet"
            options={[
              { key: 'monte', label: 'Augmente sans fin (elle tend vers +∞).' },
              { key: 'stabilise', label: "Se stabilise autour d'une valeur limite." },
              { key: 'zero', label: 'Finit par retomber à 0.' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Construire la toile <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-violet-700" /> Étape 2 — Le diagramme en toile d&apos;araignée
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pars de u₀ sur l&apos;axe des abscisses : <strong>monte</strong> jusqu&apos;à la courbe de f (tu lis uₙ₊₁),
            puis va <strong>horizontalement</strong> jusqu&apos;à la droite y = x (tu reportes uₙ₊₁ en abscisse). Répète.
            Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <CobwebScene
                u0={u0}
                a={a}
                b={ctx.b}
                unit={ctx.unit}
                dec={ctx.dec}
                limit={res.limit}
                verdict={res.verdict}
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CONTEXTS) as CtxKey[]).map((k) => (
                <Button key={k} variant={ctxKey === k ? 'gradient' : 'outline'} size="sm" onClick={() => pickCtx(k)}>
                  {CONTEXTS[k].short} {seen.has(k) && ctxKey !== k ? '✓' : ''}
                </Button>
              ))}
            </div>
            <p className="rounded-xl bg-violet-50 p-3 text-xs text-violet-900 ring-1 ring-violet-100">
              <strong>{ctx.title} —</strong> {ctx.story}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="u0">Premier terme u₀</Label>
                  <span className="font-mono text-violet-700">
                    {fr(u0, ctx.dec)} {ctx.unit}
                  </span>
                </div>
                <input
                  id="u0"
                  type="range"
                  min={ctx.u0Min}
                  max={ctx.u0Max}
                  step={ctx.u0Step}
                  value={u0}
                  onChange={(e) => {
                    setU0(Number(e.target.value));
                    touch('u0');
                  }}
                  className="slider-lab w-full"
                />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="a">Coefficient a de f ({ctx.aLabel})</Label>
                  <span className="font-mono text-violet-700">{fr(a, 2)}</span>
                </div>
                <input
                  id="a"
                  type="range"
                  min={-1.3}
                  max={1.3}
                  step={0.05}
                  value={a}
                  onChange={(e) => {
                    setA(Math.round(Number(e.target.value) * 100) / 100);
                    touch('a');
                  }}
                  className="slider-lab w-full"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="f(x)" value={`${fr(a, 2)}x + ${fr(ctx.b, ctx.dec)}`} />
            <Stat label="|a|" value={fr(Math.abs(a), 2)} />
            <Stat label="Point fixe l" value={res.limit === null ? '—' : fr(res.limit, ctx.dec)} />
            <Stat label={`u${N_MAX}`} value={Math.abs(terms[N_MAX]) > 99999 ? '≫' : fr(terms[N_MAX], ctx.dec)} />
          </div>

          <p
            className={
              'mt-3 rounded-xl p-3 text-sm ring-1 ' +
              (converge
                ? 'bg-emerald-50 text-emerald-900 ring-emerald-100'
                : 'bg-amber-50 text-amber-900 ring-amber-100')
            }
          >
            <strong>{res.verdict}.</strong>{' '}
            {converge
              ? `La limite est le point fixe : l = f(l) = ${fr(ctx.b, ctx.dec)} / (1 − ${fr(a, 2)}) = ${fr(res.limit as number, ctx.dec)} ${ctx.unit}.`
              : "Aucun point fixe n'attire la suite : l'escalier s'échappe du cadre."}
            {sens ? ` Ici la suite est ${sens}.` : ''}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/55">
              Régimes rencontrés : {regimes.size}/2 · Réglages testés : {seen.size}
            </span>
            <Button variant="gradient" disabled={!canAdvance} onClick={() => setStep('mesures')}>
              {canAdvance ? 'Voir mes mesures' : 'Trouve un cas qui converge ET un qui diverge'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-violet-700" /> Étape 3 — Mesure l&apos;écart à la limite
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Réglage actuel : uₙ₊₁ = {fr(a, 2)} × uₙ + {fr(ctx.b, ctx.dec)}, avec u₀ = {fr(u0, ctx.dec)} {ctx.unit}.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">n</th>
                  <th className="px-3 py-2 text-left">uₙ ({ctx.unit})</th>
                  <th className="px-3 py-2 text-left">|uₙ − l| mesuré</th>
                  <th className="px-3 py-2 text-left">|a|ⁿ × |u₀ − l| prévu</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 5, 8, N_MAX].map((n) => {
                  const un = terms[n];
                  const ecart = res.limit === null ? null : Math.abs(un - res.limit);
                  const borne = res.limit === null ? null : Math.pow(Math.abs(a), n) * Math.abs(u0 - res.limit);
                  return (
                    <tr key={n} className={'border-t border-night-100 ' + (n === N_MAX ? 'bg-emerald-50 font-semibold' : '')}>
                      <td className="px-3 py-2">{n}</td>
                      <td className="px-3 py-2">{Math.abs(un) > 99999 ? '≫ 10⁵' : fr(un, ctx.dec)}</td>
                      <td className="px-3 py-2">{ecart === null ? '—' : fr(ecart, 2)}</td>
                      <td className="px-3 py-2">{borne === null ? '—' : fr(borne, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-2 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            <p>
              <strong>Démonstration par récurrence.</strong> Posons l = b/(1 − a), donc l = a·l + b. Alors uₙ₊₁ − l = (a
              uₙ + b) − (a l + b) = a (uₙ − l). En partant de u₀ − l, on obtient par récurrence{' '}
              <strong>uₙ − l = aⁿ (u₀ − l)</strong> — c&apos;est exactement ce que confirment les deux dernières colonnes.
            </p>
            <p>
              <strong>Théorème des gendarmes.</strong> 0 ≤ |uₙ − l| = |a|ⁿ × |u₀ − l|. Si |a| &lt; 1 alors |a|ⁿ → 0, donc
              |uₙ − l| est coincé entre deux suites de limite 0 : <strong>uₙ → l</strong>.
            </p>
            <p>
              <strong>Limite monotone.</strong> Avec 0 &lt; a &lt; 1 et u₀ &lt; l, on montre par récurrence que la suite
              est <strong>croissante et majorée par l</strong> — donc elle converge, sans même calculer les termes.
            </p>
          </div>
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
              label="La suite uₙ₊₁ = f(uₙ) converge vers l et f est continue. Alors l vérifie :"
              tone="violet"
              hint="Sur la toile d'araignée, le point d'arrivée est à l'intersection de la courbe de f et de la droite y = x."
              options={[
                { key: 'pointfixe', label: 'l = f(l) : l est un point fixe de f.' },
                { key: 'zero', label: 'l = 0, toujours.' },
                { key: 'f0', label: 'l = f(0).' },
              ]}
              value={qFixe}
              onChange={setQFixe}
            />
            <QcmStep
              label="Pour uₙ₊₁ = a·uₙ + b (avec a ≠ 1), la suite converge quel que soit u₀ si et seulement si :"
              tone="violet"
              options={[
                { key: 'abs', label: '|a| < 1.' },
                { key: 'apos', label: 'a > 1.' },
                { key: 'b0', label: 'b = 0.' },
              ]}
              value={qCritere}
              onChange={setQCritere}
            />
            <QcmStep
              label="Une suite croissante et majorée :"
              tone="violet"
              options={[
                { key: 'converge', label: 'Converge (théorème de la limite monotone).' },
                { key: 'infini', label: 'Tend forcément vers +∞.' },
                { key: 'rien', label: "N'a jamais de limite." },
              ]}
              value={qMonotone}
              onChange={setQMonotone}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qFixe || !qCritere || !qMonotone || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pour une suite récurrente <strong>uₙ₊₁ = f(uₙ)</strong> avec f continue, si uₙ → l alors{' '}
              <strong>l = f(l)</strong> : la limite est un <strong>point fixe</strong> de f — le point où la courbe de f
              coupe la droite y = x sur la toile d&apos;araignée.
            </p>
            <p>
              Avec f(x) = a·x + b : uₙ − l = aⁿ (u₀ − l). Donc la suite <strong>converge si |a| &lt; 1</strong> (escalier
              qui s&apos;enroule) et <strong>diverge si |a| &gt; 1</strong> (escalier qui s&apos;échappe). Pour a
              négatif, les termes alternent autour de l.
            </p>
            <p className="text-sm text-ink/60">
              Deux outils du programme à garder : le <strong>théorème des gendarmes</strong> (0 ≤ |uₙ − l| ≤ |a|ⁿ|u₀ − l|
              → 0) et le <strong>théorème de la limite monotone</strong> (croissante + majorée ⇒ convergente), qui
              prouve la convergence sans connaître la limite à l&apos;avance.
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
