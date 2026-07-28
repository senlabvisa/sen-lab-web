'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, LineChart, Sigma, Sparkles, Target, TrendingUp } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Suites arithmétiques et géométriques (Première, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (type, u₀,
 * raison) → observation (alignés vs exponentiel) → QCM → bilan.
 * Maths justes : uₙ = u₀ + n·r (arithmétique, points alignés) et
 * uₙ = u₀·qⁿ (géométrique, croissance/décroissance exponentielle).
 * Contexte : épargne (tontine à intérêts simples / composés).
 */

const SuiteScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-sky-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Kind = 'arith' | 'geo';
type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'arith' | 'geo' | 'egal' | null;

const INTRO =
  "Dans une tontine, chaque mois ton épargne grandit. Si tu ajoutes toujours la même somme, tu suis une suite arithmétique. " +
  "Si au contraire la banque ajoute des intérêts qui se cumulent, ton argent est multiplié chaque mois : c'est une suite géométrique. " +
  "Aujourd'hui tu vas voir, dans un repère, pourquoi l'une grandit en ligne droite et l'autre s'envole.";

const CONCLUSION =
  "Bravo ! Dans une suite arithmétique on ajoute la raison r, donc uₙ = u₀ + n·r : les points (n ; uₙ) sont alignés. " +
  "Dans une suite géométrique on multiplie par la raison q, donc uₙ = u₀·qⁿ : la croissance est exponentielle quand q est supérieur à 1. " +
  "Voilà pourquoi les intérêts composés font grandir une épargne bien plus vite que les intérêts simples.";

function term(kind: Kind, u0: number, raison: number, n: number) {
  return kind === 'arith' ? u0 + n * raison : u0 * Math.pow(raison, n);
}

export function SuitesArithGeo1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [kind, setKind] = useState<Kind>('arith');
  const [u0, setU0] = useState(2);
  const [r, setR] = useState(1.5); // raison arithmétique
  const [q, setQ] = useState(1.5); // raison géométrique
  const [seen, setSeen] = useState<Set<string>>(new Set(['arith']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qArith, setQArith] = useState<string | null>(null);
  const [qGeo, setQGeo] = useState<string | null>(null);
  const [qPoints, setQPoints] = useState<string | null>(null);

  const raison = kind === 'arith' ? r : q;
  const u7 = useMemo(() => term(kind, u0, raison, 7), [kind, u0, raison]);

  function touch(tag: string) {
    setSeen((prev) => new Set(prev).add(tag));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, seen.size * 4); // exploration (type + réglages)
    if (hypo === 'geo') s += 10; // la géométrique grandit le plus vite
    if (qArith === 'ajoute') s += 22;
    if (qGeo === 'multiplie') s += 22;
    if (qPoints === 'alignes') s += 21;
    return Math.min(100, s);
  }, [seen, hypo, qArith, qGeo, qPoints]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'suites-arith-geo-1ere',
        version: '2.0',
        steps: {
          explored: Array.from(seen),
          settings: { kind, u0, r, q },
          hypothesis: hypo,
          qcm: { qArith, qGeo, qPoints },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sky-700 shadow-soft ring-1 ring-sky-100">
                <Sigma className="h-5 w-5" />
              </span>
              L&apos;épargne de la tontine
            </CardTitle>
            <Badge tone="maths">Maths · Première</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Chaque mois, ton épargne grandit. Si tu ajoutes toujours la <strong>même somme</strong>, c&apos;est une
              suite <strong>arithmétique</strong> (on ajoute la raison r). Si la banque ajoute des intérêts qui se
              cumulent, ton argent est <strong>multiplié</strong> chaque mois : c&apos;est une suite{' '}
              <strong>géométrique</strong> (on multiplie par la raison q).
            </p>
            <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
              <strong>Objectif :</strong> placer les termes (n ; uₙ) dans un repère et comprendre pourquoi
              l&apos;arithmétique trace une <strong>droite</strong> alors que la géométrique <strong>s&apos;envole</strong>.
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
              <Target className="h-5 w-5 text-sky-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            On part du même premier terme. Au bout de quelques mois, quelle épargne sera la <strong>plus grande</strong> ?
          </p>
          <QcmStep
            label="Mon hypothèse : sur la durée, la plus grande croissance vient de la suite…"
            tone="science"
            options={[
              { key: 'arith', label: 'Arithmétique (on ajoute toujours r)' },
              { key: 'geo', label: 'Géométrique (on multiplie par q > 1)' },
              { key: 'egal', label: 'Les deux grandissent pareil' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-sky-700" /> Étape 2 — Construis la suite
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis le type de suite, le premier terme u₀ et la raison. Observe le nuage de points (n ; uₙ). Tourne la
            scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-sky-100">
            <div className="aspect-[4/3] w-full">
              <SuiteScene kind={kind} u0={u0} raison={raison} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              {(['arith', 'geo'] as Kind[]).map((x) => (
                <Button
                  key={x}
                  variant={kind === x ? 'gradient' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setKind(x);
                    touch(x);
                  }}
                >
                  {x === 'arith' ? 'Arithmétique (+r)' : 'Géométrique (×q)'}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="u0">Premier terme u₀</Label>
                  <span className="font-mono text-sky-700">{u0}</span>
                </div>
                <input
                  id="u0"
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={u0}
                  onChange={(e) => {
                    setU0(Number(e.target.value));
                    touch('u0');
                  }}
                  className="slider-lab w-full"
                />
              </div>
              {kind === 'arith' ? (
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <Label htmlFor="r">Raison r (on ajoute)</Label>
                    <span className="font-mono text-sky-700">{r}</span>
                  </div>
                  <input
                    id="r"
                    type="range"
                    min={-2}
                    max={3}
                    step={0.5}
                    value={r}
                    onChange={(e) => {
                      setR(Number(e.target.value));
                      touch('r');
                    }}
                    className="slider-lab w-full"
                  />
                </div>
              ) : (
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <Label htmlFor="q">Raison q (on multiplie)</Label>
                    <span className="font-mono text-sky-700">{q}</span>
                  </div>
                  <input
                    id="q"
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.25}
                    value={q}
                    onChange={(e) => {
                      setQ(Number(e.target.value));
                      touch('q');
                    }}
                    className="slider-lab w-full"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Type" value={kind === 'arith' ? '+r' : '×q'} />
            <Stat label="u₀" value={`${u0}`} />
            <Stat label="u₇" value={u7.toFixed(1)} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/55">
              {kind === 'arith' ? 'Les points sont alignés sur une droite.' : 'La courbe monte (ou descend) de plus en plus vite.'}
            </span>
            <Button variant="gradient" disabled={seen.size < 4} onClick={() => setStep('mesures')}>
              {seen.size < 4 ? 'Explore les 2 types et la raison' : 'Comparer'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sky-700" /> Étape 3 — Compare les termes
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Même départ u₀ = {u0}. À gauche on <strong>ajoute</strong> r = {r} ; à droite on <strong>multiplie</strong>{' '}
            par q = {q}. Regarde comme l&apos;écart se creuse.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-xs uppercase tracking-wider text-sky-700">
                <tr>
                  <th className="px-4 py-2 text-left">Rang n</th>
                  <th className="px-4 py-2 text-left">Arithmétique (+{r})</th>
                  <th className="px-4 py-2 text-left">Géométrique (×{q})</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 3, 5, 7].map((n) => {
                  const a = term('arith', u0, r, n);
                  const g = term('geo', u0, q, n);
                  return (
                    <tr key={n} className={'border-t border-night-100 ' + (n === 7 ? 'bg-emerald-50 font-semibold' : '')}>
                      <td className="px-4 py-2">u{n === 0 ? '₀' : n}</td>
                      <td className="px-4 py-2">{a.toFixed(1)}</td>
                      <td className="px-4 py-2">
                        {g.toFixed(1)} {n === 7 && g > a ? '🚀' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
            <strong>À retenir :</strong> arithmétique = points <strong>alignés</strong> (uₙ = u₀ + n·r). Géométrique =
            croissance <strong>exponentielle</strong> si q &gt; 1 (uₙ = u₀·qⁿ).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Réessayer
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
              label="Dans une suite arithmétique, on passe d'un terme au suivant en :"
              tone="science"
              options={[
                { key: 'ajoute', label: 'Ajoutant la raison r.' },
                { key: 'multiplie', label: 'Multipliant par la raison r.' },
                { key: 'eleve', label: 'Élevant au carré.' },
              ]}
              value={qArith}
              onChange={setQArith}
            />
            <QcmStep
              label="Dans une suite géométrique, on passe d'un terme au suivant en :"
              tone="science"
              options={[
                { key: 'multiplie', label: 'Multipliant par la raison q.' },
                { key: 'ajoute', label: 'Ajoutant la raison q.' },
                { key: 'divise', label: 'Soustrayant la raison q.' },
              ]}
              value={qGeo}
              onChange={setQGeo}
            />
            <QcmStep
              label="Les points (n ; uₙ) d'une suite arithmétique sont :"
              tone="science"
              options={[
                { key: 'alignes', label: 'Alignés (sur une droite).' },
                { key: 'courbe', label: 'Sur une courbe exponentielle.' },
                { key: 'cercle', label: 'Sur un cercle.' },
              ]}
              value={qPoints}
              onChange={setQPoints}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qArith || !qGeo || !qPoints || busy} onClick={handleValidate}>
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
              <strong>Arithmétique</strong> : uₙ₊₁ = uₙ + r, donc <strong>uₙ = u₀ + n·r</strong> — les points sont
              alignés (fonction affine de n). <strong>Géométrique</strong> : uₙ₊₁ = uₙ × q, donc{' '}
              <strong>uₙ = u₀·qⁿ</strong> — croissance exponentielle si q &gt; 1, décroissance si 0 &lt; q &lt; 1.
            </p>
            <p className="text-sm text-ink/60">
              C&apos;est pourquoi les intérêts <strong>composés</strong> (géométriques) battent les intérêts{' '}
              <strong>simples</strong> (arithmétiques) sur la durée — même principe que la croissance d&apos;une
              population.
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
    <div className="rounded-xl bg-sky-50 p-2 ring-1 ring-sky-100">
      <div className="text-[10px] uppercase tracking-wider text-sky-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-sky-800">{value}</div>
    </div>
  );
}
