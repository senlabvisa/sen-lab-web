'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Compass, Gauge, Sigma, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Produit scalaire de deux vecteurs (Première S, Maths).
 *
 * Flow Lab Premium : amorce + narration → hypothèse → manipulation 3D
 * (angle + normes) → observation du signe / orthogonalité → QCM → bilan.
 * Géométrie juste : u·v = |u|·|v|·cos(θ) = ux·vx + uy·vy ; u·v = 0 ⟺ u ⊥ v.
 * Contexte : travail d'une force et ombre (projection) d'un poteau au soleil.
 */

const ScalScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'observe' | 'qcm' | 'done';
type HypoRep = 'zero' | 'maxi' | 'negatif' | null;

const INTRO =
  "Quand tu pousses une charrette, seul l'effort dans le sens du déplacement la fait avancer : " +
  "c'est le produit scalaire de la force et du déplacement, le travail. " +
  "Au marché de Dakar, l'ombre d'un poteau au soleil, c'est la même idée : la projection d'un vecteur sur un autre. " +
  "Aujourd'hui tu fais varier l'angle entre deux vecteurs et tu observes ce que devient leur produit scalaire.";

const CONCLUSION =
  "Bravo ! Le produit scalaire vaut u·v = |u| fois |v| fois cosinus de l'angle. " +
  "Son signe est celui du cosinus : positif pour un angle aigu, négatif pour un angle obtus, " +
  "et nul exactement à quatre-vingt-dix degrés. Donc u·v égale zéro si et seulement si les deux vecteurs sont orthogonaux.";

function dotOf(un: number, vn: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return un * vn * Math.cos(a);
}

export function ProduitScalaire1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [angle, setAngle] = useState(50);
  const [un, setUn] = useState(2);
  const [vn, setVn] = useState(2);
  const [anglesTried, setAnglesTried] = useState<Set<number>>(new Set([50]));
  const [sawOrtho, setSawOrtho] = useState(false);
  const [sawNeg, setSawNeg] = useState(false);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qNul, setQNul] = useState<string | null>(null);
  const [qCalc, setQCalc] = useState<string | null>(null);
  const [qObtus, setQObtus] = useState<string | null>(null);

  const dot = useMemo(() => dotOf(un, vn, angle), [un, vn, angle]);

  function onAngleChange(a: number) {
    setAngle(a);
    setAnglesTried((prev) => new Set(prev).add(a));
    if (Math.abs(a - 90) <= 2) setSawOrtho(true);
    if (a > 92) setSawNeg(true);
  }

  const explored = anglesTried.size >= 4 && sawOrtho && sawNeg;

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, anglesTried.size * 4); // exploration : nombre d'angles testés
    if (sawOrtho) s += 8; // a observé θ = 90°
    if (sawNeg) s += 7; // a observé un angle obtus
    if (hypo === 'zero') s += 5; // bonne prédiction
    if (qNul === 'orthogonal') s += 22;
    if (qCalc === 'formule') s += 20;
    if (qObtus === 'negatif') s += 18;
    return Math.min(100, s);
  }, [anglesTried, sawOrtho, sawNeg, hypo, qNul, qCalc, qObtus]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'produit-scalaire-1ere',
        version: '2.0',
        steps: {
          anglesTried: Array.from(anglesTried),
          normes: { un, vn },
          observations: { sawOrtho, sawNeg },
          hypothesis: hypo,
          qcm: { qNul, qCalc, qObtus },
        },
      },
      score,
    );
    setStep('done');
  }

  const signLabel = dot > 0.01 ? 'positif' : dot < -0.01 ? 'négatif' : 'nul';
  const signTone = dot > 0.01 ? 'text-emerald-700' : dot < -0.01 ? 'text-rose-700' : 'text-sky-700';

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Sigma className="h-5 w-5" />
              </span>
              Le produit scalaire de deux vecteurs
            </CardTitle>
            <Badge tone="maths">Maths · Première S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pousser une charrette, c&apos;est un <strong>travail</strong> : seule la part de la force dans le sens
              du déplacement compte. L&apos;<strong>ombre</strong> d&apos;un poteau au soleil, c&apos;est une{' '}
              <strong>projection</strong>. Ces deux idées tiennent dans une seule opération : le produit scalaire.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> fais varier l&apos;angle θ entre deux vecteurs u et v et découvre comment{' '}
              <strong>u·v = |u|·|v|·cos(θ)</strong> change de valeur… et de signe.
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
            Avant de manipuler : si les deux vecteurs sont <strong>perpendiculaires</strong> (θ = 90°), que vaut leur
            produit scalaire u·v selon toi ?
          </p>
          <QcmStep
            label="Mon hypothèse : quand θ = 90°, le produit scalaire u·v est…"
            tone="violet"
            options={[
              { key: 'maxi', label: 'Maximal (les vecteurs « tirent » le plus fort)' },
              { key: 'zero', label: 'Nul (égal à zéro)' },
              { key: 'negatif', label: 'Négatif' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Fais tourner v autour de u
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais varier l&apos;angle θ et les normes |u|, |v|. Observe l&apos;arc, l&apos;ombre orange (la projection
            de v sur u) et la valeur de u·v. Passe bien par <strong>θ = 90°</strong> et par un angle <strong>obtus</strong>.
            Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <ScalScene angle={angle} un={un} vn={vn} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="ang">Angle θ entre u et v</Label>
                <span className="font-mono text-violet-700">{angle}°</span>
              </div>
              <input id="ang" type="range" min={0} max={180} step={5} value={angle} onChange={(e) => onAngleChange(Number(e.target.value))} className="slider-lab w-full" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="un">Norme |u|</Label>
                <span className="font-mono text-violet-700">{un.toFixed(1)}</span>
              </div>
              <input id="un" type="range" min={1} max={3} step={0.5} value={un} onChange={(e) => setUn(Number(e.target.value))} className="slider-lab w-full" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="vn">Norme |v|</Label>
                <span className="font-mono text-violet-700">{vn.toFixed(1)}</span>
              </div>
              <input id="vn" type="range" min={1} max={3} step={0.5} value={vn} onChange={(e) => setVn(Number(e.target.value))} className="slider-lab w-full" />
            </div>
            <div className="grid place-items-center rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
              <div className="text-[10px] uppercase tracking-wider text-violet-700/70">u·v</div>
              <div className={`font-mono text-base font-bold ${signTone}`}>{dot.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={sawOrtho ? 'maths' : 'neutral'}>{sawOrtho ? '✓' : '○'} vu θ = 90°</Badge>
            <Badge tone={sawNeg ? 'maths' : 'neutral'}>{sawNeg ? '✓' : '○'} vu un angle obtus</Badge>
            <Badge tone="neutral">{anglesTried.size} angle(s) testé(s)</Badge>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={!explored} onClick={() => setStep('observe')}>
              {explored ? 'Observer' : 'Explore θ = 90° et un angle obtus'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-violet-700" /> Étape 3 — Ce que tu as observé
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le <strong>signe</strong> de u·v est celui de cos(θ) — il ne dépend que de l&apos;angle :
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Angle θ</th>
                  <th className="px-4 py-2 text-left">cos(θ)</th>
                  <th className="px-4 py-2 text-left">Signe de u·v</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100 bg-emerald-50/60">
                  <td className="px-4 py-2">aigu (0° à 90°)</td>
                  <td className="px-4 py-2">{'> 0'}</td>
                  <td className="px-4 py-2 font-semibold text-emerald-700">positif</td>
                </tr>
                <tr className="border-t border-night-100 bg-sky-50/60">
                  <td className="px-4 py-2 font-semibold">droit (90°)</td>
                  <td className="px-4 py-2">= 0</td>
                  <td className="px-4 py-2 font-semibold text-sky-700">nul → u ⊥ v</td>
                </tr>
                <tr className="border-t border-night-100 bg-rose-50/60">
                  <td className="px-4 py-2">obtus (90° à 180°)</td>
                  <td className="px-4 py-2">{'< 0'}</td>
                  <td className="px-4 py-2 font-semibold text-rose-700">négatif</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            Point clé : <strong>u·v = 0 si et seulement si u et v sont orthogonaux</strong>. C&apos;est l&apos;outil pour
            prouver un angle droit. On peut aussi calculer u·v = ux·vx + uy·vy avec les coordonnées.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Re-manipuler
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
              label="Le produit scalaire u·v est nul si et seulement si :"
              tone="violet"
              options={[
                { key: 'orthogonal', label: 'Les vecteurs sont orthogonaux (perpendiculaires)' },
                { key: 'parallele', label: 'Les vecteurs sont parallèles' },
                { key: 'egaux', label: 'Les vecteurs sont égaux' },
              ]}
              value={qNul}
              onChange={setQNul}
            />
            <QcmStep
              label="u·v se calcule par :"
              tone="violet"
              options={[
                { key: 'formule', label: '|u|·|v|·cos(θ)  (ou ux·vx + uy·vy)' },
                { key: 'somme', label: '|u| + |v|' },
                { key: 'sin', label: '|u|·|v|·sin(θ)' },
              ]}
              value={qCalc}
              onChange={setQCalc}
            />
            <QcmStep
              label="Si l'angle entre u et v est obtus, alors u·v est :"
              tone="violet"
              options={[
                { key: 'positif', label: 'Positif' },
                { key: 'negatif', label: 'Négatif' },
                { key: 'nul', label: 'Nul' },
              ]}
              value={qObtus}
              onChange={setQObtus}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qNul || !qCalc || !qObtus || busy} onClick={handleValidate}>
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
              <strong>u·v = |u|·|v|·cos(θ) = ux·vx + uy·vy.</strong> Son signe est celui de cos(θ) : positif si θ est
              aigu, négatif si θ est obtus. Et surtout : <strong>u·v = 0 ⟺ u ⊥ v</strong> (vecteurs orthogonaux).
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
