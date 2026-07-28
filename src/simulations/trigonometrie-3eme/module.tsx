'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Compass, Crosshair, Ruler, Sigma, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Trigonométrie dans le triangle rectangle (3ème, BFEM).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (cercle trigo, slider α)
 * → mesures/observation → QCM → bilan. Maths justes : sin = opp/hyp,
 * cos = adj/hyp, tan = opp/adj = sin/cos, sin² + cos² = 1. Contexte sénégalais :
 * mesurer la hauteur d'un cocotier par visée d'angle.
 */

const TrigScene = dynamic(() => import('./trig-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-sky-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'plus-grand' | 'egal' | 'plus-petit' | null;

const INTRO =
  "Devant la grande mosquée de Touba, un élève veut connaître la hauteur du minaret sans y grimper. " +
  "Il se place à distance, vise le sommet et mesure l'angle de visée. Avec la trigonométrie — sinus, cosinus, tangente — " +
  "il peut calculer cette hauteur depuis le sol. Aujourd'hui tu vas explorer le cercle trigonométrique pour comprendre ces trois rapports.";

const CONCLUSION =
  "Bravo ! Dans un triangle rectangle : sin α = côté opposé sur hypoténuse, cos α = côté adjacent sur hypoténuse, " +
  "et tan α = opposé sur adjacent, c'est-à-dire sin α divisé par cos α. Sur le cercle de rayon 1, le point M a pour coordonnées " +
  "cos α et sin α, et l'on a toujours sin²α + cos²α = 1. C'est ainsi qu'on mesure la hauteur d'un cocotier ou d'un minaret par simple visée.";

/** sin, cos, tan exacts pour un angle en degrés. */
function trig(angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { sin: Math.sin(a), cos: Math.cos(a), tan: Math.tan(a) };
}

export function Trigonometrie3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [angle, setAngle] = useState(30);
  const [anglesTried, setAnglesTried] = useState<Set<number>>(new Set([30]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qSin, setQSin] = useState<string | null>(null);
  const [qTan, setQTan] = useState<string | null>(null);
  const [qCos30, setQCos30] = useState<string | null>(null);

  const cur = useMemo(() => trig(angle), [angle]);

  function onSlide(v: number) {
    setAngle(v);
    setAnglesTried((prev) => new Set(prev).add(v));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, anglesTried.size * 5); // exploration
    if (hypo === 'plus-grand') s += 10; // sin croît avec α (de 0 à 90°)
    if (qSin === 'opp-hyp') s += 20;
    if (qTan === 'sin-cos') s += 20;
    if (qCos30 === '087') s += 20;
    return Math.min(100, s);
  }, [anglesTried, hypo, qSin, qTan, qCos30]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'trigonometrie-3eme',
        version: '2.0',
        steps: {
          anglesTried: Array.from(anglesTried),
          hypothesis: hypo,
          qcm: { qSin, qTan, qCos30 },
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
                <Sigma className="h-5 w-5" />
              </span>
              La hauteur du minaret
            </CardTitle>
            <Badge tone="maths">Maths · 3ème · BFEM</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Comment mesurer la hauteur d&apos;un <strong>minaret</strong> ou d&apos;un <strong>cocotier</strong> sans y
              grimper ? On se place à distance, on <strong>vise le sommet</strong> et on mesure l&apos;angle. La
              trigonométrie fait le reste.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> explorer le cercle trigonométrique et comprendre les trois rapports
              <strong> sin α</strong>, <strong>cos α</strong> et <strong>tan α</strong> dans le triangle rectangle.
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
              <Target className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si l&apos;angle de visée α <strong>augmente</strong> (de 0° vers 90°), que devient le
            sinus de α (sin α) ?
          </p>
          <QcmStep
            label="Mon hypothèse : quand α augmente de 0° à 90°, sin α…"
            tone="violet"
            options={[
              { key: 'plus-grand', label: 'devient plus grand' },
              { key: 'egal', label: 'ne change pas' },
              { key: 'plus-petit', label: 'devient plus petit' },
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
              <Compass className="h-5 w-5 text-violet-700" /> Étape 2 — Fais varier l&apos;angle α
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Bouge le curseur : le point M(cos α ; sin α) tourne sur le cercle. Regarde le côté opposé (vert), le côté
            adjacent (bleu) et l&apos;hypoténuse (violet). Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <TrigScene angle={angle} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="a">Angle α</Label>
              <span className="font-mono text-sm font-semibold text-violet-700">{angle}°</span>
            </div>
            <input
              id="a"
              type="range"
              min={0}
              max={90}
              value={angle}
              onChange={(e) => onSlide(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="sin α" value={cur.sin.toFixed(2)} />
            <Stat label="cos α" value={cur.cos.toFixed(2)} />
            <Stat label="tan α" value={angle >= 90 ? '∞' : cur.tan.toFixed(2)} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-ink/50">
              <Crosshair className="h-3.5 w-3.5" /> {anglesTried.size} angle(s) explorés
            </span>
            <Button variant="gradient" disabled={anglesTried.size < 4} onClick={() => setStep('mesures')}>
              {anglesTried.size < 4 ? `Explore ${4 - anglesTried.size} angle(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-violet-700" /> Étape 3 — Tes observations
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici les valeurs aux angles remarquables. Remarque que sin α grandit avec α, et que sin²α + cos²α = 1.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">α</th>
                  <th className="px-4 py-2 text-left">cos α</th>
                  <th className="px-4 py-2 text-left">sin α</th>
                  <th className="px-4 py-2 text-left">tan α</th>
                </tr>
              </thead>
              <tbody>
                {[0, 30, 45, 60, 90].map((ang) => {
                  const t = trig(ang);
                  return (
                    <tr key={ang} className="border-t border-night-100">
                      <td className="px-4 py-2 font-semibold">{ang}°</td>
                      <td className="px-4 py-2 font-mono">{t.cos.toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono">{t.sin.toFixed(2)}</td>
                      <td className="px-4 py-2 font-mono">{ang >= 90 ? '∞' : t.tan.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-900 ring-1 ring-sky-100">
            Pour α = 30° : cos α ≈ 0,87 (c&apos;est √3/2) et sin α = 0,50 (c&apos;est 1/2). On vérifie 0,87² + 0,50² ≈ 1.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Re-tester
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
              label="Dans un triangle rectangle, sin α = ?"
              tone="violet"
              options={[
                { key: 'opp-hyp', label: 'côté opposé / hypoténuse' },
                { key: 'adj-hyp', label: 'côté adjacent / hypoténuse' },
                { key: 'opp-adj', label: 'côté opposé / côté adjacent' },
              ]}
              value={qSin}
              onChange={setQSin}
            />
            <QcmStep
              label="La tangente de α est égale à…"
              tone="violet"
              options={[
                { key: 'sin-cos', label: 'sin α / cos α (= opposé / adjacent)' },
                { key: 'cos-sin', label: 'cos α / sin α' },
                { key: 'sin-hyp', label: 'sin α / hypoténuse' },
              ]}
              value={qTan}
              onChange={setQTan}
            />
            <QcmStep
              label="Pour α = 30°, cos α vaut environ :"
              tone="violet"
              options={[
                { key: '050', label: '0,50 (= 1/2)' },
                { key: '087', label: '0,87 (= √3/2)' },
                { key: '100', label: '1,00' },
              ]}
              value={qCos30}
              onChange={setQCos30}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qSin || !qTan || !qCos30 || busy} onClick={handleValidate}>
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
              <strong>SOH-CAH-TOA</strong> : sin α = opposé/hypoténuse, cos α = adjacent/hypoténuse, tan α =
              opposé/adjacent = <strong>sin α / cos α</strong>. Sur le cercle de rayon 1, M a pour coordonnées
              (cos α ; sin α) et <strong>sin²α + cos²α = 1</strong>.
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
