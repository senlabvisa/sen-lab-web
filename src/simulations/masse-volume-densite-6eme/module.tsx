'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Gauge, Scale, Target, TestTube2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { SampleShape } from './scene';

/**
 * TP — Masse, volume et masse volumique (6ème, Physique-Chimie).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (balance +
 * éprouvette graduée, mesure du volume par déplacement d'eau) → tableau
 * de mesures → QCM → bilan.
 *
 * Science juste : V = V₂ − V₁ avec 1 mL = 1 cm³ ; ρ = m / V en g/cm³
 * (soit ρ × 1000 en kg/m³). ρ(eau) = 1,00 g/cm³ : un corps coule si
 * ρ > 1, flotte si ρ < 1. Valeurs réelles des matériaux.
 *
 * Contexte : l'atelier des forgerons/menuisiers de Ngaye Mékhé, où l'on
 * doit reconnaître une matière sans la casser.
 */

const DensityScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-blue-50 text-sm text-ink/50">
      Chargement de la paillasse 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type SampleKey = 'bois' | 'alu' | 'laterite' | 'fer';
type HypoRep = 'bois' | 'alu' | 'fer' | null;

type Sample = {
  key: SampleKey;
  label: string;
  short: string;
  /** masse en g (valeur réelle : ρ × V) */
  mass: number;
  /** volume en cm³ */
  volume: number;
  color: string;
  metal: boolean;
  shape: SampleShape;
};

/** Masses volumiques réelles : teck 0,65 · aluminium 2,70 · latérite 2,60 · fer 7,87 g/cm³. */
const SAMPLES: Sample[] = [
  { key: 'bois', label: 'Bois de teck (planche de pirogue)', short: 'Teck', mass: 32.5, volume: 50, color: '#A9703F', metal: false, shape: 'cube' },
  { key: 'alu', label: 'Aluminium (morceau de marmite)', short: 'Aluminium', mass: 54, volume: 20, color: '#C9D2DA', metal: true, shape: 'cube' },
  { key: 'laterite', label: 'Caillou de latérite (piste de Kaolack)', short: 'Latérite', mass: 78, volume: 30, color: '#B24A2E', metal: false, shape: 'sphere' },
  { key: 'fer', label: 'Boulon en fer', short: 'Fer', mass: 78.7, volume: 10, color: '#5B6773', metal: true, shape: 'cyl' },
];

const V_MAX = 100; // capacité de l'éprouvette (mL)
const RHO_EAU = 1.0; // g/cm³

const INTRO =
  "Dans un atelier de Ngaye Mékhé, l'artisan te tend quatre échantillons : un bout de planche de teck, " +
  "un morceau de marmite en aluminium, un caillou de latérite et un boulon en fer. " +
  "Comment savoir de quelle matière chacun est fait, sans le casser ? " +
  "Tu vas mesurer sa masse avec une balance, son volume en le plongeant dans l'eau, " +
  "puis calculer sa masse volumique : rho égale m divisé par V.";

const CONCLUSION =
  "Bravo ! Tu sais maintenant mesurer une masse volumique. On pèse l'objet pour avoir sa masse m en grammes. " +
  "On le plonge dans une éprouvette graduée : le niveau passe de V1 à V2, et le volume de l'objet vaut V2 moins V1, " +
  "sachant qu'un millilitre égale un centimètre cube. Enfin, rho égale m divisé par V, en grammes par centimètre cube. " +
  "La masse volumique ne dépend pas de la taille du morceau : elle identifie la matière. " +
  "Et comme l'eau vaut 1 gramme par centimètre cube, tout corps de masse volumique plus grande que 1 coule, " +
  "et tout corps de masse volumique plus petite que 1 flotte.";

function rhoOf(s: Sample) {
  return s.mass / s.volume;
}

export function MasseVolumeDensite6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [sampleKey, setSampleKey] = useState<SampleKey>('bois');
  const [v0, setV0] = useState(50);
  const [weighed, setWeighed] = useState(false);
  const [immersed, setImmersed] = useState(false);
  const [measured, setMeasured] = useState<Set<SampleKey>>(new Set());
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qFormule, setQFormule] = useState<string | null>(null);
  const [qVolume, setQVolume] = useState<string | null>(null);
  const [qFlotte, setQFlotte] = useState<string | null>(null);

  const sample = useMemo(() => SAMPLES.find((s) => s.key === sampleKey) ?? SAMPLES[0], [sampleKey]);
  const rho = rhoOf(sample);
  const v1 = v0;
  const v2 = v0 + (immersed ? sample.volume : 0);

  function pick(k: SampleKey) {
    setSampleKey(k);
    setWeighed(false);
    setImmersed(false);
  }

  function record() {
    setMeasured((prev) => {
      const next = new Set(prev);
      next.add(sampleKey);
      return next;
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, measured.size * 10); // exploration : 3 échantillons mesurés = 30 pts
    if (hypo === 'fer') s += 10; // bonne prédiction
    if (qFormule === 'mv') s += 20;
    if (qVolume === '20') s += 20;
    if (qFlotte === 'plusgrande') s += 20;
    return Math.min(100, s);
  }, [measured, hypo, qFormule, qVolume, qFlotte]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'masse-volume-densite-6eme',
        version: '2.0',
        steps: {
          measured: Array.from(measured),
          results: SAMPLES.filter((s) => measured.has(s.key)).map((s) => ({
            matiere: s.short,
            masse_g: s.mass,
            volume_cm3: s.volume,
            rho_g_cm3: Number(rhoOf(s).toFixed(2)),
            flotte: rhoOf(s) < RHO_EAU,
          })),
          hypothesis: hypo,
          qcm: { qFormule, qVolume, qFlotte },
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
                <Scale className="h-5 w-5" />
              </span>
              Reconnaître une matière : la masse volumique
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans un atelier de <strong>Ngaye Mékhé</strong>, l&apos;artisan te tend quatre échantillons : une planche
              de <strong>teck</strong>, un morceau de marmite en <strong>aluminium</strong>, un caillou de{' '}
              <strong>latérite</strong> et un <strong>boulon en fer</strong>. Aucun n&apos;a la même taille.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> mesurer la masse m avec la balance, le volume V par déplacement d&apos;eau, puis
              calculer la <strong>masse volumique ρ = m / V</strong> (en g/cm³) pour identifier chaque matière.
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
            Avant de manipuler : pour un <strong>même volume</strong> de 1 cm³, quelle matière est la plus{' '}
            <strong>lourde</strong> ? C&apos;est elle qui aura la plus grande masse volumique.
          </p>
          <QcmStep
            label="Mon hypothèse : la plus grande masse volumique, c'est…"
            tone="science"
            options={[
              { key: 'bois', label: 'Le bois de teck' },
              { key: 'alu', label: "L'aluminium" },
              { key: 'fer', label: 'Le fer' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
            hint="Astuce : compare deux morceaux de la même taille dans ta main."
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Aller au labo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-700" /> Étape 2 — Pèse, plonge, calcule
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un échantillon, <strong>pose-le sur la balance</strong> pour lire sa masse, puis{' '}
            <strong>plonge-le dans l&apos;éprouvette</strong> : le niveau monte de V₁ à V₂. Tourne la scène avec ta
            souris / ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => pick(s.key)}
                className={
                  'rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ' +
                  (s.key === sampleKey
                    ? 'bg-blue-600 text-white ring-blue-600'
                    : 'bg-white text-ink/70 ring-ink/10 hover:bg-blue-50')
                }
              >
                {measured.has(s.key) ? '✓ ' : ''}
                {s.short}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <DensityScene
                label={sample.short}
                color={sample.color}
                metal={sample.metal}
                shape={sample.shape}
                mass={sample.mass}
                volume={sample.volume}
                v0={v0}
                vMax={V_MAX}
                weighed={weighed}
                immersed={immersed}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="v0">Volume d&apos;eau au départ V₁</Label>
              <span className="font-mono text-blue-700">{v0} mL</span>
            </div>
            <input
              id="v0"
              type="range"
              min={30}
              max={60}
              step={5}
              value={v0}
              onChange={(e) => setV0(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <p className="mt-1 text-[11px] text-ink/50">
              Change V₁ : le volume trouvé V₂ − V₁ reste le même. C&apos;est bien le volume de l&apos;objet.
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="Masse m" value={weighed ? `${sample.mass.toFixed(1)} g` : '—'} />
            <Stat label="V₁ → V₂" value={immersed ? `${v1} → ${v2} mL` : `${v1} mL`} />
            <Stat label="V = V₂ − V₁" value={immersed ? `${sample.volume} cm³` : '—'} />
            <Stat label="ρ = m / V" value={weighed && immersed ? `${rho.toFixed(2)} g/cm³` : '—'} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="soft" size="sm" onClick={() => setWeighed(true)} disabled={weighed}>
                <Scale className="h-4 w-4" /> Poser sur la balance
              </Button>
              <Button variant="soft" size="sm" onClick={() => setImmersed(true)} disabled={!weighed || immersed}>
                <TestTube2 className="h-4 w-4" /> Plonger dans l&apos;eau
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  record();
                  setImmersed(false);
                }}
                disabled={!weighed || !immersed}
              >
                Enregistrer la mesure
              </Button>
            </div>
            <Button variant="gradient" disabled={measured.size < 3} onClick={() => setStep('mesures')}>
              {measured.size < 3 ? `Mesure ${3 - measured.size} échantillon(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ton tableau de mesures</CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare tes résultats à l&apos;eau : <strong>ρ(eau) = 1,00 g/cm³</strong>. Un corps coule si sa masse
            volumique est plus grande que celle de l&apos;eau.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-3 py-2 text-left">Matière</th>
                  <th className="px-3 py-2 text-right">m (g)</th>
                  <th className="px-3 py-2 text-right">V (cm³)</th>
                  <th className="px-3 py-2 text-right">ρ = m/V</th>
                  <th className="px-3 py-2 text-left">Dans l&apos;eau</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLES.filter((s) => measured.has(s.key)).map((s) => {
                  const r = rhoOf(s);
                  return (
                    <tr key={s.key} className="border-t border-night-100">
                      <td className="px-3 py-2">{s.short}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.mass.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.volume}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">{r.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                            (r < RHO_EAU ? 'bg-action-50 text-action-700' : 'bg-alert-50 text-alert-700')
                          }
                        >
                          {r < RHO_EAU ? 'flotte (ρ < 1)' : 'coule (ρ > 1)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 ring-1 ring-blue-100">
            Le boulon en fer est le plus petit, mais c&apos;est lui qui a la plus grande masse volumique (7,87 g/cm³, soit
            7 870 kg/m³). La masse volumique ne dépend <strong>pas</strong> de la taille du morceau : elle identifie la
            matière.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Remesurer
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
              label="La masse volumique se calcule avec la formule…"
              tone="science"
              options={[
                { key: 'mv', label: 'ρ = m / V' },
                { key: 'vm', label: 'ρ = V / m' },
                { key: 'mult', label: 'ρ = m × V' },
              ]}
              value={qFormule}
              onChange={setQFormule}
            />
            <QcmStep
              label="Tu plonges un caillou : le niveau passe de 50 mL à 70 mL. Le volume du caillou est…"
              tone="science"
              options={[
                { key: '20', label: '20 cm³ (car 1 mL = 1 cm³)' },
                { key: '70', label: '70 cm³' },
                { key: '120', label: '120 cm³' },
              ]}
              value={qVolume}
              onChange={setQVolume}
            />
            <QcmStep
              label="Un objet coule dans l'eau si sa masse volumique est…"
              tone="science"
              options={[
                { key: 'plusgrande', label: 'plus grande que 1 g/cm³' },
                { key: 'pluspetite', label: 'plus petite que 1 g/cm³' },
                { key: 'masse', label: 'sa masse est supérieure à 100 g' },
              ]}
              value={qFlotte}
              onChange={setQFlotte}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qFormule || !qVolume || !qFlotte || busy}
              onClick={handleValidate}
            >
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
              On pèse (masse <strong>m</strong> en g), on plonge pour lire <strong>V = V₂ − V₁</strong> (1 mL = 1 cm³),
              puis <strong>ρ = m / V</strong> en g/cm³. Ici : teck 0,65 · aluminium 2,70 · latérite 2,60 · fer 7,87.
            </p>
            <p>
              Comme <strong>ρ(eau) = 1,00 g/cm³</strong>, seul le teck flotte. En unités SI, 7,87 g/cm³ s&apos;écrit
              7 870 kg/m³.
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
