'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Egg, Heart, RefreshCcw, Thermometer } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Cycle de vie de la poule (6ème, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (œuf couvé ouvert en
 * coupe, jour d'incubation 0 → 21) → mesures (journal d'incubation + suite du
 * cycle) → QCM → bilan. Le TP est recadré sur l'objet d'étude — l'œuf — dont le
 * contenu évolue jour après jour selon le développement réel de l'embryon.
 * Contexte : la poule couveuse dans la cour d'une maison à Kaolack.
 */

const IncubationScene = dynamic(() => import('./lifecycle-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la couveuse 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type StageKey = 'pondu' | 'coeur' | 'organes' | 'duvet' | 'pret' | 'eclosion';
type HypoRep = 'j3' | 'j10' | 'j20' | null;

const STAGES: Array<{ key: StageKey; to: number; title: string; obs: string }> = [
  { key: 'pondu', to: 1, title: 'Œuf pondu', obs: "L'œuf est couvé à 37,8 °C. Rien de visible encore." },
  { key: 'coeur', to: 5, title: 'Le cœur bat', obs: 'Le cœur bat dès le 3e jour ; des vaisseaux rouges couvrent le jaune.' },
  { key: 'organes', to: 9, title: 'Ailes, pattes et bec', obs: "Bourgeons d'ailes et de pattes, puis le bec apparaît." },
  { key: 'duvet', to: 15, title: 'Duvet et plumes', obs: 'Le poussin se couvre de duvet jaune ; il bouge dans la coquille.' },
  { key: 'pret', to: 20, title: 'Poussin prêt', obs: "Le jaune est presque fini ; la chambre à air est grande." },
  { key: 'eclosion', to: 21, title: 'Éclosion', obs: 'Le poussin fêle la coquille avec son « diamant » et sort.' },
];

function stageAt(day: number) {
  return STAGES.find((s) => day <= s.to) ?? STAGES[STAGES.length - 1];
}

/** Longueur réelle de l'embryon de poule (mm) selon le jour d'incubation. */
const MM: Array<[number, number]> = [
  [0, 0], [2, 2], [3, 4], [6, 15], [10, 40], [14, 60], [17, 70], [19, 75], [21, 80],
];

function embryoMm(day: number) {
  if (day <= 0) return 0;
  for (let i = 1; i < MM.length; i++) {
    const [x1, y1] = MM[i];
    if (day <= x1) {
      const [x0, y0] = MM[i - 1];
      return y0 + ((day - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return MM[MM.length - 1][1];
}

const APRES_ECLOSION: Array<{ age: string; etape: string }> = [
  { age: 'Jour 21', etape: 'Le poussin éclôt : il pèse environ 40 g.' },
  { age: '1 à 2 mois', etape: 'Il grandit, le duvet est remplacé par des plumes.' },
  { age: '3 à 4 mois', etape: 'Poulette : la crête rougit, elle prend sa taille adulte.' },
  { age: 'Vers 5 à 6 mois', etape: 'Poule adulte : elle pond son premier œuf… et tout recommence.' },
];

const INTRO =
  "Dans la cour d'une maison à Kaolack, la poule couve ses œufs pendant trois semaines sans presque bouger. " +
  "Personne ne voit ce qui se passe à l'intérieur de la coquille. Aujourd'hui tu ouvres l'œuf en 3D, jour après jour, " +
  "pour observer comment un simple œuf devient un poussin vivant.";

const CONCLUSION =
  "Bravo ! Dans l'œuf couvé, un embryon se forme : son cœur bat dès le troisième jour, ses ailes, ses pattes et son bec apparaissent, " +
  "puis il se couvre de duvet. Le jaune n'est pas le poussin : c'est sa réserve de nourriture, qu'il consomme jusqu'à l'éclosion, au 21e jour. " +
  "Le poussin devient poulette, puis poule adulte vers cinq mois, et elle pond à son tour un œuf. Le cycle de vie est circulaire : " +
  "naître, grandir, se reproduire — c'est ce qui permet à l'espèce de continuer.";

export function CycleVie6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [day, setDay] = useState(0);
  const [seen, setSeen] = useState<Set<StageKey>>(new Set(['pondu']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qJaune, setQJaune] = useState<string | null>(null);
  const [qDuree, setQDuree] = useState<string | null>(null);
  const [qCycle, setQCycle] = useState<string | null>(null);

  const stage = useMemo(() => stageAt(day), [day]);
  const sizeMm = useMemo(() => embryoMm(day), [day]);

  function changeDay(next: number) {
    setDay(next);
    setSeen((prev) => new Set(prev).add(stageAt(next).key));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, seen.size * 6); // exploration des 6 stades
    if (hypo === 'j3') s += 10;
    if (qJaune === 'reserve') s += 20;
    if (qDuree === '21') s += 20;
    if (qCycle === 'circulaire') s += 20;
    return Math.max(0, Math.min(100, s));
  }, [seen, hypo, qJaune, qDuree, qCycle]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'cycle-vie-6eme',
        version: '2.0',
        steps: {
          stagesSeen: Array.from(seen),
          lastDay: day,
          hypothesis: hypo,
          qcm: { qJaune, qDuree, qCycle },
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
                <Egg className="h-5 w-5" />
              </span>
              Cycle de vie — la poule et l&apos;œuf
            </CardTitle>
            <Badge tone="action">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans la cour d&apos;une maison à <strong>Kaolack</strong>, la poule couve ses œufs pendant trois
              semaines. Sous elle, la température reste à <strong>37,8 °C</strong>… mais personne ne voit ce qui se
              passe dans la coquille.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> ouvrir l&apos;œuf en 3D et observer, jour après jour, comment l&apos;embryon
              se forme jusqu&apos;à l&apos;<strong>éclosion au 21e jour</strong>, puis comprendre pourquoi le cycle de
              vie est <strong>circulaire</strong>.
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
              <Heart className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="action">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            L&apos;incubation dure <strong>21 jours</strong>. Avant d&apos;observer : selon toi, au bout de combien de
            temps le <strong>cœur</strong> du futur poussin commence-t-il à battre ?
          </p>
          <QcmStep
            label="Le cœur commence à battre…"
            tone="action"
            options={[
              { key: 'j3', label: 'Dès le 3e jour' },
              { key: 'j10', label: 'Vers le 10e jour, au milieu' },
              { key: 'j20', label: 'Le 20e jour, juste avant de sortir' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Ouvrir l&apos;œuf <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-emerald-700" /> Étape 2 — Observe l&apos;incubation
            </CardTitle>
            <Badge tone="action">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais glisser le curseur du <strong>jour 0 au jour 21</strong>. Regarde le jaune diminuer, les vaisseaux
            rouges apparaître, puis l&apos;embryon grandir. Tourne l&apos;œuf avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <IncubationScene day={day} sizeMm={sizeMm} stage={stage.title} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="jour">Jour d&apos;incubation</Label>
              <span className="font-mono text-emerald-700">
                j{day} · {stage.title}
              </span>
            </div>
            <input
              id="jour"
              type="range"
              min={0}
              max={21}
              step={1}
              value={day}
              onChange={(e) => changeDay(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>

          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>Jour {day} :</strong> {stage.obs}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            {STAGES.map((s) => (
              <Badge key={s.key} tone={seen.has(s.key) ? 'action' : 'neutral'} size="sm">
                {seen.has(s.key) ? '✓ ' : ''}
                {s.title}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={() => changeDay(0)}>
              <RefreshCcw className="h-3.5 w-3.5" /> Revenir au jour 0
            </Button>
            <Button variant="gradient" disabled={seen.size < STAGES.length} onClick={() => setStep('mesures')}>
              {seen.size < STAGES.length
                ? `Observe encore ${STAGES.length - seen.size} stade(s)`
                : 'Voir mon journal'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ton journal d&apos;incubation</CardTitle>
            <Badge tone="action">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici ce que tu as observé dans la coquille, puis ce qui se passe <strong>après</strong> l&apos;éclosion.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Jour</th>
                  <th className="px-3 py-2 text-left">Embryon</th>
                  <th className="px-3 py-2 text-left">Ce que tu observes</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map((s) => (
                  <tr key={s.key} className="border-t border-night-100">
                    <td className="px-3 py-2 font-mono">j{s.to}</td>
                    <td className="px-3 py-2 font-mono">{embryoMm(s.to).toFixed(0)} mm</td>
                    <td className="px-3 py-2">{s.obs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-2 mt-4 text-sm font-medium text-ink">Et après l&apos;éclosion ?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {APRES_ECLOSION.map((r) => (
              <div key={r.age} className="rounded-xl bg-emerald-50/60 p-3 text-sm ring-1 ring-emerald-100">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{r.age}</div>
                <div className="text-ink/80">{r.etape}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir l&apos;œuf
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
            <Badge tone="action">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Pendant l'incubation, à quoi sert le jaune de l'œuf ?"
              tone="action"
              hint="Souviens-toi : le jaune devient de plus en plus petit."
              options={[
                { key: 'reserve', label: "C'est la réserve de nourriture de l'embryon." },
                { key: 'devient', label: 'Le jaune se transforme lui-même en poussin.' },
                { key: 'protege', label: "Il protège l'œuf contre les chocs." },
              ]}
              value={qJaune}
              onChange={setQJaune}
            />
            <QcmStep
              label="Combien de jours dure l'incubation d'un œuf de poule ?"
              tone="action"
              options={[
                { key: '7', label: '7 jours' },
                { key: '21', label: '21 jours' },
                { key: '60', label: '60 jours' },
              ]}
              value={qDuree}
              onChange={setQDuree}
            />
            <QcmStep
              label="Le cycle de vie de la poule est…"
              tone="action"
              options={[
                { key: 'circulaire', label: 'Circulaire : la poule adulte pond un œuf et tout recommence.' },
                { key: 'lineaire', label: "Linéaire : il s'arrête à la poule adulte." },
                { key: 'aleatoire', label: 'Aléatoire : il change selon les jours.' },
              ]}
              value={qCycle}
              onChange={setQCycle}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qJaune || !qDuree || !qCycle || busy} onClick={handleValidate}>
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
              Dans l&apos;œuf couvé, le <strong>cœur bat dès le 3e jour</strong>. Le <strong>jaune</strong> n&apos;est
              pas le poussin : c&apos;est sa <strong>réserve de nourriture</strong>. L&apos;éclosion a lieu au{' '}
              <strong>21e jour</strong>.
            </p>
            <p>
              Ensuite : <strong>poussin → poulette → poule adulte</strong> vers 5 mois, qui pond un nouvel œuf. Le cycle
              de vie est <strong>circulaire</strong> : naître, grandir, se reproduire — c&apos;est ce qui permet à
              l&apos;espèce de se perpétuer.
            </p>
            <p className="text-sm text-ink/60">
              Score : exploration des 6 stades ({Math.min(30, seen.size * 6)}/30) + hypothèse ({hypo === 'j3' ? 10 : 0}
              /10) + QCM ({score - Math.min(30, seen.size * 6) - (hypo === 'j3' ? 10 : 0)}/60).
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
