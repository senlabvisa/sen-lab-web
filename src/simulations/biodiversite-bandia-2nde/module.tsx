'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ClipboardList, Grid3x3, Target, TreePine } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Mesurer la biodiversité de la Réserve de Bandia (SVT, 2nde).
 *
 * Flow Lab Premium : amorce → hypothèse → échantillonnage 3D par quadrats le
 * long d'un transect → tableau de mesures comparé sur trois secteurs → QCM →
 * bilan.
 *
 * Démarche scientifique réelle : on n'observe pas les grands animaux, on
 * échantillonne la **strate ligneuse** (arbres et arbustes), qui conditionne
 * tout le reste de l'écosystème. Pour chaque secteur on calcule :
 *   - l'abondance totale N (nombre de pieds relevés) ;
 *   - la richesse spécifique S (nombre d'espèces différentes rencontrées) ;
 *   - l'abondance relative pᵢ = nᵢ / N ;
 *   - l'indice de diversité de Shannon H' = − Σ pᵢ ln(pᵢ) ;
 *   - l'équitabilité de Piélou E = H' / ln(S), entre 0 et 1 ;
 *   - la courbe d'accumulation des espèces, qui sature quand l'échantillonnage
 *     est suffisant.
 *
 * Les relevés sont tirés d'un générateur pseudo-aléatoire **déterministe**
 * (même secteur → même transect), à partir des abondances relatives réelles
 * d'une forêt sèche sahélo-soudanienne, dégradées progressivement de la zone
 * protégée vers la lisière urbanisée.
 */

const BandiaScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type ZoneKey = 'foret' | 'savane' | 'lisiere';
type HypoRep = 'coeur' | 'lisiere' | 'identique' | null;

const SPECIES = [
  { name: 'Baobab', latin: 'Adansonia digitata', local: 'guy', color: '#8C6239' },
  { name: 'Acacia', latin: 'Acacia seyal', local: 'surur', color: '#3F8F4F' },
  { name: 'Balanites', latin: 'Balanites aegyptiaca', local: 'soump', color: '#8FA93C' },
  { name: 'Tamarinier', latin: 'Tamarindus indica', local: 'dakhar', color: '#1F6B52' },
  { name: 'Jujubier', latin: 'Ziziphus mauritiana', local: 'sidem', color: '#C88A2E' },
  { name: 'Combretum', latin: 'Combretum glutinosum', local: 'rat', color: '#5FA37E' },
  { name: 'Neem', latin: 'Azadirachta indica', local: 'neem (exotique)', color: '#8B5CF6' },
];

const ZONES: Record<
  ZoneKey,
  { name: string; sub: string; seed: number; density: number; p: number[]; background: string; patch: string; note: string }
> = {
  foret: {
    name: 'Cœur de la réserve',
    sub: 'forêt claire à baobabs · zone intégralement protégée',
    seed: 17,
    density: 14,
    // baobab, acacia, balanites, tamarinier, jujubier, combretum, neem
    p: [0.1, 0.22, 0.16, 0.12, 0.14, 0.2, 0.06],
    background: '#EAF7EC',
    patch: '#8FA86A',
    note: "Aucune coupe, aucun troupeau : les sept espèces de la forêt sèche cohabitent, aucune n'écrase les autres.",
  },
  savane: {
    name: 'Savane arbustive pâturée',
    sub: 'périphérie de la réserve · passage des troupeaux',
    seed: 41,
    density: 10,
    p: [0.06, 0.36, 0.16, 0, 0.14, 0.26, 0.02],
    background: '#F5F6E4',
    patch: '#B0A868',
    note: "Le tamarinier a disparu (ses jeunes pousses sont broutées) et l'acacia domine largement le peuplement.",
  },
  lisiere: {
    name: 'Lisière dégradée',
    sub: 'bordure de la route de Mbour · coupe de bois & habitations',
    seed: 73,
    density: 6,
    p: [0, 0.16, 0.08, 0, 0.3, 0.46, 0],
    background: '#FBF1E4',
    patch: '#C2A375',
    note: "Le bois de chauffe et l'extension des maisons ont éliminé les grands arbres : il ne reste que des espèces pionnières et épineuses.",
  },
};

const ZONE_KEYS: ZoneKey[] = ['foret', 'savane', 'lisiere'];
const MAX_QUADRATS = 10;

/** Générateur congruentiel linéaire — relevés reproductibles d'une session à l'autre. */
function lcg(seed: number) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type Survey = {
  draws: number[][];
  counts: number[];
  accumulation: number[];
  total: number;
  richness: number;
  shannon: number;
  equitability: number;
};

/** Simule le relevé des `nQuad` premiers quadrats du transect d'un secteur. */
function survey(zone: ZoneKey, nQuad: number): Survey {
  const z = ZONES[zone];
  const rnd = lcg(z.seed);
  const cum = z.p.map((_, i) => z.p.slice(0, i + 1).reduce((a, b) => a + b, 0));
  const lastNonZero = z.p.reduce((acc, v, i) => (v > 0 ? i : acc), 0);

  const draws: number[][] = [];
  const counts = SPECIES.map(() => 0);
  const accumulation: number[] = [];

  for (let q = 0; q < nQuad; q++) {
    const n = Math.max(2, Math.round(z.density + (rnd() - 0.5) * 6));
    const list: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = rnd();
      let idx = lastNonZero;
      for (let k = 0; k < cum.length; k++) {
        if (u <= cum[k] && z.p[k] > 0) {
          idx = k;
          break;
        }
      }
      list.push(idx);
      counts[idx] += 1;
    }
    draws.push(list);
    accumulation.push(counts.filter((c) => c > 0).length);
  }

  const total = counts.reduce((a, b) => a + b, 0);
  const richness = counts.filter((c) => c > 0).length;
  const shannon = total
    ? -counts.filter((c) => c > 0).reduce((acc, c) => acc + (c / total) * Math.log(c / total), 0)
    : 0;
  const equitability = richness > 1 ? shannon / Math.log(richness) : 0;

  return { draws, counts, accumulation, total, richness, shannon, equitability };
}

const INTRO =
  "À une heure de Dakar, sur la route de Mbour, la Réserve de Bandia protège une forêt sèche où l'on a réintroduit girafes, rhinocéros et élands de Derby. " +
  "Mais pour savoir si une réserve va bien, on ne compte pas d'abord les grands animaux : on mesure la végétation ligneuse, car c'est elle qui les nourrit et les abrite. " +
  "Aujourd'hui tu deviens écologue de terrain. Tu déroules un décamètre, tu poses des quadrats de 25 mètres sur 25, tu comptes les pieds d'arbres espèce par espèce, " +
  "puis tu calcules la richesse spécifique et l'indice de Shannon dans trois secteurs de plus en plus dégradés.";

const CONCLUSION =
  "Bravo ! Mesurer la biodiversité, c'est échantillonner : on pose des quadrats de surface connue le long d'un transect, on compte les individus de chaque espèce, puis on calcule. " +
  "La richesse spécifique S compte les espèces présentes. L'indice de Shannon H' va plus loin : il tient compte de l'abondance relative de chacune, donc il chute quand une seule espèce domine. " +
  "La courbe d'accumulation dit quand on a posé assez de quadrats : elle monte puis s'aplatit. " +
  "Au cœur de la Réserve de Bandia, S et H' sont élevés. Sur la lisière rongée par la coupe de bois et l'urbanisation, il ne reste que quelques espèces résistantes comme le neem et le jujubier : " +
  "la richesse s'effondre et la diversité avec elle. C'est cela, la dégradation de l'habitat.";

export function BiodiversiteBandia2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  const [zone, setZone] = useState<ZoneKey>('foret');
  const [nQuad, setNQuad] = useState(3);
  const [records, setRecords] = useState<Partial<Record<ZoneKey, Survey & { nQuad: number }>>>({});

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qRichesse, setQRichesse] = useState<string | null>(null);
  const [qCourbe, setQCourbe] = useState<string | null>(null);
  const [qShannon, setQShannon] = useState<string | null>(null);

  const cur = useMemo(() => survey(zone, nQuad), [zone, nQuad]);
  const z = ZONES[zone];
  const recorded = ZONE_KEYS.filter((k) => records[k]);

  function saveRecord() {
    setRecords((prev) => ({ ...prev, [zone]: { ...cur, nQuad } }));
  }

  const score = useMemo(() => {
    let s = 0;
    s += recorded.length * 10; // exploration : 3 secteurs relevés → 30
    if (hypo === 'coeur') s += 10;
    if (qRichesse === '3') s += 20;
    if (qCourbe === 'assez') s += 20;
    if (qShannon === 'plusfaible') s += 20;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [recorded.length, hypo, qRichesse, qCourbe, qShannon]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'biodiversite-bandia-2nde',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          releves: ZONE_KEYS.filter((k) => records[k]).map((k) => ({
            zone: k,
            quadrats: records[k]!.nQuad,
            N: records[k]!.total,
            S: records[k]!.richness,
            shannon: Number(records[k]!.shannon.toFixed(3)),
            equitability: Number(records[k]!.equitability.toFixed(3)),
          })),
          qcm: { qRichesse, qCourbe, qShannon },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-action-700 shadow-soft ring-1 ring-action-100">
                <TreePine className="h-5 w-5" />
              </span>
              Combien d&apos;espèces vivent à Bandia ?
            </CardTitle>
            <Badge tone="svt">SVT · Seconde S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La <strong>Réserve de Bandia</strong>, sur la route de Mbour, protège une forêt sèche où l&apos;on a
              réintroduit girafes et rhinocéros. Mais on ne juge pas la santé d&apos;une réserve en comptant les grands
              animaux : on mesure d&apos;abord les <strong>ligneux</strong> — les arbres et arbustes qui les nourrissent
              et les abritent.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> échantillonner la végétation avec des <strong>quadrats de 25 m × 25 m</strong>{' '}
              posés le long d&apos;un transect, puis calculer la richesse spécifique S et l&apos;indice de diversité de
              Shannon H&apos; dans trois secteurs de la réserve.
            </p>
            <NarrationButton text={INTRO} label="Écouter l'introduction" />
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypo')}>
              Partir sur le terrain <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'hypo' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-action-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de compter quoi que ce soit : selon toi, où trouveras-tu le <strong>plus d&apos;espèces d&apos;arbres
            différentes</strong> ?
          </p>
          <QcmStep
            label="Mon hypothèse : la diversité des ligneux est la plus grande…"
            tone="action"
            options={[
              { key: 'coeur', label: 'Au cœur protégé de la réserve (forêt claire à baobabs)' },
              { key: 'lisiere', label: 'Sur la lisière, le long de la route de Mbour' },
              { key: 'identique', label: 'Partout pareil : la réserve est un seul milieu' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Poser les quadrats <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5 text-action-700" /> Étape 2 — Échantillonne le transect
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un secteur, puis augmente le nombre de quadrats posés. Chaque <strong>jalon coloré</strong> est un
            pied d&apos;arbre relevé ; sa couleur donne son espèce. Surveille la <strong>courbe d&apos;accumulation</strong>{' '}
            au fond : quand elle s&apos;aplatit, tu as assez échantillonné. Tourne la scène avec ta souris ou ton doigt.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {ZONE_KEYS.map((k) => (
              <Button key={k} variant={zone === k ? 'gradient' : 'outline'} size="sm" onClick={() => setZone(k)}>
                {ZONES[k].name} {records[k] ? '✓' : ''}
              </Button>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <BandiaScene
                zoneName={z.name}
                zoneSub={z.sub}
                background={z.background}
                patch={z.patch}
                draws={cur.draws}
                counts={cur.counts}
                accumulation={cur.accumulation}
                colors={SPECIES.map((s) => s.color)}
                names={SPECIES.map((s) => s.name)}
                richness={cur.richness}
                shannon={cur.shannon}
                total={cur.total}
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="nq">Quadrats posés le long du transect</Label>
              <span className="font-mono text-action-700">
                {nQuad} × 625 m² = {(nQuad * 625).toLocaleString('fr-FR')} m²
              </span>
            </div>
            <input
              id="nq"
              type="range"
              min={1}
              max={MAX_QUADRATS}
              value={nQuad}
              onChange={(e) => setNQuad(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="Abondance N" value={`${cur.total} pieds`} />
            <Stat label="Richesse S" value={`${cur.richness} espèces`} />
            <Stat label="Shannon H'" value={cur.shannon.toFixed(2)} />
            <Stat label="Équitabilité E" value={cur.equitability.toFixed(2)} />
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-900 ring-1 ring-emerald-100">
            <strong>{z.name} —</strong> {z.note}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={saveRecord}>
              <ClipboardList className="h-4 w-4" /> Enregistrer le relevé de ce secteur
            </Button>
            <Button variant="gradient" disabled={recorded.length < 3} onClick={() => setStep('mesures')}>
              {recorded.length < 3 ? `Relève encore ${3 - recorded.length} secteur(s)` : 'Comparer mes relevés'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures de terrain</CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            H&apos; = − Σ pᵢ ln(pᵢ) avec pᵢ = nᵢ/N l&apos;abondance relative de l&apos;espèce i. E = H&apos; / ln(S)
            vaut 1 quand toutes les espèces sont également représentées.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Secteur</th>
                  <th className="px-3 py-2 text-right">Quadrats</th>
                  <th className="px-3 py-2 text-right">N</th>
                  <th className="px-3 py-2 text-right">S</th>
                  <th className="px-3 py-2 text-right">H&apos;</th>
                  <th className="px-3 py-2 text-right">E</th>
                </tr>
              </thead>
              <tbody>
                {ZONE_KEYS.map((k) => {
                  const r = records[k];
                  if (!r) return null;
                  const best = r.richness === Math.max(...ZONE_KEYS.map((j) => records[j]?.richness ?? 0));
                  return (
                    <tr key={k} className={'border-t border-night-100 ' + (best ? 'bg-emerald-50 font-semibold' : '')}>
                      <td className="px-3 py-2">{ZONES[k].name}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.nQuad}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.total}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.richness}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.shannon.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">{r.equitability.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
            Du cœur protégé vers la lisière construite, <strong>N, S et H&apos; diminuent ensemble</strong> : moins de
            pieds, moins d&apos;espèces, et une poignée d&apos;espèces résistantes (neem, jujubier) qui prennent toute la
            place. C&apos;est la signature de la <strong>dégradation de l&apos;habitat</strong>.
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner sur le terrain
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
              label="Dans un quadrat de la lisière tu comptes 6 pieds : 3 neems, 2 jujubiers et 1 acacia. La richesse spécifique S de ce relevé vaut…"
              tone="action"
              options={[
                { key: '6', label: 'S = 6 (le nombre de pieds comptés)' },
                { key: '3', label: 'S = 3 (le nombre d’espèces différentes)' },
                { key: '2', label: 'S = 2 (le nombre d’espèces qui ont plusieurs pieds)' },
              ]}
              value={qRichesse}
              onChange={setQRichesse}
            />
            <QcmStep
              label="La courbe d'accumulation monte puis s'aplatit. Que signifie ce palier ?"
              tone="action"
              options={[
                { key: 'assez', label: 'On a posé assez de quadrats : presque toutes les espèces du secteur ont été rencontrées.' },
                { key: 'vide', label: 'Il n’y a plus aucun arbre vivant dans le secteur.' },
                { key: 'erreur', label: 'Le relevé est faux, il faut tout recommencer ailleurs.' },
              ]}
              value={qCourbe}
              onChange={setQCourbe}
            />
            <QcmStep
              label="Deux secteurs ont la même richesse S = 5. Dans le premier, une seule espèce représente 90 % des pieds. Que vaut son indice de Shannon H' ?"
              tone="action"
              hint="Souviens-toi : H' dépend des abondances relatives pᵢ, pas seulement du nombre d'espèces."
              options={[
                { key: 'plusfaible', label: 'Plus faible que dans le secteur équilibré' },
                { key: 'egal', label: 'Exactement le même, puisque S est identique' },
                { key: 'plusfort', label: 'Plus fort, car une espèce est très abondante' },
              ]}
              value={qShannon}
              onChange={setQShannon}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes mesures
            </Button>
            <Button
              variant="success"
              disabled={!qRichesse || !qCourbe || !qShannon || busy}
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
            <Badge tone="svt">SVT · Seconde S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La biodiversité se <strong>mesure</strong> : quadrats de surface connue, comptage par espèce, puis calcul
              de la richesse <strong>S</strong> et de l&apos;indice de Shannon{' '}
              <strong>H&apos; = − Σ pᵢ ln pᵢ</strong>. La courbe d&apos;accumulation indique quand l&apos;échantillonnage
              est suffisant.
            </p>
            <p>
              À Bandia, du cœur protégé vers la lisière de la route de Mbour, S et H&apos; s&apos;effondrent : la coupe
              de bois et l&apos;urbanisation laissent la place à quelques espèces pionnières. Protéger un habitat, c&apos;est
              protéger la diversité qu&apos;il abrite.
            </p>
            <div className="rounded-xl bg-white/70 p-3 text-xs text-ink/70 ring-1 ring-emerald-100">
              <strong>Détail du score :</strong> secteurs relevés {recorded.length}/3 → {recorded.length * 10}/30 ·
              hypothèse {hypo === 'coeur' ? 10 : 0}/10 · richesse spécifique {qRichesse === '3' ? 20 : 0}/20 · courbe
              d&apos;accumulation {qCourbe === 'assez' ? 20 : 0}/20 · indice de Shannon{' '}
              {qShannon === 'plusfaible' ? 20 : 0}/20.
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
    <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
      <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-emerald-800">{value}</div>
    </div>
  );
}
