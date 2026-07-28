'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Leaf, Lightbulb, Save, Sprout, Sun } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Photosynthèse : l'élodée et la lumière (4ème, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (bécher + élodée +
 * lampe réglable, bulles d'O₂ animées, graphe construit en direct) → mesures →
 * QCM → bilan.
 *
 * Modèle scientifique : le débit de dioxygène suit une courbe de saturation
 * (Michaelis-Menten) — proportionnel à l'éclairement quand la lumière est le
 * facteur limitant, puis plateau quand un autre facteur (CO₂, température)
 * devient limitant.  b(I) = B_MAX × I / (I + K)
 *
 * Bilan : 6 CO₂ + 6 H₂O --(lumière, chlorophylle)--> C₆H₁₂O₆ + 6 O₂
 */

const PhotoScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'plus' | 'moins' | 'rien' | null;

const B_MAX = 40; // débit maximal de l'appareil photosynthétique (bulles/min)
const K_LIGHT = 45; // éclairement (%) donnant la moitié du débit maximal
const MAX_RATE = 32; // échelle verticale du graphe

/** Débit de bulles d'O₂ (bulles/min) pour un éclairement donné, en %. */
function bubbleRate(lightPct: number): number {
  const i = Math.max(0, Math.min(100, lightPct));
  return (B_MAX * i) / (i + K_LIGHT);
}

/** Courbe modèle échantillonnée, envoyée à la scène 3D. */
const CURVE: [number, number][] = Array.from({ length: 41 }, (_, i) => {
  const l = i * 2.5;
  return [l, bubbleRate(l)];
});

const INTRO =
  "Au Sénégal, le soleil brille près de trois mille heures par an. C'est cette lumière que les manguiers de la Casamance, " +
  "les rizières de la vallée et les vieux baobabs du Sine-Saloum utilisent pour fabriquer eux-mêmes leur nourriture. " +
  "Aujourd'hui tu poses un brin d'élodée, une plante d'eau douce, au fond d'un bécher. Tu règles une lampe, " +
  "et tu comptes les bulles de dioxygène qui montent de ses feuilles.";

const CONCLUSION =
  "Bravo ! Plus l'éclairement augmente, plus l'élodée libère de bulles de dioxygène : c'est la photosynthèse. " +
  "Grâce à la chlorophylle de ses feuilles, la plante transforme six molécules de dioxyde de carbone et six molécules d'eau " +
  "en un sucre, le glucose, et rejette six molécules de dioxygène. " +
  "Mais au-delà d'un certain éclairement la courbe s'aplatit : la lumière n'est plus le facteur limitant, " +
  "c'est le dioxyde de carbone ou la température qui freine la plante. Voilà pourquoi, en plein midi, " +
  "une plante n'accélère plus indéfiniment.";

export function Photosynthese4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [light, setLight] = useState(50);
  const [measures, setMeasures] = useState<Record<number, number>>({});

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qGaz, setQGaz] = useState<string | null>(null);
  const [qEquation, setQEquation] = useState<string | null>(null);
  const [qPlateau, setQPlateau] = useState<string | null>(null);

  const rate = useMemo(() => bubbleRate(light), [light]);

  const points = useMemo<[number, number][]>(
    () =>
      Object.entries(measures)
        .map(([l, b]) => [Number(l), b] as [number, number])
        .sort((a, b) => a[0] - b[0]),
    [measures],
  );

  /** Enregistre une mesure « comptée à l'œil » : valeur modèle + petit écart d'observation. */
  function recordMeasure() {
    const noise = light === 0 ? 0 : Math.round((Math.random() * 2 - 1) * 1.2);
    const observed = Math.max(0, Math.round(bubbleRate(light)) + noise);
    setMeasures((prev) => ({ ...prev, [light]: observed }));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, points.length * 8); // exploration : 4 mesures = 30 pts
    if (hypo === 'plus') s += 10;
    if (qGaz === 'o2') s += 20;
    if (qEquation === 'co2-h2o') s += 20;
    if (qPlateau === 'autre-facteur') s += 20;
    return Math.max(0, Math.min(100, s));
  }, [points, hypo, qGaz, qEquation, qPlateau]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'photosynthese-4eme',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          measurements: points.map(([lightPct, bubblesPerMin]) => ({ lightPct, bubblesPerMin })),
          qcm: { qGaz, qEquation, qPlateau },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Leaf className="h-5 w-5" />
              </span>
              L&apos;élodée, la lampe et les bulles
            </CardTitle>
            <Badge tone="svt">SVT · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le Sénégal reçoit près de <strong>3 000 heures de soleil par an</strong>. Les manguiers de la{' '}
              <strong>Casamance</strong>, les rizières de la vallée et les baobabs du Sine-Saloum s&apos;en servent pour
              fabriquer eux-mêmes leur nourriture : c&apos;est la <strong>photosynthèse</strong>.
            </p>
            <p>
              Sur la paillasse, tu poses un brin d&apos;<strong>élodée</strong> (une plante d&apos;eau douce) au fond
              d&apos;un bécher, puis tu approches une lampe réglable. Des bulles montent de ses feuilles : tu vas les
              compter.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> montrer que la production de dioxygène dépend de la lumière reçue, et
              découvrir pourquoi elle finit par plafonner.
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
              <Sprout className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si tu <strong>augmentes</strong> l&apos;éclairement de la lampe, que va-t-il se passer
            pour les bulles produites par l&apos;élodée ?
          </p>
          <QcmStep
            label="Mon hypothèse : quand la lumière augmente, le nombre de bulles par minute…"
            tone="action"
            options={[
              { key: 'plus', label: 'Augmente' },
              { key: 'moins', label: 'Diminue' },
              { key: 'rien', label: 'Ne change pas' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Passer à la manipulation <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-emerald-700" /> Étape 2 — Règle la lampe et compte
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Déplace le curseur, observe les bulles qui montent de l&apos;élodée, puis <strong>enregistre la mesure</strong>.
            Le point rouge se place sur le graphe à droite. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <PhotoScene light={light} rate={rate} maxRate={MAX_RATE} curve={CURVE} points={points} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <Label htmlFor="light" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-emerald-700" /> Éclairement de la lampe
              </Label>
              <span className="font-mono text-emerald-700">{light} %</span>
            </div>
            <input
              id="light"
              type="range"
              min={0}
              max={100}
              step={5}
              value={light}
              onChange={(e) => setLight(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Lumière" value={`${light} %`} />
            <Stat label="Bulles / min" value={rate.toFixed(1)} />
            <Stat label="Mesures" value={`${points.length}/4`} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordMeasure}>
              <Save className="h-4 w-4" /> Enregistrer cette mesure
            </Button>
            <Button variant="gradient" disabled={points.length < 4} onClick={() => setStep('mesures')}>
              {points.length < 4
                ? `Enregistre ${4 - points.length} mesure(s) de plus`
                : 'Voir mon tableau de mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink/50">
            Astuce : pense à tester l&apos;obscurité (0 %) et un éclairement très fort (100 %).
          </p>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures</CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare tes valeurs : entre 0 % et 40 % le nombre de bulles grimpe vite, puis il augmente de moins en moins.
            C&apos;est le <strong>plateau</strong>.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-4 py-2 text-left">Lumière</th>
                  <th className="px-4 py-2 text-left">Bulles / min</th>
                  <th className="px-4 py-2 text-left">Dégagement d&apos;O₂</th>
                </tr>
              </thead>
              <tbody>
                {points.map(([l, b]) => (
                  <tr key={l} className="border-t border-night-100">
                    <td className="px-4 py-2 font-mono font-semibold">{l} %</td>
                    <td className="px-4 py-2 font-mono">{b}</td>
                    <td className="px-4 py-2">
                      <div className="h-2 w-full max-w-[180px] rounded-full bg-emerald-100">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(100, (b / MAX_RATE) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            Ton hypothèse de départ :{' '}
            <strong>
              {hypo === 'plus' ? 'les bulles augmentent' : hypo === 'moins' ? 'les bulles diminuent' : 'rien ne change'}
            </strong>{' '}
            — {hypo === 'plus' ? 'elle est confirmée par tes mesures. ✅' : 'tes mesures montrent le contraire : les bulles augmentent avec la lumière.'}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Refaire une mesure
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
              label="Quel gaz contiennent les bulles qui montent des feuilles de l'élodée ?"
              tone="action"
              options={[
                { key: 'o2', label: 'Du dioxygène (O₂)' },
                { key: 'co2', label: 'Du dioxyde de carbone (CO₂)' },
                { key: 'n2', label: 'Du diazote (N₂)' },
              ]}
              value={qGaz}
              onChange={setQGaz}
            />
            <QcmStep
              label="Quel est le bilan de la photosynthèse ?"
              tone="action"
              hint="Attention à ne pas confondre avec la respiration."
              options={[
                { key: 'co2-h2o', label: '6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂ (avec lumière et chlorophylle)' },
                { key: 'inverse', label: 'C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O' },
                { key: 'sol', label: 'Sels minéraux du sol → sucres + O₂ (sans lumière)' },
              ]}
              value={qEquation}
              onChange={setQEquation}
            />
            <QcmStep
              label="Au-delà d'un certain éclairement, le nombre de bulles n'augmente presque plus. Pourquoi ?"
              tone="action"
              options={[
                { key: 'autre-facteur', label: "La lumière n'est plus le facteur limitant : c'est le CO₂ ou la température qui limite" },
                { key: 'fatigue', label: 'La plante est fatiguée et se met au repos' },
                { key: 'erreur', label: "C'est une erreur de mesure, la courbe devrait toujours monter" },
              ]}
              value={qPlateau}
              onChange={setQPlateau}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes mesures
            </Button>
            <Button variant="success" disabled={!qGaz || !qEquation || !qPlateau || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Éclairée, l&apos;élodée libère du <strong>dioxygène</strong> : plus la lumière est forte, plus les bulles
              sont nombreuses. Dans le noir, la production s&apos;arrête.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-center font-mono text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
              6 CO₂ + 6 H₂O <span className="text-emerald-600">—(lumière, chlorophylle)→</span> C₆H₁₂O₆ + 6 O₂
            </p>
            <p>
              La courbe finit par former un <strong>plateau</strong> : la lumière n&apos;est alors plus le{' '}
              <strong>facteur limitant</strong>, c&apos;est le CO₂ dissous ou la température qui freine la plante.
            </p>
            <p className="text-sm text-ink/60">
              Score = exploration ({Math.min(30, points.length * 8)}/30) + hypothèse ({hypo === 'plus' ? 10 : 0}/10) +
              QCM ({(qGaz === 'o2' ? 20 : 0) + (qEquation === 'co2-h2o' ? 20 : 0) + (qPlateau === 'autre-facteur' ? 20 : 0)}/60).
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
    <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
      <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-emerald-800">{value}</div>
    </div>
  );
}
