'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, CheckCircle2, Droplets, Moon, RefreshCw, Utensils } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — La régulation de la glycémie (SVT, 1ère).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (faire manger,
 * jeûner, courir le sujet ; basculer sur un pancréas diabétique) → mesures
 * → QCM → bilan.
 *
 * Physiologie réelle : glycémie de consigne ≈ 1 g/L (normale 0,7–1,1 g/L),
 * pic postprandial ≈ 1,5 g/L chez le sujet sain avec retour à la normale en
 * 2 h, insuline hypoglycémiante (stockage en glycogène dans le foie et les
 * muscles), glucagon hyperglycémiant (déstockage hépatique), seuil de
 * diabète à jeun 1,26 g/L, glycosurie au-delà de 1,8 g/L.
 * Contexte : le diabète progresse vite à Dakar, thiéboudiène et sucreries.
 */

const GlycemieScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

// ── Modèle physiologique ────────────────────────────────────────────────
const DT_MIN = 3; // un pas de simulation = 3 minutes
const G_CIBLE = 1.0; // consigne, en g/L
const HIST_MAX = 170; // ≈ 8 h 30 affichées
const BOL_REPAS = 1.3; // glucose apporté par un plat, en équivalent g/L

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Action = 'repos' | 'repas' | 'sport';
type Profil = 'sain' | 'diabete';
type Geste = 'repas' | 'jeune' | 'sport';
type HypoRep = 'oscille' | 'monte' | 'stable' | null;

type Sim = { t: number; g: number; repas: number; glycogene: number; hist: number[] };
type Stat = { max: number; min: number; monte: boolean; retour: boolean };

const SIM0: Sim = { t: 0, g: 1.0, repas: 0, glycogene: 0.55, hist: [1.0, 1.0] };
const STAT0: Stat = { max: 1.0, min: 1.0, monte: false, retour: false };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Sécrétions hormonales normalisées (0–1) pour une glycémie donnée. */
function hormones(g: number, diabete: boolean) {
  return {
    insuline: diabete ? 0 : clamp01((g - G_CIBLE) / 0.6),
    glucagon: clamp01((1.05 - g) / 0.35),
  };
}

/** Un pas de simulation : bilan entrées / sorties de glucose dans le sang. */
function stepSim(s: Sim, action: Action, diabete: boolean): Sim {
  const { insuline, glucagon } = hormones(s.g, diabete);
  const absorption = 0.035 * s.repas; // digestion → sang
  const consoBasale = 0.003 * s.g; // cellules au repos
  const consoSport = action === 'sport' ? 0.0075 * s.g : 0; // muscles à l'effort
  const stockage = 0.03 * insuline * s.g; // insuline → glycogène
  const hepatique = 0.003 + 0.011 * glucagon; // foie → sang (glucagon)
  const renal = s.g > 1.8 ? 0.01 * (s.g - 1.8) : 0; // glycosurie
  const dg = absorption + hepatique - consoBasale - consoSport - stockage - renal;
  const g = Math.max(0.4, Math.min(3.2, s.g + dg * DT_MIN));
  return {
    t: s.t + DT_MIN,
    g,
    repas: Math.max(0, s.repas * (1 - 0.035 * DT_MIN)),
    glycogene: clamp01(s.glycogene + (stockage * 0.15 - 0.011 * glucagon * 0.6) * DT_MIN),
    hist: [...s.hist, g].slice(-HIST_MAX),
  };
}

function formatT(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

const INTRO =
  "À Dakar, les journées de dépistage du diabète attirent de plus en plus de monde : une simple goutte de sang au bout du doigt suffit pour lire la glycémie. " +
  "Après une grande assiette de thiéboudiène ou un bissap bien sucré, le glucose passe du tube digestif vers ton sang. " +
  "Pourtant, chez une personne en bonne santé, la glycémie revient toujours autour de 1 gramme par litre, jour et nuit. " +
  "Aujourd'hui tu vas faire manger, jeûner et courir un sujet, suivre sa glycémie en direct, et découvrir les deux hormones du pancréas qui tiennent la barre.";

const CONCLUSION =
  "Bravo ! La glycémie est réglée autour de 1 gramme par litre par le pancréas. " +
  "Quand elle monte après un repas, les cellules bêta libèrent l'insuline : le foie et les muscles stockent le glucose sous forme de glycogène, et la glycémie redescend. " +
  "Quand elle baisse, pendant un jeûne ou un effort, les cellules alpha libèrent le glucagon : le foie déstocke son glycogène et renvoie du glucose dans le sang. " +
  "Chaque écart déclenche la réponse qui l'annule : c'est un rétrocontrôle négatif. " +
  "Dans le diabète de type 1, les cellules bêta ne fabriquent plus d'insuline : après le repas la glycémie monte et ne redescend pas. " +
  "On parle de diabète quand la glycémie à jeun dépasse 1,26 gramme par litre.";

export function Hormones1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [sim, setSim] = useState<Sim>(SIM0);
  const [action, setAction] = useState<Action>('repos');
  const [profil, setProfil] = useState<Profil>('sain');
  const [gestes, setGestes] = useState<Set<Geste>>(new Set<Geste>());
  const [vus, setVus] = useState<Set<Profil>>(new Set<Profil>(['sain']));
  const [stats, setStats] = useState<Record<Profil, Stat>>({ sain: STAT0, diabete: STAT0 });

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qRepas, setQRepas] = useState<string | null>(null);
  const [qJeune, setQJeune] = useState<string | null>(null);
  const [qBoucle, setQBoucle] = useState<string | null>(null);

  const diabete = profil === 'diabete';
  const { insuline, glucagon } = hormones(sim.g, diabete);
  const manipOk = gestes.size >= 3 && vus.has('diabete');

  // Horloge de la simulation : elle ne tourne que pendant la manipulation.
  useEffect(() => {
    if (step !== 'manip') return;
    const id = setInterval(() => setSim((s) => stepSim(s, action, diabete)), 150);
    return () => clearInterval(id);
  }, [step, action, diabete]);

  // Relevés automatiques (max, min, retour à la normale) par profil.
  useEffect(() => {
    if (step !== 'manip') return;
    setStats((prev) => {
      const cur = prev[profil];
      const monte = cur.monte || sim.g > 1.4;
      const next: Stat = {
        max: Math.max(cur.max, sim.g),
        min: Math.min(cur.min, sim.g),
        monte,
        retour: cur.retour || (monte && sim.g <= 1.15),
      };
      if (next.max === cur.max && next.min === cur.min && next.monte === cur.monte && next.retour === cur.retour) {
        return prev;
      }
      return { ...prev, [profil]: next };
    });
  }, [sim.g, profil, step]);

  function manger() {
    setAction('repos');
    setSim((s) => ({ ...s, repas: s.repas + BOL_REPAS }));
    setGestes((prev) => new Set(prev).add('repas'));
  }

  function jeuner() {
    setAction('repos');
    setSim((s) => ({ ...s, repas: 0 }));
    setGestes((prev) => new Set(prev).add('jeune'));
  }

  function courir() {
    setAction('sport');
    setGestes((prev) => new Set(prev).add('sport'));
  }

  function choisirProfil(p: Profil) {
    setProfil(p);
    setAction('repos');
    setSim(SIM0);
    setVus((prev) => new Set(prev).add(p));
  }

  const etat =
    action === 'sport'
      ? 'Effort physique en cours'
      : sim.repas > 0.05
        ? 'Digestion du repas'
        : 'À jeun (repos)';

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(21, gestes.size * 7); // manger / jeûner / courir
    if (vus.has('diabete')) s += 9; // a comparé avec un pancréas diabétique
    if (hypo === 'oscille') s += 10; // hypothèse juste
    if (qRepas === 'insuline') s += 20;
    if (qJeune === 'glucagon') s += 20;
    if (qBoucle === 'negatif') s += 20;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [gestes, vus, hypo, qRepas, qJeune, qBoucle]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'hormones-1ere',
        version: '2.0',
        steps: {
          gestes: Array.from(gestes),
          profilsObserves: Array.from(vus),
          releves: {
            sain: { max: Number(stats.sain.max.toFixed(2)), min: Number(stats.sain.min.toFixed(2)), retourNormale: stats.sain.retour },
            diabete: {
              max: Number(stats.diabete.max.toFixed(2)),
              min: Number(stats.diabete.min.toFixed(2)),
              retourNormale: stats.diabete.retour,
            },
          },
          hypothesis: hypo,
          qcm: { qRepas, qJeune, qBoucle },
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
                <Droplets className="h-5 w-5" />
              </span>
              1 g/L, jour et nuit
            </CardTitle>
            <Badge tone="svt">SVT · Première</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Aux journées de dépistage à <strong>Dakar</strong>, une goutte de sang au bout du doigt suffit pour lire
              la <strong>glycémie</strong>. Après un thiéboudiène bien garni de riz ou un bissap sucré, le glucose passe
              dans le sang… et pourtant la glycémie revient toujours autour de <strong>1 g/L</strong>.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> faire manger, jeûner et courir un sujet, suivre sa glycémie en direct et
              comprendre comment le <strong>pancréas</strong> la ramène vers 1 g/L. Puis observer ce qui change quand le
              pancréas ne fabrique plus d&apos;insuline (diabète).
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
              <Activity className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : une personne en bonne santé avale une grande assiette de thiéboudiène. Que fait sa
            glycémie dans les heures qui suivent ?
          </p>
          <QcmStep
            label="Mon hypothèse : après le repas, la glycémie…"
            tone="action"
            options={[
              { key: 'oscille', label: 'Monte jusque vers 1,5 g/L, puis redescend vers 1 g/L en environ 2 heures.' },
              { key: 'monte', label: 'Monte et reste élevée toute la journée.' },
              { key: 'stable', label: 'Ne bouge pas : le corps empêche le glucose d’entrer dans le sang.' },
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
              <Utensils className="h-5 w-5 text-emerald-700" /> Étape 2 — Fais varier la glycémie
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            La courbe se trace toute seule. Fais manger, jeûner puis courir le sujet, et regarde le pancréas répondre.
            Ensuite, bascule sur un pancréas <strong>diabétique</strong> et recommence. Tourne la scène avec ta souris /
            ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <GlycemieScene
                glycemie={sim.g}
                insuline={insuline}
                glucagon={glucagon}
                glycogene={sim.glycogene}
                historique={sim.hist}
                diabete={diabete}
                etat={etat}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="soft" size="sm" onClick={manger}>
              <Utensils className="h-4 w-4" /> Manger
            </Button>
            <Button variant="soft" size="sm" onClick={jeuner}>
              <Moon className="h-4 w-4" /> Jeûner
            </Button>
            <Button variant="soft" size="sm" onClick={courir}>
              <Activity className="h-4 w-4" /> Courir
            </Button>
            <Button variant="outline" size="sm" onClick={() => choisirProfil(profil)}>
              <RefreshCw className="h-4 w-4" /> Recommencer
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant={diabete ? 'outline' : 'gradient'} size="sm" onClick={() => choisirProfil('sain')}>
              Pancréas normal
            </Button>
            <Button variant={diabete ? 'gradient' : 'outline'} size="sm" onClick={() => choisirProfil('diabete')}>
              Pancréas diabétique (type 1)
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="Glycémie" value={`${sim.g.toFixed(2)} g/L`} />
            <Stat label="Insuline" value={diabete ? 'nulle' : `${Math.round(insuline * 100)} %`} />
            <Stat label="Glucagon" value={`${Math.round(glucagon * 100)} %`} />
            <Stat label="Temps écoulé" value={formatT(sim.t)} />
          </div>

          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900 ring-1 ring-emerald-100">
            {diabete
              ? 'Pancréas diabétique : les cellules β ne sécrètent plus d’insuline. Regarde si la glycémie arrive encore à redescendre sous 1,26 g/L.'
              : insuline > 0.15
                ? 'La glycémie est trop haute : l’insuline part vers le foie et les muscles, qui stockent le glucose en glycogène.'
                : glucagon > 0.15
                  ? 'La glycémie est trop basse : le glucagon part vers le foie, qui déstocke son glycogène et renvoie du glucose dans le sang.'
                  : 'Glycémie dans la zone normale : les deux sécrétions sont au repos.'}
          </p>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="gradient" disabled={!manipOk} onClick={() => setStep('mesures')}>
              {manipOk
                ? 'Voir mes relevés'
                : gestes.size < 3
                  ? `Encore ${3 - gestes.size} geste(s) à tester`
                  : 'Teste aussi le pancréas diabétique'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes relevés</CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici les glycémies extrêmes enregistrées pendant tes essais. Compare les deux pancréas.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Pancréas</th>
                  <th className="px-3 py-2 text-left">Glycémie max</th>
                  <th className="px-3 py-2 text-left">Glycémie min</th>
                  <th className="px-3 py-2 text-left">Retour vers 1 g/L</th>
                </tr>
              </thead>
              <tbody>
                {(['sain', 'diabete'] as Profil[]).map((p) => (
                  <tr key={p} className="border-t border-night-100">
                    <td className="px-3 py-2 font-medium">{p === 'sain' ? 'Normal' : 'Diabétique (type 1)'}</td>
                    <td className="px-3 py-2">{stats[p].max.toFixed(2)} g/L</td>
                    <td className="px-3 py-2">{stats[p].min.toFixed(2)} g/L</td>
                    <td className="px-3 py-2">
                      {stats[p].monte ? (stats[p].retour ? 'Oui ✅' : 'Non ❌') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
            Repère médical : on parle de <strong>diabète</strong> lorsque la glycémie <strong>à jeun</strong> dépasse
            <strong> 1,26 g/L</strong> lors de deux mesures. Au-delà de 1,8 g/L, le rein laisse passer du glucose dans
            les urines — c&apos;est le sucre retrouvé au test de dépistage.
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
              label="Après le thiéboudiène, la glycémie monte à 1,5 g/L. Que fait le pancréas ?"
              tone="action"
              options={[
                { key: 'insuline', label: 'Ses cellules β libèrent l’insuline : le foie et les muscles stockent le glucose en glycogène, la glycémie baisse.' },
                { key: 'glucagon', label: 'Ses cellules α libèrent le glucagon : la glycémie monte encore plus.' },
                { key: 'rien', label: 'Rien : la glycémie redescend toute seule, sans hormone.' },
              ]}
              value={qRepas}
              onChange={setQRepas}
            />
            <QcmStep
              label="Cinq heures plus tard, à jeun, la glycémie descend vers 0,8 g/L. Que se passe-t-il ?"
              tone="action"
              options={[
                { key: 'glucagon', label: 'Le glucagon est libéré : le foie déstocke son glycogène et renvoie du glucose dans le sang.' },
                { key: 'insuline', label: 'L’insuline est libérée : elle fait baisser encore la glycémie.' },
                { key: 'aucune', label: 'Aucune hormone : le foie n’intervient pas dans la glycémie.' },
              ]}
              value={qJeune}
              onChange={setQJeune}
            />
            <QcmStep
              label="La régulation de la glycémie est un rétrocontrôle…"
              tone="action"
              hint="Pense au sens de la correction par rapport à l'écart mesuré."
              options={[
                { key: 'negatif', label: 'Négatif : dès que la glycémie s’écarte de 1 g/L, la réponse hormonale la ramène vers 1 g/L.' },
                { key: 'positif', label: 'Positif : l’écart de départ est amplifié par les hormones.' },
                { key: 'aucun', label: 'Il n’y a pas de contrôle : la glycémie suit seulement les repas.' },
              ]}
              value={qBoucle}
              onChange={setQBoucle}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qRepas || !qJeune || !qBoucle || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La glycémie est maintenue autour de <strong>1 g/L</strong> (normale 0,7 – 1,1 g/L) par le
              <strong> pancréas</strong> : l&apos;<strong>insuline</strong> (cellules β) est
              <strong> hypoglycémiante</strong> — elle fait stocker le glucose en glycogène dans le foie et les muscles ;
              le <strong>glucagon</strong> (cellules α) est <strong>hyperglycémiant</strong> — il fait déstocker le foie.
            </p>
            <p>
              Chaque écart déclenche la réponse qui l&apos;annule : c&apos;est un <strong>rétrocontrôle négatif</strong>.
              Dans le <strong>diabète de type 1</strong>, plus d&apos;insuline : après le repas la glycémie monte et ne
              redescend pas. Diagnostic : glycémie à jeun ≥ 1,26 g/L.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              <strong>Ton score :</strong> {Math.min(21, gestes.size * 7)}/21 pour les gestes testés,{' '}
              {vus.has('diabete') ? 9 : 0}/9 pour la comparaison avec le pancréas diabétique, {hypo === 'oscille' ? 10 : 0}/10
              pour l&apos;hypothèse, {(qRepas === 'insuline' ? 20 : 0) + (qJeune === 'glucagon' ? 20 : 0) + (qBoucle === 'negatif' ? 20 : 0)}/60
              pour le QCM.
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
