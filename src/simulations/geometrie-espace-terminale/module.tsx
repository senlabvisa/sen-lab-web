'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Box, CheckCircle2, Compass, Gauge, Scissors, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import {
  cuttingRange,
  distanceToPlane,
  fmtVector,
  lineAGvsPlane,
  normalLength,
  planeEquation,
  planeVsBase,
  polygonArea,
  sectionPolygon,
  shapeName,
} from './geometry';

/**
 * TP — Géométrie dans l'espace : plan, vecteur normal et sections du cube
 * (Terminale S, Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (a, b, c, d) →
 * mesures (tableau des coupes enregistrées) → QCM → bilan.
 *
 * Maths justes, tout est calculé et rien n'est dessiné « à la main » :
 *  - le vecteur n(a ; b ; c) est normal au plan ax + by + cz + d = 0 ;
 *  - la section est l'intersection RÉELLE du plan avec les 12 arêtes du cube ;
 *  - d(M ; P) = |ax₀ + by₀ + cz₀ + d| / √(a² + b² + c²) ;
 *  - (AG) : x = t, y = t, z = t est parallèle au plan ⟺ a + b + c = 0.
 *
 * Contexte : chantier de Diamniadio — tailler un bloc de béton cubique pour
 * poser une toiture inclinée qui porte un panneau solaire.
 */

const SpaceScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'carre' | 'poly36' | 'cercle' | null;

type Coupe = {
  eq: string;
  n: string;
  cotes: number;
  forme: string;
  aire: number;
  distG: number;
  incl: number;
};

const INTRO =
  "Sur le chantier de Diamniadio, un bloc de béton cubique doit être taillé selon un plan bien précis, " +
  "pour recevoir une toiture inclinée qui portera un panneau solaire. " +
  "Pour décrire ce plan, une seule équation suffit : a x plus b y plus c z plus d égale zéro. " +
  "Le triplet a, b, c est un vecteur normal : il est perpendiculaire au plan, c'est lui qui donne l'orientation. " +
  "Aujourd'hui tu orientes ce plan de coupe et tu observes la forme de la section du cube.";

const CONCLUSION =
  "Bravo ! Un plan de l'espace a pour équation cartésienne a x plus b y plus c z plus d égale zéro, " +
  "et le vecteur de coordonnées a, b, c lui est normal, c'est-à-dire perpendiculaire. " +
  "Changer a, b et c fait pivoter le plan ; changer d le fait glisser parallèlement à lui-même. " +
  "La distance d'un point au plan vaut la valeur absolue de a x zéro plus b y zéro plus c z zéro plus d, " +
  "divisée par la racine carrée de a au carré plus b au carré plus c au carré. " +
  "Enfin, une droite est parallèle au plan quand son vecteur directeur est orthogonal au vecteur normal.";

const PRESETS: { label: string; a: number; b: number; c: number }[] = [
  { label: 'n(1 ; 1 ; 1)', a: 1, b: 1, c: 1 },
  { label: 'n(0 ; 0 ; 1)', a: 0, b: 0, c: 1 },
  { label: 'n(1 ; 1 ; 0)', a: 1, b: 1, c: 0 },
  { label: 'n(2 ; 1 ; 1)', a: 2, b: 1, c: 1 },
];

const round2 = (v: number) => Math.round(v * 100) / 100;

export function GeometrieEspaceTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [c, setC] = useState(1);
  const [d, setD] = useState(-0.5);

  const [formes, setFormes] = useState<Set<number>>(new Set());
  const [coupes, setCoupes] = useState<Coupe[]>([]);
  const [vuParallele, setVuParallele] = useState(false);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qNormal, setQNormal] = useState<string | null>(null);
  const [qDist, setQDist] = useState<string | null>(null);
  const [qDroite, setQDroite] = useState<string | null>(null);

  const nLen = normalLength(a, b, c);
  const valide = nLen > 1e-9;
  const range = useMemo(() => cuttingRange(a, b, c), [a, b, c]);
  const poly = useMemo(() => sectionPolygon(a, b, c, d), [a, b, c, d]);
  const aire = useMemo(() => polygonArea(poly), [poly]);
  const distG = distanceToPlane(a, b, c, d, [1, 1, 1]);
  const base = useMemo(() => planeVsBase(a, b, c), [a, b, c]);
  const droite = useMemo(() => lineAGvsPlane(a, b, c, d), [a, b, c, d]);
  const eq = planeEquation(a, b, c, d);

  // Mémorise les formes de section rencontrées (3, 4, 5 ou 6 côtés).
  useEffect(() => {
    if (poly.length < 3) return;
    setFormes((prev) => (prev.has(poly.length) ? prev : new Set(prev).add(poly.length)));
  }, [poly]);

  useEffect(() => {
    if (droite.kind !== 'secante') setVuParallele(true);
  }, [droite]);

  /**
   * Change le vecteur normal en gardant la position RELATIVE du plan dans le
   * cube : le plan pivote sans sortir du solide (d est recalculé).
   */
  const setNormale = useCallback(
    (na: number, nb: number, nc: number) => {
      const old = cuttingRange(a, b, c);
      const rel = old.dMax > old.dMin ? (d - old.dMin) / (old.dMax - old.dMin) : 0.5;
      const next = cuttingRange(na, nb, nc);
      setA(na);
      setB(nb);
      setC(nc);
      if (next.dMax > next.dMin) setD(round2(next.dMin + rel * (next.dMax - next.dMin)));
    },
    [a, b, c, d],
  );

  function enregistrer() {
    if (poly.length < 3) return;
    setCoupes((prev) => {
      if (prev.some((x) => x.eq === eq)) return prev;
      return [
        ...prev,
        {
          eq,
          n: fmtVector('n', a, b, c),
          cotes: poly.length,
          forme: shapeName(poly.length),
          aire,
          distG,
          incl: base.angle,
        },
      ].slice(0, 8);
    });
  }

  const explore = formes.size >= 3 && coupes.length >= 2;

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, formes.size * 5); // formes de section découvertes (3,4,5,6)
    s += Math.min(10, coupes.length * 4); // coupes consignées dans le tableau
    if (hypo === 'poly36') s += 8; // hypothèse juste
    if (qNormal === 'normal') s += 22;
    if (qDist === 'formule') s += 22;
    if (qDroite === 'somme0') s += 18;
    return Math.min(100, Math.round(s));
  }, [formes, coupes, hypo, qNormal, qDist, qDroite]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'geometrie-espace-terminale',
        version: '2.0',
        steps: {
          plan: { a, b, c, d, equation: eq },
          formesDecouvertes: Array.from(formes).sort((x, y) => x - y),
          coupes,
          vuDroiteParallele: vuParallele,
          hypothesis: hypo,
          qcm: { qNormal, qDist, qDroite },
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
                <Box className="h-5 w-5" />
              </span>
              Couper un cube par un plan
            </CardTitle>
            <Badge tone="maths">Maths · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Sur le chantier de <strong>Diamniadio</strong>, un bloc de béton cubique doit être taillé selon un plan
              précis pour recevoir une <strong>toiture inclinée</strong> qui portera un panneau solaire. On repère le
              bloc dans le repère <strong>(A ; ı⃗, ȷ⃗, k⃗)</strong> : c&apos;est le cube ABCDEFGH dont les sommets ont
              pour coordonnées des 0 et des 1.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> piloter le plan de coupe <strong>(P) : ax + by + cz + d = 0</strong> grâce à
              son <strong>vecteur normal n⃗(a ; b ; c)</strong> et au nombre d, puis observer la{' '}
              <strong>section</strong> du cube — triangle, quadrilatère, pentagone ou hexagone.
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
            Avant de manipuler : quand on coupe un cube par un plan, quelles formes la{' '}
            <strong>section</strong> peut-elle prendre ?
          </p>
          <QcmStep
            label="Mon hypothèse : la section d'un cube par un plan est…"
            tone="violet"
            options={[
              { key: 'carre', label: 'Toujours un carré ou un rectangle' },
              { key: 'poly36', label: 'Un polygone de 3 à 6 côtés selon l’orientation du plan' },
              { key: 'cercle', label: 'Parfois un cercle, si le plan est bien placé' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
            hint="Le cube a 6 faces : la section rencontre au plus une fois chacune d’elles."
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
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Oriente le plan de coupe
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle le vecteur normal <strong>n⃗(a ; b ; c)</strong> — la flèche rouge, toujours perpendiculaire à la
            section orange — puis fais glisser <strong>d</strong> pour déplacer le plan. Tourne la scène avec ta souris
            ou ton doigt. Essaie d&apos;obtenir un <strong>triangle</strong>, un <strong>quadrilatère</strong> et un{' '}
            <strong>hexagone</strong>.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <SpaceScene a={a} b={b} c={c} d={d} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Slider id="ga" label="a (composante x de n⃗)" value={a} min={-3} max={3} step={1} onChange={(v) => setNormale(v, b, c)} />
            <Slider id="gb" label="b (composante y de n⃗)" value={b} min={-3} max={3} step={1} onChange={(v) => setNormale(a, v, c)} />
            <Slider id="gc" label="c (composante z de n⃗)" value={c} min={-3} max={3} step={1} onChange={(v) => setNormale(a, b, v)} />
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="gd">d (fait glisser le plan sans le faire pivoter)</Label>
              <span className="font-mono text-violet-700">{d.toFixed(2)}</span>
            </div>
            <input
              id="gd"
              type="range"
              min={round2(range.dMin - 0.6)}
              max={round2(range.dMax + 0.6)}
              step={0.05}
              value={d}
              onChange={(e) => setD(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <p className="mt-1 text-[11px] text-ink/55">
              Le plan coupe le cube seulement si d est entre{' '}
              <span className="font-mono">{range.dMin.toFixed(2)}</span> et{' '}
              <span className="font-mono">{range.dMax.toFixed(2)}</span>.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant={a === p.a && b === p.b && c === p.c ? 'gradient' : 'outline'}
                onClick={() => setNormale(p.a, p.b, p.c)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="Équation (P)" value={eq} mono />
            <Stat label="Section" value={valide && poly.length >= 3 ? `${shapeName(poly.length)} (${poly.length})` : 'aucune'} />
            <Stat label="‖n⃗‖" value={nLen.toFixed(2)} />
            <Stat label="d(G ; P)" value={Number.isFinite(distG) ? distG.toFixed(2) : '—'} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {[3, 4, 5, 6].map((k) => (
              <Badge key={k} tone={formes.has(k) ? 'maths' : 'neutral'}>
                {formes.has(k) ? '✓' : '○'} {shapeName(k)}
              </Badge>
            ))}
            <Badge tone={coupes.length >= 2 ? 'maths' : 'neutral'}>{coupes.length} coupe(s) enregistrée(s)</Badge>
          </div>
          {!valide && (
            <p className="mt-2 rounded-xl bg-rose-50 p-2 text-xs text-rose-800 ring-1 ring-rose-100">
              n⃗(0 ; 0 ; 0) est le vecteur nul : ce n&apos;est plus l&apos;équation d&apos;un plan. Remets au moins une
              composante non nulle.
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" disabled={poly.length < 3} onClick={enregistrer}>
              <Scissors className="h-4 w-4" /> Enregistrer cette coupe
            </Button>
            <Button variant="gradient" disabled={!explore} onClick={() => setStep('mesures')}>
              {explore ? 'Voir mes mesures' : 'Trouve 3 formes + enregistre 2 coupes'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-violet-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Les coupes que tu as enregistrées (cube d&apos;arête 1, donc aires en unités d&apos;aire) :
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Équation du plan</th>
                  <th className="px-3 py-2 text-left">Normal</th>
                  <th className="px-3 py-2 text-left">Section</th>
                  <th className="px-3 py-2 text-left">Aire</th>
                  <th className="px-3 py-2 text-left">d(G ; P)</th>
                  <th className="px-3 py-2 text-left">Angle / base</th>
                </tr>
              </thead>
              <tbody>
                {coupes.map((k) => (
                  <tr key={k.eq} className="border-t border-night-100">
                    <td className="px-3 py-2 font-mono text-xs">{k.eq}</td>
                    <td className="px-3 py-2 font-mono text-xs">{k.n}</td>
                    <td className="px-3 py-2">
                      {k.forme} <span className="text-ink/50">({k.cotes} côtés)</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{k.aire.toFixed(3)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{Number.isFinite(k.distG) ? k.distG.toFixed(2) : '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{Number.isFinite(k.incl) ? `${k.incl.toFixed(0)}°` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <p className="rounded-xl bg-violet-50 p-3 text-violet-900 ring-1 ring-violet-100">
              <strong>Ce qu&apos;il faut retenir.</strong> Le triplet (a ; b ; c) est un{' '}
              <strong>vecteur normal</strong> au plan : il donne son orientation. Le nombre d ne change pas
              l&apos;orientation, il fait <strong>glisser</strong> le plan parallèlement à lui-même — c&apos;est pour ça
              que la section change de forme quand tu bouges d.
            </p>
            <p className="rounded-xl bg-sky-50 p-3 text-sky-900 ring-1 ring-sky-100">
              <strong>Droite et plan.</strong> La grande diagonale (AG) a pour représentation paramétrique{' '}
              <span className="font-mono">x = t, y = t, z = t</span> (t ∈ ℝ), de vecteur directeur u⃗(1 ; 1 ; 1). Elle
              est <strong>parallèle</strong> au plan exactement quand n⃗·u⃗ = a + b + c = 0. Avec ton réglage actuel,
              a + b + c = <span className="font-mono">{a + b + c}</span> →{' '}
              <strong>
                {droite.kind === 'secante'
                  ? `sécante (elle coupe le plan en t = ${droite.t.toFixed(2)})`
                  : droite.kind === 'incluse'
                    ? 'incluse dans le plan'
                    : 'strictement parallèle au plan'}
              </strong>
              .
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-100">
              <strong>Plan et plan.</strong> Ton plan est parallèle à la base (ABC) si n⃗ est colinéaire à k⃗(0 ; 0 ; 1),
              c&apos;est-à-dire si a = b = 0. Sinon, l&apos;angle entre les deux plans est celui de leurs normales :
              ici <span className="font-mono">{Number.isFinite(base.angle) ? `${base.angle.toFixed(0)}°` : '—'}</span>.
              Un panneau solaire à Dakar se cale autour de 15°, la latitude de la ville.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Re-manipuler
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
              label="Dans l'équation cartésienne ax + by + cz + d = 0, le triplet (a ; b ; c) donne :"
              tone="violet"
              options={[
                { key: 'normal', label: 'Un vecteur normal au plan (perpendiculaire au plan)' },
                { key: 'directeur', label: 'Un vecteur directeur du plan (contenu dans le plan)' },
                { key: 'point', label: 'Les coordonnées d’un point du plan' },
              ]}
              value={qNormal}
              onChange={setQNormal}
            />
            <QcmStep
              label="La distance du point M(x₀ ; y₀ ; z₀) au plan (P) : ax + by + cz + d = 0 vaut :"
              tone="violet"
              options={[
                { key: 'formule', label: '|ax₀ + by₀ + cz₀ + d| / √(a² + b² + c²)' },
                { key: 'brut', label: 'ax₀ + by₀ + cz₀ + d' },
                { key: 'sansnorme', label: '|ax₀ + by₀ + cz₀ + d| / (a + b + c)' },
              ]}
              value={qDist}
              onChange={setQDist}
            />
            <QcmStep
              label="La droite de représentation paramétrique x = t, y = t, z = t est parallèle au plan (P) si et seulement si :"
              tone="violet"
              options={[
                { key: 'somme0', label: 'a + b + c = 0' },
                { key: 'd0', label: 'd = 0' },
                { key: 'abc', label: 'a = b = c' },
              ]}
              value={qDroite}
              onChange={setQDroite}
              hint="La droite est parallèle au plan quand son vecteur directeur est orthogonal au vecteur normal."
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qNormal || !qDist || !qDroite || busy} onClick={handleValidate}>
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
              Un plan de l&apos;espace s&apos;écrit <strong>ax + by + cz + d = 0</strong> et{' '}
              <strong>n⃗(a ; b ; c)</strong> lui est <strong>normal</strong>. Faire varier a, b, c fait{' '}
              <strong>pivoter</strong> le plan ; faire varier d le fait <strong>glisser</strong>.
            </p>
            <p>
              La section d&apos;un cube est un polygone de <strong>3 à 6 côtés</strong> (jamais plus : le cube n&apos;a
              que 6 faces). La distance d&apos;un point au plan vaut{' '}
              <strong>|ax₀ + by₀ + cz₀ + d| / √(a² + b² + c²)</strong>, et une droite de vecteur directeur u⃗ est
              parallèle au plan si et seulement si <strong>n⃗·u⃗ = 0</strong>.
            </p>
            <div className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-violet-100">
              <strong>Détail du score :</strong> formes de section trouvées {Math.min(20, formes.size * 5)}/20 · coupes
              enregistrées {Math.min(10, coupes.length * 4)}/10 · hypothèse {hypo === 'poly36' ? 8 : 0}/8 · QCM{' '}
              {(qNormal === 'normal' ? 22 : 0) + (qDist === 'formule' ? 22 : 0) + (qDroite === 'somme0' ? 18 : 0)}/62.
            </div>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-violet-700">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-lab w-full"
      />
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
      <div className="text-[10px] uppercase tracking-wider text-violet-700/70">{label}</div>
      <div className={`text-sm font-bold text-violet-800 ${mono ? 'font-mono text-[11px]' : 'font-mono'}`}>{value}</div>
    </div>
  );
}
