'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Gauge, Lightbulb, Target, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Mesurer l'intensité et la tension (Physique-Chimie, 4ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures →
 * QCM → bilan. Science juste : l'ampèremètre se branche EN SÉRIE (mesure I
 * en ampères A), le voltmètre EN DÉRIVATION (mesure U en volts V). Plus la
 * tension de la pile augmente, plus l'intensité augmente et plus l'ampoule
 * brille. Contexte : l'installation électrique d'une école.
 */

const MultimeterScene = dynamic(() => import('./multimeter-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

const R = 12; // résistance de l'ampoule (Ω) — donne I ≈ 0,1 à 0,5 A
type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'hausse' | 'baisse' | 'rien' | null;

const INTRO =
  "Dans ton école, l'électricité fait briller les lampes des salles de classe. " +
  "Pour vérifier une installation, le technicien utilise deux appareils : l'ampèremètre, qui mesure l'intensité du courant en ampères, " +
  "et le voltmètre, qui mesure la tension en volts. Aujourd'hui tu vas brancher ces appareils correctement et observer comment l'ampoule réagit.";

const CONCLUSION =
  "Bravo ! L'ampèremètre se branche en série dans le circuit : il mesure l'intensité I, en ampères. " +
  "Le voltmètre se branche en dérivation aux bornes de l'ampoule : il mesure la tension U, en volts. " +
  "Plus la tension de la pile augmente, plus l'intensité augmente, et plus l'ampoule brille fort.";

/** Modèle : l'ampoule est seule, donc U_ampoule ≈ U_pile ; I = U / R. */
function measures(uPile: number) {
  const uBulb = uPile;
  const intensity = uBulb / R;
  return { uBulb, intensity };
}

export function IntensiteTension4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [uPile, setUPile] = useState(3);
  const [voltsTried, setVoltsTried] = useState<Set<number>>(new Set([3]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qAmp, setQAmp] = useState<string | null>(null);
  const [qVolt, setQVolt] = useState<string | null>(null);
  const [qUnite, setQUnite] = useState<string | null>(null);

  const cur = useMemo(() => measures(uPile), [uPile]);

  function recordMeasure() {
    setVoltsTried((prev) => new Set(prev).add(uPile));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, voltsTried.size * 6); // exploration
    if (hypo === 'hausse') s += 10;
    if (qAmp === 'serie') s += 20;
    if (qVolt === 'derivation') s += 25;
    if (qUnite === 'amperes') s += 20;
    return Math.min(100, s);
  }, [voltsTried, hypo, qAmp, qVolt, qUnite]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'intensite-tension-4eme',
        version: '2.0',
        steps: {
          voltsTried: Array.from(voltsTried),
          hypothesis: hypo,
          qcm: { qAmp, qVolt, qUnite },
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
              Mesurer l&apos;intensité et la tension
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans ton école, l&apos;électricité fait briller les lampes. Pour vérifier une installation, on utilise deux
              appareils : l&apos;<strong>ampèremètre</strong> (intensité, en ampères <strong>A</strong>) et le{' '}
              <strong>voltmètre</strong> (tension, en volts <strong>V</strong>).
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> brancher chaque appareil au bon endroit, puis observer comment l&apos;intensité
              et la tension varient quand on change la pile.
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
              <Target className="h-5 w-5 text-blue-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : selon toi, si on prend une pile de tension plus grande, l&apos;
            <strong>intensité</strong> du courant qui traverse l&apos;ampoule va…
          </p>
          <QcmStep
            label="Mon hypothèse : avec une tension plus grande, l'intensité…"
            tone="violet"
            options={[
              { key: 'hausse', label: 'Augmente (l’ampoule brille plus)' },
              { key: 'baisse', label: 'Diminue (l’ampoule brille moins)' },
              { key: 'rien', label: 'Ne change pas' },
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
              <Gauge className="h-5 w-5 text-blue-700" /> Étape 2 — Branche et mesure
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Regarde le circuit : l&apos;<strong>ampèremètre est en série</strong> (sur le fil), le{' '}
            <strong>voltmètre en dérivation</strong> (aux bornes de l&apos;ampoule). Règle la tension de la pile et
            observe les aiguilles. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <MultimeterScene voltage={uPile} intensity={cur.intensity} uBulb={cur.uBulb} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="u">Tension de la pile</Label>
              <span className="font-mono text-blue-700">{uPile.toFixed(1)} V</span>
            </div>
            <input
              id="u"
              type="range"
              min={1.5}
              max={6}
              step={0.5}
              value={uPile}
              onChange={(e) => setUPile(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <Stat label="Tension U (voltmètre)" value={`${cur.uBulb.toFixed(1)} V`} />
            <Stat label="Intensité I (ampèremètre)" value={`${cur.intensity.toFixed(2)} A`} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordMeasure}>
              <Lightbulb className="h-4 w-4" /> Noter cette mesure
            </Button>
            <Button variant="gradient" disabled={voltsTried.size < 3} onClick={() => setStep('mesures')}>
              {voltsTried.size < 3 ? `Note ${3 - voltsTried.size} mesure(s) de plus` : 'Voir mes mesures'}
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
            Voici tes relevés. Compare : quand la tension <strong>U</strong> augmente, que fait l&apos;intensité{' '}
            <strong>I</strong> ?
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-4 py-2 text-left">Tension U (V)</th>
                  <th className="px-4 py-2 text-left">Intensité I (A)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(voltsTried)
                  .sort((a, b) => a - b)
                  .map((u) => {
                    const m = measures(u);
                    return (
                      <tr key={u} className="border-t border-night-100">
                        <td className="px-4 py-2 font-mono">{u.toFixed(1)}</td>
                        <td className="px-4 py-2 font-mono">{m.intensity.toFixed(2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            On lit la tension <strong>U en volts (V)</strong> sur le voltmètre, l&apos;intensité{' '}
            <strong>I en ampères (A)</strong> sur l&apos;ampèremètre. Plus U est grande, plus I est grande.
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
              label="L'ampèremètre se branche :"
              tone="science"
              options={[
                { key: 'serie', label: 'En série (sur le fil du circuit)' },
                { key: 'derivation', label: 'En dérivation (sur le côté)' },
                { key: 'peu', label: 'N’importe comment' },
              ]}
              value={qAmp}
              onChange={setQAmp}
            />
            <QcmStep
              label="Le voltmètre se branche :"
              tone="science"
              options={[
                { key: 'derivation', label: 'En dérivation (aux bornes de l’ampoule)' },
                { key: 'serie', label: 'En série (sur le fil du circuit)' },
                { key: 'peu', label: 'N’importe comment' },
              ]}
              value={qVolt}
              onChange={setQVolt}
            />
            <QcmStep
              label="L'intensité se mesure en :"
              tone="science"
              options={[
                { key: 'amperes', label: 'Ampères (A)' },
                { key: 'volts', label: 'Volts (V)' },
                { key: 'ohms', label: 'Ohms (Ω)' },
              ]}
              value={qUnite}
              onChange={setQUnite}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qAmp || !qVolt || !qUnite || busy} onClick={handleValidate}>
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
              L&apos;<strong>ampèremètre</strong> se branche <strong>en série</strong> : il mesure l&apos;intensité{' '}
              <strong>I</strong> en <strong>ampères (A)</strong>. Le <strong>voltmètre</strong> se branche{' '}
              <strong>en dérivation</strong> : il mesure la tension <strong>U</strong> en <strong>volts (V)</strong>. Plus
              U augmente, plus I augmente et plus l&apos;ampoule brille.
            </p>
            <p className="text-sm text-ink/60">
              Score = exploration des tensions ({Math.min(25, voltsTried.size * 6)}/25) + tes bonnes réponses.
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
