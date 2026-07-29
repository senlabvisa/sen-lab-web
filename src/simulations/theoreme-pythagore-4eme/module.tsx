'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Grid3x3, Play, Ruler, Squircle, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Théorème de Pythagore et sa réciproque (4ème, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (les trois carrés
 * pavés de carreaux, transfert animé) → mesures → réciproque (triplets) →
 * QCM → bilan.
 *
 * Maths justes : le théorème ne vaut QUE dans un triangle rectangle ;
 * l'hypoténuse est le côté opposé à l'angle droit (et le plus long) ;
 * réciproque : si c² = a² + b² alors le triangle est rectangle.
 * Contexte : l'équerrage d'une fondation avec la corde à 13 nœuds.
 */

const PythagoreScene = dynamic(() => import('./pythagore-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'reciproque' | 'qcm' | 'done';
type HypoRep = 'egale' | 'plusgrande' | 'sansrapport' | null;

type Triplet = { id: string; a: number; b: number; c: number; story: string };

const TRIPLETS: Triplet[] = [
  { id: 't345', a: 3, b: 4, c: 5, story: 'La corde à 13 nœuds du maçon (3 + 4 + 5 = 12 intervalles)' },
  { id: 't6810', a: 6, b: 8, c: 10, story: 'Fondation de 6 m sur 8 m à Diamniadio' },
  { id: 't51213', a: 5, b: 12, c: 13, story: 'Hauban d’un pylône télécom de 12 m' },
  { id: 't567', a: 5, b: 6, c: 7, story: 'Traçage fait à l’œil, sans corde' },
  { id: 't458', a: 4, b: 5, c: 8, story: 'Cordeau trop lâche : le coin s’ouvre' },
];

const INTRO =
  "Sur un chantier à Diamniadio, le maçon doit tracer un angle parfaitement droit avant de couler les fondations. " +
  "Il n'a pas d'équerre géante : il prend une corde à 13 nœuds, donc 12 intervalles égaux, et forme un triangle " +
  "de 3, 4 et 5 intervalles. L'angle obtenu est droit, à tous les coups. Pourquoi ? Parce que 3² + 4² = 5². " +
  "Aujourd'hui tu vas voir cette égalité avec tes yeux : on construit un vrai carré sur chacun des trois côtés " +
  "du triangle rectangle, et on compte les carreaux.";

const CONCLUSION =
  "Bravo ! Dans un triangle rectangle, le carré construit sur l'hypoténuse a exactement la même aire que les deux " +
  "autres carrés réunis : c égale a au carré plus b au carré. L'hypoténuse est le côté opposé à l'angle droit, " +
  "c'est toujours le plus long. Attention : ce théorème ne marche que dans un triangle rectangle. " +
  "Et sa réciproque te donne un outil de chantier : si le carré du plus grand côté est égal à la somme des carrés " +
  "des deux autres, alors le triangle est rectangle. C'est tout le secret de la corde à 13 nœuds.";

export function Pythagore4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  // ── Partie 1 : les aires
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [pairs, setPairs] = useState<Set<string>>(new Set(['3-4']));
  const [transfer, setTransfer] = useState(false);
  const [sawTransfer, setSawTransfer] = useState(false);

  // ── Partie 2 : la réciproque
  const [tripletId, setTripletId] = useState<string>(TRIPLETS[0].id);
  const [tested, setTested] = useState<Set<string>>(new Set([TRIPLETS[0].id]));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qHypo, setQHypo] = useState<string | null>(null);
  const [qCalc, setQCalc] = useState<string | null>(null);
  const [qRecip, setQRecip] = useState<string | null>(null);

  const c = useMemo(() => Math.hypot(a, b), [a, b]);
  const triplet = useMemo(() => TRIPLETS.find((t) => t.id === tripletId) ?? TRIPLETS[0], [tripletId]);

  function setSide(nextA: number, nextB: number) {
    setA(nextA);
    setB(nextB);
    setPairs((prev) => new Set(prev).add(`${nextA}-${nextB}`));
  }

  function pickTriplet(id: string) {
    setTripletId(id);
    setTested((prev) => new Set(prev).add(id));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, pairs.size * 5); // exploration des aires
    if (sawTransfer) s += 5; // a lancé le transfert des carreaux
    s += Math.min(15, tested.size * 5); // exploration de la réciproque
    if (hypo === 'egale') s += 10;
    if (qHypo === 'oppose') s += 15;
    if (qCalc === '10') s += 15;
    if (qRecip === 'rect') s += 20;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [pairs, sawTransfer, tested, hypo, qHypo, qCalc, qRecip]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'theoreme-pythagore-4eme',
        version: '2.0',
        steps: {
          pairsTested: Array.from(pairs),
          lastPair: { a, b, c2: a * a + b * b, c: Number(c.toFixed(3)) },
          sawTransfer,
          tripletsTested: Array.from(tested),
          hypothesis: hypo,
          qcm: { qHypo, qCalc, qRecip },
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
                <Squircle className="h-5 w-5" />
              </span>
              La corde à 13 nœuds du maçon
            </CardTitle>
            <Badge tone="maths">Maths · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Sur un chantier à <strong>Diamniadio</strong>, le maçon doit tracer un angle parfaitement droit avant de
              couler les fondations. Sans équerre géante, il utilise une <strong>corde à 13 nœuds</strong> : 12
              intervalles égaux, qu&apos;il replie en triangle <strong>3 – 4 – 5</strong>. L&apos;angle est droit à tous
              les coups.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> construire un vrai carré sur chacun des trois côtés d&apos;un triangle
              rectangle, compter les carreaux et vérifier que <strong>a² + b² = c²</strong>. Puis utiliser la{' '}
              <strong>réciproque</strong> pour reconnaître un vrai angle droit.
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
            <Badge tone="maths">1/5</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            On dessine un triangle <strong>rectangle</strong> et on construit un carré sur chacun de ses côtés :
            l&apos;aire du carré bleu vaut a², celle du carré orange vaut b², celle du grand carré vaut c². Selon toi,
            quand on change a et b…
          </p>
          <QcmStep
            label="Mon hypothèse : l'aire du grand carré (c²) est…"
            tone="violet"
            options={[
              { key: 'egale', label: 'Toujours égale à a² + b², quels que soient a et b.' },
              { key: 'plusgrande', label: 'Toujours plus grande que a² + b².' },
              { key: 'sansrapport', label: 'Sans rapport avec a² et b² : ça dépend du dessin.' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5 text-violet-700" /> Étape 2 — Compte les carreaux
            </CardTitle>
            <Badge tone="maths">2/5</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle les deux côtés de l&apos;angle droit, <strong>a</strong> et <strong>b</strong>. Compte les carreaux
            bleus (a²) et orange (b²), puis lance le <strong>transfert</strong> : ils partent tous remplir le grand
            carré. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <PythagoreScene a={a} b={b} mode="aires" transfer={transfer} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="cote-a">Côté a (bleu)</Label>
                <span className="font-mono text-blue-700">{a}</span>
              </div>
              <input
                id="cote-a"
                type="range"
                min={2}
                max={6}
                step={1}
                value={a}
                onChange={(e) => setSide(Number(e.target.value), b)}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="cote-b">Côté b (orange)</Label>
                <span className="font-mono text-amber-700">{b}</span>
              </div>
              <input
                id="cote-b"
                type="range"
                min={2}
                max={6}
                step={1}
                value={b}
                onChange={(e) => setSide(a, Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            <Stat label="a²" value={`${a * a}`} />
            <Stat label="b²" value={`${b * b}`} />
            <Stat label="a² + b²" value={`${a * a + b * b}`} highlight />
            <Stat label="c²" value={`${a * a + b * b}`} highlight />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button
              variant={transfer ? 'outline' : 'soft'}
              size="sm"
              onClick={() => {
                setTransfer((t) => !t);
                setSawTransfer(true);
              }}
            >
              <Play className="h-4 w-4" /> {transfer ? 'Arrêter le transfert' : 'Transférer les carreaux'}
            </Button>
            <span className="text-xs text-ink/50">Réglages testés : {pairs.size}</span>
            <Button variant="gradient" disabled={pairs.size < 3} onClick={() => setStep('mesures')}>
              {pairs.size < 3 ? `Teste ${3 - pairs.size} réglage(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-violet-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="maths">3/5</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici tous les triangles rectangles que tu as construits. Compare la colonne{' '}
            <strong>a² + b²</strong> et la colonne <strong>c²</strong>.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">a</th>
                  <th className="px-3 py-2 text-left">b</th>
                  <th className="px-3 py-2 text-center">a²</th>
                  <th className="px-3 py-2 text-center">b²</th>
                  <th className="px-3 py-2 text-center">a² + b²</th>
                  <th className="px-3 py-2 text-center">c²</th>
                  <th className="px-3 py-2 text-center">c</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(pairs)
                  .map((k) => k.split('-').map(Number) as [number, number])
                  .sort((p, q) => p[0] - q[0] || p[1] - q[1])
                  .map(([pa, pb]) => (
                    <tr key={`${pa}-${pb}`} className="border-t border-night-100">
                      <td className="px-3 py-2 font-mono text-blue-700">{pa}</td>
                      <td className="px-3 py-2 font-mono text-amber-700">{pb}</td>
                      <td className="px-3 py-2 text-center font-mono">{pa * pa}</td>
                      <td className="px-3 py-2 text-center font-mono">{pb * pb}</td>
                      <td className="bg-violet-50/60 px-3 py-2 text-center font-mono font-bold text-violet-800">
                        {pa * pa + pb * pb}
                      </td>
                      <td className="bg-emerald-50/60 px-3 py-2 text-center font-mono font-bold text-emerald-800">
                        {pa * pa + pb * pb}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{Math.hypot(pa, pb).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            Les deux dernières colonnes sont <strong>toujours égales</strong> : c&apos;est le{' '}
            <strong>théorème de Pythagore</strong>. Dans un triangle <strong>rectangle</strong> en C,{' '}
            <strong>AB² = CA² + CB²</strong>, c&apos;est-à-dire <strong>c² = a² + b²</strong> où c est
            l&apos;hypoténuse, le côté <em>opposé à l&apos;angle droit</em> (et le plus long). Pour trouver c, on prend
            la racine carrée : c = √(a² + b²) ={' '}
            <strong>
              √{a * a + b * b} ≈ {c.toFixed(2)}
            </strong>
            .
          </p>
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
            <strong>Attention :</strong> cette égalité n&apos;est vraie que si le triangle est{' '}
            <strong>rectangle</strong>. Dans un triangle quelconque, elle est fausse — tu vas le voir tout de suite.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Reprendre les carreaux
            </Button>
            <Button variant="gradient" onClick={() => setStep('reciproque')}>
              Passer à la réciproque <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'reciproque' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-violet-700" /> Étape 4 — La réciproque : est-ce bien un angle droit ?
            </CardTitle>
            <Badge tone="maths">4/5</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le maçon tend sa corde et forme un triangle de trois longueurs imposées. Le triangle est-il vraiment
            rectangle ? Choisis un triplet, compare <strong>a² + b²</strong> et <strong>c²</strong> (c = le plus grand
            côté) et lis l&apos;angle mesuré en C.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {TRIPLETS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTriplet(t.id)}
                className={
                  'rounded-xl border px-3 py-2 text-sm font-mono transition ' +
                  (t.id === tripletId
                    ? 'border-violet-500 bg-violet-50 font-bold text-violet-800'
                    : 'border-ink/10 text-ink/70 hover:border-violet-200 hover:bg-violet-50/50')
                }
              >
                {t.a} · {t.b} · {t.c}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <PythagoreScene a={triplet.a} b={triplet.b} mode="reciproque" cTest={triplet.c} />
            </div>
          </div>
          <p className="mt-3 text-xs italic text-ink/60">{triplet.story}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="a² + b²" value={`${triplet.a ** 2 + triplet.b ** 2}`} />
            <Stat label="c²" value={`${triplet.c ** 2}`} />
            <Stat
              label="Verdict"
              value={triplet.a ** 2 + triplet.b ** 2 === triplet.c ** 2 ? 'Rectangle' : 'Non rectangle'}
              highlight
            />
          </div>
          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            <strong>Réciproque du théorème :</strong> si <strong>c² = a² + b²</strong> (c étant le plus grand côté),
            alors le triangle est <strong>rectangle</strong>, et l&apos;angle droit est celui <em>opposé</em> au côté c.
            Sinon, il ne l&apos;est pas : l&apos;angle mesuré s&apos;écarte de 90°.
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">Triplets testés : {tested.size}</span>
            <Button variant="gradient" disabled={tested.size < 3} onClick={() => setStep('qcm')}>
              {tested.size < 3 ? `Teste ${3 - tested.size} triplet(s) de plus` : 'Conclure'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 5 — Valide ta compréhension</CardTitle>
            <Badge tone="maths">5/5</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Dans un triangle rectangle, l'hypoténuse est…"
              tone="violet"
              options={[
                { key: 'oppose', label: "Le côté opposé à l'angle droit — et c'est toujours le plus long." },
                { key: 'adjacent', label: "L'un des deux côtés qui forment l'angle droit." },
                { key: 'petit', label: 'Le plus petit côté du triangle.' },
              ]}
              value={qHypo}
              onChange={setQHypo}
            />
            <QcmStep
              label="Le maçon mesure 6 m sur un mur et 8 m sur le mur perpendiculaire. Quelle doit être la diagonale pour que l'angle soit droit ?"
              tone="violet"
              hint="c² = 6² + 8² = 36 + 64 = 100, puis c = √100."
              options={[
                { key: '10', label: '10 m' },
                { key: '14', label: '14 m (6 + 8)' },
                { key: '7', label: '7 m' },
              ]}
              value={qCalc}
              onChange={setQCalc}
            />
            <QcmStep
              label="Un triangle a pour côtés 9 cm, 12 cm et 15 cm. Que peux-tu affirmer ?"
              tone="violet"
              options={[
                { key: 'rect', label: 'Il est rectangle, car 15² = 225 et 9² + 12² = 81 + 144 = 225 (réciproque).' },
                { key: 'non', label: 'Il n’est pas rectangle, car 9 + 12 ≠ 15.' },
                { key: 'inconnu', label: 'On ne peut rien dire sans mesurer l’angle au rapporteur.' },
              ]}
              value={qRecip}
              onChange={setQRecip}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('reciproque')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qHypo || !qCalc || !qRecip || busy} onClick={handleValidate}>
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
              <strong>Théorème de Pythagore :</strong> si le triangle ABC est rectangle en C, alors{' '}
              <strong>AB² = CA² + CB²</strong>, soit <strong>c² = a² + b²</strong>. Le carré construit sur
              l&apos;hypoténuse a exactement l&apos;aire des deux autres carrés réunis — tu l&apos;as vu carreau par
              carreau.
            </p>
            <p>
              <strong>Réciproque :</strong> si <strong>c² = a² + b²</strong> avec c le plus grand côté, alors le
              triangle est rectangle en C. C&apos;est ce qui rend la <strong>corde à 13 nœuds</strong> (3 – 4 – 5)
              infaillible sur un chantier.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Le piège à éviter :</strong> Pythagore ne s&apos;applique <em>que</em> dans un triangle
              rectangle. Pour 5 – 6 – 7, on a 5² + 6² = 61 ≠ 49 = 7² : le triangle n&apos;est pas rectangle.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={'rounded-xl p-2 ring-1 ' + (highlight ? 'bg-violet-50 ring-violet-200' : 'bg-night-50 ring-night-100')}>
      <div className={'text-[10px] uppercase tracking-wider ' + (highlight ? 'text-violet-700/70' : 'text-ink/45')}>
        {label}
      </div>
      <div className={'font-mono text-sm font-bold ' + (highlight ? 'text-violet-800' : 'text-ink/80')}>{value}</div>
    </div>
  );
}
