'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Calculator, CheckCircle2, LayoutGrid, Ruler, Square, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Périmètre et aire (6ème, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (terrain
 * rectangulaire sur papier quadrillé : clôture le long du CONTOUR, pavage en
 * carreaux de 1 m²) → mesures (tableau + défi de calcul + fiche formules) →
 * QCM (3 questions) → bilan.
 *
 * Angle 6ème : casser la confusion PÉRIMÈTRE (longueur du contour, en m) ↔
 * AIRE (surface couverte, en m²). Démonstration forte : deux terrains de MÊME
 * périmètre et d'aires très différentes. Formules du rectangle, du carré, du
 * triangle et du disque (π ≈ 3,14), unités et conversions.
 */

const FieldScene = dynamic(() => import('./field-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement du terrain 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'oui' | 'non' | 'forme' | null;
type Essai = { L: number; l: number };

/** Défi de calcul : dimensions fixes (le champ de la tante à Kaolack). */
const DEFI_L = 9;
const DEFI_l = 6;
const DEFI_P = 2 * (DEFI_L + DEFI_l); // 30 m
const PRIX_GRILLAGE = 1500; // F CFA le mètre

const INTRO =
  "À Kaolack, ta tante veut protéger son champ de mil des chèvres. Elle va acheter du grillage chez le quincaillier. " +
  "Le grillage se vend au MÈTRE : il faut donc mesurer la longueur du contour du champ, c'est ce qu'on appelle le périmètre. " +
  "Le même jour, à la maison, on veut carreler la cour. Le carrelage, lui, se vend au MÈTRE CARRÉ : " +
  "il faut mesurer la surface couverte, c'est ce qu'on appelle l'aire. " +
  "Périmètre et aire, ce ne sont pas les mêmes calculs, pas les mêmes unités, et pas le même usage. " +
  "Aujourd'hui tu vas les voir tous les deux sur le même terrain, et tu vas découvrir quelque chose de surprenant.";

const CONCLUSION =
  "Bravo ! Le périmètre, c'est la longueur du contour : on le mesure en mètres, comme le grillage qu'on achète au mètre. " +
  "Pour un rectangle, périmètre égale deux fois la somme de la longueur et de la largeur. " +
  "L'aire, c'est la surface couverte : on la mesure en mètres carrés, comme le carrelage qu'on achète au mètre carré. " +
  "Pour un rectangle, aire égale longueur multipliée par largeur. " +
  "Et surtout, retiens le piège : deux terrains peuvent avoir exactement le même périmètre et des aires très différentes. " +
  "Un terrain de douze mètres sur six et un terrain de dix-sept mètres sur un mètre demandent tous les deux trente-six mètres de grillage, " +
  "mais le premier fait soixante-douze mètres carrés et le second seulement dix-sept. " +
  "Alors avant de calculer, pose-toi toujours la question : est-ce que je cherche un contour, ou est-ce que je cherche une surface ?";

/**
 * Terrain témoin : MÊME périmètre que (L, l), mais dimensions différentes.
 * Comme P = 2 × (L + l), il suffit de garder la somme L + l constante.
 */
function temoin(L: number, l: number): Essai {
  const demi = L + l;
  if (l >= 3) return { L: demi - 1, l: 1 }; // bande étroite : aire minuscule
  const l2 = Math.max(1, Math.floor(demi / 2));
  const L2 = demi - l2;
  if (L2 === L && l2 === l) return { L: demi - 1, l: 1 };
  return { L: L2, l: l2 }; // la forme la plus « carrée » : aire maximale
}

export function PerimetresAires6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [longueur, setLongueur] = useState(8);
  const [largeur, setLargeur] = useState(5);
  const [compare, setCompare] = useState(false);
  const [compareSeen, setCompareSeen] = useState(false);
  const [essais, setEssais] = useState<Essai[]>([{ L: 8, l: 5 }]);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [defi, setDefi] = useState('');
  const [qAchat, setQAchat] = useState<string | null>(null);
  const [qCarre, setQCarre] = useState<string | null>(null);
  const [qMeme, setQMeme] = useState<string | null>(null);

  const perimetre = 2 * (longueur + largeur);
  const aire = longueur * largeur;
  const ref = useMemo(() => temoin(longueur, largeur), [longueur, largeur]);
  const aireRef = ref.L * ref.l;

  function noteEssai(L: number, l: number) {
    setEssais((prev) => (prev.some((e) => e.L === L && e.l === l) ? prev : [...prev, { L, l }]));
  }
  function changeLongueur(v: number) {
    setLongueur(v);
    noteEssai(v, largeur);
  }
  function changeLargeur(v: number) {
    setLargeur(v);
    noteEssai(longueur, v);
  }
  function toggleCompare() {
    setCompare((c) => !c);
    setCompareSeen(true);
  }

  /** Deux essais de même périmètre mais d'aires différentes = preuve faite par l'élève. */
  const preuve = useMemo(() => {
    for (let i = 0; i < essais.length; i++) {
      for (let j = i + 1; j < essais.length; j++) {
        const a = essais[i];
        const b = essais[j];
        if (2 * (a.L + a.l) === 2 * (b.L + b.l) && a.L * a.l !== b.L * b.l) return { a, b };
      }
    }
    return null;
  }, [essais]);

  const defiNum = Number(defi.replace(',', '.').replace(/[^\d.]/g, ''));
  const defiOk = defi.trim() !== '' && defiNum === DEFI_P;

  const ptsExplore = Math.min(15, essais.length * 4);
  const ptsContre = compareSeen ? 10 : 0;
  const ptsHypo = hypo === 'non' ? 10 : 0;
  const ptsDefi = defiOk ? 15 : 0;
  const ptsQcm =
    (qAchat === 'perimetre' ? 20 : 0) + (qCarre === '49' ? 15 : 0) + (qMeme === 'differentes' ? 15 : 0);

  const score = useMemo(
    () => Math.max(0, Math.min(100, Math.round(ptsExplore + ptsContre + ptsHypo + ptsDefi + ptsQcm))),
    [ptsExplore, ptsContre, ptsHypo, ptsDefi, ptsQcm],
  );

  async function handleValidate() {
    await onComplete(
      {
        shell: 'perimetres-aires-6eme',
        version: '2.0',
        steps: {
          explore: { essais, count: essais.length, dernier: { longueur, largeur, perimetre, aire } },
          contreExemple: { vu: compareSeen, temoin: ref, aireTemoin: aireRef, prouveParEleve: preuve !== null },
          hypothesis: hypo,
          defiGrillage: { attendu: DEFI_P, reponse: defi, correct: defiOk },
          qcm: { qAchat, qCarre, qMeme },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Square className="h-5 w-5" />
              </span>
              Le grillage et le carrelage
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À <strong>Kaolack</strong>, ta tante veut clôturer son champ de mil pour le protéger des chèvres. Chez le
              quincaillier, le <strong>grillage se vend au mètre</strong> : elle doit mesurer le{' '}
              <strong>tour du champ</strong>.
            </p>
            <p>
              À la maison, on veut <strong>carreler la cour</strong>. Le <strong>carrelage se vend au mètre carré</strong> :
              là, il faut mesurer la <strong>surface</strong>.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-white/70 p-3 text-center ring-1 ring-violet-100">
                <div className="text-[11px] uppercase tracking-wider text-ink/50">Périmètre</div>
                <div className="font-display text-lg font-bold text-violet-700">le contour · en m</div>
                <div className="mt-1 font-mono text-xs text-ink/60">P = 2 × (L + l)</div>
              </div>
              <div className="rounded-xl bg-white/70 p-3 text-center ring-1 ring-emerald-100">
                <div className="text-[11px] uppercase tracking-wider text-ink/50">Aire</div>
                <div className="font-display text-lg font-bold text-emerald-700">la surface · en m²</div>
                <div className="mt-1 font-mono text-xs text-ink/60">A = L × l</div>
              </div>
            </div>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> ne plus jamais confondre le <strong>périmètre</strong> (une longueur, en m) et
              l&apos;<strong>aire</strong> (une surface, en m²) — et découvrir un piège que presque tout le monde rate.
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
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Deux voisins achètent <strong>exactement la même longueur de grillage</strong> et clôturent chacun un champ
            rectangulaire. Leurs deux champs ont donc le <strong>même périmètre</strong>.
          </p>
          <QcmStep
            label="Alors, leurs deux champs ont…"
            tone="amber"
            hint="Attention : le périmètre mesure le contour, pas ce qu'il y a à l'intérieur."
            options={[
              { key: 'oui', label: 'Forcément la même aire (même grillage ⇒ même surface)' },
              { key: 'non', label: 'Peut-être des aires très différentes' },
              { key: 'forme', label: 'Forcément la même forme et la même aire' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier sur le terrain <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-emerald-700" /> Étape 2 — Règle le champ
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Sur le papier quadrillé, <strong>un carreau = 1 m²</strong>. Le <strong>rouleau de grillage orange</strong>{' '}
            court le long du <strong>contour</strong> : sa course, c&apos;est le périmètre. Le{' '}
            <strong>carreau jaune</strong> compte les carreaux de 1 m² : c&apos;est l&apos;aire. Tourne la scène avec ta
            souris ou ton doigt.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <FieldScene
                longueur={longueur}
                largeur={largeur}
                compare={compare}
                refLongueur={ref.L}
                refLargeur={ref.l}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="long">Longueur L</Label>
                <span className="font-mono text-sm font-semibold text-violet-700">{longueur} m</span>
              </div>
              <input
                id="long"
                type="range"
                min={3}
                max={10}
                step={1}
                value={longueur}
                onChange={(e) => changeLongueur(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="larg">Largeur l</Label>
                <span className="font-mono text-sm font-semibold text-violet-700">{largeur} m</span>
              </div>
              <input
                id="larg"
                type="range"
                min={2}
                max={7}
                step={1}
                value={largeur}
                onChange={(e) => changeLargeur(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-violet-50 p-3 text-center ring-1 ring-violet-100">
              <div className="text-xs text-ink/60">Périmètre — le contour</div>
              <div className="font-display text-2xl font-bold text-violet-700">{perimetre} m</div>
              <div className="mt-1 font-mono text-[10px] text-ink/50">
                P = 2 × ({longueur} + {largeur}) = {perimetre} m
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
              <div className="text-xs text-ink/60">Aire — la surface</div>
              <div className="font-display text-2xl font-bold text-emerald-700">{aire} m²</div>
              <div className="mt-1 font-mono text-[10px] text-ink/50">
                A = {longueur} × {largeur} = {aire} m²
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm ring-1 ring-amber-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink/80">
                <strong>Le piège :</strong> un autre champ avec <strong>la même clôture</strong> ({perimetre} m).
              </span>
              <Button size="sm" variant={compare ? 'gradient' : 'outline'} onClick={toggleCompare}>
                <LayoutGrid className="h-4 w-4" /> {compare ? 'Masquer le témoin' : 'Afficher le témoin'}
              </Button>
            </div>
            {compare && (
              <p className="mt-2 text-xs text-ink/70">
                Le champ témoin mesure{' '}
                <strong>
                  {ref.L} m × {ref.l} m
                </strong>{' '}
                : P = 2 × ({ref.L} + {ref.l}) = <strong>{perimetre} m</strong>, exactement comme le tien. Mais son aire
                vaut <strong>{aireRef} m²</strong> contre <strong>{aire} m²</strong> pour le tien. Compte les carreaux !
              </p>
            )}
          </div>

          <div className="mt-3 rounded-xl bg-white p-3 text-xs text-ink/70 ring-1 ring-night-100">
            <strong>Observe :</strong> si tu augmentes L de 1 m et que tu diminues l de 1 m, le périmètre ne bouge pas —
            mais l&apos;aire, elle, change ! Terrains essayés : <strong>{essais.length}</strong>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="gradient"
              disabled={essais.length < 4 || !compareSeen}
              onClick={() => setStep('mesures')}
            >
              {essais.length < 4
                ? `Essaie ${4 - essais.length} terrain(s) de plus`
                : !compareSeen
                  ? 'Affiche le champ témoin'
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
              <Calculator className="h-5 w-5 text-emerald-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>

          <div
            className={
              'mb-3 rounded-xl p-3 text-sm ring-1 ' +
              (hypo === 'non'
                ? 'bg-action-50 text-action-700 ring-action-100'
                : 'bg-amber-50 text-amber-800 ring-amber-100')
            }
          >
            <strong>Ton hypothèse :</strong>{' '}
            {hypo === 'non'
              ? 'juste ! Même périmètre ne veut pas dire même aire. Le contour ne dit rien sur la surface enfermée.'
              : "à corriger. Deux champs peuvent demander la MÊME longueur de grillage et pourtant n'avoir pas du tout la même surface. Le périmètre mesure le contour, pas l'intérieur."}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">L (m)</th>
                  <th className="px-3 py-2 text-left">l (m)</th>
                  <th className="px-3 py-2 text-left">P = 2 × (L + l)</th>
                  <th className="px-3 py-2 text-left">A = L × l</th>
                </tr>
              </thead>
              <tbody>
                {essais
                  .slice()
                  .sort((a, b) => 2 * (a.L + a.l) - 2 * (b.L + b.l) || a.L - b.L)
                  .map((e) => {
                    const p = 2 * (e.L + e.l);
                    const mis = preuve !== null && (p === 2 * (preuve.a.L + preuve.a.l));
                    return (
                      <tr
                        key={`${e.L}x${e.l}`}
                        className={'border-t border-night-100 ' + (mis ? 'bg-emerald-50 font-semibold' : '')}
                      >
                        <td className="px-3 py-2 font-mono">{e.L}</td>
                        <td className="px-3 py-2 font-mono">{e.l}</td>
                        <td className="px-3 py-2 font-mono text-violet-700">{p} m</td>
                        <td className="px-3 py-2 font-mono text-emerald-700">{e.L * e.l} m²</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-ink/80 ring-1 ring-violet-100">
            {preuve ? (
              <>
                <strong>Tu l&apos;as prouvé toi-même :</strong> ton terrain{' '}
                <span className="font-mono">
                  {preuve.a.L} × {preuve.a.l}
                </span>{' '}
                et ton terrain{' '}
                <span className="font-mono">
                  {preuve.b.L} × {preuve.b.l}
                </span>{' '}
                ont le même périmètre (<strong>{2 * (preuve.a.L + preuve.a.l)} m</strong> de grillage) mais des aires
                différentes : <strong>{preuve.a.L * preuve.a.l} m²</strong> contre{' '}
                <strong>{preuve.b.L * preuve.b.l} m²</strong>.
              </>
            ) : (
              <>
                <strong>Le contre-exemple à retenir :</strong> <span className="font-mono">12 m × 6 m</span> et{' '}
                <span className="font-mono">17 m × 1 m</span> demandent tous les deux{' '}
                <strong>36 m de grillage</strong> (même périmètre), mais le premier fait <strong>72 m²</strong> et le
                second seulement <strong>17 m²</strong>. Même contour, quatre fois plus de surface !
              </>
            )}
          </div>

          <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-night-100">
            <p className="mb-2 text-sm text-ink/80">
              <strong>Défi.</strong> Le champ de ta tante à Kaolack mesure <strong>{DEFI_L} m sur {DEFI_l} m</strong>.
              Combien de <strong>mètres de grillage</strong> doit-elle acheter pour faire tout le tour ?
            </p>
            <Label htmlFor="defi">Périmètre (en m)</Label>
            <Input
              id="defi"
              inputMode="numeric"
              value={defi}
              onChange={(e) => setDefi(e.target.value)}
              placeholder={`P = 2 × (${DEFI_L} + ${DEFI_l})`}
              className="mt-1"
            />
            {defi.trim() !== '' && (
              <p className={'mt-2 text-xs ' + (defiOk ? 'text-action-700' : 'text-alert-700')}>
                {defiOk
                  ? `✓ Exact : P = 2 × (${DEFI_L} + ${DEFI_l}) = ${DEFI_P} m. À ${PRIX_GRILLAGE.toLocaleString('fr-FR')} F CFA le mètre, cela fait ${(DEFI_P * PRIX_GRILLAGE).toLocaleString('fr-FR')} F CFA. (Son aire, elle, vaut ${DEFI_L * DEFI_l} m².)`
                  : `Réessaie : additionne d'abord la longueur et la largeur, puis multiplie par 2 (les deux longueurs et les deux largeurs).`}
              </p>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Figure</th>
                  <th className="px-3 py-2 text-left">Périmètre (m)</th>
                  <th className="px-3 py-2 text-left">Aire (m²)</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr className="border-t border-night-100">
                  <td className="px-3 py-2 font-sans">Rectangle (L, l)</td>
                  <td className="px-3 py-2">P = 2 × (L + l)</td>
                  <td className="px-3 py-2">A = L × l</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-3 py-2 font-sans">Carré (côté c)</td>
                  <td className="px-3 py-2">P = 4 × c</td>
                  <td className="px-3 py-2">A = c × c</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-3 py-2 font-sans">Triangle (a, b, c)</td>
                  <td className="px-3 py-2">P = a + b + c</td>
                  <td className="px-3 py-2">A = (base × hauteur) ÷ 2</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-3 py-2 font-sans">Disque (rayon r)</td>
                  <td className="px-3 py-2">P = 2 × π × r</td>
                  <td className="px-3 py-2">A = π × r × r</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-3 text-ink/75 ring-1 ring-emerald-100">
              <strong>Exemples chiffrés.</strong> Cour carrée de 7 m de côté : P = 4 × 7 = <strong>28 m</strong>, A = 7 ×
              7 = <strong>49 m²</strong>. Bassin circulaire de rayon 5 m (π ≈ 3,14) : P = 2 × 3,14 × 5 ={' '}
              <strong>31,4 m</strong>, A = 3,14 × 5 × 5 = <strong>78,5 m²</strong>. Voile triangulaire de base 8 m et de
              hauteur 3 m : A = (8 × 3) ÷ 2 = <strong>12 m²</strong>.
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-ink/75 ring-1 ring-amber-100">
              <strong>Unités.</strong> Un périmètre est une <strong>longueur</strong> : m, mais aussi km, dm, cm, mm. Une
              aire est une <strong>surface</strong> : m², km², cm²… <br />
              1 m² = 10 000 cm² (car 1 m = 100 cm et 100 × 100 = 10 000) · 1 ha (hectare) = 10 000 m² · 1 km² = 1 000 000
              m². Un champ de 1 ha, c&apos;est un carré de 100 m de côté.
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner au terrain
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
            <CardTitle>Étape 4 — Périmètre ou aire ?</CardTitle>
            <Badge tone="maths">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Chez le quincaillier de Kaolack, le grillage se vend au mètre. Pour clôturer tout le champ, tu dois calculer…"
              tone="amber"
              options={[
                { key: 'perimetre', label: 'Le périmètre, en mètres (m)' },
                { key: 'aire', label: "L'aire, en mètres carrés (m²)" },
                { key: 'perimetre-m2', label: 'Le périmètre, en mètres carrés (m²)' },
              ]}
              value={qAchat}
              onChange={setQAchat}
            />
            <QcmStep
              label="La cour de la maison est un carré de 7 m de côté. On veut la carreler entièrement. Quelle quantité de carrelage faut-il ?"
              tone="amber"
              hint="Carreler, c'est couvrir une surface."
              options={[
                { key: '28', label: '28 m² (car 4 × 7 = 28)' },
                { key: '49', label: '49 m² (car 7 × 7 = 49)' },
                { key: '14', label: '14 m² (car 7 + 7 = 14)' },
              ]}
              value={qCarre}
              onChange={setQCarre}
            />
            <QcmStep
              label="Deux champs sont clôturés avec 36 m de grillage chacun. Le premier mesure 12 m × 6 m, le second 17 m × 1 m."
              tone="amber"
              hint="Vérifie d'abord les deux périmètres, puis calcule les deux aires."
              options={[
                { key: 'differentes', label: 'Leurs aires sont différentes : 72 m² et 17 m²' },
                { key: 'egales', label: 'Leurs aires sont égales, puisque le périmètre est le même' },
                { key: 'impossible', label: 'Impossible : avec le même grillage, on enferme toujours la même surface' },
              ]}
              value={qMeme}
              onChange={setQMeme}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qAchat || !qCarre || !qMeme || busy} onClick={handleValidate}>
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
              Le <strong>périmètre</strong> est la <strong>longueur du contour</strong> : on l&apos;exprime en{' '}
              <strong>mètres</strong>, c&apos;est ce qu&apos;on achète quand on achète du grillage. Pour un rectangle,{' '}
              <span className="font-mono">P = 2 × (L + l)</span> ; pour un carré,{' '}
              <span className="font-mono">P = 4 × c</span> ; pour un disque,{' '}
              <span className="font-mono">P = 2 × π × r</span>.
            </p>
            <p>
              L&apos;<strong>aire</strong> est la <strong>surface couverte</strong> : on l&apos;exprime en{' '}
              <strong>mètres carrés</strong>, c&apos;est ce qu&apos;on achète quand on achète du carrelage. Pour un
              rectangle, <span className="font-mono">A = L × l</span> ; pour un carré,{' '}
              <span className="font-mono">A = c × c</span> ; pour un triangle,{' '}
              <span className="font-mono">A = (base × hauteur) ÷ 2</span> ; pour un disque,{' '}
              <span className="font-mono">A = π × r × r</span> (avec π ≈ 3,14).
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              <strong>Le piège à ne plus jamais rater :</strong> deux terrains de{' '}
              <strong>même périmètre</strong> peuvent avoir des <strong>aires très différentes</strong>. Ton dernier
              terrain de <span className="font-mono">{longueur} m × {largeur} m</span> a un périmètre de{' '}
              <strong>{perimetre} m</strong> et une aire de <strong>{aire} m²</strong> ; le terrain témoin de{' '}
              <span className="font-mono">{ref.L} m × {ref.l} m</span> a le <strong>même périmètre</strong> mais une aire
              de <strong>{aireRef} m²</strong>.
            </p>
            <div className="rounded-xl bg-white/70 p-3 text-xs text-ink/70 ring-1 ring-violet-100">
              <strong>Détail du score :</strong> exploration des terrains {ptsExplore}/15 · contre-exemple observé{' '}
              {ptsContre}/10 · hypothèse {ptsHypo}/10 · défi du grillage {ptsDefi}/15 · QCM {ptsQcm}/50
            </div>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
