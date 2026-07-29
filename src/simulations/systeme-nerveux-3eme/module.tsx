'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, Brain, CheckCircle2, Gauge, Timer, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Le neurone et l'arc réflexe (SVT, 3ème).
 *
 * Flow Lab Premium : intro → hypothèse → manipulation 3D (neurone / arc
 * réflexe, fibre nue ou myélinisée) → mesures → QCM → bilan.
 * Science juste : v = 6·d pour une fibre myélinisée (d en µm, jusqu'à
 * ≈ 100 m/s), v = 1,2·√d pour une fibre nue (≈ 1 à 5 m/s) ; le temps de
 * réaction volontaire vaut environ 200 ms. Contexte : la marmite brûlante
 * du thiéboudieune et le freinage sur la route de Rufisque.
 */

const NeuroneScene = dynamic(() => import('./neurone-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type View = 'neurone' | 'arc';
type Fibre = 'myeline' | 'nue';
type HypoRep = '1' | '20' | '100' | null;

const SYNAPSE_MS = 2; // 2 synapses × ≈ 1 ms de délai chacune
const MUSCLE_MS = 30; // latence de contraction du muscle
const CERVEAU_MS = 150; // traitement volontaire par le cerveau
const CAR_KMH = 60; // vitesse du car rapide sur la route de Rufisque

const INTRO =
  "Tu soulèves le couvercle d'une marmite de thiéboudieune posée sur le feu : ta main se retire toute seule, " +
  "avant même que tu aies eu le temps d'y penser. C'est un réflexe. Le message nerveux a filé le long de tes " +
  "neurones à plusieurs dizaines de mètres par seconde. Aujourd'hui tu vas observer un neurone en 3D, mesurer " +
  "la vitesse de conduction du message et comprendre pourquoi la gaine de myéline change tout.";

const CONCLUSION =
  "Le neurone reçoit les messages par ses dendrites et les conduit le long de son axone jusqu'à la synapse, " +
  "où des neurotransmetteurs font passer l'information au neurone suivant. Sur une fibre nue, le message rampe " +
  "à environ 1 mètre par seconde. Sur une fibre entourée de myéline, il saute d'un nœud de Ranvier à l'autre et " +
  "atteint 100 mètres par seconde. Voilà pourquoi ta main quitte la marmite en moins de 60 millisecondes, alors " +
  "qu'un freinage volontaire demande environ 200 millisecondes, le temps que le cerveau décide.";

/** Vitesse de conduction en m/s selon le diamètre d (µm) et la myélinisation. */
function conduction(diametre: number, myelin: boolean) {
  return myelin ? 6 * diametre : 1.2 * Math.sqrt(diametre);
}

/** Temps du réflexe (ms) : trajet nerveux + délais synaptiques + contraction. */
function reflexe(longueur: number, vitesse: number) {
  return (longueur / vitesse) * 1000 + SYNAPSE_MS + MUSCLE_MS;
}

export function SystemeNerveux3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [view, setView] = useState<View>('neurone');
  const [myelin, setMyelin] = useState(true);
  const [diametre, setDiametre] = useState(12); // µm
  const [longueur, setLongueur] = useState(1.4); // m (main → moelle → muscle)

  const [viewsVues, setViewsVues] = useState<Set<View>>(new Set<View>(['neurone']));
  const [fibresVues, setFibresVues] = useState<Set<Fibre>>(new Set<Fibre>(['myeline']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qMyeline, setQMyeline] = useState<string | null>(null);
  const [qSynapse, setQSynapse] = useState<string | null>(null);
  const [qTrajet, setQTrajet] = useState<string | null>(null);

  const vitesse = useMemo(() => conduction(diametre, myelin), [diametre, myelin]);
  const vMyeline = useMemo(() => conduction(diametre, true), [diametre]);
  const vNue = useMemo(() => conduction(diametre, false), [diametre]);

  const tReflexe = useMemo(() => reflexe(longueur, vitesse), [longueur, vitesse]);
  const tVolontaire = tReflexe + CERVEAU_MS;
  const distanceCar = ((CAR_KMH / 3.6) * tVolontaire) / 1000; // m parcourus avant de freiner

  const exploreOk = viewsVues.size === 2 && fibresVues.size === 2;

  function choisirVue(v: View) {
    setView(v);
    setViewsVues((prev) => new Set(prev).add(v));
  }

  function choisirFibre(m: boolean) {
    setMyelin(m);
    setFibresVues((prev) => new Set(prev).add(m ? 'myeline' : 'nue'));
  }

  const score = useMemo(() => {
    let s = 0;
    s += viewsVues.size * 8; // explorer les deux vues 3D → 16
    s += fibresVues.size * 7; // comparer fibre nue / myélinisée → 14
    if (hypo === '100') s += 10; // hypothèse juste
    if (qMyeline === 'saut') s += 20;
    if (qSynapse === 'chimique') s += 20;
    if (qTrajet === 'moelle') s += 20;
    return Math.min(100, Math.round(s));
  }, [viewsVues, fibresVues, hypo, qMyeline, qSynapse, qTrajet]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'systeme-nerveux-3eme',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          reglages: { diametreUm: diametre, longueurM: longueur, myelin },
          mesures: {
            vitesseMyelineMs: Number(vMyeline.toFixed(1)),
            vitesseNueMs: Number(vNue.toFixed(2)),
            reflexeMs: Number(tReflexe.toFixed(0)),
            volontaireMs: Number(tVolontaire.toFixed(0)),
            distanceCarM: Number(distanceCar.toFixed(1)),
          },
          exploration: { vues: Array.from(viewsVues), fibres: Array.from(fibresVues) },
          qcm: { qMyeline, qSynapse, qTrajet },
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
                <Brain className="h-5 w-5" />
              </span>
              La marmite brûlante et le message nerveux
            </CardTitle>
            <Badge tone="svt">SVT · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Tu soulèves le couvercle d&apos;une <strong>marmite de thiéboudieune</strong> encore sur le feu : ta main
              se retire <em>toute seule</em>, avant même que tu aies eu le temps d&apos;y penser. Ce n&apos;est pas de
              la magie : un <strong>message nerveux</strong> a voyagé dans tes neurones.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> observer un neurone en 3D (corps cellulaire, dendrites, axone, gaine de
              myéline, synapse), mesurer la <strong>vitesse de conduction</strong> en m/s et calculer le
              <strong> temps de réaction</strong> en ms.
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
              <Zap className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : à ton avis, à quelle vitesse le message nerveux file-t-il dans un nerf du bras ?
          </p>
          <QcmStep
            label="Mon hypothèse : le message nerveux le plus rapide va à environ…"
            tone="action"
            hint="Repère : un piéton marche à 1 m/s, un car rapide roule à 17 m/s."
            options={[
              { key: '1', label: '1 m/s — comme un piéton qui marche' },
              { key: '20', label: '20 m/s — comme un car rapide' },
              { key: '100', label: '100 m/s — plus vite que tous les véhicules de la route' },
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
              <Gauge className="h-5 w-5 text-emerald-700" /> Étape 2 — Manipule le neurone
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Regarde <strong>les deux vues</strong> et teste <strong>les deux types de fibres</strong>. Tourne la scène
            avec ta souris ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant={view === 'neurone' ? 'gradient' : 'outline'} size="sm" onClick={() => choisirVue('neurone')}>
              Vue neurone
            </Button>
            <Button variant={view === 'arc' ? 'gradient' : 'outline'} size="sm" onClick={() => choisirVue('arc')}>
              Vue arc réflexe
            </Button>
            <span className="mx-1 hidden w-px bg-night-100 sm:block" />
            <Button variant={myelin ? 'success' : 'soft'} size="sm" onClick={() => choisirFibre(true)}>
              Fibre myélinisée
            </Button>
            <Button variant={!myelin ? 'success' : 'soft'} size="sm" onClick={() => choisirFibre(false)}>
              Fibre nue
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <NeuroneScene view={view} myelin={myelin} speed={vitesse} reflexMs={tReflexe} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="d">Diamètre de la fibre d</Label>
                <span className="font-mono text-emerald-700">{diametre} µm</span>
              </div>
              <input
                id="d"
                type="range"
                min={2}
                max={16}
                step={1}
                value={diametre}
                onChange={(e) => setDiametre(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="l">Trajet du message L</Label>
                <span className="font-mono text-emerald-700">{longueur.toFixed(1)} m</span>
              </div>
              <input
                id="l"
                type="range"
                min={0.8}
                max={2}
                step={0.1}
                value={longueur}
                onChange={(e) => setLongueur(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Vitesse v" value={`${vitesse.toFixed(1)} m/s`} />
            <Stat label="Trajet nerveux" value={`${((longueur / vitesse) * 1000).toFixed(0)} ms`} />
            <Stat label="Réflexe total" value={`${tReflexe.toFixed(0)} ms`} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-ink/50">
              {exploreOk ? 'Bien joué : tu as tout exploré.' : 'Il te reste une vue ou une fibre à tester.'}
            </p>
            <Button variant="gradient" disabled={!exploreOk} onClick={() => setStep('mesures')}>
              Voir mes mesures <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour une fibre de <strong>{diametre} µm</strong> et un trajet de <strong>{longueur.toFixed(1)} m</strong>{' '}
            (main → moelle épinière → muscle) :
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-4 py-2 text-left">Type de fibre</th>
                  <th className="px-4 py-2 text-left">Vitesse v</th>
                  <th className="px-4 py-2 text-left">Trajet L/v</th>
                  <th className="px-4 py-2 text-left">Réflexe total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100 bg-emerald-50/60 font-semibold">
                  <td className="px-4 py-2">Myélinisée 🏆</td>
                  <td className="px-4 py-2">{vMyeline.toFixed(0)} m/s</td>
                  <td className="px-4 py-2">{((longueur / vMyeline) * 1000).toFixed(0)} ms</td>
                  <td className="px-4 py-2">{reflexe(longueur, vMyeline).toFixed(0)} ms</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Nue (sans myéline)</td>
                  <td className="px-4 py-2">{vNue.toFixed(1)} m/s</td>
                  <td className="px-4 py-2">{((longueur / vNue) * 1000).toFixed(0)} ms</td>
                  <td className="px-4 py-2">{reflexe(longueur, vNue).toFixed(0)} ms</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Stat label="Réflexe (moelle)" value={`${reflexe(longueur, vMyeline).toFixed(0)} ms`} />
            <Stat label="Réaction volontaire" value={`${(reflexe(longueur, vMyeline) + CERVEAU_MS).toFixed(0)} ms`} />
            <Stat
              label={`Route de Rufisque (${CAR_KMH} km/h)`}
              value={`${(((CAR_KMH / 3.6) * (reflexe(longueur, vMyeline) + CERVEAU_MS)) / 1000).toFixed(1)} m`}
            />
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <Timer className="mr-1 inline h-4 w-4" />
            Le réflexe se joue dans la <strong>moelle épinière</strong> : il est très court. Un freinage{' '}
            <strong>volontaire</strong> passe par le cerveau et coûte environ {CERVEAU_MS} ms de plus — c&apos;est la
            distance que le car rapide parcourt avant même que ton pied touche la pédale.
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
            <Badge tone="svt">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="À quoi sert la gaine de myéline autour de l'axone ?"
              tone="action"
              options={[
                { key: 'saut', label: "Elle fait sauter le message d'un nœud de Ranvier au suivant : la conduction est beaucoup plus rapide." },
                { key: 'nourrit', label: "Elle nourrit le neurone en sucre et en dioxygène." },
                { key: 'fabrique', label: "Elle fabrique le message nerveux à la place du corps cellulaire." },
              ]}
              value={qMyeline}
              onChange={setQMyeline}
            />
            <QcmStep
              label="Au niveau de la synapse, comment le message passe-t-il d'un neurone au suivant ?"
              tone="action"
              options={[
                { key: 'chimique', label: "Grâce à des neurotransmetteurs, molécules libérées dans la fente synaptique." },
                { key: 'soude', label: "Les deux neurones sont soudés : le message passe directement." },
                { key: 'sang', label: "Le sang transporte le message d'un neurone à l'autre." },
              ]}
              value={qSynapse}
              onChange={setQSynapse}
            />
            <QcmStep
              label="Quand ta main se retire de la marmite brûlante, quel est le trajet du message ?"
              tone="action"
              options={[
                { key: 'moelle', label: "Récepteur de la peau → nerf sensitif → moelle épinière → nerf moteur → muscle." },
                { key: 'cerveau', label: "Récepteur → cerveau → nerf moteur → muscle : le cerveau commande le retrait." },
                { key: 'muscle', label: "Le muscle réagit tout seul, sans message nerveux." },
              ]}
              value={qTrajet}
              onChange={setQTrajet}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qMyeline || !qSynapse || !qTrajet || busy}
              onClick={handleValidate}
            >
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
              Le neurone reçoit par ses <strong>dendrites</strong>, conduit le long de son <strong>axone</strong> et
              transmet à la <strong>synapse</strong> grâce à des <strong>neurotransmetteurs</strong>. La{' '}
              <strong>gaine de myéline</strong> fait sauter le message de nœud en nœud : on passe d&apos;environ
              1 m/s (fibre nue) à près de 100 m/s (fibre myélinisée).
            </p>
            <p>
              Dans l&apos;<strong>arc réflexe</strong>, la <strong>moelle épinière</strong> commande le retrait en
              moins de 60 ms, sans attendre le cerveau. Une réaction <strong>volontaire</strong>, elle, demande
              environ <strong>200 ms</strong> : sur la route de Rufisque, à {CAR_KMH} km/h, cela fait déjà{' '}
              {(((CAR_KMH / 3.6) * 200) / 1000).toFixed(1)} m parcourus avant de freiner.
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
