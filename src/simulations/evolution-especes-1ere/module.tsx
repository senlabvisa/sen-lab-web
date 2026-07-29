'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, BarChart3, Bug, CheckCircle2, GitBranch, LineChart, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { EvolView } from './scene';

/**
 * TP — Évolution des espèces : la sélection naturelle, mesurée (SVT, Première).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (histogramme des
 * génotypes, courbes de fréquences alléliques, arbre généalogique) →
 * mesures (tableau de suivi sur 20 générations) → QCM → bilan.
 *
 * Choix pédagogique : on ne montre PAS des animaux qui « se transforment ».
 * On montre les DONNÉES d'un laboratoire d'entomologie : la fréquence de
 * l'allèle kdr de résistance chez Anopheles gambiae, vecteur du paludisme.
 * La mutation existe AVANT l'insecticide ; l'insecticide ne fait que trier.
 *
 * Modèle : population diploïde, panmixie, allèle R (résistance) dominant.
 * Génotypes en proportions de Hardy-Weinberg, puis sélection contre SS avec
 * un coefficient s. Récurrence exacte : p' = p / (1 − s·q²).
 */

const EvolScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement des données du laboratoire…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'avant' | 'cause' | 'volonte' | null;

const N_MAX = 20; // générations suivies
const P0 = 0.02; // fréquence initiale de l'allèle kdr (2 %) — mutation rare préexistante

/** Fréquence de l'allèle R, génération par génération, sous pression s. */
function simulate(s: number, gens: number): number[] {
  const out = [P0];
  for (let i = 0; i < gens; i++) {
    const p = out[i];
    const q = 1 - p;
    const wBar = 1 - s * q * q; // fitness moyenne de la population
    out.push(Math.min(1, p / wBar));
  }
  return out;
}

const VIEWS: { key: EvolView; label: string; icon: typeof BarChart3 }[] = [
  { key: 'population', label: 'Population', icon: BarChart3 },
  { key: 'frequences', label: 'Fréquences', icon: LineChart },
  { key: 'arbre', label: 'Généalogie', icon: GitBranch },
];

const INTRO =
  "Dans la vallée du fleuve Sénégal, à Richard-Toll, le paludisme est transmis par le moustique Anopheles gambiae. " +
  "Depuis les campagnes de moustiquaires imprégnées et les épandages d'insecticides, les entomologistes testent chaque année " +
  "des moustiques capturés : de plus en plus survivent au traitement. Attention à l'erreur classique : l'insecticide ne fabrique pas " +
  "la résistance. Un allèle de résistance, appelé kdr, existait déjà dans la population, par mutation au hasard, avant le premier épandage. " +
  "L'insecticide ne fait que trier : les moustiques qui le portent laissent plus de descendants. Aujourd'hui tu vas mesurer ce tri, " +
  "génération après génération.";

const CONCLUSION =
  "Bravo ! Tu as mesuré la sélection naturelle. La mutation kdr apparaît au hasard et avant le traitement : elle n'est pas causée par lui. " +
  "L'insecticide agit ensuite comme une pression de sélection : les moustiques résistants survivent et se reproduisent davantage. " +
  "C'est cette reproduction différentielle qui fait monter la fréquence de l'allèle de résistance de génération en génération. " +
  "Plus la pression est forte, plus la dérive est rapide. Et comme l'allèle sensible reste caché chez les hétérozygotes, " +
  "il ne disparaît jamais complètement. Voilà pourquoi il faut alterner les insecticides.";

export function EvolutionEspeces1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [view, setView] = useState<EvolView>('population');
  const [pression, setPression] = useState(0.6);
  const [generation, setGeneration] = useState(6);

  const [pressuresTried, setPressuresTried] = useState<Set<number>>(new Set([0.6]));
  const [viewsSeen, setViewsSeen] = useState<Set<EvolView>>(new Set<EvolView>(['population']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qTri, setQTri] = useState<string | null>(null);
  const [qNulle, setQNulle] = useState<string | null>(null);
  const [qHetero, setQHetero] = useState<string | null>(null);

  const series = useMemo(() => simulate(pression, N_MAX), [pression]);
  const serieNulle = useMemo(() => simulate(0, N_MAX), []);

  const p = series[generation];
  const q = 1 - p;
  const phenoR = 1 - q * q; // fréquence du phénotype résistant (R dominant)
  const gDemi = useMemo(() => {
    const i = series.findIndex((v) => v >= 0.5);
    return i < 0 ? null : i;
  }, [series]);

  function pickView(v: EvolView) {
    setView(v);
    setViewsSeen((prev) => new Set(prev).add(v));
  }

  function pickPression(raw: number) {
    const v = Math.round(raw * 10) / 10;
    setPression(v);
    setPressuresTried((prev) => new Set(prev).add(v));
  }

  const explored = pressuresTried.size >= 3 && pressuresTried.has(0) && viewsSeen.size >= 3;

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, pressuresTried.size * 5); // pressions testées
    s += Math.min(15, viewsSeen.size * 5); // graphiques consultés
    if (hypo === 'avant') s += 15;
    if (qTri === 'tri') s += 20;
    if (qNulle === 'stable') s += 15;
    if (qHetero === 'heterozygotes') s += 15;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [pressuresTried, viewsSeen, hypo, qTri, qNulle, qHetero]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'evolution-especes-1ere',
        version: '2.0',
        steps: {
          p0: P0,
          pressuresTried: Array.from(pressuresTried).sort((a, b) => a - b),
          viewsSeen: Array.from(viewsSeen),
          pressionFinale: pression,
          generationFinale: generation,
          pFinal: Number(p.toFixed(4)),
          generationSeuil50: gDemi,
          hypothesis: hypo,
          qcm: { qTri, qNulle, qHetero },
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
                <Bug className="h-5 w-5" />
              </span>
              Le moustique qui résiste
            </CardTitle>
            <Badge tone="svt">SVT · Première</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À <strong>Richard-Toll</strong>, dans la vallée du fleuve Sénégal, le paludisme est transmis par le moustique{' '}
              <em>Anopheles gambiae</em>. Après plusieurs années d&apos;épandages, les entomologistes constatent que de plus en
              plus de moustiques <strong>survivent à l&apos;insecticide</strong>.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> mesurer, sur 20 générations, comment la fréquence de l&apos;allèle de résistance{' '}
              <strong>kdr</strong> évolue selon la <strong>pression de sélection</strong>. Au départ, cet allèle est rare :{' '}
              <strong>p(R) = 2 %</strong>.
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
              <Sparkles className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : d&apos;où vient, selon toi, l&apos;allèle de résistance <strong>kdr</strong> présent chez ces
            moustiques ?
          </p>
          <QcmStep
            label="Mon hypothèse : l'allèle de résistance…"
            tone="action"
            options={[
              { key: 'avant', label: 'Existait déjà, rare, par mutation au hasard, AVANT le premier épandage' },
              { key: 'cause', label: 'A été fabriqué par l’insecticide chez les moustiques exposés' },
              { key: 'volonte', label: 'Est apparu parce que les moustiques avaient besoin de se défendre' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Ouvrir les données du labo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-700" /> Étape 2 — Règle la pression de sélection
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un <strong>graphique</strong>, fais varier la <strong>pression de sélection</strong> et avance les{' '}
            <strong>générations</strong>. Tourne la scène avec ta souris ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {VIEWS.map((v) => {
              const Icon = v.icon;
              return (
                <Button key={v.key} variant={view === v.key ? 'gradient' : 'outline'} size="sm" onClick={() => pickView(v.key)}>
                  <Icon className="h-4 w-4" /> {v.label} {viewsSeen.has(v.key) && view !== v.key ? '✓' : ''}
                </Button>
              );
            })}
            <Badge tone={viewsSeen.size >= 3 ? 'action' : 'neutral'} size="sm">
              {viewsSeen.size}/3 graphiques
            </Badge>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <EvolScene view={view} pR={series} generation={generation} pression={pression} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="s">Pression de sélection s</Label>
                <span className="font-mono text-emerald-700">{pression.toFixed(1)}</span>
              </div>
              <input
                id="s"
                type="range"
                min={0}
                max={0.9}
                step={0.1}
                value={pression}
                onChange={(e) => pickPression(Number(e.target.value))}
                className="slider-lab w-full"
              />
              <p className="mt-1 text-[11px] text-ink/50">
                {Math.round(pression * 100)} % des moustiques sensibles (SS) sont éliminés à chaque génération.
              </p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="g">Génération</Label>
                <span className="font-mono text-emerald-700">G{generation}</span>
              </div>
              <input
                id="g"
                type="range"
                min={0}
                max={N_MAX}
                value={generation}
                onChange={(e) => setGeneration(Number(e.target.value))}
                className="slider-lab w-full"
              />
              <p className="mt-1 text-[11px] text-ink/50">Une génération d&apos;Anopheles dure environ 3 semaines.</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="p(R) allèle" value={`${(p * 100).toFixed(1)} %`} />
            <Stat label="Phénotype résistant" value={`${(phenoR * 100).toFixed(1)} %`} />
            <Stat label="Pressions testées" value={`${pressuresTried.size}`} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">Teste au moins 3 pressions, dont s = 0.</span>
            <Button variant="gradient" disabled={!explored} onClick={() => setStep('mesures')}>
              {explored ? 'Voir mon tableau de suivi' : 'Explore encore un peu'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-emerald-700" /> Étape 3 — Ton tableau de suivi
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Relevés du laboratoire pour une pression <strong>s = {pression.toFixed(1)}</strong>, comparés à une zone{' '}
            <strong>sans traitement</strong> (s = 0).
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Génération</th>
                  <th className="px-3 py-2 text-left">p(R) traité</th>
                  <th className="px-3 py-2 text-left">Résistants</th>
                  <th className="px-3 py-2 text-left">p(R) sans traitement</th>
                </tr>
              </thead>
              <tbody>
                {[0, 5, 10, 15, 20].map((gi) => {
                  const pi = series[gi];
                  const ri = 1 - (1 - pi) * (1 - pi);
                  return (
                    <tr key={gi} className="border-t border-emerald-100">
                      <td className="px-3 py-2 font-semibold">G{gi}</td>
                      <td className="px-3 py-2 font-mono">{(pi * 100).toFixed(1)} %</td>
                      <td className="px-3 py-2 font-mono">{(ri * 100).toFixed(1)} %</td>
                      <td className="px-3 py-2 font-mono text-ink/50">{(serieNulle[gi] * 100).toFixed(1)} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            {pression === 0 ? (
              <>
                <strong>Sans pression de sélection</strong>, la fréquence de l&apos;allèle kdr ne bouge pas : elle reste à 2 %.
                L&apos;allèle est bien là, mais rien ne le favorise.
              </>
            ) : gDemi !== null ? (
              <>
                Avec s = {pression.toFixed(1)}, l&apos;allèle R dépasse <strong>50 %</strong> dès la{' '}
                <strong>génération {gDemi}</strong>, soit environ {Math.round((gDemi * 3) / 4.3)} mois de terrain. Sans
                traitement, il serait resté à 2 %.
              </>
            ) : (
              <>
                Avec s = {pression.toFixed(1)}, l&apos;allèle R monte mais reste sous 50 % après {N_MAX} générations : la
                pression est trop faible pour trier vite.
              </>
            )}
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
              label="Que fait exactement l'insecticide sur la population de moustiques ?"
              tone="action"
              hint="Regarde la vue « Généalogie » : à quel moment l'étoile de la mutation apparaît-elle ?"
              options={[
                { key: 'tri', label: 'Il ne crée rien : il trie. Les porteurs de R survivent et laissent plus de descendants' },
                { key: 'mutation', label: 'Il provoque la mutation kdr chez les moustiques qu’il touche' },
                { key: 'immunise', label: 'Il rend chaque moustique progressivement immunisé au cours de sa vie' },
              ]}
              value={qTri}
              onChange={setQTri}
            />
            <QcmStep
              label="Avec une pression nulle (s = 0), que devient la fréquence de R après 20 générations ?"
              tone="action"
              options={[
                { key: 'stable', label: 'Elle reste à 2 % : l’allèle est là mais rien ne le favorise' },
                { key: 'monte', label: 'Elle monte quand même, car la mutation continue de se produire' },
                { key: 'disparait', label: 'Elle tombe à 0 % : un allèle inutile disparaît toujours' },
              ]}
              value={qNulle}
              onChange={setQNulle}
            />
            <QcmStep
              label="Quand p(R) s'approche de 100 %, la courbe ralentit. Pourquoi ?"
              tone="action"
              hint="L'allèle R est dominant : un moustique RS survit à l'insecticide alors qu'il porte encore un allèle S."
              options={[
                { key: 'heterozygotes', label: 'Les derniers allèles S sont abrités chez les hétérozygotes RS, qui survivent' },
                { key: 'insecticide', label: 'L’insecticide devient moins efficace en vieillissant dans les bidons' },
                { key: 'hasard', label: 'Le hasard remet des allèles S dans la population à chaque génération' },
              ]}
              value={qHetero}
              onChange={setQHetero}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes mesures
            </Button>
            <Button variant="success" disabled={!qTri || !qNulle || !qHetero || busy} onClick={handleValidate}>
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
              La <strong>mutation kdr précède</strong> l&apos;insecticide : elle apparaît au hasard, sans lien avec le besoin du
              moustique. L&apos;insecticide n&apos;est qu&apos;une <strong>pression de sélection</strong> : il provoque une{' '}
              <strong>reproduction différentielle</strong>, et c&apos;est elle qui fait dériver la fréquence allélique.
            </p>
            <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
              <Stat label="Exploration" value={`${Math.min(20, pressuresTried.size * 5)}/20`} />
              <Stat label="Graphiques" value={`${Math.min(15, viewsSeen.size * 5)}/15`} />
              <Stat label="Hypothèse" value={`${hypo === 'avant' ? 15 : 0}/15`} />
              <Stat
                label="QCM"
                value={`${(qTri === 'tri' ? 20 : 0) + (qNulle === 'stable' ? 15 : 0) + (qHetero === 'heterozygotes' ? 15 : 0)}/50`}
              />
            </div>
            <p className="text-sm">
              Bilan de terrain : l&apos;allèle S ne disparaît jamais tout à fait, car il reste <strong>caché chez les
              hétérozygotes RS</strong>. C&apos;est pourquoi les programmes de lutte contre le paludisme{' '}
              <strong>alternent les familles d&apos;insecticides</strong> et associent les moustiquaires imprégnées.
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
