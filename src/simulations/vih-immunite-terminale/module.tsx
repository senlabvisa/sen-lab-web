'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, CheckCircle2, Microscope, Pill, TrendingDown } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import {
  ARV_DEBUT_MAX,
  ARV_DEBUT_MIN,
  MOIS_MAX,
  PHASE_LABEL,
  SEUIL_SIDA,
  cd4,
  cd4Naturel,
  formatCharge,
  formatDuree,
  logChargeVirale,
  logChargeViraleNaturelle,
  moisSida,
  phaseDe,
} from './model';

/**
 * TP — VIH et immunité (SVT, Terminale S).
 *
 * Flow Lab Premium : intro → hypothèse → manipulation 3D (structure du virion,
 * cycle infectieux, graphe de l'infection) → mesures (charge virale vs T4,
 * effet des antirétroviraux) → QCM → bilan.
 *
 * Science juste : le VIH infecte les lymphocytes T CD4+ ; la primo-infection
 * s'accompagne d'un pic de charge virale ; suit une longue phase
 * asymptomatique où les T4 déclinent ; le stade SIDA correspond à T4 < 200/mm³
 * avec infections opportunistes. Séropositif ≠ malade du SIDA. Les
 * antirétroviraux ne guérissent pas l'infection (le provirus reste intégré)
 * mais rendent la charge virale indétectable et font remonter les T4.
 *
 * Registre : santé publique, factuel et non stigmatisant. Contexte sénégalais :
 * prévalence faible (~0,3 %), dépistage volontaire, CNLS, ARV gratuits.
 */

const VihScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type View = 'virion' | 'cycle' | 'courbes';
type HypoRep = 'immediat' | 'silencieux' | 'disparait' | null;

const VUES: { key: View; label: string; aide: string }[] = [
  {
    key: 'virion',
    label: '1 · Le virion',
    aide: "Tourne le virus pour repérer l'enveloppe, les spicules gp120, la capside conique et les deux brins d'ARN.",
  },
  {
    key: 'cycle',
    label: '2 · Le cycle infectieux',
    aide: 'Suis les 5 étapes : fixation, entrée, transcription inverse, intégration du provirus, réplication.',
  },
  {
    key: 'courbes',
    label: '3 · Le graphe sur 10 ans',
    aide: "Déplace le curseur du temps et compare la charge virale (rouge) au taux de lymphocytes T4 (vert).",
  },
];

const INTRO =
  "Chaque année, des journées de dépistage volontaire sont organisées au Sénégal dans les postes de santé et les " +
  "établissements scolaires. Le pays affiche une prévalence du VIH parmi les plus faibles d'Afrique de l'Ouest, " +
  "environ zéro virgule trois pour cent, grâce à une politique de prévention engagée très tôt : le Sénégal a été " +
  "l'un des premiers pays africains à organiser l'accès aux antirétroviraux, et le traitement y est gratuit. " +
  "Aujourd'hui tu vas observer la structure du virus, suivre son cycle dans un lymphocyte T quatre, puis lire le " +
  "graphe qui suit pendant dix ans la charge virale et le taux de lymphocytes T quatre. Tu verras enfin ce que " +
  "change un traitement antirétroviral.";

const CONCLUSION =
  "Le VIH est un rétrovirus : son patrimoine génétique est de l'ARN. Sa protéine gp cent vingt se fixe sur le " +
  "récepteur CD quatre des lymphocytes T quatre, les cellules qui commandent la réponse immunitaire. Une fois " +
  "entré, la transcriptase inverse copie l'ARN viral en ADN, qui s'intègre à l'ADN de la cellule : c'est le " +
  "provirus. La cellule fabrique alors de nouveaux virions puis meurt. L'infection se déroule en trois temps. " +
  "La primo-infection : la charge virale atteint un pic en quelques semaines. La phase asymptomatique : elle dure " +
  "souvent huit à dix ans, la personne ne se sent pas malade alors que ses lymphocytes T quatre baissent " +
  "lentement. Le stade SIDA enfin, quand les T quatre passent sous deux cents par millimètre cube et que des " +
  "infections opportunistes apparaissent. Être séropositif n'est donc pas la même chose qu'être malade du SIDA. " +
  "Les antirétroviraux bloquent la multiplication du virus : en quelques mois la charge virale devient " +
  "indétectable et les lymphocytes T quatre remontent. Ils ne suppriment pas le provirus, le traitement se prend " +
  "donc à vie, mais une personne traitée tôt garde une immunité solide, vit en bonne santé, et une charge virale " +
  "durablement indétectable signifie que le virus ne se transmet plus.";

const REPERES = [1, 6, 24, 60, 120]; // mois affichés dans le tableau de mesures

export function VihImmuniteTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [view, setView] = useState<View>('virion');
  const [mois, setMois] = useState(1);
  const [traitement, setTraitement] = useState(false);
  const [debutTraitement, setDebutTraitement] = useState(24);

  const [vuesVues, setVuesVues] = useState<Set<View>>(new Set<View>(['virion']));
  const [regimesVus, setRegimesVus] = useState<Set<string>>(new Set<string>(['sans']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qCycle, setQCycle] = useState<string | null>(null);
  const [qStade, setQStade] = useState<string | null>(null);
  const [qArv, setQArv] = useState<string | null>(null);

  const t4 = useMemo(() => cd4(mois, traitement, debutTraitement), [mois, traitement, debutTraitement]);
  const logCv = useMemo(() => logChargeVirale(mois, traitement, debutTraitement), [mois, traitement, debutTraitement]);
  const phase = useMemo(() => phaseDe(mois, traitement, debutTraitement), [mois, traitement, debutTraitement]);
  const sidaSans = useMemo(() => moisSida(false, 0), []);
  const sidaAvec = useMemo(() => moisSida(true, debutTraitement), [debutTraitement]);
  const picCv = useMemo(() => logChargeViraleNaturelle(1.3), []);

  const exploreOk = vuesVues.size === 3 && regimesVus.size === 2;

  function choisirVue(v: View) {
    setView(v);
    setVuesVues((prev) => new Set(prev).add(v));
  }

  function choisirRegime(actif: boolean) {
    setTraitement(actif);
    setRegimesVus((prev) => new Set(prev).add(actif ? 'avec' : 'sans'));
  }

  const score = useMemo(() => {
    let s = 0;
    s += vuesVues.size * 6; // virion + cycle + graphe observés → 18
    s += regimesVus.size * 6; // sans traitement ET sous ARV comparés → 12
    if (hypo === 'silencieux') s += 10; // hypothèse juste
    if (qCycle === 'retro') s += 20;
    if (qStade === 'distinct') s += 20;
    if (qArv === 'indetectable') s += 20;
    return Math.min(100, Math.round(s));
  }, [vuesVues, regimesVus, hypo, qCycle, qStade, qArv]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'vih-immunite-terminale',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          reglages: { mois, traitement, debutTraitement },
          mesures: {
            auMoisChoisi: {
              mois,
              cd4: Math.round(t4),
              logChargeVirale: Number(logCv.toFixed(2)),
              phase,
            },
            picPrimoInfection: { mois: 1.3, logChargeVirale: Number(picCv.toFixed(2)) },
            sansTraitement: {
              cd4A10Ans: Math.round(cd4Naturel(MOIS_MAX)),
              moisSeuilSida: sidaSans,
            },
            avecTraitement: {
              debutMois: debutTraitement,
              cd4A10Ans: Math.round(cd4(MOIS_MAX, true, debutTraitement)),
              moisSeuilSida: sidaAvec,
            },
          },
          exploration: { vues: Array.from(vuesVues), regimes: Array.from(regimesVus) },
          qcm: { qCycle, qStade, qArv },
        },
      },
      score,
    );
    setStep('done');
  }

  const aide = VUES.find((v) => v.key === view)?.aide ?? '';

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Microscope className="h-5 w-5" />
              </span>
              VIH : le virus qui désarme l&apos;immunité
            </CardTitle>
            <Badge tone="svt">SVT · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Lors des journées de <strong>dépistage volontaire</strong> organisées par le CNLS dans les postes de
              santé, un résultat s&apos;accompagne toujours d&apos;une explication scientifique. Le Sénégal a
              engagé très tôt sa politique de prévention : la prévalence y reste faible (environ{' '}
              <strong>0,3 %</strong>) et les <strong>antirétroviraux sont gratuits</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> comprendre comment le <strong>VIH</strong> infecte les{' '}
              <strong>lymphocytes T CD4+</strong> (les T4), lire le graphe qui oppose la{' '}
              <strong>charge virale</strong> au <strong>taux de T4</strong> sur 10 ans, distinguer{' '}
              <strong>séropositivité</strong> et <strong>SIDA</strong>, et mesurer l&apos;effet des{' '}
              <strong>antirétroviraux</strong>.
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
              <TrendingDown className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Une personne vient d&apos;être contaminée par le VIH et ne reçoit aucun traitement. Avant de manipuler :
            selon toi, que se passe-t-il <strong>dans les années qui suivent</strong> ?
          </p>
          <QcmStep
            label="Mon hypothèse : sans traitement, après la primo-infection…"
            tone="action"
            hint="Souviens-toi : le virus se multiplie dans les lymphocytes T4, qui commandent la réponse immunitaire."
            options={[
              { key: 'immediat', label: 'La personne tombe gravement malade tout de suite : le SIDA se déclare en quelques semaines.' },
              {
                key: 'silencieux',
                label:
                  "La personne ne ressent aucun symptôme pendant plusieurs années, alors que le virus détruit peu à peu ses lymphocytes T4.",
              },
              { key: 'disparait', label: 'Le virus est éliminé par le système immunitaire, comme un rhume : la personne guérit seule.' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-violet-700" /> Étape 2 — Du virion au graphe
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Explore <strong>les trois vues</strong>, puis, sur le graphe, compare l&apos;évolution{' '}
            <strong>sans traitement</strong> et <strong>sous antirétroviraux</strong>. Tourne la scène avec ta souris
            ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {VUES.map((v) => (
              <Button
                key={v.key}
                variant={view === v.key ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => choisirVue(v.key)}
              >
                {v.label}
              </Button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <VihScene view={view} mois={mois} traitement={traitement} debutTraitement={debutTraitement} />
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-violet-900 ring-1 ring-violet-100">{aide}</p>

          {view === 'courbes' && (
            <>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="m">Temps écoulé depuis la contamination</Label>
                  <span className="font-mono text-violet-700">{formatDuree(mois)}</span>
                </div>
                <input
                  id="m"
                  type="range"
                  min={0}
                  max={MOIS_MAX}
                  step={1}
                  value={mois}
                  onChange={(e) => setMois(Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant={!traitement ? 'success' : 'soft'} size="sm" onClick={() => choisirRegime(false)}>
                  Sans traitement
                </Button>
                <Button variant={traitement ? 'success' : 'soft'} size="sm" onClick={() => choisirRegime(true)}>
                  <Pill className="h-4 w-4" /> Avec antirétroviraux
                </Button>
              </div>

              {traitement && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <Label htmlFor="d">Début du traitement</Label>
                    <span className="font-mono text-violet-700">{formatDuree(debutTraitement)}</span>
                  </div>
                  <input
                    id="d"
                    type="range"
                    min={ARV_DEBUT_MIN}
                    max={ARV_DEBUT_MAX}
                    step={6}
                    value={debutTraitement}
                    onChange={(e) => setDebutTraitement(Number(e.target.value))}
                    className="slider-lab w-full"
                  />
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="Lymphocytes T4" value={`${Math.round(t4)} /mm³`} />
                <Stat label="Charge virale" value={`${formatCharge(logCv)}`} />
                <Stat label="Stade" value={PHASE_LABEL[phase]} />
              </div>
            </>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-ink/50">
              {exploreOk
                ? 'Bien joué : tu as tout exploré.'
                : "Il te reste une vue à ouvrir, ou le graphe à comparer avec et sans antirétroviraux."}
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
              <Activity className="h-5 w-5 text-violet-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le graphe croise deux indicateurs suivis au laboratoire : la <strong>charge virale</strong> (nombre de
            copies d&apos;ARN viral par millilitre de plasma, en rouge, échelle logarithmique) et le{' '}
            <strong>taux de lymphocytes T4</strong> (en vert). Un adulte non infecté a entre{' '}
            <strong>500 et 1500 T4/mm³</strong>.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <VihScene view="courbes" mois={mois} traitement={traitement} debutTraitement={debutTraitement} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant={!traitement ? 'success' : 'soft'} size="sm" onClick={() => choisirRegime(false)}>
              Sans traitement
            </Button>
            <Button variant={traitement ? 'success' : 'soft'} size="sm" onClick={() => choisirRegime(true)}>
              <Pill className="h-4 w-4" /> Sous antirétroviraux
            </Button>
            <span className="ml-auto font-mono text-xs text-violet-700">{formatDuree(mois)}</span>
          </div>
          <input
            id="m2"
            type="range"
            min={0}
            max={MOIS_MAX}
            step={1}
            value={mois}
            onChange={(e) => setMois(Number(e.target.value))}
            className="slider-lab mt-2 w-full"
          />

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Moment</th>
                  <th className="px-3 py-2 text-left">Charge virale (sans ARV)</th>
                  <th className="px-3 py-2 text-left">T4 sans ARV</th>
                  <th className="px-3 py-2 text-left">T4 avec ARV dès {formatDuree(debutTraitement)}</th>
                </tr>
              </thead>
              <tbody>
                {REPERES.map((m) => {
                  const t4Sans = cd4Naturel(m);
                  const t4Avec = cd4(m, true, debutTraitement);
                  return (
                    <tr key={m} className={'border-t border-night-100 ' + (t4Sans < SEUIL_SIDA ? 'bg-red-50' : '')}>
                      <td className="px-3 py-2">{formatDuree(m)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{formatCharge(logChargeViraleNaturelle(m))}</td>
                      <td className="px-3 py-2">
                        {Math.round(t4Sans)} /mm³ {t4Sans < SEUIL_SIDA ? '⚠' : ''}
                      </td>
                      <td className="px-3 py-2 font-semibold text-emerald-700">{Math.round(t4Avec)} /mm³</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Stat label="Pic de primo-infection" value={formatCharge(picCv)} />
            <Stat
              label="Seuil SIDA sans ARV"
              value={sidaSans === null ? 'non atteint' : formatDuree(sidaSans)}
            />
            <Stat label="Ton hypothèse" value={hypo === 'silencieux' ? 'confirmée ✔' : 'à corriger'} />
          </div>

          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            Sans traitement, la charge virale explose pendant la <strong>primo-infection</strong> (jusqu&apos;à{' '}
            {formatCharge(picCv)} copies/mL vers la 5ᵉ semaine), puis redescend : le système immunitaire reprend
            partiellement le dessus. Commence alors la <strong>phase asymptomatique</strong> : la personne ne ressent
            rien, mais ses T4 baissent d&apos;environ <strong>80 par an</strong>. Vers{' '}
            <strong>{sidaSans === null ? '—' : formatDuree(sidaSans)}</strong>, ils passent sous{' '}
            <strong>200/mm³</strong> : c&apos;est le <strong>stade SIDA</strong>, celui où apparaissent les{' '}
            <strong>infections opportunistes</strong> (tuberculose, candidoses, pneumocystose). Avec les{' '}
            <strong>antirétroviraux</strong>, la charge virale devient <strong>indétectable</strong> (&lt; 50
            copies/mL) en quelques mois et les T4 remontent : à 10 ans ils sont à{' '}
            <strong>{Math.round(cd4(MOIS_MAX, true, debutTraitement))}/mm³</strong> au lieu de{' '}
            <strong>{Math.round(cd4Naturel(MOIS_MAX))}/mm³</strong>. Plus le traitement démarre tôt, mieux
            l&apos;immunité est préservée — d&apos;où l&apos;intérêt du <strong>dépistage volontaire</strong>.
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
              label="Le VIH vient d'entrer dans un lymphocyte T CD4+. Que devient son ARN ?"
              tone="action"
              options={[
                {
                  key: 'retro',
                  label:
                    "Une enzyme virale, la transcriptase inverse, le copie en ADN. Cet ADN s'intègre ensuite à l'ADN de la cellule : c'est le provirus.",
                },
                { key: 'direct', label: "Il est traduit directement en protéines virales, sans jamais passer par l'ADN." },
                { key: 'noyau', label: "Il remplace purement et simplement l'ADN du noyau de la cellule." },
              ]}
              value={qCycle}
              onChange={setQCycle}
            />
            <QcmStep
              label="Au lycée, quelqu'un affirme : « être séropositif au VIH, c'est avoir le SIDA ». Que réponds-tu ?"
              tone="action"
              hint="Regarde à quel moment la courbe verte croise le seuil des 200 T4/mm³."
              options={[
                {
                  key: 'distinct',
                  label:
                    "C'est faux : séropositif signifie que le virus est présent dans l'organisme. Le SIDA est le stade tardif, quand les T4 passent sous 200/mm³ et que des infections opportunistes apparaissent — souvent plusieurs années plus tard, et jamais si la personne est traitée.",
                },
                { key: 'meme', label: "C'est exact : les deux mots désignent exactement la même situation." },
                { key: 'gueri', label: "C'est faux : séropositif veut dire que la personne a éliminé le virus et qu'elle est guérie." },
              ]}
              value={qStade}
              onChange={setQStade}
            />
            <QcmStep
              label="Que font les antirétroviraux, distribués gratuitement au Sénégal ?"
              tone="action"
              options={[
                {
                  key: 'indetectable',
                  label:
                    "Ils bloquent la multiplication du virus : la charge virale devient indétectable et les T4 remontent. Ils n'éliminent pas le provirus, donc le traitement se prend à vie.",
                },
                { key: 'guerison', label: 'Ils détruisent le provirus intégré et guérissent définitivement la personne en quelques mois.' },
                { key: 'remplace', label: 'Ils remplacent les lymphocytes T4 détruits par de nouvelles cellules fabriquées en laboratoire.' },
              ]}
              value={qArv}
              onChange={setQArv}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qCycle || !qStade || !qArv || busy} onClick={handleValidate}>
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
              Le <strong>VIH</strong> est un <strong>rétrovirus</strong> : sa protéine <strong>gp120</strong> se fixe
              sur le récepteur <strong>CD4</strong> des lymphocytes <strong>T4</strong>. La{' '}
              <strong>transcriptase inverse</strong> copie son ARN en ADN, qui s&apos;intègre à l&apos;ADN de la
              cellule (<strong>provirus</strong>). La cellule infectée produit de nouveaux virions puis meurt : c&apos;est
              la destruction progressive des T4 qui désarme l&apos;immunité.
            </p>
            <p>
              Trois phases : <strong>primo-infection</strong> (pic de charge virale en quelques semaines),{' '}
              <strong>phase asymptomatique</strong> (plusieurs années sans symptôme, T4 en baisse d&apos;environ 80 par
              an), puis <strong>stade SIDA</strong> lorsque les T4 passent sous <strong>200/mm³</strong> et que les{' '}
              <strong>infections opportunistes</strong> surviennent. Un adulte non infecté a{' '}
              <strong>500 à 1500 T4/mm³</strong>.
            </p>
            <p>
              À retenir : <strong>séropositif ≠ malade du SIDA</strong>. Les <strong>antirétroviraux</strong> ne
              guérissent pas l&apos;infection (le provirus reste intégré) mais rendent la charge virale{' '}
              <strong>indétectable</strong> et font remonter les T4 — dans ta simulation,{' '}
              <strong>{Math.round(cd4(MOIS_MAX, true, debutTraitement))}/mm³</strong> à 10 ans contre{' '}
              <strong>{Math.round(cd4Naturel(MOIS_MAX))}/mm³</strong> sans traitement. Plus le{' '}
              <strong>dépistage</strong> est précoce, plus le traitement est efficace : c&apos;est tout le sens des
              campagnes du <strong>CNLS</strong> et de la gratuité des antirétroviraux au Sénégal.
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
