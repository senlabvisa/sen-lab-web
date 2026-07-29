'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ClipboardList, Divide, Scale, Target, ZoomIn } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Fractions et nombres décimaux (5ème, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (droite graduée
 * zoomable unité → dixième → centième + réglettes 10 / 100) → mesures
 * (tableau des relevés, rangement croissant, banc de division) → QCM
 * (3 questions) → bilan.
 *
 * Angle 5ème (à distinguer du TP 6ème « fractions simples », qui traite le
 * SENS du partage) : passage fraction → écriture décimale par la DIVISION,
 * quotient exact vs quotient approché, fractions décimales (dixièmes,
 * centièmes, millièmes), placement d'un décimal sur une droite graduée,
 * comparaison / rangement de décimaux et ordre de grandeur (arrondis).
 */

const DecimalScene = dynamic(() => import('./decimal-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'fatou' | 'moussa' | 'egaux' | null;

type Division = {
  num: number;
  den: number;
  /** Écriture décimale (exacte, ou début du développement périodique). */
  dec: string;
  exact: boolean;
  /** Valeur approchée au centième, pour les quotients non exacts. */
  approx?: string;
  /** Pourquoi la division s'arrête (ou pas). */
  why: string;
};

const DIVISIONS: Division[] = [
  { num: 1, den: 2, dec: '0,5', exact: true, why: '2 = 2 → la division tombe juste : 1/2 = 5/10.' },
  { num: 1, den: 4, dec: '0,25', exact: true, why: '4 = 2 × 2 → 1/4 = 25/100.' },
  { num: 3, den: 4, dec: '0,75', exact: true, why: '3/4 = 75/100 : trois quarts, c’est 75 centièmes.' },
  { num: 1, den: 5, dec: '0,2', exact: true, why: '5 divise 10 → 1/5 = 2/10.' },
  { num: 3, den: 10, dec: '0,3', exact: true, why: 'Fraction décimale : 3/10 se lit directement 3 dixièmes.' },
  { num: 1, den: 8, dec: '0,125', exact: true, why: '8 = 2 × 2 × 2 → 1/8 = 125/1000 (millièmes).' },
  {
    num: 1,
    den: 3,
    dec: '0,333…',
    exact: false,
    approx: '0,33',
    why: '3 n’est ni 2 ni 5 : le reste 1 revient sans fin, la division ne s’arrête jamais.',
  },
  {
    num: 2,
    den: 3,
    dec: '0,666…',
    exact: false,
    approx: '0,67',
    why: 'Même chose : 2 ÷ 3 tourne en rond. On arrondit selon la précision voulue.',
  },
  {
    num: 1,
    den: 6,
    dec: '0,1666…',
    exact: false,
    approx: '0,17',
    why: '6 = 2 × 3 : le facteur 3 empêche la division de tomber juste.',
  },
];

const INTRO =
  "Au marché de Tilène, la balance du vendeur de mangues n'affiche presque jamais un nombre entier. " +
  "Elle affiche 3,25 kilos, ou 3,7 kilos. Ce sont des nombres décimaux. " +
  "Un nombre décimal, c'est un nombre entier suivi de dixièmes, de centièmes, de millièmes. " +
  "3,25 kilos, ça veut dire 3 kilos, plus 2 dixièmes de kilo, plus 5 centièmes de kilo. " +
  "Et 25 centièmes, c'est exactement la fraction 25 sur 100. " +
  "Aujourd'hui tu vas zoomer sur une droite graduée, descendre de l'unité au dixième puis au centième, " +
  "et découvrir pourquoi 3,7 kilos, c'est plus lourd que 3,25 kilos.";

const CONCLUSION =
  "Bravo ! Retiens trois choses. Un : pour passer d'une fraction à son écriture décimale, on divise le numérateur par le dénominateur. " +
  "Deux : la division tombe juste seulement quand le dénominateur ne contient que des 2 et des 5, comme 2, 4, 5, 8, 10 ou 100. " +
  "Un quart égale exactement zéro virgule vingt-cinq. Mais un tiers ne s'arrête jamais : on écrit environ zéro virgule trente-trois, c'est une valeur approchée. " +
  "Trois : pour comparer deux décimaux, on compare d'abord les unités, puis les dixièmes, puis les centièmes, rang par rang. " +
  "3,7 est plus grand que 3,25 parce que 7 dixièmes valent plus que 2 dixièmes. " +
  "Le nombre de chiffres après la virgule ne dit rien sur la taille du nombre.";

/** Écriture française d'un décimal (virgule, pas de point). */
function fr(v: number, dec: number) {
  return v.toFixed(dec).replace('.', ',');
}

export function FractionsDecimaux5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  // Le nombre est stocké en CENTIÈMES ENTIERS : aucune erreur de virgule flottante.
  const [u, setU] = useState(3);
  const [d, setD] = useState(2);
  const [c, setC] = useState(5);
  const [zoom, setZoom] = useState(0);
  const [maxZoom, setMaxZoom] = useState(0);
  const [tried, setTried] = useState<Set<number>>(new Set([325]));
  const [records, setRecords] = useState<number[]>([]);

  const [divKey, setDivKey] = useState<string | null>(null);
  const [divTried, setDivTried] = useState<Set<string>>(new Set());

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qCompare, setQCompare] = useState<string | null>(null);
  const [qRang, setQRang] = useState<string | null>(null);
  const [qQuotient, setQQuotient] = useState<string | null>(null);

  const cents = u * 100 + d * 10 + c;
  const value = cents / 100;

  function change(nu: number, nd: number, nc: number) {
    setU(nu);
    setD(nd);
    setC(nc);
    setTried((prev) => new Set(prev).add(nu * 100 + nd * 10 + nc));
  }

  function changeZoom(z: number) {
    setZoom(z);
    setMaxZoom((m) => Math.max(m, z));
  }

  function noter() {
    setRecords((prev) => (prev.includes(cents) ? prev : [...prev, cents]));
  }

  function pickDivision(k: string) {
    setDivKey(k);
    setDivTried((prev) => new Set(prev).add(k));
  }

  const activeDiv = useMemo(() => DIVISIONS.find((x) => `${x.num}/${x.den}` === divKey) ?? null, [divKey]);

  const sorted = useMemo(() => [...records].sort((a, b) => a - b), [records]);

  const parts = useMemo(
    () => ({
      explore: Math.min(12, tried.size * 3),
      zoom: maxZoom >= 2 ? 5 : 0,
      notes: Math.min(8, records.length * 4),
      div: Math.min(10, divTried.size * 3),
      hypo: hypo === 'moussa' ? 10 : 0,
      qcm: (qCompare === 'moussa' ? 20 : 0) + (qRang === 'centiemes' ? 20 : 0) + (qQuotient === 'approche' ? 15 : 0),
    }),
    [tried, maxZoom, records, divTried, hypo, qCompare, qRang, qQuotient],
  );

  const score = useMemo(() => {
    const s = parts.explore + parts.zoom + parts.notes + parts.div + parts.hypo + parts.qcm;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [parts]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'fractions-decimaux-5eme',
        version: '2.0',
        steps: {
          explore: { count: tried.size, values: Array.from(tried).map((x) => x / 100), maxZoom },
          hypothesis: hypo,
          records: records.map((x) => x / 100),
          divisions: Array.from(divTried),
          qcm: { qCompare, qRang, qQuotient },
        },
      },
      score,
    );
    setStep('done');
  }

  const manipReady = tried.size >= 5 && maxZoom >= 2 && records.length >= 3;

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <Scale className="h-5 w-5" />
              </span>
              La balance du marché
            </CardTitle>
            <Badge tone="maths">Maths · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au <strong>marché de Tilène</strong>, la balance du vendeur de mangues affiche{' '}
              <span className="font-mono font-bold text-amber-700">3,25 kg</span>. Le sac du voisin, lui, affiche{' '}
              <span className="font-mono font-bold text-amber-700">3,7 kg</span>. Ces nombres à virgule s&apos;appellent
              des <strong>nombres décimaux</strong>.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-center font-mono text-base font-bold text-amber-700 ring-1 ring-amber-100">
              3,25 = 3 + 2/10 + 5/100 = 325/100
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> passer d&apos;une <strong>fraction</strong> à son{' '}
              <strong>écriture décimale</strong> par la division, reconnaître les rangs (
              <strong>dixièmes, centièmes, millièmes</strong>), placer un décimal sur une{' '}
              <strong>droite graduée</strong> et <strong>comparer</strong> deux décimaux sans se tromper.
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
              <Target className="h-5 w-5 text-amber-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fatou repart avec <strong className="font-mono">3,25 kg</strong> de mangues. Moussa repart avec{' '}
            <strong className="font-mono">3,7 kg</strong>. Ils paient le même prix au kilo : 750 F CFA.
          </p>
          <QcmStep
            label="Avant de manipuler : qui a le plus de mangues ?"
            tone="amber"
            hint="Piège classique : ne compare PAS 25 et 7 comme des nombres entiers. Compare rang par rang."
            options={[
              { key: 'fatou', label: 'Fatou, car 25 est plus grand que 7' },
              { key: 'moussa', label: 'Moussa, car 7 dixièmes valent plus que 2 dixièmes' },
              { key: 'egaux', label: 'Ils ont exactement la même quantité' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier sur la droite graduée <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ZoomIn className="h-5 w-5 text-amber-700" /> Étape 2 — Zoome sur la droite graduée
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compose un nombre avec les trois curseurs (unités, dixièmes, centièmes), puis <strong>zoome</strong> : chaque
            intervalle orange devient la droite du dessous. En bas, les deux réglettes montrent la <strong>même</strong>{' '}
            unité coupée en 10 puis en 100. Tourne la scène avec ta souris ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {['Unités', 'Dixièmes (1/10)', 'Centièmes (1/100)'].map((lab, i) => (
              <Button key={lab} size="sm" variant={zoom === i ? 'gradient' : 'outline'} onClick={() => changeZoom(i)}>
                {lab}
              </Button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <DecimalScene u={u} d={d} c={c} zoom={zoom} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="u">Unités</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{u}</span>
              </div>
              <input
                id="u"
                type="range"
                min={0}
                max={9}
                step={1}
                value={u}
                onChange={(e) => change(Number(e.target.value), d, c)}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="d">Dixièmes</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{d}</span>
              </div>
              <input
                id="d"
                type="range"
                min={0}
                max={9}
                step={1}
                value={d}
                onChange={(e) => change(u, Number(e.target.value), c)}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="c">Centièmes</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{c}</span>
              </div>
              <input
                id="c"
                type="range"
                min={0}
                max={9}
                step={1}
                value={c}
                onChange={(e) => change(u, d, Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-center ring-1 ring-amber-100">
            <div className="font-mono text-lg font-bold text-amber-700">{fr(value, 2)} kg</div>
            <div className="mt-1 font-mono text-xs text-ink/70">
              = {u} + {d}/10 + {c}/100 = {cents}/100
            </div>
            <div className="mt-1 text-xs text-ink/60">
              Fraction décimale : <strong>{cents}/100</strong> — le dénominateur 100 se lit « centièmes ».
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white p-3 text-xs text-ink/70 ring-1 ring-night-100">
            <strong>Observe :</strong> entre 3 et 4 il y a 10 dixièmes ; entre 3,2 et 3,3 il y a 10 centièmes. On peut
            toujours zoomer d&apos;un rang. Nombres essayés : <strong>{tried.size}</strong> · Zoom le plus fin atteint :{' '}
            <strong>{['unité', 'dixième', 'centième'][maxZoom]}</strong> · Relevés notés : <strong>{records.length}</strong>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={noter}>
              <ClipboardList className="h-4 w-4" /> Noter ce nombre
            </Button>
            <Button variant="gradient" disabled={!manipReady} onClick={() => setStep('mesures')}>
              {tried.size < 5
                ? `Compose ${5 - tried.size} nombre(s) de plus`
                : maxZoom < 2
                  ? 'Zoome jusqu’aux centièmes'
                  : records.length < 3
                    ? `Note ${3 - records.length} nombre(s)`
                    : 'Voir mes relevés'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Divide className="h-5 w-5 text-amber-700" /> Étape 3 — Range, arrondis, divise
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>

          <div
            className={
              'mb-3 rounded-xl p-3 text-sm ring-1 ' +
              (hypo === 'moussa'
                ? 'bg-action-50 text-action-700 ring-action-100'
                : 'bg-amber-50 text-amber-800 ring-amber-100')
            }
          >
            <strong>Ton hypothèse :</strong>{' '}
            {hypo === 'moussa'
              ? 'juste ! 3,7 = 3,70 : Moussa a 70 centièmes de kilo en plus des 3 kg, Fatou seulement 25.'
              : 'à corriger. On compare rang par rang : mêmes unités (3 et 3), puis les dixièmes — 7 dixièmes contre 2 dixièmes. Donc 3,7 > 3,25. Écris 3,7 = 3,70 pour bien voir : 70 centièmes > 25 centièmes.'}
          </div>

          <h4 className="mb-2 text-sm font-semibold text-ink">Tes relevés, rangés dans l&apos;ordre croissant</h4>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                <tr>
                  <th className="px-3 py-2 text-left">Décimal</th>
                  <th className="px-3 py-2 text-left">Décomposition</th>
                  <th className="px-3 py-2 text-left">Fraction décimale</th>
                  <th className="px-3 py-2 text-left">Arrondi au dixième</th>
                  <th className="px-3 py-2 text-left">Ordre de grandeur</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((k, i) => {
                  const uu = Math.floor(k / 100);
                  const dd = Math.floor(k / 10) % 10;
                  const cc = k % 10;
                  return (
                    <tr key={k} className={'border-t border-night-100 ' + (i === sorted.length - 1 ? 'bg-emerald-50 font-semibold' : '')}>
                      <td className="px-3 py-2 font-mono">{fr(k / 100, 2)}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {uu} + {dd}/10 + {cc}/100
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{k}/100</td>
                      <td className="px-3 py-2 font-mono text-xs">{fr(Math.round(k / 10) / 10, 1)}</td>
                      <td className="px-3 py-2 font-mono text-xs">≈ {Math.round(k / 100)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            Le plus grand de tes nombres est surligné. Pour ranger des décimaux : on compare les{' '}
            <strong>unités</strong>, puis les <strong>dixièmes</strong>, puis les <strong>centièmes</strong> — jamais la
            longueur de l&apos;écriture.
          </p>

          <h4 className="mb-2 mt-5 text-sm font-semibold text-ink">
            Banc de division : de la fraction à l&apos;écriture décimale
          </h4>
          <p className="mb-2 text-xs text-ink/60">
            Clique sur une fraction : on divise le numérateur par le dénominateur. Parfois la division{' '}
            <strong>tombe juste</strong>, parfois elle ne s&apos;arrête <strong>jamais</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            {DIVISIONS.map((x) => {
              const k = `${x.num}/${x.den}`;
              return (
                <Button key={k} size="sm" variant={divKey === k ? 'gradient' : 'outline'} onClick={() => pickDivision(k)}>
                  {k}
                </Button>
              );
            })}
          </div>
          {activeDiv ? (
            <div
              className={
                'mt-3 rounded-xl p-3 text-sm ring-1 ' +
                (activeDiv.exact ? 'bg-action-50 ring-action-100' : 'bg-violet-50 ring-violet-100')
              }
            >
              <div className="font-mono text-base font-bold text-ink">
                {activeDiv.num} ÷ {activeDiv.den} = {activeDiv.dec}
              </div>
              <div className="mt-1 text-xs text-ink/75">
                {activeDiv.exact ? (
                  <>
                    <strong>Quotient exact.</strong> {activeDiv.why}
                  </>
                ) : (
                  <>
                    <strong>Quotient non exact</strong> — la division est illimitée. On donne une{' '}
                    <strong>valeur approchée</strong> : {activeDiv.num}/{activeDiv.den} ≈ {activeDiv.approx} (au
                    centième). {activeDiv.why}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-white p-3 text-xs text-ink/60 ring-1 ring-night-100">
              Choisis une fraction ci-dessus pour lancer la division.
            </div>
          )}
          <div className="mt-2 rounded-xl bg-violet-50 p-3 text-xs text-ink/80 ring-1 ring-violet-100">
            <strong>Règle :</strong> une fraction a une écriture décimale <strong>exacte</strong> seulement si son
            dénominateur (simplifié) ne contient que des facteurs <strong>2</strong> et <strong>5</strong> — 2, 4, 5, 8,
            10, 20, 25, 100… Sinon (3, 6, 7, 9…), la division ne s&apos;arrête pas : on écrit «&nbsp;≈&nbsp;» et on
            arrondit. Fractions testées : <strong>{divTried.size}</strong>/{DIVISIONS.length}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner à la droite
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
              label="Un bidon contient 12,5 litres d’essence, un autre 12,45 litres. Lequel en contient le plus ?"
              tone="amber"
              hint="Écris-les avec le même nombre de chiffres après la virgule : 12,50 et 12,45."
              options={[
                { key: 'moussa', label: 'Le bidon de 12,5 L (car 12,50 > 12,45)' },
                { key: 'fatou', label: 'Le bidon de 12,45 L (car 45 > 5)' },
                { key: 'egaux', label: 'Les deux contiennent la même quantité' },
              ]}
              value={qCompare}
              onChange={setQCompare}
            />
            <QcmStep
              label="La balance affiche 7,486 kg. Quel est le rang du chiffre 8 ?"
              tone="amber"
              options={[
                { key: 'dixiemes', label: 'Les dixièmes' },
                { key: 'centiemes', label: 'Les centièmes' },
                { key: 'milliemes', label: 'Les millièmes' },
              ]}
              value={qRang}
              onChange={setQRang}
            />
            <QcmStep
              label="On partage 1 kg de riz en 3 parts égales. Quelle est la masse d’une part ?"
              tone="amber"
              hint="Pose la division 1 ÷ 3 et regarde les restes."
              options={[
                { key: 'exact', label: 'Exactement 0,33 kg' },
                { key: 'approche', label: 'Environ 0,333… kg : la division ne s’arrête jamais, on donne une valeur approchée' },
                { key: 'impossible', label: 'C’est impossible, 1 ne se divise pas par 3' },
              ]}
              value={qQuotient}
              onChange={setQQuotient}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qCompare || !qRang || !qQuotient || busy} onClick={handleValidate}>
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
              Pour écrire une fraction sous forme décimale, on <strong>divise</strong> le numérateur par le
              dénominateur. Quand le dénominateur ne contient que des <strong>2</strong> et des <strong>5</strong>, le
              quotient est <strong>exact</strong> : <span className="font-mono">1/4 = 0,25</span>,{' '}
              <span className="font-mono">1/8 = 0,125</span>. Sinon il est seulement{' '}
              <strong>approché</strong> : <span className="font-mono">1/3 ≈ 0,333…</span>
            </p>
            <p>
              Les <strong>fractions décimales</strong> se lisent directement :{' '}
              <span className="font-mono">3/10 = 0,3</span>, <span className="font-mono">25/100 = 0,25</span>,{' '}
              <span className="font-mono">125/1000 = 0,125</span>. Ton dernier nombre,{' '}
              <span className="font-mono">{fr(value, 2)}</span>, s&apos;écrit aussi{' '}
              <span className="font-mono">{cents}/100</span> et vaut environ{' '}
              <span className="font-mono">{Math.round(cents / 100)}</span> à l&apos;unité près.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-amber-100">
              <strong>Le piège à éviter :</strong> <span className="font-mono">3,25 &lt; 3,7</span> ! On ne compare pas
              25 et 7 comme des entiers. On compare <strong>rang par rang</strong> : unités, puis dixièmes, puis
              centièmes. Ajoute des zéros pour aligner : <span className="font-mono">3,25</span> contre{' '}
              <span className="font-mono">3,70</span>.
            </p>
            <div className="rounded-xl bg-white/70 p-3 text-xs text-ink/70 ring-1 ring-amber-100">
              <strong>Détail du score :</strong> nombres composés {parts.explore}/12 · zoom jusqu&apos;au centième{' '}
              {parts.zoom}/5 · relevés notés {parts.notes}/8 · divisions testées {parts.div}/10 · hypothèse {parts.hypo}
              /10 · QCM {parts.qcm}/55
            </div>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
