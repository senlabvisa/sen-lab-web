'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Crosshair, Gauge, Rocket, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Mécanique de Newton : tir d'un projectile (Terminale S, Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures →
 * QCM → bilan. Physique réelle (g = 9,78 à Dakar), portée et flèche
 * calculées. Contexte : lancer une mangue depuis un baobab.
 */

const ProjScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

const G = 9.78; // Dakar
type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = '30' | '45' | '60' | null;

const INTRO =
  "Sous un grand baobab, un enfant lance une mangue le plus loin possible. " +
  "Galilée puis Newton ont compris que, sans frottement, l'objet suit une courbe précise : une parabole. " +
  "Sa forme dépend de la vitesse de lancer et de l'angle. Aujourd'hui tu vas trouver l'angle qui envoie la mangue le plus loin.";

const CONCLUSION =
  "Bravo ! La trajectoire d'un projectile est une parabole. À vitesse fixée, c'est l'angle de 45 degrés qui donne la portée maximale. " +
  "Plus haut que 45°, la mangue monte trop ; plus bas, elle retombe trop vite.";

function physics(v0: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  const range = (v0 * v0 * Math.sin(2 * a)) / G;
  const height = (v0 * Math.sin(a)) ** 2 / (2 * G);
  const flight = (2 * v0 * Math.sin(a)) / G;
  return { range, height, flight };
}

export function MecaniqueNewtonTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [v0, setV0] = useState(10);
  const [angle, setAngle] = useState(30);
  const [anglesTried, setAnglesTried] = useState<Set<number>>(new Set([30]));
  const [hypo, setHypo] = useState<HypoRep>(null);
  const [best, setBest] = useState<{ angle: number; range: number } | null>(null);

  const [qForme, setQForme] = useState<string | null>(null);
  const [qPortee, setQPortee] = useState<string | null>(null);
  const [qVitesse, setQVitesse] = useState<string | null>(null);

  const cur = useMemo(() => physics(v0, angle), [v0, angle]);

  function recordMeasure() {
    setAnglesTried((prev) => new Set(prev).add(angle));
    setBest((b) => (!b || cur.range > b.range ? { angle, range: cur.range } : b));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, anglesTried.size * 6); // exploration
    if (hypo === '45') s += 10;
    if (qForme === 'parabole') s += 20;
    if (qPortee === '45') s += 25;
    if (qVitesse === 'augmente') s += 15;
    return Math.min(100, s);
  }, [anglesTried, hypo, qForme, qPortee, qVitesse]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'mecanique-newton-terminale',
        version: '2.0',
        steps: {
          anglesTried: Array.from(anglesTried),
          best,
          hypothesis: hypo,
          qcm: { qForme, qPortee, qVitesse },
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
                <Rocket className="h-5 w-5" />
              </span>
              La mangue et le baobab
            </CardTitle>
            <Badge tone="physique">Physique · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Sous un grand <strong>baobab</strong>, on lance une mangue le plus loin possible. Sans frottement,
              elle décrit une courbe précise : une <strong>parabole</strong>.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> trouver l&apos;angle de lancer qui envoie la mangue le plus loin (la portée
              maximale), avec g = 9,78 m/s² à Dakar.
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
            Avant de manipuler : selon toi, quel angle de lancer donne la <strong>plus grande portée</strong> ?
          </p>
          <QcmStep
            label="Mon hypothèse : la portée est maximale pour un angle de…"
            tone="amber"
            options={[
              { key: '30', label: '30° (lancer tendu)' },
              { key: '45', label: '45° (à mi-chemin)' },
              { key: '60', label: '60° (lancer haut)' },
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
              <Gauge className="h-5 w-5 text-amber-700" /> Étape 2 — Règle le tir
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais varier la vitesse et l&apos;angle. Observe la trajectoire et la portée. Tourne la scène avec ta
            souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <ProjScene v0={v0} angle={angle} g={G} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="v">Vitesse v₀</Label>
                <span className="font-mono text-amber-700">{v0} m/s</span>
              </div>
              <input id="v" type="range" min={5} max={16} value={v0} onChange={(e) => setV0(Number(e.target.value))} className="slider-lab w-full" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="a">Angle α</Label>
                <span className="font-mono text-amber-700">{angle}°</span>
              </div>
              <input id="a" type="range" min={15} max={75} step={5} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="slider-lab w-full" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Portée" value={`${cur.range.toFixed(1)} m`} />
            <Stat label="Flèche" value={`${cur.height.toFixed(1)} m`} />
            <Stat label="Durée vol" value={`${cur.flight.toFixed(1)} s`} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordMeasure}>
              <Crosshair className="h-4 w-4" /> Enregistrer cet essai
            </Button>
            <Button variant="gradient" disabled={anglesTried.size < 3} onClick={() => setStep('mesures')}>
              {anglesTried.size < 3 ? `Teste ${3 - anglesTried.size} angle(s) de plus` : 'Voir mes mesures'}
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
            Voici les portées que tu as enregistrées (à v₀ = {v0} m/s). Repère l&apos;angle qui va le plus loin.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                <tr>
                  <th className="px-4 py-2 text-left">Angle</th>
                  <th className="px-4 py-2 text-left">Portée (à v₀ fixe)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(anglesTried)
                  .sort((a, b) => a - b)
                  .map((ang) => {
                    const r = physics(v0, ang).range;
                    const isBest = best && ang === best.angle;
                    return (
                      <tr key={ang} className={'border-t border-night-100 ' + (isBest ? 'bg-emerald-50 font-semibold' : '')}>
                        <td className="px-4 py-2">{ang}°</td>
                        <td className="px-4 py-2">
                          {r.toFixed(1)} m {isBest ? '🏆' : ''}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
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
              label="Sans frottement, la trajectoire d'un projectile est…"
              tone="amber"
              options={[
                { key: 'parabole', label: 'Une parabole' },
                { key: 'droite', label: 'Une droite' },
                { key: 'cercle', label: 'Un cercle' },
              ]}
              value={qForme}
              onChange={setQForme}
            />
            <QcmStep
              label="Pour une vitesse donnée, la portée est maximale à…"
              tone="amber"
              options={[
                { key: '30', label: '30°' },
                { key: '45', label: '45°' },
                { key: '60', label: '60°' },
              ]}
              value={qPortee}
              onChange={setQPortee}
            />
            <QcmStep
              label="Si on augmente la vitesse initiale v₀ (même angle), la portée…"
              tone="amber"
              options={[
                { key: 'augmente', label: 'Augmente' },
                { key: 'diminue', label: 'Diminue' },
                { key: 'constante', label: 'Ne change pas' },
              ]}
              value={qVitesse}
              onChange={setQVitesse}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qForme || !qPortee || !qVitesse || busy} onClick={handleValidate}>
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
              La trajectoire est une <strong>parabole</strong>. À vitesse fixée, la portée est maximale pour
              <strong> α = 45°</strong> (car sin 2α = 1). Augmenter v₀ augmente la portée (elle varie en v₀²).
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
