'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Gauge, Sigma, Sparkles, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Équations du second degré : trinôme, parabole, discriminant (Seconde).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (sliders a, b, c) →
 * observation du nombre de racines → QCM → bilan. Maths justes :
 * Δ = b² − 4ac, racines x = (−b ± √Δ)/(2a), sommet en x = −b/(2a).
 * Contexte : trajectoire d'un ballon, arche d'un pont, antenne parabolique.
 */

const ParabolaScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'observe' | 'qcm' | 'done';
type HypoRep = 'jamais' | 'parfois' | 'toujours' | null;

const INTRO =
  "Quand un footballeur frappe un ballon au stade Léopold-Sédar-Senghor, le ballon dessine une courbe dans le ciel : une parabole. " +
  "La même forme se cache dans l'arche d'un pont ou dans une antenne parabolique. " +
  "Toutes ces courbes obéissent à une seule équation : f de x égale a x au carré plus b x plus c. " +
  "Aujourd'hui tu vas découvrir comment le discriminant delta décide si la parabole touche le sol, le frôle, ou reste en l'air.";

const CONCLUSION =
  "Bravo ! Le discriminant delta égale b au carré moins 4 a c décide de tout. " +
  "Si delta est positif, la parabole coupe l'axe en deux points : deux racines. " +
  "Si delta est nul, elle le touche en un seul point : une racine double, c'est le sommet. " +
  "Si delta est négatif, la parabole ne coupe jamais l'axe : aucune solution réelle. " +
  "Et le sommet se trouve toujours en x égale moins b sur 2 a.";

function analyse(a: number, b: number, c: number) {
  const delta = b * b - 4 * a * c;
  const xs = a === 0 ? 0 : -b / (2 * a);
  const nb = delta > 1e-9 ? 2 : delta > -1e-9 ? 1 : 0;
  return { delta, vertexX: xs, nb };
}

export function EquationsSecondDegre2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(-1);

  const [hypo, setHypo] = useState<HypoRep>(null);
  // Cas explorés : signe de Δ (>0, =0, <0) — on veut que l'élève voie les 3 situations.
  const [casVus, setCasVus] = useState<Set<string>>(new Set(['pos']));

  const [qDelta, setQDelta] = useState<string | null>(null);
  const [qNeg, setQNeg] = useState<string | null>(null);
  const [qSommet, setQSommet] = useState<string | null>(null);

  const cur = useMemo(() => analyse(a, b, c), [a, b, c]);

  function bump(setter: (n: number) => void, value: number) {
    setter(value);
    const { delta } = analyse(
      setter === setA ? value : a,
      setter === setB ? value : b,
      setter === setC ? value : c,
    );
    const tag = delta > 1e-9 ? 'pos' : delta > -1e-9 ? 'nul' : 'neg';
    setCasVus((prev) => (prev.has(tag) ? prev : new Set(prev).add(tag)));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, casVus.size * 9); // exploration : voir Δ>0, Δ=0, Δ<0
    if (hypo === 'parfois') s += 10;
    if (qDelta === 'd') s += 25;
    if (qNeg === 'aucune') s += 20;
    if (qSommet === 'mb2a') s += 20;
    return Math.min(100, s);
  }, [casVus, hypo, qDelta, qNeg, qSommet]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'equations-second-degre-2nde',
        version: '2.0',
        steps: {
          coeffs: { a, b, c },
          casVus: Array.from(casVus),
          hypothesis: hypo,
          qcm: { qDelta, qNeg, qSommet },
        },
      },
      score,
    );
    setStep('done');
  }

  const deltaLabel = cur.delta > 1e-9 ? 'Δ > 0' : cur.delta > -1e-9 ? 'Δ = 0' : 'Δ < 0';

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Sigma className="h-5 w-5" />
              </span>
              Le ballon, le pont et la parabole
            </CardTitle>
            <Badge tone="maths">Maths · Seconde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Un ballon frappé au stade, l&apos;arche d&apos;un <strong>pont</strong>, une <strong>antenne parabolique</strong> :
              partout la même courbe, la <strong>parabole</strong>, donnée par f(x) = a x² + b x + c.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> comprendre comment le discriminant <strong>Δ = b² − 4ac</strong> décide du nombre de
              points où la parabole coupe l&apos;axe Ox (les <strong>racines</strong>), et où se trouve le <strong>sommet</strong>.
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
            Avant de manipuler : selon toi, une parabole f(x) = a x² + b x + c coupe-t-elle l&apos;axe Ox (le sol) ?
          </p>
          <QcmStep
            label="Mon hypothèse : une parabole coupe l'axe Ox…"
            tone="violet"
            options={[
              { key: 'jamais', label: 'Jamais (elle reste toujours au-dessus).' },
              { key: 'parfois', label: 'Parfois : 0, 1 ou 2 fois selon les coefficients.' },
              { key: 'toujours', label: 'Toujours exactement 2 fois.' },
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
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Règle a, b, c
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais varier les coefficients et observe la parabole. Vise les 3 situations : <strong>Δ &gt; 0</strong> (2 racines),
            <strong> Δ = 0</strong> (sommet sur l&apos;axe) et <strong>Δ &lt; 0</strong> (aucune racine). Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <ParabolaScene a={a} b={b} c={c} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {([
              ['a', a, setA, -2, 2] as const,
              ['b', b, setB, -3, 3] as const,
              ['c', c, setC, -3, 3] as const,
            ]).map(([n, v, fn, mn, mx]) => (
              <div key={n}>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor={n}>{n}</Label>
                  <span className="font-mono text-violet-700">{v}</span>
                </div>
                <input
                  id={n}
                  type="range"
                  min={mn}
                  max={mx}
                  step={0.5}
                  value={v}
                  onChange={(e) => bump(fn, Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Δ = b² − 4ac" value={cur.delta.toFixed(1)} />
            <Stat label="Nb racines" value={`${cur.nb}`} />
            <Stat label="Sommet x = −b/2a" value={cur.vertexX.toFixed(2)} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Badge tone={cur.delta > 1e-9 ? 'science' : cur.delta > -1e-9 ? 'maths' : 'alert'}>{deltaLabel}</Badge>
            <Button variant="gradient" disabled={casVus.size < 3} onClick={() => setStep('observe')}>
              {casVus.size < 3 ? `Trouve ${3 - casVus.size} cas de Δ en plus` : 'Voir le bilan des cas'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-700" /> Étape 3 — Ce que tu as observé
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le signe du discriminant Δ commande tout. Voici le résumé des trois situations.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Signe de Δ</th>
                  <th className="px-4 py-2 text-left">Parabole et axe Ox</th>
                  <th className="px-4 py-2 text-left">Racines</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tag: 'pos', d: 'Δ > 0', txt: 'coupe l’axe en 2 points', r: '2 racines : x = (−b ± √Δ)/(2a)' },
                  { tag: 'nul', d: 'Δ = 0', txt: 'touche l’axe au sommet', r: '1 racine double : x = −b/(2a)' },
                  { tag: 'neg', d: 'Δ < 0', txt: 'ne touche jamais l’axe', r: '0 racine réelle' },
                ].map((row) => (
                  <tr key={row.tag} className={'border-t border-night-100 ' + (casVus.has(row.tag) ? 'bg-emerald-50 font-medium' : '')}>
                    <td className="px-4 py-2 font-mono">{row.d}</td>
                    <td className="px-4 py-2">
                      {row.txt} {casVus.has(row.tag) ? '✓ vu' : ''}
                    </td>
                    <td className="px-4 py-2">{row.r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              label="Le discriminant vaut :"
              tone="violet"
              options={[
                { key: 'd', label: 'Δ = b² − 4ac' },
                { key: 'x', label: 'Δ = b² + 4ac' },
                { key: 'y', label: 'Δ = 2b − 4ac' },
              ]}
              value={qDelta}
              onChange={setQDelta}
            />
            <QcmStep
              label="Si Δ < 0, l'équation ax² + bx + c = 0 a :"
              tone="violet"
              options={[
                { key: 'aucune', label: 'Aucune solution réelle' },
                { key: 'une', label: 'Une solution double' },
                { key: 'deux', label: 'Deux solutions distinctes' },
              ]}
              value={qNeg}
              onChange={setQNeg}
            />
            <QcmStep
              label="L'abscisse du sommet de la parabole est :"
              tone="violet"
              options={[
                { key: 'mb2a', label: 'x = −b / (2a)' },
                { key: 'b2a', label: 'x = b / (2a)' },
                { key: 'mca', label: 'x = −c / a' },
              ]}
              value={qSommet}
              onChange={setQSommet}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qDelta || !qNeg || !qSommet || busy} onClick={handleValidate}>
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
              Le discriminant <strong>Δ = b² − 4ac</strong> décide du nombre de racines :
              <strong> Δ &gt; 0</strong> ⇒ 2 racines x = (−b ± √Δ)/(2a), <strong>Δ = 0</strong> ⇒ 1 racine double,
              <strong> Δ &lt; 0</strong> ⇒ aucune solution réelle. Le sommet est toujours en <strong>x = −b/(2a)</strong>.
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
