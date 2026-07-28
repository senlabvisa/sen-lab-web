'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, FlaskConical, Gauge, Thermometer, Beaker as BeakerIcon } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Cinétique chimique : vitesse de réaction & facteurs cinétiques
 * (Terminale S, Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (sliders T° et
 * concentration) → mesures → QCM → bilan. Science réelle : l'avancement x(t)
 * tend vers un palier, la vitesse v = k·[A] diminue quand les réactifs
 * s'épuisent. ↑T° → ↑vitesse (Arrhenius) ; ↑concentration → ↑vitesse ; un
 * catalyseur accélère sans être consommé. Contexte : conserver les aliments
 * au frais à Dakar (réactions plus lentes au froid).
 */

const KineticScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'plus-vite' | 'plus-lent' | 'pareil' | null;

const INTRO =
  "Au marché de Dakar, on garde la viande et le poisson au frais : au froid, les réactions qui les abîment sont beaucoup plus lentes. " +
  "La cinétique chimique étudie justement la vitesse des réactions. Aujourd'hui tu fais réagir des réactifs dans une fiole et tu règles deux facteurs : " +
  "la température et la concentration. Observe la courbe d'avancement et trouve ce qui rend une réaction plus rapide.";

const CONCLUSION =
  "Bravo ! La vitesse d'une réaction diminue au cours du temps, car les réactifs s'épuisent : la courbe d'avancement monte de moins en moins vite et atteint un palier. " +
  "Pour accélérer, on augmente la température ou la concentration des réactifs ; un catalyseur accélère sans être consommé. " +
  "C'est pour cela qu'au frais, comme dans un frigo, les aliments se conservent plus longtemps.";

/**
 * Modèle cinétique.
 * - T° (°C) → constante k via une loi d'Arrhenius simplifiée (k croît avec T).
 * - concentration relative C0 ∈ [0,1] → amplifie la vitesse initiale v0 = k·C0.
 * Renvoie le k effectif passé à la scène et la vitesse initiale relative.
 */
function kinetics(tempC: number, concPct: number) {
  const conc = concPct / 100; // [0,1]
  const T = tempC + 273; // K
  // Arrhenius : k = A·exp(−Ea/RT). Constantes calées pour rester lisibles.
  const k = 0.34 * Math.exp(-1900 / T); // s⁻¹ (échelle scène)
  const rate = k; // pilote la rapidité (T°)
  const v0 = k * conc; // vitesse initiale v = k·[A]₀ (dépend aussi de C0)
  const tHalf = Math.log(2) / Math.max(k, 1e-4);
  return { conc, k, rate, v0, tHalf };
}

export function CinetiqueChimiqueTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [temp, setTemp] = useState(25);
  const [conc, setConc] = useState(50);
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const [fastest, setFastest] = useState<{ temp: number; conc: number; v0: number } | null>(null);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qTemp, setQTemp] = useState<string | null>(null);
  const [qVitesse, setQVitesse] = useState<string | null>(null);
  const [qCata, setQCata] = useState<string | null>(null);

  const cur = useMemo(() => kinetics(temp, conc), [temp, conc]);

  function track(nextTemp: number, nextConc: number) {
    const v = kinetics(nextTemp, nextConc);
    setExplored((prev) => new Set(prev).add(`${nextTemp}|${nextConc}`));
    setFastest((b) => (!b || v.v0 > b.v0 ? { temp: nextTemp, conc: nextConc, v0: v.v0 } : b));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, explored.size * 4); // exploration (avoir manipulé)
    if (hypo === 'plus-vite') s += 10; // bonne prédiction
    if (qTemp === 'accelere') s += 22;
    if (qVitesse === 'diminue') s += 22;
    if (qCata === 'accelere-sans') s += 21;
    return Math.min(100, s);
  }, [explored, hypo, qTemp, qVitesse, qCata]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'cinetique-chimique-terminale',
        version: '2.0',
        steps: {
          explored: Array.from(explored),
          fastest,
          hypothesis: hypo,
          qcm: { qTemp, qVitesse, qCata },
        },
      },
      score,
    );
    setStep('done');
  }

  // Indicateur de vitesse relatif (0–100) pour le Readout / barre.
  const speedIdx = Math.round(Math.min(100, (cur.v0 / 0.18) * 100));
  const speedWord = speedIdx > 55 ? 'rapide' : speedIdx > 25 ? 'modérée' : 'lente';

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-amber" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <FlaskConical className="h-5 w-5" />
              </span>
              Vitesse de réaction
            </CardTitle>
            <Badge tone="science">Physique-Chimie · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au marché de Dakar, on garde la viande et le poisson <strong>au frais</strong> : au froid, les réactions
              qui les abîment sont bien plus <strong>lentes</strong>. La cinétique chimique étudie la{' '}
              <strong>vitesse des réactions</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> régler la <strong>température</strong> et la <strong>concentration</strong>,
              observer la courbe d&apos;avancement x(t), et trouver ce qui rend une réaction plus rapide.
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
              <Thermometer className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si tu <strong>chauffes</strong> le mélange, à ton avis la réaction va se passer…
          </p>
          <QcmStep
            label="Mon hypothèse : en augmentant la température, la réaction sera…"
            tone="amber"
            options={[
              { key: 'plus-vite', label: 'Plus rapide' },
              { key: 'plus-lent', label: 'Plus lente' },
              { key: 'pareil', label: 'Identique (aucun effet)' },
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
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Règle la réaction
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais varier la température et la concentration. Observe l&apos;effervescence dans la fiole et la courbe
            d&apos;avancement. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <KineticScene rate={cur.rate} conc={cur.conc} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="t">Température</Label>
                <span className="font-mono text-violet-700">{temp} °C</span>
              </div>
              <input
                id="t"
                type="range"
                min={5}
                max={90}
                step={5}
                value={temp}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTemp(v);
                  track(v, conc);
                }}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="c">Concentration des réactifs</Label>
                <span className="font-mono text-violet-700">{conc} %</span>
              </div>
              <input
                id="c"
                type="range"
                min={10}
                max={100}
                step={10}
                value={conc}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setConc(v);
                  track(temp, v);
                }}
                className="slider-lab w-full"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Vitesse" value={speedWord} />
            <Stat label="Indice vitesse" value={`${speedIdx}/100`} />
            <Stat label="Demi-réaction t½" value={`${cur.tHalf.toFixed(1)} s`} />
          </div>
          {/* barre = indicateur de vitesse */}
          <div className="mt-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100">
              <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${speedIdx}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink/55">
              Plus la température et la concentration sont élevées, plus la vitesse est grande et plus t½ est court.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">{explored.size} réglage(s) testé(s)</span>
            <Button variant="gradient" disabled={explored.size < 4} onClick={() => setStep('mesures')}>
              {explored.size < 4 ? `Teste ${4 - explored.size} réglage(s) de plus` : 'Voir mes observations'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BeakerIcon className="h-5 w-5 text-violet-700" /> Étape 3 — Tes observations
            </CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici ce que tu as observé. Le réglage le plus rapide est celui où la température{' '}
            <strong>et</strong> la concentration sont les plus élevées.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Obs
              title="↑ Température"
              body="La réaction accélère : plus de chocs efficaces entre molécules (loi d'Arrhenius)."
            />
            <Obs
              title="↑ Concentration"
              body="Plus de réactifs par litre ⇒ plus de chocs ⇒ vitesse initiale plus grande."
            />
            <Obs
              title="Au cours du temps"
              body="La vitesse diminue : les réactifs s'épuisent, la courbe atteint un palier."
            />
            <Obs
              title="Au frais (Dakar)"
              body="Réactions ralenties : c'est pourquoi la nourriture se conserve mieux au froid."
            />
          </div>
          {fastest && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              🏆 Ton réglage le plus rapide : <strong>{fastest.temp} °C</strong> et{' '}
              <strong>{fastest.conc} %</strong> de réactifs.
            </p>
          )}
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
            <Badge tone="science">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Augmenter la température :"
              tone="amber"
              options={[
                { key: 'accelere', label: 'Accélère la réaction' },
                { key: 'ralentit', label: 'Ralentit la réaction' },
                { key: 'rien', label: "N'a aucun effet" },
              ]}
              value={qTemp}
              onChange={setQTemp}
            />
            <QcmStep
              label="Au cours du temps, la vitesse d'une réaction :"
              tone="amber"
              options={[
                { key: 'diminue', label: "Diminue (les réactifs s'épuisent)" },
                { key: 'augmente', label: 'Augmente' },
                { key: 'constante', label: 'Reste constante' },
              ]}
              value={qVitesse}
              onChange={setQVitesse}
            />
            <QcmStep
              label="Un catalyseur :"
              tone="amber"
              options={[
                { key: 'accelere-sans', label: 'Accélère la réaction sans être consommé' },
                { key: 'consomme', label: 'Accélère la réaction en se consommant' },
                { key: 'ralentit', label: 'Ralentit la réaction' },
              ]}
              value={qCata}
              onChange={setQCata}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qTemp || !qVitesse || !qCata || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-amber">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La <strong>vitesse diminue</strong> au cours du temps (réactifs épuisés) : x(t) atteint un{' '}
              <strong>palier</strong>. On l&apos;augmente avec la <strong>température</strong> ou la{' '}
              <strong>concentration</strong> ; un <strong>catalyseur</strong> accélère sans être consommé et le{' '}
              <strong>t½</strong> diminue quand la vitesse augmente.
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

function Obs({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-violet-50/60 p-3 ring-1 ring-violet-100">
      <div className="text-sm font-semibold text-violet-800">{title}</div>
      <div className="mt-0.5 text-xs text-ink/70">{body}</div>
    </div>
  );
}
