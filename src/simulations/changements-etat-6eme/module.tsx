'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Thermometer,
} from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Les changements d'état de l'eau (6ème, Physique-Chimie).
 *
 * Lab Premium : on chauffe 100 g de glace à −20 °C avec une plaque de 500 W
 * et on relève la COURBE DE CHAUFFAGE. L'idée forte du TP, c'est le
 * **palier** : à 0 °C (fusion) et à 100 °C (ébullition), la température ne
 * monte plus alors que la plaque chauffe toujours.
 *
 * Complémentaire du TP « États de la matière » (qui décrit les 3 états) :
 * ici on étudie le PASSAGE d'un état à l'autre et son vocabulaire (fusion,
 * solidification, vaporisation, condensation).
 *
 * Contexte sénégalais : les sachets d'eau glacée vendus devant l'école et
 * le couscoussier du thiéré.
 */

const HeatingScene = dynamic(() => import('./heating-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-blue-50 text-sm text-ink/50">
      Chargement de la paillasse 3D…
    </div>
  ),
});

// ── Physique réelle (SI, pression normale) ────────────────────────────
const M = 0.1; // kg de glace
const P = 500; // W
const C_ICE = 2100; // J·kg⁻¹·K⁻¹
const C_WATER = 4185; // J·kg⁻¹·K⁻¹
const LF = 334_000; // J·kg⁻¹
const LV = 2_256_000; // J·kg⁻¹
const T_ICE = -20; // °C

const T1 = (M * C_ICE * 20) / P; // 8,4 s
const T2 = T1 + (M * LF) / P; // 75,2 s
const T3 = T2 + (M * C_WATER * 100) / P; // 158,9 s
const T_VAP = T3 + (M * LV) / P; // 610,1 s
const T_OBS = 300; // fenêtre d'observation

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Phase = 'glace' | 'fusion' | 'liquide' | 'ebullition';
type Hypo = 'monte' | 'bloque' | 'descend' | null;

const PHASE_LABEL: Record<Phase, string> = {
  glace: 'Glace (solide)',
  fusion: 'Fusion — palier à 0 °C',
  liquide: 'Eau liquide',
  ebullition: 'Ébullition — palier à 100 °C',
};

function heating(t: number): { temp: number; phase: Phase } {
  if (t <= T1) return { temp: T_ICE + (P * t) / (M * C_ICE), phase: 'glace' };
  if (t <= T2) return { temp: 0, phase: 'fusion' };
  if (t <= T3) return { temp: (P * (t - T2)) / (M * C_WATER), phase: 'liquide' };
  return { temp: 100, phase: 'ebullition' };
}

const INTRO_NARRATION =
  "Devant ton école, on vend des sachets d'eau glacée. À la sortie du congélateur, le sachet est dur comme une pierre. " +
  "Dix minutes plus tard, il est tout mou : la glace est devenue de l'eau liquide. " +
  "Et quand ta grande sœur cuit le thiéré au couscoussier, l'eau bout et la vapeur monte ; sur le couvercle, des gouttes se forment. " +
  "Aujourd'hui tu vas chauffer cent grammes de glace et suivre la température minute par minute. " +
  "Tu vas découvrir quelque chose d'étonnant : par moments, la température refuse de monter.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu as tracé la courbe de chauffage de l'eau. Elle a deux paliers : un à zéro degré pendant la fusion de la glace, " +
  "un à cent degrés pendant l'ébullition. Pendant un palier, la plaque chauffe toujours, mais toute l'énergie sert à changer l'état de l'eau, " +
  "pas à élever sa température. Retiens les quatre mots : fusion, solidification, vaporisation, condensation. " +
  "Le palier d'ébullition est beaucoup plus long que celui de fusion : il faut bien plus d'énergie pour vaporiser l'eau que pour la faire fondre.";

export function ChangementsEtat6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [phasesSeen, setPhasesSeen] = useState<Set<Phase>>(new Set(['glace']));
  const [marks, setMarks] = useState<Array<{ t: number; temp: number; phase: Phase }>>([]);

  const [hypo, setHypo] = useState<Hypo>(null);
  const [qEnergie, setQEnergie] = useState<string | null>(null);
  const [qCondensation, setQCondensation] = useState<string | null>(null);
  const [qSolidification, setQSolidification] = useState<string | null>(null);

  const cur = useMemo(() => heating(time), [time]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTime((t) => Math.min(T_OBS, t + 3));
    }, 120);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    if (playing && time >= T_OBS) setPlaying(false);
  }, [playing, time]);

  useEffect(() => {
    setPhasesSeen((prev) => (prev.has(cur.phase) ? prev : new Set(prev).add(cur.phase)));
  }, [cur.phase]);

  function reset() {
    setPlaying(false);
    setTime(0);
  }

  function record() {
    setMarks((prev) =>
      prev.some((m) => Math.abs(m.t - time) < 1)
        ? prev
        : [...prev, { t: time, temp: cur.temp, phase: cur.phase }].sort((a, b) => a.t - b.t),
    );
  }

  const score = useMemo(() => {
    let s = Math.min(30, phasesSeen.size * 8); // exploration des 4 phases
    if (hypo === 'bloque') s += 10;
    if (qEnergie === 'changement') s += 20;
    if (qCondensation === 'condensation') s += 20;
    if (qSolidification === '0') s += 20;
    return Math.max(0, Math.min(100, s));
  }, [phasesSeen, hypo, qEnergie, qCondensation, qSolidification]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'changements-etat-6eme',
        version: '2.0',
        steps: {
          finalTime: time,
          finalTemp: Number(cur.temp.toFixed(1)),
          phasesSeen: Array.from(phasesSeen),
          marks,
          hypothesis: hypo,
          qcm: { qEnergie, qCondensation, qSolidification },
        },
      },
      score,
    );
    setStep('done');
  }

  const allPhases = phasesSeen.size >= 4;

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-orange-700 shadow-soft ring-1 ring-orange-100">
                <Flame className="h-5 w-5" />
              </span>
              La courbe qui refuse de monter
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Devant ton école, on vend des <strong>sachets d&apos;eau glacée</strong>. À la sortie du
              congélateur le sachet est dur comme une pierre ; dix minutes plus tard il est liquide. Et
              quand on cuit le <strong>thiéré au couscoussier</strong>, l&apos;eau bout, la vapeur monte,
              puis des gouttes se forment sous le couvercle.
            </p>
            <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-900 ring-1 ring-orange-100">
              <strong>Mission :</strong> chauffer 100 g de glace prise à −20 °C sur une plaque de 500 W,
              relever la température au fil du temps et tracer la <strong>courbe de chauffage</strong>.
            </p>
            <p>
              Attention : ce TP ne parle pas des trois états, mais du <strong>passage</strong> d&apos;un
              état à l&apos;autre. Tu vas voir un phénomène surprenant : par moments la plaque chauffe,
              et pourtant la température <strong>ne bouge plus</strong>.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypo')}>
              Allumer le bec de gaz
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'hypo' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-orange-700" />
              Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le bécher contient de la glace et de l&apos;eau à 0 °C. La plaque chauffe sans arrêt.
            Selon toi, <strong>pendant que la glace fond</strong>, que fait le thermomètre ?
          </p>
          <QcmStep
            label="Mon hypothèse : pendant la fonte de la glace, la température…"
            tone="science"
            hint="Réponds sans regarder : tu vérifieras juste après."
            options={[
              { key: 'monte', label: 'Monte régulièrement, comme avant' },
              { key: 'bloque', label: 'Reste bloquée à 0 °C tant qu’il reste de la glace' },
              { key: 'descend', label: 'Descend sous 0 °C' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as Hypo)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier sur la paillasse
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-700" />
              Étape 2 — Chauffe et trace la courbe
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Appuie sur <strong>Chauffer</strong>. Regarde en même temps le bécher (à gauche) et le point
            noir qui avance sur la courbe (à droite). Tu peux aussi faire glisser le curseur du temps
            pour revenir en arrière. Tourne la scène avec ta souris / ton doigt.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-orange-100">
            <div className="aspect-[4/3] w-full">
              <HeatingScene time={time} marks={marks.map((m) => [m.t, m.temp] as [number, number])} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <Label htmlFor="t">Temps de chauffage</Label>
              <span className="font-mono text-orange-700">
                {time.toFixed(0)} s · {cur.temp.toFixed(0)} °C
              </span>
            </div>
            <input
              id="t"
              type="range"
              min={0}
              max={T_OBS}
              step={1}
              value={time}
              onChange={(e) => {
                setPlaying(false);
                setTime(Number(e.target.value));
              }}
              className="slider-lab w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink/40">
              <span>0 s</span>
              <span>fusion</span>
              <span>chauffage de l&apos;eau</span>
              <span>{T_OBS} s</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="gradient" size="sm" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? 'Pause' : 'Chauffer'}
            </Button>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Recommencer
            </Button>
            <Button variant="soft" size="sm" onClick={record}>
              <ClipboardList className="h-3.5 w-3.5" />
              Noter cette mesure
            </Button>
            <Badge tone={marks.length > 0 ? 'maths' : 'neutral'} size="sm">
              {marks.length} mesure{marks.length > 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['glace', 'fusion', 'liquide', 'ebullition'] as Phase[]).map((p) => (
              <div
                key={p}
                className={
                  'rounded-xl p-2 text-center text-[11px] ring-1 transition ' +
                  (cur.phase === p
                    ? 'bg-orange-50 font-semibold text-orange-800 ring-orange-200'
                    : phasesSeen.has(p)
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-ink/5 text-ink/40 ring-transparent')
                }
              >
                {phasesSeen.has(p) ? '✓ ' : ''}
                {PHASE_LABEL[p]}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={!allPhases} onClick={() => setStep('mesures')}>
              {allPhases ? 'Voir mon tableau de mesures' : 'Chauffe jusqu’à l’ébullition…'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-700" />
              Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare tes relevés : repère les lignes où la température <strong>ne change pas</strong>
            alors que le temps avance. Ce sont les <strong>paliers</strong>.
          </p>

          {marks.length === 0 ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              Tu n&apos;as noté aucune mesure. Reviens à la paillasse et clique sur « Noter cette
              mesure » à plusieurs moments du chauffage.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
              <table className="w-full text-sm">
                <thead className="bg-orange-50 text-xs uppercase tracking-wider text-orange-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Temps (s)</th>
                    <th className="px-4 py-2 text-left">Température (°C)</th>
                    <th className="px-4 py-2 text-left">Ce qu&apos;on voit</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map((m) => {
                    const plateau = m.phase === 'fusion' || m.phase === 'ebullition';
                    return (
                      <tr
                        key={m.t}
                        className={'border-t border-night-100 ' + (plateau ? 'bg-blue-50 font-semibold' : '')}
                      >
                        <td className="px-4 py-2 font-mono">{m.t.toFixed(0)}</td>
                        <td className="px-4 py-2 font-mono">{m.temp.toFixed(0)}</td>
                        <td className="px-4 py-2">
                          {PHASE_LABEL[m.phase]} {plateau ? '⏸' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
            <strong>Bilan de la courbe :</strong> la glace passe de −20 °C à 0 °C, puis la température
            se bloque à <strong>0 °C</strong> (fusion). Elle repart ensuite jusqu&apos;à{' '}
            <strong>100 °C</strong>, où elle se bloque de nouveau (ébullition). Ton hypothèse était{' '}
            {hypo === 'bloque' ? <strong>juste</strong> : <strong>à corriger</strong>}.
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner chauffer
            </Button>
            <Button variant="gradient" onClick={() => setStep('qcm')}>
              Conclure
              <ArrowRight className="h-4 w-4" />
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
              label="Pendant le palier à 0 °C, la plaque chauffe toujours. À quoi sert cette énergie ?"
              tone="science"
              options={[
                { key: 'changement', label: 'À faire fondre la glace, donc à changer son état (pas à la réchauffer)' },
                { key: 'temperature', label: "À faire monter la température de l'eau" },
                { key: 'perdue', label: 'À rien : elle est perdue' },
              ]}
              value={qEnergie}
              onChange={setQEnergie}
            />
            <QcmStep
              label="Sous le couvercle du couscoussier, la vapeur redevient liquide. Ce changement d'état s'appelle…"
              tone="science"
              options={[
                { key: 'condensation', label: 'La condensation (ou liquéfaction) : gaz → liquide' },
                { key: 'fusion', label: 'La fusion : solide → liquide' },
                { key: 'vaporisation', label: 'La vaporisation : liquide → gaz' },
              ]}
              value={qCondensation}
              onChange={setQCondensation}
            />
            <QcmStep
              label="On remet l'eau liquide au congélateur : elle se solidifie. À quelle température ?"
              tone="science"
              hint="La solidification est le changement inverse de la fusion."
              options={[
                { key: '0', label: '0 °C, la même température que la fusion' },
                { key: '100', label: '100 °C' },
                { key: 'moins20', label: '−20 °C' },
              ]}
              value={qSolidification}
              onChange={setQSolidification}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes mesures
            </Button>
            <Button
              variant="success"
              disabled={!qEnergie || !qCondensation || !qSolidification || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La courbe de chauffage de l&apos;eau a <strong>deux paliers</strong> : à{' '}
              <strong>0 °C</strong> pendant la <strong>fusion</strong> (solide → liquide) et à{' '}
              <strong>100 °C</strong> pendant la <strong>vaporisation</strong> (liquide → gaz), sous la
              pression de l&apos;air habituelle.
            </p>
            <p>
              Pendant un palier, l&apos;énergie reçue sert entièrement à <strong>changer l&apos;état</strong>{' '}
              de l&apos;eau, jamais à élever sa température. Les changements inverses portent d&apos;autres
              noms : <strong>solidification</strong> (liquide → solide, à 0 °C) et{' '}
              <strong>condensation</strong> (gaz → liquide), comme les gouttes sous le couvercle.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-ink/5">
              <strong>Pour aller plus loin :</strong> le palier d&apos;ébullition est bien plus long que
              celui de fusion. Il faut environ 334 kJ pour fondre 1 kg de glace, mais 2 256 kJ pour
              vaporiser 1 kg d&apos;eau — presque sept fois plus.
            </p>
            <p className="text-xs text-ink/50">
              Détail du score : exploration des 4 phases {Math.min(30, phasesSeen.size * 8)}/30 ·
              hypothèse {hypo === 'bloque' ? 10 : 0}/10 · QCM{' '}
              {(qEnergie === 'changement' ? 20 : 0) +
                (qCondensation === 'condensation' ? 20 : 0) +
                (qSolidification === '0' ? 20 : 0)}
              /60. Vaporisation complète des 100 g d&apos;eau : {T_VAP.toFixed(0)} s de chauffage.
            </p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
