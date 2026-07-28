'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Droplets, Ruler, Sparkles, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { WaterMode } from './water-scene';

/**
 * TP — LA MOLÉCULE D'EAU H₂O (Physique-Chimie, 4ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (rapporteur virtuel
 * pour mesurer l'angle H–O–H, puis polarité, solvatation, électrolyse) →
 * relevé de mesures → QCM → bilan narré.
 *
 * Science juste : formule H₂O, 2 liaisons covalentes O–H de 96 pm, géométrie
 * COUDÉE d'angle 104,5° (et non 180°), molécule polaire (O porte δ−, H portent
 * δ+) donc solvant des composés ioniques, décomposition 2 H₂O → 2 H₂ + O₂.
 */

const WaterScene = dynamic(() => import('./water-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-science-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'alignee' | 'coudee' | 'triangle' | null;

const REAL_ANGLE = 104.5;

const MODES: { key: WaterMode; label: string; hint: string }[] = [
  {
    key: 'modele',
    label: 'Géométrie',
    hint: 'Ouvre le rapporteur (curseur ci-dessous) jusqu’à superposer les deux rayons aux liaisons O–H, puis enregistre ta mesure.',
  },
  {
    key: 'polarite',
    label: 'Polarité',
    hint: 'L’oxygène attire les électrons des deux liaisons : il porte une charge partielle négative δ−, chaque hydrogène une charge partielle positive δ+. La molécule a donc un pôle « + » et un pôle « − ».',
  },
  {
    key: 'solvant',
    label: 'Eau + sel',
    hint: 'Dans l’eau salée, le sel NaCl se sépare en ions Na⁺ et Cl⁻. Les molécules d’eau tournent leur côté δ− vers Na⁺ et leur côté δ+ vers Cl⁻ : le sel se dissout.',
  },
  {
    key: 'synthese',
    label: 'Électrolyse',
    hint: 'Avec un courant électrique, l’eau se décompose : 2 H₂O → 2 H₂ + O₂. Compte les atomes : 4 H et 2 O à gauche, 4 H et 2 O à droite. Rien ne se perd.',
  },
];

const INTRO =
  "L'eau du robinet de la SDE à Dakar, l'eau d'un forage du Ferlo, l'eau dessalée de l'usine des Mamelles, " +
  "l'eau du fleuve Sénégal à Podor : c'est toujours la même molécule, H2O. " +
  "Un atome d'oxygène relié à deux atomes d'hydrogène par deux liaisons covalentes. " +
  "Attention : les trois atomes ne sont pas alignés ! La molécule est coudée. " +
  "Aujourd'hui tu vas mesurer toi-même l'angle H-O-H avec un rapporteur virtuel, " +
  "puis comprendre pourquoi cette forme permet à l'eau de dissoudre le sel.";

const CONCLUSION =
  "Bravo ! La molécule d'eau s'écrit H2O : un atome d'oxygène lié à deux atomes d'hydrogène " +
  "par deux liaisons covalentes de 96 picomètres. Les trois atomes ne sont pas alignés : " +
  "la molécule est coudée, l'angle H-O-H vaut environ 104 virgule 5 degrés. " +
  "L'oxygène attire davantage les électrons : il porte une charge partielle négative, " +
  "les hydrogènes une charge partielle positive. L'eau est donc une molécule polaire, " +
  "et c'est pour cela qu'elle dissout le sel de cuisine. Enfin, un courant électrique peut la décomposer : " +
  "2 H2O donne 2 H2 plus O2.";

export function MoleculeEau4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [mode, setMode] = useState<WaterMode>('modele');
  const [seen, setSeen] = useState<Set<WaterMode>>(new Set<WaterMode>(['modele']));
  const [angle, setAngle] = useState(140);
  const [releve, setReleve] = useState<number | null>(null);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qFormule, setQFormule] = useState<string | null>(null);
  const [qLiaison, setQLiaison] = useState<string | null>(null);
  const [qPolaire, setQPolaire] = useState<string | null>(null);

  const ecart = releve === null ? null : Math.abs(releve - REAL_ANGLE);
  const hint = MODES.find((m) => m.key === mode)?.hint ?? '';

  function pick(k: WaterMode) {
    setMode(k);
    setSeen((prev) => new Set(prev).add(k));
  }

  function enregistrer() {
    setReleve(angle);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, seen.size * 5); // exploration des 4 vues
    if (ecart !== null) s += ecart <= 2 ? 15 : ecart <= 6 ? 8 : 3; // précision du relevé
    if (hypo === 'coudee') s += 10;
    if (qFormule === 'h2o') s += 20;
    if (qLiaison === 'covalente') s += 15;
    if (qPolaire === 'polaire') s += 20;
    return Math.min(100, s);
  }, [seen, ecart, hypo, qFormule, qLiaison, qPolaire]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'molecule-eau-4eme',
        version: '2.0',
        steps: {
          vues: Array.from(seen),
          hypothesis: hypo,
          angle: { releve, reference: REAL_ANGLE, ecart },
          qcm: { qFormule, qLiaison, qPolaire },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-science-700 shadow-soft ring-1 ring-science-100">
                <Droplets className="h-5 w-5" />
              </span>
              La molécule d’eau H₂O
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              L’eau du robinet de la <strong>SDE</strong>, l’eau d’un <strong>forage du Ferlo</strong>, l’eau
              dessalée de l’usine des <strong>Mamelles</strong>, l’eau du <strong>fleuve Sénégal</strong> : c’est
              toujours la même molécule, <strong>H₂O</strong>.
            </p>
            <p>
              Un atome d’oxygène + deux atomes d’hydrogène, tenus par des <strong>liaisons covalentes</strong>. Mais
              les trois atomes ne sont <em>pas alignés</em> : la molécule est <strong>coudée</strong>.
            </p>
            <p className="rounded-xl bg-science-50 p-3 text-sm text-science-700 ring-1 ring-science-100">
              <strong>Objectif :</strong> mesurer l’angle H–O–H avec un rapporteur virtuel, puis expliquer pourquoi
              cette forme rend l’eau <strong>polaire</strong> — et donc capable de dissoudre le sel.
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
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de mesurer : à ton avis, comment les 3 atomes de la molécule d’eau sont-ils placés&nbsp;?
          </p>
          <QcmStep
            label="Mon hypothèse : dans la molécule H₂O, les atomes H–O–H sont…"
            tone="violet"
            hint="Indice : regarde bien la forme d’une goutte de rosée… puis vérifie en 3D."
            options={[
              { key: 'alignee', label: 'Alignés : H–O–H forme une ligne droite (180°)' },
              { key: 'coudee', label: 'Coudés : les deux liaisons O–H forment un angle bien plus petit que 180°' },
              { key: 'triangle', label: 'En triangle : les deux H sont aussi liés entre eux' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Mesurer ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-science-700" /> Étape 2 — Manipule la molécule d’eau
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tourne la scène avec ta souris / ton doigt. Passe en revue les <strong>4 vues</strong> de la molécule
            d’eau.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-science-100">
            <div className="aspect-[4/3] w-full">
              <WaterScene mode={mode} angle={angle} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {MODES.map((m) => (
              <Button
                key={m.key}
                variant={mode === m.key ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => pick(m.key)}
              >
                {m.label} {seen.has(m.key) && mode !== m.key ? '✓' : ''}
              </Button>
            ))}
          </div>

          <p className="mt-3 rounded-xl bg-science-50 p-3 text-sm text-science-700 ring-1 ring-science-100">
            <Sparkles className="mr-1 inline h-4 w-4" />
            {hint}
          </p>

          {mode === 'modele' && (
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="angle">Ouverture du rapporteur</Label>
                  <span className="font-mono text-science-700">{angle.toFixed(1)}°</span>
                </div>
                <input
                  id="angle"
                  type="range"
                  min={80}
                  max={180}
                  step={0.5}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>
              <p className="text-sm text-ink/70">
                {Math.abs(angle - REAL_ANGLE) <= 2
                  ? '✅ Les rayons se superposent aux liaisons O–H : tu y es !'
                  : angle > REAL_ANGLE
                    ? '↔️ Trop ouvert : tes rayons passent en dehors des liaisons O–H. Referme un peu.'
                    : '↔️ Trop fermé : tes rayons passent en dedans des liaisons O–H. Ouvre un peu.'}
              </p>
              <Button variant="soft" size="sm" onClick={enregistrer}>
                <Ruler className="h-4 w-4" /> Enregistrer ma mesure
              </Button>
              {releve !== null && (
                <p className="text-xs text-ink/60">
                  Mesure enregistrée : <span className="font-mono font-semibold">{releve.toFixed(1)}°</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">Vues explorées : {seen.size}/4</span>
            <Button
              variant="gradient"
              disabled={seen.size < 3 || releve === null}
              onClick={() => setStep('mesures')}
            >
              {releve === null
                ? 'Enregistre d’abord ta mesure d’angle'
                : seen.size < 3
                  ? `Explore ${3 - seen.size} vue(s) de plus`
                  : 'Voir ma fiche de mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ma fiche d’identité de H₂O</CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare ton relevé à la valeur de référence, puis retiens la carte d’identité de la molécule d’eau.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-science-50 text-xs uppercase tracking-wider text-science-700">
                <tr>
                  <th className="px-4 py-2 text-left">Grandeur</th>
                  <th className="px-4 py-2 text-left">Valeur</th>
                </tr>
              </thead>
              <tbody>
                <tr className={'border-t border-night-100 ' + (ecart !== null && ecart <= 2 ? 'bg-emerald-50 font-semibold' : '')}>
                  <td className="px-4 py-2">Angle H–O–H (ton relevé)</td>
                  <td className="px-4 py-2 font-mono">
                    {releve !== null ? `${releve.toFixed(1)}°` : '—'}
                    {ecart !== null ? ` · écart ${ecart.toFixed(1)}°` : ''}
                    {ecart !== null && ecart <= 2 ? ' 🏆' : ''}
                  </td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Angle H–O–H (référence)</td>
                  <td className="px-4 py-2 font-mono">≈ 104,5°</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Formule chimique</td>
                  <td className="px-4 py-2 font-mono">H₂O — 2 atomes H + 1 atome O</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Liaisons</td>
                  <td className="px-4 py-2">2 liaisons covalentes O–H (longueur ≈ 96 pm)</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Forme</td>
                  <td className="px-4 py-2">Coudée (les 3 atomes ne sont pas alignés)</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Polarité</td>
                  <td className="px-4 py-2">Polaire : O porte δ−, chaque H porte δ+</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Décomposition</td>
                  <td className="px-4 py-2 font-mono">2 H₂O → 2 H₂ + O₂ (électrolyse)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-ink/70">
            Ton hypothèse de départ&nbsp;:{' '}
            {hypo === 'coudee' ? (
              <span className="font-semibold text-action-700">correcte — la molécule est bien coudée.</span>
            ) : (
              <span className="font-semibold text-alert-700">
                à corriger — la molécule est coudée (104,5°), pas alignée, et les deux H ne sont pas liés entre eux.
              </span>
            )}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir en 3D
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
            <Badge tone="science">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="La formule chimique de l’eau est :"
              tone="violet"
              options={[
                { key: 'h2o', label: 'H₂O — 2 atomes d’hydrogène et 1 atome d’oxygène' },
                { key: 'ho2', label: 'HO₂ — 1 atome d’hydrogène et 2 atomes d’oxygène' },
                { key: 'h2o2', label: 'H₂O₂ — 2 atomes d’hydrogène et 2 atomes d’oxygène' },
              ]}
              value={qFormule}
              onChange={setQFormule}
            />
            <QcmStep
              label="Dans la molécule d’eau, l’oxygène et l’hydrogène sont reliés par :"
              tone="violet"
              options={[
                { key: 'covalente', label: 'Une liaison covalente : ils mettent des électrons en commun' },
                { key: 'aimant', label: 'Une force d’aimant entre les deux atomes' },
                { key: 'colle', label: 'Rien : les atomes sont simplement posés côte à côte' },
              ]}
              value={qLiaison}
              onChange={setQLiaison}
            />
            <QcmStep
              label="Pourquoi l’eau dissout-elle le sel de cuisine (NaCl) ?"
              tone="violet"
              hint="Repense à la vue « Eau + sel » et à l’angle de 104,5°."
              options={[
                {
                  key: 'polaire',
                  label:
                    'Parce que H₂O est coudée et polaire : le côté O (δ−) attire Na⁺ et le côté H (δ+) attire Cl⁻',
                },
                { key: 'liquide', label: 'Parce que l’eau est liquide : tout liquide dissout tout' },
                { key: 'chaud', label: 'Parce que le sel fond à la chaleur du soleil' },
              ]}
              value={qPolaire}
              onChange={setQPolaire}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qFormule || !qLiaison || !qPolaire || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La molécule d’eau s’écrit <strong>H₂O</strong> : 1 atome d’oxygène lié à 2 atomes d’hydrogène par deux{' '}
              <strong>liaisons covalentes</strong> (≈ 96 pm). Elle est <strong>coudée</strong> :{' '}
              <strong>angle H–O–H ≈ 104,5°</strong>. L’oxygène attire plus les électrons, il porte <strong>δ−</strong>{' '}
              et les hydrogènes <strong>δ+</strong> : l’eau est <strong>polaire</strong>, c’est pourquoi elle dissout
              le sel. Par électrolyse : <strong>2 H₂O → 2 H₂ + O₂</strong>.
            </p>
            <p className="text-sm text-ink/60">
              Détail du score : exploration des vues {Math.min(20, seen.size * 5)}/20 · précision de ta mesure{' '}
              {ecart === null ? 0 : ecart <= 2 ? 15 : ecart <= 6 ? 8 : 3}/15 · hypothèse {hypo === 'coudee' ? 10 : 0}/10
              · QCM {(qFormule === 'h2o' ? 20 : 0) + (qLiaison === 'covalente' ? 15 : 0) + (qPolaire === 'polaire' ? 20 : 0)}/55.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
