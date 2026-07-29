'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, CheckCircle2, Gauge, LineChart, Save, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Loi d'Ohm : caractéristique d'un conducteur ohmique (3ème, Physique-Chimie).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures → QCM → bilan.
 * L'élève règle la tension du générateur et le rhéostat, relève les couples (I ; U)
 * point par point, voit la caractéristique U = f(I) se construire, et découvre que
 * c'est une droite passant par l'origine dont la pente vaut R.
 *
 * Physique : I = E / (R + R_rhéostat) puis U = R × I. R = 20 Ω (caché).
 * Contexte : le fer à repasser du tailleur branché sur le compteur Woyofal.
 */

const OhmScene = dynamic(() => import('./ohm-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la paillasse 3D…
    </div>
  ),
});

const R_OHM = 20; // conducteur ohmique étudié (Ω) — inconnu de l'élève
const RH_MAX = 30; // course du rhéostat (Ω)
const MIN_POINTS = 4;
const MAX_POINTS = 8;

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'double' | 'identique' | 'moitie' | null;
type Point = { i: number; u: number; e: number; rh: number };

const INTRO =
  "Dans l'atelier du quartier, le tailleur branche son fer à repasser sur le compteur Woyofal. " +
  "Le fer chauffe parce qu'un fil s'oppose au passage du courant : cette opposition s'appelle la résistance, " +
  "et elle se mesure en ohms. Aujourd'hui tu montes un vrai circuit de paillasse : un générateur réglable, " +
  "un rhéostat, un conducteur ohmique, un ampèremètre en série et un voltmètre en dérivation. " +
  "Tu relèves des couples intensité-tension, tu traces la caractéristique, et tu découvres la loi d'Ohm : " +
  "U égale R fois I.";

const CONCLUSION =
  "Bravo ! Pour un conducteur ohmique, la tension U est proportionnelle à l'intensité I : U égale R fois I. " +
  "La caractéristique U en fonction de I est donc une droite qui passe par l'origine, et sa pente donne " +
  "la résistance R en ohms. Retiens aussi le branchement : l'ampèremètre se place en série dans le circuit, " +
  "le voltmètre se place en dérivation aux bornes du dipôle.";

/** Physique du montage : le rhéostat et le générateur fixent I, puis U = R × I. */
function physics(e: number, rh: number) {
  const i = e / (R_OHM + rh);
  return { i, u: R_OHM * i };
}

/** Régression linéaire forcée par l'origine : pente = Σ(U·I) / Σ(I²). */
function slopeThroughOrigin(pts: Point[]): number | null {
  if (pts.length < 2) return null;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += p.u * p.i;
    den += p.i * p.i;
  }
  if (den <= 0) return null;
  return num / den;
}

export function LoiDohm3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [e, setE] = useState(6);
  const [rh, setRh] = useState(10);
  const [points, setPoints] = useState<Point[]>([]);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qForme, setQForme] = useState<string | null>(null);
  const [qPente, setQPente] = useState<string | null>(null);
  const [qBranchement, setQBranchement] = useState<string | null>(null);

  const cur = useMemo(() => physics(e, rh), [e, rh]);
  const slope = useMemo(() => slopeThroughOrigin(points), [points]);

  const alreadyTaken = points.some((p) => Math.abs(p.i - cur.i) < 0.015);
  const canRecord = points.length < MAX_POINTS && !alreadyTaken && cur.i > 0.005;

  function recordPoint() {
    if (!canRecord) return;
    setPoints((prev) => [...prev, { i: cur.i, u: cur.u, e, rh }].sort((a, b) => a.i - b.i));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, points.length * 8); // exploration : relever des points
    if (hypo === 'double') s += 10; // hypothèse de proportionnalité
    if (qForme === 'droite-origine') s += 20;
    if (qPente === 'resistance') s += 20;
    if (qBranchement === 'a-serie') s += 20;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [points, hypo, qForme, qPente, qBranchement]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'loi-dohm-3eme',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          points: points.map((p) => ({
            e: p.e,
            rheostat: p.rh,
            i: Number(p.i.toFixed(4)),
            u: Number(p.u.toFixed(3)),
          })),
          slope: slope !== null ? Number(slope.toFixed(2)) : null,
          trueR: R_OHM,
          qcm: { qForme, qPente, qBranchement },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-700 shadow-soft ring-1 ring-blue-100">
                <Zap className="h-5 w-5" />
              </span>
              Le fer à repasser du tailleur
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Chez le tailleur du quartier, le fer à repasser branché sur le compteur{' '}
              <strong>Woyofal</strong> chauffe fort. Dedans, un fil s&apos;oppose au passage du courant :
              c&apos;est la <strong>résistance R</strong>, en ohms (Ω). Une ampoule grille quand la tension
              est trop forte, et quand la Senelec coupe, plus rien ne passe.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> monter un circuit, relever plusieurs couples (I ; U) aux bornes
              d&apos;un conducteur ohmique, tracer la caractéristique <strong>U = f(I)</strong> et trouver
              la valeur de R.
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
              <Activity className="h-5 w-5 text-blue-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : dans le circuit, tu doubles la tension U aux bornes du conducteur
            ohmique (sans changer le conducteur). Que devient l&apos;intensité I qui le traverse ?
          </p>
          <QcmStep
            label="Mon hypothèse : si U double, alors I…"
            tone="science"
            options={[
              { key: 'double', label: 'Double aussi' },
              { key: 'identique', label: 'Ne change pas' },
              { key: 'moitie', label: 'Est divisée par deux' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Manipuler ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-700" /> Étape 2 — Relève les couples (I ; U)
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle le générateur et le rhéostat, lis l&apos;ampèremètre (en série) et le voltmètre
            (en dérivation), puis clique sur <strong>Relever ce point</strong>. Chaque point s&apos;ajoute
            à la caractéristique, à droite. Tourne la scène avec ta souris ou ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <OhmScene e={e} rh={rh} i={cur.i} u={cur.u} slope={slope} points={points} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="e">Tension du générateur E</Label>
                <span className="font-mono text-blue-700">{e} V</span>
              </div>
              <input
                id="e"
                type="range"
                min={2}
                max={12}
                step={1}
                value={e}
                onChange={(ev) => setE(Number(ev.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="rh">Rhéostat</Label>
                <span className="font-mono text-blue-700">{rh} Ω</span>
              </div>
              <input
                id="rh"
                type="range"
                min={0}
                max={RH_MAX}
                step={5}
                value={rh}
                onChange={(ev) => setRh(Number(ev.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Intensité I" value={`${(cur.i * 1000).toFixed(0)} mA`} />
            <Stat label="Tension U" value={`${cur.u.toFixed(2)} V`} />
            <Stat label="Points relevés" value={`${points.length}/${MIN_POINTS}`} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" size="sm" disabled={!canRecord} onClick={recordPoint}>
              <Save className="h-4 w-4" />
              {alreadyTaken ? 'Point déjà relevé — change un réglage' : 'Relever ce point'}
            </Button>
            <Button variant="gradient" disabled={points.length < MIN_POINTS} onClick={() => setStep('mesures')}>
              {points.length < MIN_POINTS
                ? `Relève ${MIN_POINTS - points.length} point(s) de plus`
                : 'Exploiter mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-700" /> Étape 3 — Ton tableau de mesures
            </CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Calcule le quotient U/I pour chaque ligne. Que remarques-tu ?
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-3 py-2 text-left">I (mA)</th>
                  <th className="px-3 py-2 text-left">I (A)</th>
                  <th className="px-3 py-2 text-left">U (V)</th>
                  <th className="px-3 py-2 text-left">U / I (Ω)</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, idx) => (
                  <tr key={idx} className="border-t border-night-100">
                    <td className="px-3 py-2 font-mono">{(p.i * 1000).toFixed(0)}</td>
                    <td className="px-3 py-2 font-mono">{p.i.toFixed(3)}</td>
                    <td className="px-3 py-2 font-mono">{p.u.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono font-semibold text-blue-800">
                      {(p.u / p.i).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            Le quotient U/I est <strong>constant</strong> : U et I sont proportionnelles. Les points sont
            donc alignés sur une <strong>droite passant par l&apos;origine</strong>, de pente{' '}
            <strong>{slope !== null ? `${slope.toFixed(1)} Ω` : '—'}</strong>. Cette pente, c&apos;est la
            résistance R du conducteur ohmique : <strong>U = R × I</strong>.
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Relever d&apos;autres points
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
              label="La caractéristique U = f(I) d'un conducteur ohmique est…"
              tone="science"
              options={[
                { key: 'droite-origine', label: 'Une droite qui passe par l’origine' },
                { key: 'droite-decalee', label: 'Une droite qui coupe l’axe des U au-dessus de zéro' },
                { key: 'courbe', label: 'Une courbe de plus en plus penchée' },
              ]}
              value={qForme}
              onChange={setQForme}
              hint="Repense à ton graphique : que vaut U quand I = 0 ?"
            />
            <QcmStep
              label="Que représente la pente de cette droite ?"
              tone="science"
              options={[
                { key: 'resistance', label: 'La résistance R du conducteur, en ohms' },
                { key: 'intensite', label: 'L’intensité I du courant, en ampères' },
                { key: 'tension', label: 'La tension du générateur, en volts' },
              ]}
              value={qPente}
              onChange={setQPente}
            />
            <QcmStep
              label="Pour mesurer I dans le conducteur et U à ses bornes, il faut brancher…"
              tone="science"
              options={[
                { key: 'a-serie', label: 'L’ampèremètre en série et le voltmètre en dérivation' },
                { key: 'a-derivation', label: 'L’ampèremètre en dérivation et le voltmètre en série' },
                { key: 'deux-serie', label: 'Les deux appareils en série' },
              ]}
              value={qBranchement}
              onChange={setQBranchement}
              hint="Regarde comment les fils bleus du voltmètre sont posés dans la scène."
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qForme || !qPente || !qBranchement || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-physique" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pour un conducteur ohmique, <strong>U = R × I</strong> (U en volts, I en ampères, R en
              ohms). Ta caractéristique est une <strong>droite passant par l&apos;origine</strong> :
              sa pente vaut <strong>{slope !== null ? `${slope.toFixed(1)} Ω` : `${R_OHM} Ω`}</strong>,
              soit la résistance du conducteur ({R_OHM} Ω).
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-blue-100">
              <strong>À retenir :</strong> l&apos;ampèremètre se branche <strong>en série</strong>, le
              voltmètre <strong>en dérivation</strong>. Attention : le filament d&apos;une ampoule n&apos;est{' '}
              <em>pas</em> un conducteur ohmique — sa caractéristique n&apos;est pas une droite, car sa
              résistance augmente quand il chauffe.
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
    <div className="rounded-xl bg-blue-50 p-2 ring-1 ring-blue-100">
      <div className="text-[10px] uppercase tracking-wider text-blue-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-blue-800">{value}</div>
    </div>
  );
}
