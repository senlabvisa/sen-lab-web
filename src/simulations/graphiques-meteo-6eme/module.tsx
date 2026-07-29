'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BarChart3, CheckCircle2, Eraser, MapPin, PenLine, Table2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Lire et construire un graphique : le climat du Sénégal (Maths, 6ème).
 *
 * Flow Lab Premium : intro → hypothèse → manipulation 3D (construire la
 * courbe des températures sur le diagramme en barres des pluies) → mesures
 * (maximum, minimum, étendue) → QCM → bilan.
 *
 * Données mensuelles plausibles pour Dakar (~400 mm/an), Ziguinchor
 * (~1200 mm/an) et Podor (~250 mm/an). Même échelle pour les trois villes.
 */

const MeteoScene = dynamic(() => import('./meteo-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-sky-50 via-white to-blue-50 text-sm text-ink/50">
      Chargement du graphique 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type CityKey = 'dakar' | 'ziguinchor' | 'podor';
type HypoRep = CityKey | null;

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

type City = { key: CityKey; name: string; region: string; rain: number[]; temp: number[] };

/** Relevés mensuels (janvier → décembre) : pluie en mm, température moyenne en °C. */
const CITIES: City[] = [
  {
    key: 'dakar',
    name: 'Dakar',
    region: 'côte atlantique',
    rain: [0, 1, 0, 0, 1, 15, 70, 180, 105, 25, 3, 2],
    temp: [21, 20, 21, 21, 23, 26, 28, 28, 28, 28, 26, 23],
  },
  {
    key: 'ziguinchor',
    name: 'Ziguinchor',
    region: 'Casamance',
    rain: [0, 0, 0, 0, 5, 110, 300, 400, 290, 90, 5, 0],
    temp: [25, 27, 28, 29, 29, 29, 27, 26, 27, 27, 27, 25],
  },
  {
    key: 'podor',
    name: 'Podor',
    region: 'vallée du fleuve, Sahel',
    rain: [0, 0, 0, 0, 0, 10, 55, 110, 60, 12, 0, 0],
    temp: [22, 25, 28, 32, 35, 37, 34, 32, 33, 33, 28, 23],
  },
];

function stats(c: City) {
  const total = c.rain.reduce((a, b) => a + b, 0);
  const rMax = Math.max(...c.rain);
  const rMin = Math.min(...c.rain);
  const tMax = Math.max(...c.temp);
  const tMin = Math.min(...c.temp);
  return {
    total,
    rMax,
    rMin,
    rSpan: rMax - rMin,
    rMonth: MONTHS[c.rain.indexOf(rMax)],
    tMax,
    tMin,
    tSpan: tMax - tMin,
    tMonth: MONTHS[c.temp.indexOf(tMax)],
  };
}

const INTRO =
  "À la radio, on annonce chaque année l'arrivée de l'hivernage. Mais il ne pleut pas pareil partout au Sénégal : " +
  "Ziguinchor, en Casamance, reçoit environ 1200 millimètres d'eau par an, alors que Podor, dans le Sahel, en reçoit à peine 250. " +
  "Pour comparer, les météorologues dessinent un diagramme : des barres pour la pluie de chaque mois, une courbe pour la température. " +
  "Aujourd'hui, tu vas lire ce graphique et le construire toi-même.";

const CONCLUSION =
  "Bravo ! Tu sais maintenant lire un diagramme : en abscisse les douze mois, en ordonnée la hauteur de pluie en millimètres à gauche et la température en degrés à droite. " +
  "Les barres montrent la quantité tombée pendant chaque mois, la courbe montre comment la température évolue tout au long de l'année. " +
  "L'étendue se calcule en faisant maximum moins minimum. Et pour comparer deux villes honnêtement, il faut garder la même échelle.";

export function GraphiquesMeteo6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [cityKey, setCityKey] = useState<CityKey>('dakar');
  const [month, setMonth] = useState(0);
  const [placed, setPlaced] = useState<Record<CityKey, number[]>>({ dakar: [], ziguinchor: [], podor: [] });
  const [visited, setVisited] = useState<Set<CityKey>>(new Set<CityKey>(['dakar']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qAxe, setQAxe] = useState<string | null>(null);
  const [qLecture, setQLecture] = useState<string | null>(null);
  const [qEtendue, setQEtendue] = useState<string | null>(null);

  const city = useMemo(() => CITIES.find((c) => c.key === cityKey) as City, [cityKey]);
  const st = useMemo(() => stats(city), [city]);
  const marks = placed[cityKey];

  const placedTotal = placed.dakar.length + placed.ziguinchor.length + placed.podor.length;
  const curveDone = placed.dakar.length === 12 || placed.ziguinchor.length === 12 || placed.podor.length === 12;
  const canContinue = curveDone && visited.size >= 2;

  function pickCity(k: CityKey) {
    setCityKey(k);
    setMonth(0);
    setVisited((prev) => new Set(prev).add(k));
  }

  function placePoint() {
    setPlaced((prev) => {
      if (prev[cityKey].includes(month)) return prev;
      return { ...prev, [cityKey]: [...prev[cityKey], month] };
    });
    setMonth((m) => (m + 1) % 12);
  }

  function clearCurve() {
    setPlaced((prev) => ({ ...prev, [cityKey]: [] }));
    setMonth(0);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, placedTotal * 2); // 10 points placés = 20 pts
    s += Math.min(10, (visited.size - 1) * 5); // comparer 2 puis 3 villes
    if (hypo === 'ziguinchor') s += 10;
    if (qAxe === 'mois') s += 20;
    if (qLecture === 'barres-pluie') s += 20;
    if (qEtendue === '15') s += 20;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [placedTotal, visited, hypo, qAxe, qLecture, qEtendue]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'graphiques-meteo-6eme',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          citiesVisited: Array.from(visited),
          pointsPlaced: { dakar: placed.dakar.length, ziguinchor: placed.ziguinchor.length, podor: placed.podor.length },
          readings: CITIES.map((c) => ({ city: c.key, ...stats(c) })),
          qcm: { qAxe, qLecture, qEtendue },
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
                <BarChart3 className="h-5 w-5" />
              </span>
              Lire le climat du Sénégal dans un graphique
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Il ne pleut pas de la même façon partout : <strong>Ziguinchor</strong> (Casamance) reçoit environ
              1200 mm d&apos;eau par an, <strong>Dakar</strong> environ 400 mm et <strong>Podor</strong> (Sahel) à
              peine 250 mm. Pour comparer, on trace un <strong>diagramme ombrothermique</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Mission :</strong> les <span className="font-semibold text-blue-700">barres bleues</span> donnent
              la pluie de chaque mois (mm). À toi de <strong>construire la courbe rouge</strong> des températures (°C),
              point par point, puis de comparer deux villes.
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
              <MapPin className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de lire les graphiques, fais un pari. Tu vérifieras ensuite avec les données.
          </p>
          <QcmStep
            label="Selon moi, la ville qui reçoit le plus de pluie dans l'année est…"
            tone="violet"
            options={[
              { key: 'dakar', label: 'Dakar (côte atlantique)' },
              { key: 'ziguinchor', label: 'Ziguinchor (Casamance)' },
              { key: 'podor', label: 'Podor (vallée du fleuve)' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Ouvrir le graphique <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-violet-700" /> Étape 2 — Construis la courbe
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis le mois avec le curseur, lis la température, puis pose le point à la bonne hauteur. Change de
            ville pour comparer : l&apos;<strong>échelle reste la même</strong> (1 carreau = 50 mm = 5 °C).
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <Button
                key={c.key}
                size="sm"
                variant={c.key === cityKey ? 'gradient' : 'outline'}
                onClick={() => pickCity(c.key)}
              >
                <MapPin className="h-4 w-4" /> {c.name}
              </Button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <MeteoScene cityName={city.name} rain={city.rain} temp={city.temp} month={month} placed={marks} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="mois">Mois lu en abscisse</Label>
              <span className="font-mono text-violet-700">{MONTHS[month]}</span>
            </div>
            <input
              id="mois"
              type="range"
              min={0}
              max={11}
              step={1}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Pluie du mois" value={`${city.rain[month]} mm`} />
            <Stat label="Température" value={`${city.temp[month]} °C`} />
            <Stat label="Points posés" value={`${marks.length}/12`} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="soft" size="sm" onClick={placePoint} disabled={marks.includes(month)}>
                <PenLine className="h-4 w-4" />
                {marks.includes(month) ? 'Point déjà posé' : `Placer ${city.temp[month]} °C`}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearCurve} disabled={marks.length === 0}>
                <Eraser className="h-4 w-4" /> Effacer
              </Button>
            </div>
            <Button variant="gradient" disabled={!canContinue} onClick={() => setStep('mesures')}>
              {!curveDone
                ? `Termine une courbe (${marks.length}/12)`
                : visited.size < 2
                  ? 'Visite une 2ᵉ ville'
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
              <Table2 className="h-5 w-5 text-violet-700" /> Étape 3 — Maximum, minimum, étendue
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici ce que disent les trois graphiques. Rappel :{' '}
            <strong>étendue = valeur maximale − valeur minimale</strong>.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Ville</th>
                  <th className="px-3 py-2 text-left">Pluie de l&apos;année</th>
                  <th className="px-3 py-2 text-left">Mois le plus pluvieux</th>
                  <th className="px-3 py-2 text-left">Étendue des pluies</th>
                  <th className="px-3 py-2 text-left">Températures</th>
                  <th className="px-3 py-2 text-left">Étendue des °C</th>
                </tr>
              </thead>
              <tbody>
                {CITIES.map((c) => {
                  const s = stats(c);
                  const seen = visited.has(c.key);
                  return (
                    <tr key={c.key} className={'border-t border-night-100 ' + (seen ? 'bg-violet-50/40' : '')}>
                      <td className="px-3 py-2 font-semibold">
                        {c.name} {seen ? '👁' : ''}
                        <div className="text-[10px] font-normal text-ink/50">{c.region}</div>
                      </td>
                      <td className="px-3 py-2">{s.total} mm</td>
                      <td className="px-3 py-2">
                        {s.rMonth} ({s.rMax} mm)
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {s.rMax} − {s.rMin} = {s.rSpan} mm
                      </td>
                      <td className="px-3 py-2">
                        de {s.tMin} à {s.tMax} °C
                      </td>
                      <td className="px-3 py-2 font-mono">{s.tSpan} °C</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
            À {city.name}, la pluie tombe surtout de <strong>juin à octobre</strong> : c&apos;est l&apos;
            <strong>hivernage</strong>. Le reste de l&apos;année, les barres sont presque nulles : c&apos;est la{' '}
            <strong>saison sèche</strong>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner au graphique
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
            <CardTitle>Étape 4 — Valide ta lecture de graphique</CardTitle>
            <Badge tone="maths">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Sur ce diagramme, l'axe horizontal (l'abscisse) porte…"
              tone="violet"
              options={[
                { key: 'mois', label: "Les 12 mois de l'année" },
                { key: 'mm', label: 'Les hauteurs de pluie, en millimètres' },
                { key: 'degres', label: 'Les températures, en degrés Celsius' },
              ]}
              value={qAxe}
              onChange={setQAxe}
            />
            <QcmStep
              label="Que représentent les barres bleues et la courbe rouge ?"
              tone="violet"
              options={[
                { key: 'barres-pluie', label: 'Barres = pluie tombée pendant chaque mois (mm) · courbe = température (°C)' },
                { key: 'inverse', label: 'Barres = température (°C) · courbe = pluie (mm)' },
                { key: 'meme', label: 'Les deux montrent la pluie, en deux couleurs différentes' },
              ]}
              value={qLecture}
              onChange={setQLecture}
            />
            <QcmStep
              label="À Podor, la température moyenne la plus haute est 37 °C (juin) et la plus basse 22 °C (janvier). L'étendue des températures vaut…"
              tone="violet"
              hint="Étendue = valeur maximale − valeur minimale."
              options={[
                { key: '15', label: '15 °C' },
                { key: '59', label: '59 °C' },
                { key: '22', label: '22 °C' },
              ]}
              value={qEtendue}
              onChange={setQEtendue}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir le tableau
            </Button>
            <Button variant="success" disabled={!qAxe || !qLecture || !qEtendue || busy} onClick={handleValidate}>
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
              En <strong>abscisse</strong> : les 12 mois. En <strong>ordonnée</strong> : la pluie en mm (axe bleu, à
              gauche) et la température en °C (axe rouge, à droite). Les <strong>barres</strong> comptent la pluie de
              chaque mois ; la <strong>courbe</strong> montre l&apos;évolution de la température.
            </p>
            <p>
              <strong>Étendue = maximum − minimum.</strong> Ziguinchor : 400 − 0 = <strong>400 mm</strong> d&apos;écart
              entre le mois le plus arrosé et le plus sec ; Podor : 37 − 22 = <strong>15 °C</strong> d&apos;écart de
              température. Ziguinchor reçoit ~1200 mm par an, Dakar ~400 mm, Podor ~250 mm : c&apos;est bien la
              Casamance la plus arrosée.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              Détail du score : exploration {Math.min(20, placedTotal * 2)}/20 · villes comparées{' '}
              {Math.min(10, (visited.size - 1) * 5)}/10 · hypothèse {hypo === 'ziguinchor' ? 10 : 0}/10 · QCM{' '}
              {(qAxe === 'mois' ? 20 : 0) + (qLecture === 'barres-pluie' ? 20 : 0) + (qEtendue === '15' ? 20 : 0)}/60.
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
