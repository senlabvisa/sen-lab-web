'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Compass, Ruler, Shapes, Triangle } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Le triangle : nature, somme des angles et inégalité triangulaire
 * (Maths · 5ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (les 3 côtés) →
 * mesures (tableau des essais + droites remarquables) → QCM → bilan.
 * Contexte : la ferme triangulaire d'une charpente de toit en tôle et la
 * voile triangulaire des pirogues de Soumbédioune.
 *
 * Maths exactes : angles par la loi des cosinus (donc Â + B̂ + Ĉ = 180°
 * quoi que fasse l'élève), inégalité triangulaire stricte a < b + c.
 */

const TriangleScene = dynamic(() => import('./triangle-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'change' | '180' | '360' | null;
type Droites = 'aucune' | 'medianes' | 'mediatrices' | 'hauteurs';

const INTRO =
  "Sur la plage de Soumbédioune, les pirogues hissent une voile triangulaire. Sur les toits en tôle de Dakar, " +
  "la charpente est faite de fermes triangulaires. Pourquoi le triangle partout ? Parce qu'une fois ses trois " +
  "côtés fixés, il ne se déforme plus. Mais attention : le charpentier ne peut pas choisir n'importe quelles " +
  "longueurs. Aujourd'hui tu vas découvrir deux règles que tous les triangles du monde respectent.";

const CONCLUSION =
  "Bravo ! Retiens trois choses. Un : dans tout triangle, la somme des trois angles vaut cent quatre-vingts degrés, " +
  "c'est un angle plat. Deux : l'inégalité triangulaire, chaque côté doit être plus court que la somme des deux " +
  "autres, sinon les barres ne se rejoignent pas et le triangle est impossible. Trois : un triangle équilatéral a " +
  "trois côtés égaux et trois angles de soixante degrés, un triangle isocèle a deux côtés égaux et deux angles " +
  "égaux à la base. Enfin, les médianes se coupent au centre de gravité, les médiatrices au centre du cercle " +
  "circonscrit et les hauteurs à l'orthocentre.";

const clamp1 = (x: number) => Math.max(-1, Math.min(1, x));
const deg = (r: number) => (r * 180) / Math.PI;
const fr = (x: number, n = 1) => x.toFixed(n).replace('.', ',');

type Analyse = {
  possible: boolean;
  label: string;
  angA: number;
  angB: number;
  angC: number;
  somme: number;
  equilateral: boolean;
  isocele: boolean;
  rectangle: boolean;
  /** Longueur manquante quand le triangle est impossible (cm). */
  gap: number;
};

/** Angles exacts par la loi des cosinus + classification par côtés et par angles. */
function analyse(a: number, b: number, c: number): Analyse {
  const possible = a + b > c && a + c > b && b + c > a;
  if (!possible) {
    const [L, m1, m2] = [a, b, c].slice().sort((x, y) => y - x);
    return {
      possible: false,
      label: 'Impossible',
      angA: 0,
      angB: 0,
      angC: 0,
      somme: 0,
      equilateral: false,
      isocele: false,
      rectangle: false,
      gap: L - m1 - m2,
    };
  }
  const angA = deg(Math.acos(clamp1((b * b + c * c - a * a) / (2 * b * c))));
  const angB = deg(Math.acos(clamp1((a * a + c * c - b * b) / (2 * a * c))));
  const angC = 180 - angA - angB;
  const equilateral = a === b && b === c;
  const isocele = !equilateral && (a === b || b === c || a === c);
  const rectangle = [angA, angB, angC].some((x) => Math.abs(x - 90) < 0.05);
  let label = equilateral ? 'Équilatéral' : isocele ? 'Isocèle' : 'Quelconque';
  if (rectangle && !equilateral) label += ' rectangle';
  return { possible: true, label, angA, angB, angC, somme: angA + angB + angC, equilateral, isocele, rectangle, gap: 0 };
}

const PRESETS: Array<{ key: string; label: string; a: number; b: number; c: number }> = [
  { key: 'eq', label: 'Équilatéral 5-5-5', a: 5, b: 5, c: 5 },
  { key: 'iso', label: 'Isocèle 4-7-7', a: 4, b: 7, c: 7 },
  { key: 'rect', label: 'Rectangle 5-4-3', a: 5, b: 4, c: 3 },
  { key: 'qcq', label: 'Quelconque 8-6-5', a: 8, b: 6, c: 5 },
  { key: 'imp', label: 'Impossible 9-2-3', a: 9, b: 2, c: 3 },
];

const DROITES: Array<{ key: Droites; label: string; texte: string }> = [
  { key: 'aucune', label: 'Aucune', texte: 'Choisis une famille de droites remarquables à tracer.' },
  {
    key: 'medianes',
    label: 'Médianes',
    texte: 'La médiane joint un sommet au MILIEU du côté opposé. Les trois se coupent en G, le centre de gravité.',
  },
  {
    key: 'mediatrices',
    label: 'Médiatrices',
    texte:
      'La médiatrice d’un côté est perpendiculaire à ce côté en son milieu. Les trois se coupent en O, centre du cercle circonscrit (il passe par A, B et C).',
  },
  {
    key: 'hauteurs',
    label: 'Hauteurs',
    texte: 'La hauteur part d’un sommet PERPENDICULAIREMENT au côté opposé. Les trois se coupent en H, l’orthocentre.',
  },
];

type Essai = { key: string; a: number; b: number; c: number; label: string; somme: number; possible: boolean };

export function Triangles5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [a, setA] = useState(5);
  const [b, setB] = useState(4);
  const [c, setC] = useState(3);
  const [droites, setDroites] = useState<Droites>('aucune');
  const [droitesVues, setDroitesVues] = useState<Set<Droites>>(new Set());

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qIneg, setQIneg] = useState<string | null>(null);
  const [qSomme, setQSomme] = useState<string | null>(null);
  const [qMediane, setQMediane] = useState<string | null>(null);

  const cur = useMemo(() => analyse(a, b, c), [a, b, c]);

  const [essais, setEssais] = useState<Essai[]>([
    { key: '5-4-3', a: 5, b: 4, c: 3, label: 'Quelconque rectangle', somme: 180, possible: true },
  ]);

  function explore(na: number, nb: number, nc: number) {
    setA(na);
    setB(nb);
    setC(nc);
    const res = analyse(na, nb, nc);
    const key = `${na}-${nb}-${nc}`;
    setEssais((prev) =>
      prev.some((e) => e.key === key)
        ? prev
        : [...prev, { key, a: na, b: nb, c: nc, label: res.label, somme: res.somme, possible: res.possible }],
    );
  }

  function choisirDroites(d: Droites) {
    setDroites(d);
    if (d !== 'aucune') setDroitesVues((prev) => new Set(prev).add(d));
  }

  const vus = useMemo(
    () => ({
      equilateral: essais.some((e) => e.label === 'Équilatéral'),
      isocele: essais.some((e) => e.label.startsWith('Isocèle')),
      rectangle: essais.some((e) => e.label.includes('rectangle')),
      impossible: essais.some((e) => !e.possible),
    }),
    [essais],
  );

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(15, essais.length * 3); // exploration (15)
    if (vus.equilateral) s += 5; // cas rencontrés (20)
    if (vus.isocele) s += 5;
    if (vus.rectangle) s += 5;
    if (vus.impossible) s += 5;
    s += Math.min(12, droitesVues.size * 4); // droites remarquables (12)
    if (hypo === '180') s += 8; // hypothèse (8)
    if (qIneg === 'non') s += 15; // QCM (45)
    if (qSomme === '70') s += 15;
    if (qMediane === 'gravite') s += 15;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [essais, vus, droitesVues, hypo, qIneg, qSomme, qMediane]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'triangles-5eme',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          essais: essais.map((e) => ({ a: e.a, b: e.b, c: e.c, nature: e.label, somme: e.somme })),
          casVus: vus,
          droitesVues: Array.from(droitesVues),
          dernier: { a, b, c, nature: cur.label, angles: [cur.angA, cur.angB, cur.angC] },
          qcm: { qIneg, qSomme, qMediane },
        },
      },
      score,
    );
    setStep('done');
  }

  const manipOk = essais.length >= 4 && vus.impossible;
  const droitesInfo = DROITES.find((d) => d.key === droites) ?? DROITES[0];

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Triangle className="h-5 w-5" />
              </span>
              La ferme du charpentier
            </CardTitle>
            <Badge tone="maths">Maths · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pour poser un <strong>toit en tôle</strong>, le charpentier assemble des <strong>fermes triangulaires</strong> :
              trois barres, trois clous, et la structure ne se déforme plus. Même forme sur la{' '}
              <strong>voile des pirogues</strong> de Soumbédioune.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> découvrir que les trois angles d&apos;un triangle font{' '}
              <strong>toujours 180°</strong>, et qu&apos;avec certaines longueurs le triangle est{' '}
              <strong>impossible à fermer</strong>.
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
              <Shapes className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : le charpentier fabrique des fermes plates, d&apos;autres très pointues. Que devient la{' '}
            <strong>somme des trois angles</strong> quand la forme change ?
          </p>
          <QcmStep
            label="Mon hypothèse : Â + B̂ + Ĉ…"
            tone="violet"
            options={[
              { key: 'change', label: 'Change selon la forme du triangle' },
              { key: '180', label: 'Vaut toujours 180° (un angle plat)' },
              { key: '360', label: 'Vaut toujours 360° (un tour complet)' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-violet-700" /> Étape 2 — Coupe tes trois barres
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle les longueurs <strong>a = BC</strong>, <strong>b = CA</strong>, <strong>c = AB</strong> (1 carreau = 1 cm).
            Regarde les trois angles, puis le <strong>report des trois angles bout à bout</strong> sous la figure : ils forment
            un angle plat. Essaie aussi un triangle <strong>impossible</strong>.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <TriangleScene a={a} b={b} c={c} nature={cur.label} droites="aucune" showReport />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(
              [
                ['a', a, (v: number) => explore(v, b, c)],
                ['b', b, (v: number) => explore(a, v, c)],
                ['c', c, (v: number) => explore(a, b, v)],
              ] as const
            ).map(([n, v, fn]) => (
              <div key={n}>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor={`side-${n}`}>Côté {n}</Label>
                  <span className="font-mono text-violet-700">{v} cm</span>
                </div>
                <input
                  id={`side-${n}`}
                  type="range"
                  min={2}
                  max={9}
                  step={1}
                  value={v}
                  onChange={(e) => fn(Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.key} variant="soft" size="sm" onClick={() => explore(p.a, p.b, p.c)}>
                {p.label}
              </Button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="Nature" value={cur.label} />
            <Stat label="Â" value={cur.possible ? `${fr(cur.angA)}°` : '—'} />
            <Stat label="B̂" value={cur.possible ? `${fr(cur.angB)}°` : '—'} />
            <Stat label="Somme" value={cur.possible ? `${fr(cur.somme)}°` : '—'} />
          </div>

          <div
            className={
              'mt-3 rounded-xl p-3 text-xs ring-1 ' +
              (cur.possible
                ? 'bg-action-50 text-action-700 ring-action-100'
                : 'bg-alert-50 text-alert-700 ring-alert-100')
            }
          >
            {cur.possible ? (
              <>
                <strong>Inégalité triangulaire respectée :</strong> chaque côté est plus court que la somme des deux autres
                ({a} &lt; {b} + {c}, {b} &lt; {a} + {c}, {c} &lt; {a} + {b}).
              </>
            ) : (
              <>
                <strong>Triangle impossible :</strong> le côté le plus long dépasse la somme des deux autres — il manque{' '}
                {fr(cur.gap)} cm. Les deux barres courtes ont beau pivoter, elles ne se rejoignent jamais.
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">{essais.length} triangle(s) testé(s)</span>
            <Button variant="gradient" disabled={!manipOk} onClick={() => setStep('mesures')}>
              {!manipOk
                ? essais.length < 4
                  ? `Teste ${4 - essais.length} triangle(s) de plus`
                  : 'Teste un triangle impossible'
                : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-violet-700" /> Étape 3 — Mesures et droites remarquables
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>

          <p className="mb-3 text-sm text-ink/70">
            Voici tous les triangles que tu as construits. Regarde la dernière colonne : la somme ne bouge jamais.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">a · b · c</th>
                  <th className="px-3 py-2 text-left">Nature</th>
                  <th className="px-3 py-2 text-left">Â + B̂ + Ĉ</th>
                </tr>
              </thead>
              <tbody>
                {essais.slice(-14).map((e) => (
                  <tr key={e.key} className={'border-t border-night-100 ' + (e.possible ? '' : 'bg-alert-50/60')}>
                    <td className="px-3 py-2 font-mono">
                      {e.a} · {e.b} · {e.c}
                    </td>
                    <td className="px-3 py-2">{e.label}</td>
                    <td className="px-3 py-2 font-mono font-semibold">{e.possible ? `${fr(e.somme)}°` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-3 mt-5 text-sm text-ink/70">
            Dans un triangle, trois familles de droites se coupent chacune en un seul point. Trace-les sur le triangle{' '}
            <span className="font-mono">{a}-{b}-{c}</span>.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.filter((p) => p.key !== 'imp').map((p) => (
              <Button key={p.key} variant="ghost" size="sm" onClick={() => explore(p.a, p.b, p.c)}>
                {p.label}
              </Button>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <TriangleScene a={a} b={b} c={c} nature={cur.label} droites={droites} showReport={false} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {DROITES.map((d) => (
              <Button
                key={d.key}
                variant={droites === d.key ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => choisirDroites(d.key)}
              >
                {d.label}
              </Button>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-ink/75 ring-1 ring-violet-100">{droitesInfo.texte}</p>

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
              label="Le charpentier a des barres de 3 cm, 4 cm et 9 cm. Peut-il fermer un triangle ?"
              tone="violet"
              options={[
                { key: 'non', label: 'Non, car 9 > 3 + 4 : les deux barres courtes ne se rejoignent pas' },
                { key: 'oui', label: 'Oui, on peut toujours fermer un triangle' },
                { key: 'angles', label: 'Non, car la somme des angles dépasserait 180°' },
              ]}
              value={qIneg}
              onChange={setQIneg}
            />
            <QcmStep
              label="Dans un triangle, deux angles mesurent 70° et 40°. Le troisième mesure…"
              tone="violet"
              hint="Utilise Â + B̂ + Ĉ = 180°."
              options={[
                { key: '70', label: '70°' },
                { key: '80', label: '80°' },
                { key: '110', label: '110°' },
              ]}
              value={qSomme}
              onChange={setQSomme}
            />
            <QcmStep
              label="Les trois médianes d'un triangle se coupent en un point appelé…"
              tone="violet"
              options={[
                { key: 'gravite', label: 'Le centre de gravité (G)' },
                { key: 'ortho', label: "L'orthocentre (H)" },
                { key: 'circons', label: 'Le centre du cercle circonscrit (O)' },
              ]}
              value={qMediane}
              onChange={setQMediane}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qIneg || !qSomme || !qMediane || busy} onClick={handleValidate}>
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
            <ul className="space-y-1.5 text-sm">
              <li>
                <strong>Somme des angles :</strong> Â + B̂ + Ĉ = <strong>180°</strong> dans tout triangle — les trois angles
                mis bout à bout forment un angle plat.
              </li>
              <li>
                <strong>Inégalité triangulaire :</strong> a &lt; b + c (et pareil pour b et c). Sinon les barres ne se
                rejoignent pas : le triangle est impossible.
              </li>
              <li>
                <strong>Nature :</strong> équilatéral = 3 côtés égaux et 3 angles de 60° ; isocèle = 2 côtés égaux et les 2
                angles de la base égaux ; rectangle = un angle de 90°.
              </li>
              <li>
                <strong>Droites remarquables :</strong> médianes → G (centre de gravité), médiatrices → O (centre du cercle
                circonscrit), hauteurs → H (orthocentre).
              </li>
            </ul>
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
