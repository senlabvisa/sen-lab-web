'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Car, Gauge, Play, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Cinématique : mouvement & vitesse moyenne (Physique-Chimie, 3ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures →
 * QCM → bilan. Science juste : v = d/t, mouvement uniforme (positions
 * équidistantes, graphe d(t) = droite), 1 m/s = 3,6 km/h. Contexte
 * sénégalais : un car rapide sur la route Dakar–Thiès.
 */

const MotionScene = dynamic(() => import('./motion-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'plus' | 'pareil' | 'moins' | null;

const INTRO =
  "Un car rapide quitte Dakar pour Thiès, environ 70 kilomètres de route. " +
  "Pour savoir s'il roule vite, on calcule sa vitesse : la distance parcourue divisée par la durée du trajet. " +
  "C'est la vitesse moyenne, v égale d divisé par t. Aujourd'hui tu fais rouler le car, tu poses des jalons et tu mesures sa vitesse.";

const CONCLUSION =
  "Bravo ! La vitesse moyenne est la distance divisée par la durée : v = d / t. " +
  "Quand la vitesse est constante, le mouvement est uniforme : les jalons posés à intervalles de temps égaux sont équidistants, et le graphe distance-temps est une droite. " +
  "Pense aussi que 1 mètre par seconde vaut 3,6 kilomètres par heure : 36 km/h, c'est donc 10 m/s.";

export function Cinematique3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [speed, setSpeed] = useState(5);
  const [running, setRunning] = useState(false);
  const [speedsTried, setSpeedsTried] = useState<Set<number>>(new Set());

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qFormule, setQFormule] = useState<string | null>(null);
  const [qUniforme, setQUniforme] = useState<string | null>(null);
  const [qConvert, setQConvert] = useState<string | null>(null);

  // À vitesse constante, sur 5 jalons espacés de 2 s, distance entre deux
  // jalons = v × 2. Distance totale (4 intervalles) = v × 8.
  const dt = 2;
  const dInter = useMemo(() => speed * dt, [speed]);
  const dTotal = useMemo(() => speed * dt * 4, [speed]);
  const kmh = useMemo(() => speed * 3.6, [speed]);

  function startRun() {
    setRunning(true);
    setSpeedsTried((prev) => new Set(prev).add(Number(speed.toFixed(1))));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, speedsTried.size * 9); // exploration (vitesses essayées)
    if (hypo === 'plus') s += 5; // prédiction cohérente
    if (qFormule === 'd_div_t') s += 25;
    if (qUniforme === 'constante') s += 25;
    if (qConvert === '10') s += 20;
    return Math.min(100, s);
  }, [speedsTried, hypo, qFormule, qUniforme, qConvert]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'cinematique-3eme',
        version: '2.0',
        steps: {
          speedsTried: Array.from(speedsTried),
          lastSpeed: speed,
          hypothesis: hypo,
          qcm: { qFormule, qUniforme, qConvert },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-physique" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <Car className="h-5 w-5" />
              </span>
              Le car rapide Dakar–Thiès
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Un <strong>car rapide</strong> file de Dakar vers Thiès. Pour savoir s&apos;il roule vite, on mesure sa{' '}
              <strong>vitesse moyenne</strong> : la distance parcourue divisée par la durée.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> faire rouler le car, poser des jalons toutes les 2 s et comprendre que{' '}
              <strong>v = d / t</strong>. Quand la vitesse est constante, le mouvement est <strong>uniforme</strong>.
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
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si le car roule <strong>plus vite</strong> mais toujours pendant 2 s, la distance qu&apos;il
            parcourt entre deux jalons va…
          </p>
          <QcmStep
            label="Mon hypothèse : à plus grande vitesse, la distance parcourue en 2 s…"
            tone="amber"
            options={[
              { key: 'plus', label: 'Augmente' },
              { key: 'pareil', label: 'Ne change pas' },
              { key: 'moins', label: 'Diminue' },
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
              <Gauge className="h-5 w-5 text-amber-700" /> Étape 2 — Fais rouler le car
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle la vitesse, démarre, et observe les jalons (toutes les 2 s) et le graphe distance-temps. Tourne la scène
            avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <MotionScene speed={speed} running={running} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="s">Vitesse v</Label>
                <span className="font-mono text-amber-700">
                  {speed.toFixed(1)} m/s · {kmh.toFixed(0)} km/h
                </span>
              </div>
              <input
                id="s"
                type="range"
                min={2}
                max={12}
                step={0.5}
                value={speed}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSpeed(v);
                  if (running) setSpeedsTried((prev) => new Set(prev).add(Number(v.toFixed(1))));
                }}
                className="slider-lab w-full"
              />
            </div>
            <Button variant="gradient" onClick={() => (running ? setRunning(false) : startRun())}>
              <Play className="h-3.5 w-3.5" /> {running ? 'Stop' : 'Démarrer'}
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Entre 2 jalons (2 s)" value={`${dInter.toFixed(0)} m`} />
            <Stat label="Distance totale (8 s)" value={`${dTotal.toFixed(0)} m`} />
            <Stat label="v = d / t" value={`${speed.toFixed(1)} m/s`} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              {speedsTried.size === 0 ? 'Démarre pour mesurer une 1ʳᵉ vitesse.' : `${speedsTried.size} vitesse(s) testée(s)`}
            </span>
            <Button variant="gradient" disabled={speedsTried.size < 2} onClick={() => setStep('mesures')}>
              {speedsTried.size < 2 ? `Teste ${2 - speedsTried.size} vitesse(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures</CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour chaque vitesse, voici la distance entre deux jalons (mesurés toutes les <strong>2 s</strong>). Remarque :
            à vitesse constante, cette distance reste la <strong>même</strong> → jalons équidistants, mouvement uniforme.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                <tr>
                  <th className="px-4 py-2 text-left">Vitesse v</th>
                  <th className="px-4 py-2 text-left">En km/h</th>
                  <th className="px-4 py-2 text-left">Distance / 2 s</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(speedsTried)
                  .sort((a, b) => a - b)
                  .map((v) => (
                    <tr key={v} className="border-t border-night-100">
                      <td className="px-4 py-2">{v.toFixed(1)} m/s</td>
                      <td className="px-4 py-2">{(v * 3.6).toFixed(0)} km/h</td>
                      <td className="px-4 py-2">{(v * dt).toFixed(0)} m</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-900 ring-1 ring-sky-100">
            Rappel : <strong>1 m/s = 3,6 km/h</strong>. Le graphe distance-temps d(t) est une <strong>droite</strong> : c&apos;est
            la signature d&apos;un mouvement uniforme.
          </p>
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
            <Badge tone="physique">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="La vitesse moyenne se calcule par :"
              tone="amber"
              options={[
                { key: 'd_div_t', label: 'distance ÷ durée' },
                { key: 't_div_d', label: 'durée ÷ distance' },
                { key: 'd_x_t', label: 'distance × durée' },
              ]}
              value={qFormule}
              onChange={setQFormule}
            />
            <QcmStep
              label="Dans un mouvement uniforme, la vitesse est :"
              tone="amber"
              options={[
                { key: 'constante', label: 'Constante' },
                { key: 'croissante', label: 'Toujours croissante' },
                { key: 'nulle', label: 'Nulle' },
              ]}
              value={qUniforme}
              onChange={setQUniforme}
            />
            <QcmStep
              label="36 km/h valent :"
              tone="amber"
              options={[
                { key: '10', label: '10 m/s' },
                { key: '36', label: '36 m/s' },
                { key: '100', label: '100 m/s' },
              ]}
              value={qConvert}
              onChange={setQConvert}
              hint="Indice : 1 m/s = 3,6 km/h."
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qFormule || !qUniforme || !qConvert || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-physique">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La vitesse moyenne, c&apos;est <strong>v = d / t</strong>. Quand elle est constante, le mouvement est{' '}
              <strong>uniforme</strong> : jalons équidistants et graphe d(t) en <strong>droite</strong>. Et{' '}
              <strong>36 km/h = 10 m/s</strong> (car 1 m/s = 3,6 km/h).
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
    <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100">
      <div className="text-[10px] uppercase tracking-wider text-amber-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-amber-800">{value}</div>
    </div>
  );
}
