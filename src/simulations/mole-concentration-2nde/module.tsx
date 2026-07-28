'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Droplets, FlaskConical, Gauge, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — La mole et la concentration molaire (Physique-Chimie, Seconde).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (bécher de bissap) →
 * dilution + mesures → QCM → bilan. Science réelle : C = n/V (mol/L), n en mol,
 * V en L ; dilution à n constant (C₁V₁ = C₂V₂). Contexte : préparer un bissap
 * (jus d'hibiscus) plus ou moins concentré.
 */

const MoleScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'plus' | 'moins' | 'pareil' | null;

const INTRO =
  "Pour préparer un bon bissap, le jus d'hibiscus, tu dissous une quantité de fleurs séchées dans un volume d'eau. " +
  "Plus tu mets de matière dans peu d'eau, plus le jus est concentré et foncé. " +
  "Cette idée se mesure : c'est la concentration molaire C = n divisé par V. Aujourd'hui tu vas la régler, puis diluer ta solution.";

const CONCLUSION =
  "Bravo ! La concentration molaire vaut C = n / V, en moles par litre. " +
  "Plus tu mets de soluté (n grand) ou moins tu mets d'eau (V petit), plus C est grande et plus le bissap est foncé. " +
  "Quand tu dilues, tu ajoutes de l'eau : n ne change pas mais V augmente, donc C diminue. C'est la règle C₁V₁ = C₂V₂.";

// quantité de matière n (mol) et volume V (mL) → concentration C (mol/L)
function concentration(moles: number, volumeML: number) {
  return moles / (volumeML / 1000);
}

export function MoleConcentration2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [moles, setMoles] = useState(0.1); // mol de soluté
  const [vol, setVol] = useState(250); // mL de solution
  const [tweaks, setTweaks] = useState(0);
  const [diluted, setDiluted] = useState(false);
  const [cBeforeDil, setCBeforeDil] = useState<number | null>(null);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qFormule, setQFormule] = useState<string | null>(null);
  const [qDilution, setQDilution] = useState<string | null>(null);
  const [qUnite, setQUnite] = useState<string | null>(null);

  const C = useMemo(() => concentration(moles, vol), [moles, vol]);

  function diluer() {
    if (cBeforeDil === null) setCBeforeDil(C);
    setVol((v) => Math.min(500, v + 100)); // ajoute 100 mL d'eau, n constant
    setDiluted(true);
    setTweaks((t) => t + 1);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, tweaks * 5); // exploration des sliders
    if (diluted) s += 5; // a réalisé une dilution
    if (hypo === 'moins') s += 10; // hypothèse correcte : diluer → C diminue
    if (qFormule === 'n-sur-v') s += 20;
    if (qDilution === 'diminue') s += 20;
    if (qUnite === 'mol-l') s += 20;
    return Math.min(100, s);
  }, [tweaks, diluted, hypo, qFormule, qDilution, qUnite]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'mole-concentration-2nde',
        version: '2.0',
        steps: {
          moles,
          volumeML: vol,
          concentration: Number(C.toFixed(3)),
          diluted,
          hypothesis: hypo,
          qcm: { qFormule, qDilution, qUnite },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <FlaskConical className="h-5 w-5" />
              </span>
              Le bissap et la concentration
            </CardTitle>
            <Badge tone="science">Physique-Chimie · Seconde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pour préparer un <strong>bissap</strong>, tu dissous des fleurs d&apos;hibiscus dans de l&apos;eau. Plus tu mets de
              matière dans peu d&apos;eau, plus le jus est <strong>concentré</strong> et foncé.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> régler la quantité de soluté <strong>n</strong> (en mol) et le volume <strong>V</strong>, lire la
              concentration <strong>C = n / V</strong> (mol/L), puis <strong>diluer</strong> en ajoutant de l&apos;eau.
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
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tu as un bissap bien foncé. Tu y ajoutes un grand verre d&apos;<strong>eau</strong> (sans rien d&apos;autre). Selon toi, sa
            concentration va…
          </p>
          <QcmStep
            label="Mon hypothèse : en ajoutant de l'eau, la concentration…"
            tone="violet"
            options={[
              { key: 'plus', label: 'augmente (le jus devient plus fort)' },
              { key: 'moins', label: 'diminue (le jus devient plus léger)' },
              { key: 'pareil', label: 'ne change pas' },
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
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Prépare ta solution
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle la quantité de soluté <strong>n</strong> (les grains dans le liquide) et le volume <strong>V</strong> (le niveau).
            Observe la couleur et la valeur de <strong>C</strong>. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <MoleScene moles={moles} volume={vol} concentration={C} diluting={false} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="n">Soluté n</Label>
                <span className="font-mono text-violet-700">{moles.toFixed(2)} mol</span>
              </div>
              <input
                id="n"
                type="range"
                min={0.02}
                max={0.3}
                step={0.02}
                value={moles}
                onChange={(e) => {
                  setMoles(Number(e.target.value));
                  setTweaks((t) => t + 1);
                }}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="v">Volume V</Label>
                <span className="font-mono text-violet-700">{vol} mL</span>
              </div>
              <input
                id="v"
                type="range"
                min={100}
                max={500}
                step={50}
                value={vol}
                onChange={(e) => {
                  setVol(Number(e.target.value));
                  setTweaks((t) => t + 1);
                }}
                className="slider-lab w-full"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="n" value={`${moles.toFixed(2)} mol`} />
            <Stat label="V" value={`${(vol / 1000).toFixed(2)} L`} />
            <Stat label="C = n/V" value={`${C.toFixed(2)} mol/L`} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 3} onClick={() => setStep('mesures')}>
              {tweaks < 3 ? `Manipule encore ${3 - tweaks}×` : 'Passer à la dilution'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-violet-700" /> Étape 3 — Dilue ta solution
            </CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            <strong>Diluer</strong>, c&apos;est ajouter de l&apos;eau sans ajouter de soluté : <strong>n reste constant</strong>, V augmente.
            Clique pour ajouter 100 mL d&apos;eau et regarde C.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <MoleScene moles={moles} volume={vol} concentration={C} diluting />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="n (constant)" value={`${moles.toFixed(2)} mol`} />
            <Stat label="V" value={`${(vol / 1000).toFixed(2)} L`} />
            <Stat label="C = n/V" value={`${C.toFixed(2)} mol/L`} />
          </div>
          {cBeforeDil !== null && (
            <p className="mt-3 rounded-xl bg-violet-50 p-3 text-center text-sm text-violet-900 ring-1 ring-violet-100">
              Avant dilution : C = <strong>{cBeforeDil.toFixed(2)}</strong> mol/L → maintenant : C = <strong>{C.toFixed(2)}</strong> mol/L.
              {C < cBeforeDil ? ' La concentration a bien diminué.' : ''}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" disabled={vol >= 500} onClick={diluer}>
              <Droplets className="h-4 w-4" /> {vol >= 500 ? 'Bécher plein' : 'Ajouter 100 mL d’eau'}
            </Button>
            <Button variant="gradient" disabled={!diluted} onClick={() => setStep('qcm')}>
              {diluted ? 'Conclure' : 'Dilue au moins une fois'} <ArrowRight className="h-4 w-4" />
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
              label="La concentration molaire se calcule par :"
              tone="violet"
              options={[
                { key: 'n-sur-v', label: 'C = n / V (quantité de matière ÷ volume)' },
                { key: 'm-sur-v', label: 'C = m / V (masse ÷ volume)' },
                { key: 'v-sur-n', label: 'C = V / n' },
              ]}
              value={qFormule}
              onChange={setQFormule}
            />
            <QcmStep
              label="Quand on dilue (on ajoute de l'eau), la concentration :"
              tone="violet"
              options={[
                { key: 'augmente', label: 'augmente' },
                { key: 'diminue', label: 'diminue' },
                { key: 'constante', label: 'ne change pas' },
              ]}
              value={qDilution}
              onChange={setQDilution}
            />
            <QcmStep
              label="La concentration s'exprime en :"
              tone="violet"
              options={[
                { key: 'mol-l', label: 'mol/L (mole par litre)' },
                { key: 'g-l', label: 'g/L (gramme par litre)' },
                { key: 'g', label: 'g (gramme)' },
              ]}
              value={qUnite}
              onChange={setQUnite}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qFormule || !qDilution || !qUnite || busy} onClick={handleValidate}>
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
              La concentration molaire vaut <strong>C = n / V</strong> (en mol/L). Beaucoup de soluté ou peu d&apos;eau → C grande,
              bissap foncé. <strong>Diluer</strong> (ajouter de l&apos;eau, n constant) augmente V donc <strong>C diminue</strong> :
              c&apos;est la règle <strong>C₁V₁ = C₂V₂</strong>.
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
