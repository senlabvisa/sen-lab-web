'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Gauge, Mountain, RotateCcw, Scale, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Énergie mécanique : Ec, Epp et leur conservation (1ère S).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures → QCM →
 * bilan. Une bille est lâchée sur un toboggan parabolique ; trois barres
 * suivent en direct Ec = ½mv², Epp = mgh et Em = Ec + Epp. Sans frottement
 * la barre Em ne bouge pas ; avec frottement elle descend.
 * g = 9,78 m/s² (Dakar).
 */

const EnergieScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-blue-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

const G = 9.78; // Dakar
const H_MAX = 2.2; // hauteur du toboggan à ses extrémités (m)
const X_MAX = 3; // demi-largeur du toboggan (m)
const K = H_MAX / (X_MAX * X_MAX); // profil y(x) = K·x²

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'augmente' | 'diminue' | 'constante' | null;

const INTRO =
  "À Dakar, l'intensité de la pesanteur vaut 9,78 newtons par kilogramme. " +
  "Quand une mangue se détache du manguier, elle perd de la hauteur mais gagne de la vitesse : rien ne disparaît, l'énergie change seulement de forme. " +
  "Sur ce toboggan tu vas lâcher une bille et surveiller trois barres : l'énergie cinétique, l'énergie potentielle de pesanteur, et leur somme, l'énergie mécanique. " +
  "Regarde bien la troisième barre : c'est elle qui raconte toute l'histoire.";

const CONCLUSION =
  "Bravo ! Sans frottement, l'énergie mécanique se conserve : la barre Em reste collée à son trait de départ. " +
  "Pendant la descente, l'énergie potentielle de pesanteur se transforme en énergie cinétique ; pendant la montée, c'est l'inverse. " +
  "Dès que tu ajoutes des frottements, une partie de l'énergie part en chaleur : Em diminue et la bille remonte de moins en moins haut, exactement comme un car rapide qui freine à l'entrée de Kaolack et dont les tambours chauffent.";

/** Vitesse et énergies au niveau h, pour une bille lâchée sans vitesse de h₀. */
function energies(mass: number, h0: number, h: number) {
  const epp = mass * G * h;
  const ec = Math.max(0, mass * G * (h0 - h));
  const v = Math.sqrt((2 * ec) / mass);
  return { epp, ec, em: epp + ec, v };
}

export function EnergieMecanique1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [h0, setH0] = useState(1.8);
  const [mass, setMass] = useState(0.2);
  const [mu, setMu] = useState(0);
  const [runId, setRunId] = useState(0);

  const [heightsTried, setHeightsTried] = useState<Set<number>>(new Set([1.8]));
  const [usedFriction, setUsedFriction] = useState(false);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qBas, setQBas] = useState<string | null>(null);
  const [qMasse, setQMasse] = useState<string | null>(null);
  const [qFrot, setQFrot] = useState<string | null>(null);

  const em0 = mass * G * h0;
  const vBas = Math.sqrt(2 * G * h0);
  /** Distance horizontale parcourue du lâcher jusqu'au bas du toboggan. */
  const xStart = Math.sqrt(h0 / K);
  /** Énergie dissipée par les frottements sur cette première descente. */
  const perte = mu * mass * G * xStart;

  const rows = useMemo(
    () => [1, 0.75, 0.5, 0.25, 0].map((f) => ({ h: h0 * f, ...energies(mass, h0, h0 * f) })),
    [h0, mass],
  );

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, heightsTried.size * 7); // exploration des hauteurs
    if (usedFriction) s += 10; // a testé les frottements
    if (hypo === 'constante') s += 10; // hypothèse juste
    if (qBas === 'tout-ec') s += 20;
    if (qMasse === 'inchangee') s += 20;
    if (qFrot === 'diminue') s += 20;
    return Math.min(100, Math.round(s));
  }, [heightsTried, usedFriction, hypo, qBas, qMasse, qFrot]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'energie-mecanique-1ere',
        version: '2.0',
        steps: {
          reglages: { h0, mass, mu, g: G },
          heightsTried: Array.from(heightsTried),
          usedFriction,
          hypothesis: hypo,
          mesures: { em0, vBas },
          qcm: { qBas, qMasse, qFrot },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-science-700 shadow-soft ring-1 ring-science-100">
                <Mountain className="h-5 w-5" />
              </span>
              La bille et le toboggan
            </CardTitle>
            <Badge tone="physique">Physique · 1ère S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Une <strong>mangue</strong> qui se détache du manguier perd de la hauteur et gagne de la vitesse. Elle
              échange de l&apos;<strong>énergie potentielle de pesanteur</strong> E<sub>pp</sub> = m·g·h contre de
              l&apos;<strong>énergie cinétique</strong> E<sub>c</sub> = ½·m·v².
            </p>
            <p>
              Leur somme s&apos;appelle l&apos;<strong>énergie mécanique</strong> : E<sub>m</sub> = E<sub>c</sub> +
              E<sub>pp</sub>. Tu vas lâcher une bille sur un toboggan et suivre les trois énergies en direct, en joules.
            </p>
            <p className="rounded-xl bg-science-50 p-3 text-sm text-science-700 ring-1 ring-science-100">
              <strong>Objectif :</strong> découvrir ce que devient E<sub>m</sub> pendant le mouvement, sans puis avec
              frottements. À Dakar, g = <strong>9,78 m/s²</strong>.
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
              <Target className="h-5 w-5 text-science-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : la bille descend le toboggan <strong>sans aucun frottement</strong>. À ton avis, que
            devient son énergie mécanique E<sub>m</sub> = E<sub>c</sub> + E<sub>pp</sub> pendant la descente ?
          </p>
          <QcmStep
            label="Mon hypothèse : pendant la descente sans frottement, Em…"
            tone="science"
            options={[
              { key: 'augmente', label: 'Augmente, parce que la bille va de plus en plus vite.' },
              { key: 'diminue', label: 'Diminue, parce que la bille perd de la hauteur.' },
              { key: 'constante', label: "Reste constante : ce qu'un terme perd, l'autre le gagne." },
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
              <Gauge className="h-5 w-5 text-science-700" /> Étape 2 — Lâche la bille
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Change la hauteur de lâcher et la masse, puis observe les trois barres. Le trait orange marque
            E<sub>m</sub> au départ. Ensuite, monte le curseur de frottement. Tourne la scène avec ta souris ou ton
            doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-science-100">
            <div className="aspect-[4/3] w-full">
              <EnergieScene h0={h0} mass={mass} mu={mu} g={G} hMax={H_MAX} xMax={X_MAX} runId={runId} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="h0">Hauteur de lâcher h₀</Label>
                <span className="font-mono text-science-700">{h0.toFixed(1)} m</span>
              </div>
              <input
                id="h0"
                type="range"
                min={0.4}
                max={2.2}
                step={0.1}
                value={h0}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setH0(v);
                  setHeightsTried((prev) => new Set(prev).add(Math.round(v * 10) / 10));
                }}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="m">Masse m</Label>
                <span className="font-mono text-science-700">{mass.toFixed(2)} kg</span>
              </div>
              <input
                id="m"
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={mass}
                onChange={(e) => setMass(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="mu">Frottement μ</Label>
                <span className="font-mono text-science-700">{mu.toFixed(2)}</span>
              </div>
              <input
                id="mu"
                type="range"
                min={0}
                max={0.2}
                step={0.01}
                value={mu}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMu(v);
                  if (v > 0) setUsedFriction(true);
                }}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Em au départ" value={`${em0.toFixed(2)} J`} />
            <Stat label="v en bas (μ = 0)" value={`${vBas.toFixed(2)} m/s`} />
            <Stat label="Perdu par frottement" value={`${perte.toFixed(2)} J`} />
          </div>

          <p className="mt-3 rounded-xl bg-science-50 p-3 text-xs text-science-700 ring-1 ring-science-100">
            {mu === 0
              ? "μ = 0 : la barre orange Em reste exactement sur le trait. Ec et Epp s'échangent, leur somme ne change pas."
              : "μ > 0 : le rail frotte. À chaque aller-retour la barre Em descend sous le trait — l'énergie part en chaleur."}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={() => setRunId((r) => r + 1)}>
              <RotateCcw className="h-4 w-4" /> Relâcher la bille
            </Button>
            <Button
              variant="gradient"
              disabled={heightsTried.size < 3 || !usedFriction}
              onClick={() => setStep('mesures')}
            >
              {heightsTried.size < 3
                ? `Teste ${3 - heightsTried.size} hauteur(s) de plus`
                : !usedFriction
                  ? 'Essaie aussi les frottements'
                  : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-science-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Descente <strong>sans frottement</strong> pour m = {mass.toFixed(2)} kg lâchée de h₀ = {h0.toFixed(1)} m.
            Lis la dernière colonne de haut en bas.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-science-50 text-xs uppercase tracking-wider text-science-700">
                <tr>
                  <th className="px-3 py-2 text-left">h (m)</th>
                  <th className="px-3 py-2 text-left">Epp = mgh</th>
                  <th className="px-3 py-2 text-left">Ec = ½mv²</th>
                  <th className="px-3 py-2 text-left">v (m/s)</th>
                  <th className="px-3 py-2 text-left">Em = Ec + Epp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.h} className="border-t border-night-100">
                    <td className="px-3 py-2 font-mono">{r.h.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono">{r.epp.toFixed(2)} J</td>
                    <td className="px-3 py-2 font-mono">{r.ec.toFixed(2)} J</td>
                    <td className="px-3 py-2 font-mono">{r.v.toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono font-bold text-amber-700">{r.em.toFixed(2)} J</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-2 text-sm text-ink/75">
            <p className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
              La colonne E<sub>m</sub> ne bouge pas : <strong>{em0.toFixed(2)} J</strong> du début à la fin. C&apos;est
              la <strong>conservation de l&apos;énergie mécanique</strong>. En bas, tout est cinétique donc
              ½mv² = mgh₀, d&apos;où v = √(2·g·h₀) = <strong>{vBas.toFixed(2)} m/s</strong> — une valeur qui ne dépend
              pas de la masse.
            </p>
            <p className="rounded-xl bg-rose-50 p-3 ring-1 ring-rose-100">
              Avec μ = {mu.toFixed(2)}, le rail dissipe μ·m·g·d sur les d = {xStart.toFixed(2)} m de descente, soit{' '}
              <strong>{perte.toFixed(2)} J</strong> : en bas il ne reste plus que{' '}
              <strong>{Math.max(0, em0 - perte).toFixed(2)} J</strong> d&apos;énergie mécanique.
            </p>
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
              label="Au point le plus bas du toboggan (h = 0), sans frottement, l'énergie de la bille est…"
              tone="science"
              options={[
                { key: 'tout-ec', label: 'Entièrement cinétique : Ec = mgh₀ et Epp = 0.' },
                { key: 'tout-epp', label: 'Entièrement potentielle : Epp = mgh₀ et Ec = 0.' },
                { key: 'nulle', label: "Nulle : la bille a tout perdu en descendant." },
              ]}
              value={qBas}
              onChange={setQBas}
            />
            <QcmStep
              label="Tu doubles la masse de la bille mais tu la lâches de la même hauteur h₀ (toujours sans frottement). Sa vitesse en bas…"
              tone="science"
              hint="Indice : en bas ½mv² = mgh₀. Simplifie par m."
              options={[
                { key: 'inchangee', label: 'Ne change pas : v = √(2·g·h₀) ne dépend pas de m.' },
                { key: 'double', label: 'Double elle aussi.' },
                { key: 'moitie', label: 'Est deux fois plus petite.' },
              ]}
              value={qMasse}
              onChange={setQMasse}
            />
            <QcmStep
              label="Quand tu montes le curseur de frottement, l'énergie mécanique de la bille…"
              tone="science"
              options={[
                { key: 'diminue', label: "Diminue : une partie est dissipée en chaleur par le rail." },
                { key: 'constante', label: 'Reste constante : Em se conserve toujours.' },
                { key: 'augmente', label: 'Augmente : le frottement pousse la bille.' },
              ]}
              value={qFrot}
              onChange={setQFrot}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qBas || !qMasse || !qFrot || busy} onClick={handleValidate}>
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
            <Badge tone="physique">Physique · 1ère S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              E<sub>c</sub> = ½·m·v² · E<sub>pp</sub> = m·g·h · E<sub>m</sub> = E<sub>c</sub> + E<sub>pp</sub>.
              <strong> Sans frottement, E<sub>m</sub> se conserve</strong> : la barre orange ne bouge pas. Ce que
              E<sub>pp</sub> perd, E<sub>c</sub> le gagne — et réciproquement à la remontée.
            </p>
            <p>
              <strong>Avec frottement</strong>, le travail des forces de frottement est résistant : E<sub>m</sub>{' '}
              diminue et l&apos;énergie perdue se retrouve en chaleur. C&apos;est pour cela qu&apos;un car rapide qui
              freine longuement chauffe ses tambours, et qu&apos;une bille réelle finit toujours par s&apos;arrêter en
              bas du toboggan.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-science-100">
              Détail du score : exploration des hauteurs {Math.min(20, heightsTried.size * 7)}/20 · frottements testés{' '}
              {usedFriction ? 10 : 0}/10 · hypothèse {hypo === 'constante' ? 10 : 0}/10 · QCM{' '}
              {(qBas === 'tout-ec' ? 20 : 0) + (qMasse === 'inchangee' ? 20 : 0) + (qFrot === 'diminue' ? 20 : 0)}/60.
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
    <div className="rounded-xl bg-science-50 p-2 ring-1 ring-science-100">
      <div className="text-[10px] uppercase tracking-wider text-science-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-science-700">{value}</div>
    </div>
  );
}
