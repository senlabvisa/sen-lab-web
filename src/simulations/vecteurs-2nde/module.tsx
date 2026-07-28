'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Compass, Crosshair, MoveRight, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Vecteurs : somme de deux vecteurs (Seconde, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (sliders ux,uy,
 * vx,vy) → observation de la somme → QCM → bilan. Maths justes : règle du
 * parallélogramme / mise bout à bout, u+v = (ux+vx ; uy+vy), relation de
 * Chasles AB+BC=AC. Contexte : déplacements, forces, navigation d'une pirogue.
 */

const VectorScene = dynamic(() => import('./vector-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'observe' | 'qcm' | 'done';
type HypoRep = 'somme' | 'moyenne' | 'plusgrand' | null;

const INTRO =
  "Une pirogue quitte la plage de Soumbédioune. Le piroguier rame vers le large (un premier déplacement), " +
  "puis le courant du fleuve la pousse de côté (un second déplacement). Où arrive-t-elle vraiment ? " +
  "Chaque déplacement est un vecteur : une direction et une longueur. Additionner deux vecteurs, " +
  "c'est les enchaîner bout à bout. Aujourd'hui tu vas construire la somme u + v et lire ses coordonnées.";

const CONCLUSION =
  "Bravo ! Pour additionner deux vecteurs, on les place bout à bout : l'extrémité du premier devient " +
  "l'origine du second (règle du parallélogramme). Les coordonnées s'ajoutent : u + v = (ux + vx ; uy + vy). " +
  "C'est la relation de Chasles : AB + BC = AC. La pirogue arrive là où mènent les deux déplacements combinés.";

export function Vecteurs2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [u, setU] = useState({ x: 2, y: 1 });
  const [v, setV] = useState({ x: 1, y: 2 });
  const [tweaks, setTweaks] = useState(0);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qCoord, setQCoord] = useState<string | null>(null);
  const [qChasles, setQChasles] = useState<string | null>(null);
  const [qPlace, setQPlace] = useState<string | null>(null);

  const sum = useMemo(() => ({ x: u.x + v.x, y: u.y + v.y }), [u, v]);

  function nudge() {
    setTweaks((n) => n + 1);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, tweaks * 4); // exploration (manipulation des sliders)
    if (hypo === 'somme') s += 10;
    if (qCoord === 'add') s += 25;
    if (qChasles === 'abbc') s += 20;
    if (qPlace === 'boutabout') s += 20;
    return Math.min(100, s);
  }, [tweaks, hypo, qCoord, qChasles, qPlace]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'vecteurs-2nde',
        version: '2.0',
        steps: {
          u,
          v,
          sum,
          tweaks,
          hypothesis: hypo,
          qcm: { qCoord, qChasles, qPlace },
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
                <Compass className="h-5 w-5" />
              </span>
              La pirogue et les deux déplacements
            </CardTitle>
            <Badge tone="maths">Maths · Seconde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Un <strong>vecteur</strong> décrit un déplacement : une direction et une longueur. Une pirogue rame vers
              le large (vecteur <span className="font-semibold text-blue-700">u⃗</span>), puis le courant la pousse de
              côté (vecteur <span className="font-semibold text-emerald-700">v⃗</span>).
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> construire la <strong>somme u⃗ + v⃗</strong> en mettant les vecteurs bout à
              bout, et lire ses coordonnées. C&apos;est la <strong>relation de Chasles</strong>.
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
            Avant de manipuler : la pirogue subit deux déplacements u⃗ puis v⃗. Selon toi, le déplacement total est…
          </p>
          <QcmStep
            label="Mon hypothèse : le déplacement total de la pirogue est…"
            tone="violet"
            options={[
              { key: 'somme', label: 'La somme u⃗ + v⃗ (on enchaîne les deux déplacements).' },
              { key: 'moyenne', label: 'La moyenne des deux déplacements.' },
              { key: 'plusgrand', label: 'Seulement le plus grand des deux déplacements.' },
            ]}
            value={hypo}
            onChange={(val) => setHypo(val as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Construire ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MoveRight className="h-5 w-5 text-violet-700" /> Étape 2 — Règle u⃗ et v⃗
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Change les coordonnées de <span className="font-semibold text-blue-700">u⃗</span> et de{' '}
            <span className="font-semibold text-emerald-700">v⃗</span>. Le vecteur{' '}
            <span className="font-semibold text-violet-700">u⃗ + v⃗</span> (violet) se construit bout à bout. Tourne la
            scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <VectorScene ux={u.x} uy={u.y} vx={v.x} vy={v.y} />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-blue-50/60 p-3 ring-1 ring-blue-100">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-700">Vecteur u⃗</div>
              <SliderRow id="ux" label="ux" value={u.x} accent="text-blue-700" onChange={(n) => { setU((p) => ({ ...p, x: n })); nudge(); }} />
              <SliderRow id="uy" label="uy" value={u.y} accent="text-blue-700" onChange={(n) => { setU((p) => ({ ...p, y: n })); nudge(); }} />
            </div>
            <div className="rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Vecteur v⃗</div>
              <SliderRow id="vx" label="vx" value={v.x} accent="text-emerald-700" onChange={(n) => { setV((p) => ({ ...p, x: n })); nudge(); }} />
              <SliderRow id="vy" label="vy" value={v.y} accent="text-emerald-700" onChange={(n) => { setV((p) => ({ ...p, y: n })); nudge(); }} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="u⃗" value={`(${u.x.toFixed(1)} ; ${u.y.toFixed(1)})`} />
            <Stat label="v⃗" value={`(${v.x.toFixed(1)} ; ${v.y.toFixed(1)})`} />
            <Stat label="u⃗ + v⃗" value={`(${sum.x.toFixed(1)} ; ${sum.y.toFixed(1)})`} highlight />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              <Crosshair className="mr-1 inline h-3.5 w-3.5" />
              Essais : {tweaks}
            </span>
            <Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('observe')}>
              {tweaks < 4 ? `Bouge ${4 - tweaks} curseur(s) de plus` : 'Voir la somme'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Observe la somme</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour ton réglage actuel, regarde comment les coordonnées s&apos;additionnent, composante par composante.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Vecteur</th>
                  <th className="px-4 py-2 text-center">abscisse (x)</th>
                  <th className="px-4 py-2 text-center">ordonnée (y)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2 font-semibold text-blue-700">u⃗</td>
                  <td className="px-4 py-2 text-center font-mono">{u.x.toFixed(1)}</td>
                  <td className="px-4 py-2 text-center font-mono">{u.y.toFixed(1)}</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2 font-semibold text-emerald-700">v⃗</td>
                  <td className="px-4 py-2 text-center font-mono">{v.x.toFixed(1)}</td>
                  <td className="px-4 py-2 text-center font-mono">{v.y.toFixed(1)}</td>
                </tr>
                <tr className="border-t border-night-100 bg-violet-50 font-semibold">
                  <td className="px-4 py-2 text-violet-700">u⃗ + v⃗</td>
                  <td className="px-4 py-2 text-center font-mono text-violet-800">{sum.x.toFixed(1)}</td>
                  <td className="px-4 py-2 text-center font-mono text-violet-800">{sum.y.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            On lit bien : <strong>u⃗ + v⃗ = (ux + vx ; uy + vy)</strong> = ({u.x.toFixed(1)} + {v.x.toFixed(1)} ;{' '}
            {u.y.toFixed(1)} + {v.y.toFixed(1)}) = <strong>({sum.x.toFixed(1)} ; {sum.y.toFixed(1)})</strong>. C&apos;est
            la relation de Chasles : <strong>AB⃗ + BC⃗ = AC⃗</strong>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Reprendre les curseurs
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
              label="Les coordonnées de u⃗ + v⃗ sont :"
              tone="violet"
              options={[
                { key: 'add', label: '(ux + vx ; uy + vy)' },
                { key: 'mul', label: '(ux × vx ; uy × vy)' },
                { key: 'sub', label: '(ux − vx ; uy − vy)' },
              ]}
              value={qCoord}
              onChange={setQCoord}
            />
            <QcmStep
              label="La relation de Chasles s'écrit :"
              tone="violet"
              options={[
                { key: 'abbc', label: 'AB⃗ + BC⃗ = AC⃗' },
                { key: 'abac', label: 'AB⃗ + AC⃗ = BC⃗' },
                { key: 'acbc', label: 'AC⃗ + BC⃗ = AB⃗' },
              ]}
              value={qChasles}
              onChange={setQChasles}
            />
            <QcmStep
              label="Pour additionner deux vecteurs géométriquement, on les place :"
              tone="violet"
              options={[
                { key: 'boutabout', label: 'Bout à bout (l’extrémité de l’un = l’origine de l’autre).' },
                { key: 'memeorigine', label: 'Avec la même origine, en gardant le plus long.' },
                { key: 'opposes', label: 'Tête-bêche, en sens opposés.' },
              ]}
              value={qPlace}
              onChange={setQPlace}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qCoord || !qChasles || !qPlace || busy} onClick={handleValidate}>
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
              Pour additionner deux vecteurs, on les met <strong>bout à bout</strong> (règle du parallélogramme) et les
              coordonnées s&apos;ajoutent : <strong>u⃗ + v⃗ = (ux + vx ; uy + vy)</strong>. C&apos;est la relation de
              Chasles <strong>AB⃗ + BC⃗ = AC⃗</strong> : la pirogue arrive là où mènent les deux déplacements combinés.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function SliderRow({
  id,
  label,
  value,
  accent,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  accent: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex justify-between text-xs">
        <Label htmlFor={id}>{label}</Label>
        <span className={`font-mono ${accent}`}>{value.toFixed(1)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={-3}
        max={3}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-lab w-full"
      />
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={'rounded-xl p-2 ring-1 ' + (highlight ? 'bg-violet-50 ring-violet-200' : 'bg-night-50 ring-night-100')}>
      <div className={'text-[10px] uppercase tracking-wider ' + (highlight ? 'text-violet-700/70' : 'text-ink/45')}>{label}</div>
      <div className={'font-mono text-sm font-bold ' + (highlight ? 'text-violet-800' : 'text-ink/80')}>{value}</div>
    </div>
  );
}
