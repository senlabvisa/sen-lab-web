'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Bug, CheckCircle2, ClipboardList, Leaf, RotateCcw } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { OrganismKey } from './chain-scene';

/**
 * TP — Alimentation des animaux et chaîne alimentaire (6ème, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → mesures →
 * QCM → bilan. Contexte : un champ de mil du bassin arachidier (Kaolack),
 * attaqué par les criquets. L'élève construit la chaîne alimentaire en
 * cliquant les organismes dans l'ordre, puis traite le champ et lit
 * l'effondrement des effectifs sur toute la chaîne.
 */

const ChainScene = dynamic(() => import('./chain-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 text-sm text-ink/50">
      Chargement du champ de mil 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'plus' | 'rien' | 'moins' | null;
type Essai = { pesticide: number; criquet: number; margouillat: number; rapace: number };

const ORDER: OrganismKey[] = ['mil', 'criquet', 'margouillat', 'rapace'];
const LABELS: Record<OrganismKey, string> = {
  mil: 'Pied de mil',
  criquet: 'Criquet',
  margouillat: 'Margouillat',
  rapace: 'Rapace',
};
/** Effectifs de référence sur une parcelle, champ sain. */
const BASE: Record<OrganismKey, number> = { mil: 1000, criquet: 250, margouillat: 30, rapace: 3 };

const INTRO =
  "Dans le bassin arachidier, près de Kaolack, un paysan cultive du mil. " +
  "Chaque hivernage, les criquets viennent dévorer les feuilles. Mais les criquets sont eux-mêmes mangés par les margouillats, " +
  "et les margouillats sont chassés par les rapaces. Cette suite d'êtres vivants qui se mangent les uns les autres s'appelle une chaîne alimentaire. " +
  "Tu vas la construire toi-même, puis observer ce qui arrive à tout le champ quand on traite contre les criquets.";

const CONCLUSION =
  "Bravo ! Le mil est un producteur : il fabrique sa matière grâce à la lumière du soleil. " +
  "Le criquet est un herbivore, le margouillat et le rapace sont des carnivores : ce sont des consommateurs. " +
  "La flèche de la chaîne alimentaire se lit est mangé par. Quand on supprime les criquets, tous les maillons suivants manquent de nourriture : " +
  "les margouillats puis les rapaces disparaissent à leur tour. Chaque maillon est utile à l'équilibre du champ.";

function counted(pesticide: number): Record<OrganismKey, number> {
  const survie = 1 - pesticide / 100;
  return {
    mil: BASE.mil,
    criquet: Math.round(BASE.criquet * survie),
    margouillat: Math.round(BASE.margouillat * survie),
    rapace: Math.round(BASE.rapace * survie),
  };
}

export function AlimentationAnimale6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [clicked, setClicked] = useState<OrganismKey[]>([]);
  const [errors, setErrors] = useState(0);
  const [warn, setWarn] = useState<string | null>(null);
  const [hypo, setHypo] = useState<HypoRep>(null);
  const [pesticide, setPesticide] = useState(0);
  const [essais, setEssais] = useState<Essai[]>([]);

  const [qRegime, setQRegime] = useState<string | null>(null);
  const [qRole, setQRole] = useState<string | null>(null);
  const [qFleche, setQFleche] = useState<string | null>(null);

  const isComplete = clicked.length === ORDER.length;
  const next = isComplete ? null : ORDER[clicked.length];
  const counts = useMemo(() => counted(pesticide), [pesticide]);
  const survie = 1 - pesticide / 100;

  function handlePick(k: OrganismKey) {
    if (isComplete || clicked.includes(k)) return;
    if (k === ORDER[clicked.length]) {
      setClicked((prev) => [...prev, k]);
      setWarn(null);
    } else {
      setErrors((e) => e + 1);
      setWarn(
        clicked.length === 0
          ? 'Pas encore : commence par l’être vivant qui ne mange aucun autre être vivant.'
          : `Pas encore : demande-toi qui mange le ${LABELS[ORDER[clicked.length - 1]].toLowerCase()}.`,
      );
    }
  }

  function handleReset() {
    setClicked([]);
    setErrors(0);
    setWarn(null);
  }

  function recordEssai() {
    setEssais((prev) => {
      if (prev.some((e) => e.pesticide === pesticide)) return prev;
      return [...prev, { pesticide, criquet: counts.criquet, margouillat: counts.margouillat, rapace: counts.rapace }];
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += isComplete ? Math.max(12, 40 - errors * 8) : clicked.length * 6; // chaîne
    if (hypo === 'moins') s += 10; // hypothèse
    s += Math.min(15, essais.length * 5); // exploration
    if (qRegime === 'herbivore') s += 12;
    if (qRole === 'producteur') s += 12;
    if (qFleche === 'mange') s += 11;
    return Math.max(0, Math.min(100, s));
  }, [isComplete, clicked, errors, hypo, essais, qRegime, qRole, qFleche]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'alimentation-animale-6eme',
        version: '2.0',
        steps: {
          chain: clicked,
          errors,
          hypothesis: hypo,
          essais,
          qcm: { qRegime, qRole, qFleche },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Leaf className="h-5 w-5" />
              </span>
              Qui mange qui dans le champ de mil ?
            </CardTitle>
            <Badge tone="svt">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Près de <strong>Kaolack</strong>, dans le bassin arachidier, un champ de <strong>mil</strong> est
              attaqué par les criquets. Les <strong>margouillats</strong> mangent les criquets, et les{' '}
              <strong>rapaces</strong> chassent les margouillats.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> construire la chaîne alimentaire du champ, puis mesurer ce qui arrive
              aux autres maillons quand on traite le champ contre les criquets.
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
              <Bug className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : le paysan traite son champ et il ne reste presque plus de criquets. À ton avis,
            que deviennent les <strong>rapaces</strong> du village ?
          </p>
          <QcmStep
            label="Mon hypothèse : après le traitement, les rapaces seront…"
            tone="action"
            options={[
              { key: 'plus', label: 'Plus nombreux (il y a plus de mil pour tout le monde)' },
              { key: 'rien', label: 'Aussi nombreux (ils ne mangent pas de criquets)' },
              { key: 'moins', label: 'Moins nombreux (leur nourriture vient de la chaîne)' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Aller au champ <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-700" /> Étape 2 — Construis la chaîne, puis traite le champ
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            {isComplete
              ? 'Chaîne complète ! Déplace maintenant le curseur du traitement et enregistre au moins 2 essais.'
              : 'Clique les organismes dans l’ordre : commence par celui qui ne mange aucun être vivant, puis clique celui qui le mange.'}
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <ChainScene
                clicked={clicked}
                next={next}
                onPick={handlePick}
                showImpact={isComplete}
                counts={counts}
                survie={survie}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {ORDER.map((k) => (
                <Badge key={k} tone={clicked.includes(k) ? 'action' : 'neutral'} size="sm">
                  {clicked.includes(k) ? `${clicked.indexOf(k) + 1}. ` : ''}
                  {LABELS[k]}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {errors > 0 && <span className="text-xs text-alert-700">{errors} essai(s) manqué(s)</span>}
              {clicked.length > 0 && !isComplete && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5" /> Recommencer
                </Button>
              )}
            </div>
          </div>
          {warn && !isComplete && (
            <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-100">{warn}</p>
          )}

          {isComplete && (
            <>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="pest">Traitement du champ (criquets tués)</Label>
                  <span className="font-mono text-emerald-700">{pesticide} %</span>
                </div>
                <input
                  id="pest"
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={pesticide}
                  onChange={(e) => setPesticide(Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <Stat label="Pieds de mil" value={`${counts.mil}`} />
                <Stat label="Criquets" value={`${counts.criquet}`} />
                <Stat label="Margouillats" value={`${counts.margouillat}`} />
                <Stat label="Rapaces" value={`${counts.rapace}`} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button variant="soft" size="sm" onClick={recordEssai}>
                  <ClipboardList className="h-4 w-4" /> Enregistrer cet essai
                </Button>
                <Button variant="gradient" disabled={essais.length < 2} onClick={() => setStep('mesures')}>
                  {essais.length < 2 ? `Enregistre ${2 - essais.length} essai(s)` : 'Voir mes mesures'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ta fiche de mesures</CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare tes essais : quand le traitement tue les criquets, regarde la colonne des rapaces.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Traitement</th>
                  <th className="px-3 py-2 text-left">Criquets</th>
                  <th className="px-3 py-2 text-left">Margouillats</th>
                  <th className="px-3 py-2 text-left">Rapaces</th>
                </tr>
              </thead>
              <tbody>
                {[...essais]
                  .sort((a, b) => a.pesticide - b.pesticide)
                  .map((e) => (
                    <tr key={e.pesticide} className={'border-t border-night-100 ' + (e.rapace === 0 ? 'bg-alert-50' : '')}>
                      <td className="px-3 py-2">{e.pesticide} %</td>
                      <td className="px-3 py-2">{e.criquet}</td>
                      <td className="px-3 py-2">{e.margouillat}</td>
                      <td className="px-3 py-2 font-semibold">{e.rapace}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>Observe :</strong> le mil reste à {BASE.mil} pieds, mais dès qu&apos;il y a moins de criquets,
            il y a aussi moins de margouillats, puis moins de rapaces. Ton hypothèse de départ était{' '}
            {hypo === 'moins' ? 'juste' : 'à corriger'}.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner au champ
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
            <Badge tone="svt">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Le criquet ne mange que les feuilles du mil : son régime alimentaire est…"
              tone="action"
              options={[
                { key: 'herbivore', label: 'Herbivore (il mange des végétaux)' },
                { key: 'carnivore', label: 'Carnivore (il mange des animaux)' },
                { key: 'omnivore', label: 'Omnivore (il mange des végétaux et des animaux)' },
              ]}
              value={qRegime}
              onChange={setQRegime}
            />
            <QcmStep
              label="Le mil fabrique sa matière grâce à la lumière du soleil. Dans la chaîne, c'est…"
              tone="action"
              options={[
                { key: 'producteur', label: 'Un producteur (premier maillon de la chaîne)' },
                { key: 'consommateur', label: 'Un consommateur (il mange un autre être vivant)' },
                { key: 'predateur', label: 'Un prédateur (il chasse les autres)' },
              ]}
              value={qRole}
              onChange={setQRole}
            />
            <QcmStep
              label="Dans « mil → criquet », que veut dire la flèche ?"
              tone="action"
              hint="Attention au sens : la flèche part de celui qui est mangé."
              options={[
                { key: 'mange', label: '« est mangé par » : le criquet mange le mil' },
                { key: 'inverse', label: '« mange » : le mil mange le criquet' },
                { key: 'vit', label: '« vit à côté de » : ils habitent le même champ' },
              ]}
              value={qFleche}
              onChange={setQFleche}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qRegime || !qRole || !qFleche || busy} onClick={handleValidate}>
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
              La chaîne du champ est : <strong>mil → criquet → margouillat → rapace</strong>. Le mil est un{' '}
              <strong>producteur</strong> ; le criquet est <strong>herbivore</strong> ; le margouillat et le rapace
              sont <strong>carnivores</strong> : tous les trois sont des <strong>consommateurs</strong>.
            </p>
            <p>
              En supprimant les criquets, on casse le deuxième maillon : les margouillats, puis les rapaces,
              n&apos;ont plus assez à manger. <strong>Chaque maillon compte</strong> pour l&apos;équilibre du champ.
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
    <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
      <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-emerald-800">{value}</div>
    </div>
  );
}
