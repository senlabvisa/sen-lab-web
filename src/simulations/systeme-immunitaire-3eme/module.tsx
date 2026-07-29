'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, CheckCircle2, Shield, ShieldCheck, Syringe } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Les défenses de l'organisme (SVT, 3ème).
 *
 * Flow Lab Premium : intro → hypothèse → manipulation 3D (barrière cutanée,
 * phagocytose, réponse spécifique) → mesures (courbes primaire/secondaire) →
 * QCM → bilan.
 *
 * Science juste : les défenses NON SPÉCIFIQUES (barrière cutanée puis
 * phagocytose) agissent en quelques heures contre n'importe quel microbe ;
 * les défenses SPÉCIFIQUES (lymphocytes B → anticorps, lymphocytes T)
 * demandent plusieurs jours et ne visent QU'UN antigène. Les lymphocytes
 * mémoire rendent la réponse secondaire plus rapide et plus ample : c'est
 * ce qui justifie le rappel du vaccin (PEV).
 *
 * Contexte : une plaie souillée de sable sur le terrain de foot et le
 * calendrier vaccinal du Programme élargi de vaccination du Sénégal.
 */

const ImmuneScene = dynamic(() => import('./immune-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type View = 'barriere' | 'phagocytose' | 'specifique';
type HypoRep = 'pareil' | 'lent' | 'vite' | null;

// ── Modèle du taux d'anticorps (même formule que la scène 3D) ────────────
const PRIM = { lag: 5, peak: 14, amp: 15, res: 0.05, tau: 6 };
const SEC = { lag: 2, peak: 7, amp: 120, res: 0.15, tau: 3 };
const SEUIL = 8; // u.a. — seuil de protection
const JOUR_MAX = 28;

function titre(jour: number, rappel: boolean) {
  const p = rappel ? SEC : PRIM;
  const t = jour - p.lag;
  if (t <= 0) return 0;
  const tp = p.peak - p.lag;
  const r = t / tp;
  return p.amp * r * r * Math.exp(2 * (1 - r)) + p.amp * p.res * (1 - Math.exp(-t / p.tau));
}

/** Premier jour où le taux dépasse le seuil de protection. */
function jourProtege(rappel: boolean) {
  for (let d = 0; d <= JOUR_MAX; d += 0.1) if (titre(d, rappel) >= SEUIL) return d;
  return null;
}

/** Jour et valeur du maximum d'anticorps. */
function pic(rappel: boolean) {
  let best = { jour: 0, valeur: 0 };
  for (let d = 0; d <= JOUR_MAX; d += 0.1) {
    const v = titre(d, rappel);
    if (v > best.valeur) best = { jour: d, valeur: v };
  }
  return best;
}

const INTRO =
  "Tu joues au foot sur le terrain sablonneux du quartier et tu te fais une belle éraflure au genou. " +
  "Du sable, de la poussière et des milliers de microbes entrent dans la plaie. Pourtant, quelques jours plus tard, " +
  "tout est cicatrisé. Ton corps s'est défendu tout seul, en plusieurs étapes : d'abord la peau, puis les cellules " +
  "qui avalent les microbes, enfin les anticorps fabriqués sur mesure. Aujourd'hui tu vas observer ces trois lignes " +
  "de défense en 3D et comprendre pourquoi l'infirmier du poste de santé insiste autant sur le rappel du vaccin.";

const CONCLUSION =
  "Ton organisme se défend en trois temps. La peau intacte est une barrière que les microbes ne franchissent pas. " +
  "Si une plaie s'ouvre, les phagocytes accourent et avalent les intrus en quelques heures : c'est la phagocytose, " +
  "une défense non spécifique, la même contre tous les microbes. Si cela ne suffit pas, les lymphocytes B se " +
  "transforment en plasmocytes et fabriquent des anticorps. Un anticorps est spécifique : il ne reconnaît qu'un seul " +
  "antigène, comme une clé n'ouvre qu'une seule serrure. Les lymphocytes T, eux, détruisent les cellules infectées. " +
  "Après cette première rencontre, des lymphocytes mémoire restent dans le corps. Lors du rappel du vaccin, ils " +
  "réagissent en deux ou trois jours au lieu de neuf, et le taux d'anticorps monte huit fois plus haut. " +
  "Voilà pourquoi le calendrier du Programme élargi de vaccination prévoit plusieurs doses.";

export function SystemeImmunitaire3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [view, setView] = useState<View>('barriere');
  const [peauIntacte, setPeauIntacte] = useState(true);
  const [rappel, setRappel] = useState(false);
  const [jour, setJour] = useState(7);

  const [vuesVues, setVuesVues] = useState<Set<View>>(new Set<View>(['barriere']));
  const [peauxVues, setPeauxVues] = useState<Set<string>>(new Set<string>(['intacte']));
  const [regimesVus, setRegimesVus] = useState<Set<string>>(new Set<string>(['primaire']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qPremier, setQPremier] = useState<string | null>(null);
  const [qSpecifique, setQSpecifique] = useState<string | null>(null);
  const [qRappel, setQRappel] = useState<string | null>(null);

  const taux = useMemo(() => titre(jour, rappel), [jour, rappel]);
  const picPrim = useMemo(() => pic(false), []);
  const picSec = useMemo(() => pic(true), []);
  const protPrim = useMemo(() => jourProtege(false), []);
  const protSec = useMemo(() => jourProtege(true), []);

  const exploreOk = vuesVues.size === 3 && regimesVus.size === 2;

  function choisirVue(v: View) {
    setView(v);
    setVuesVues((prev) => new Set(prev).add(v));
  }

  function choisirPeau(intacte: boolean) {
    setPeauIntacte(intacte);
    setPeauxVues((prev) => new Set(prev).add(intacte ? 'intacte' : 'plaie'));
  }

  function choisirRegime(r: boolean) {
    setRappel(r);
    setRegimesVus((prev) => new Set(prev).add(r ? 'secondaire' : 'primaire'));
  }

  const score = useMemo(() => {
    let s = 0;
    s += vuesVues.size * 6; // les 3 lignes de défense observées → 18
    s += regimesVus.size * 5; // 1re rencontre ET rappel comparés → 10
    s += peauxVues.size * 1; // peau intacte ET plaie testées → 2
    if (hypo === 'vite') s += 10; // hypothèse juste
    if (qPremier === 'phago') s += 20;
    if (qSpecifique === 'non') s += 20;
    if (qRappel === 'memoire') s += 20;
    return Math.min(100, Math.round(s));
  }, [vuesVues, regimesVus, peauxVues, hypo, qPremier, qSpecifique, qRappel]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'systeme-immunitaire-3eme',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          reglages: { jour, rappel, peauIntacte },
          mesures: {
            tauxAuJour: Number(taux.toFixed(1)),
            primaire: {
              picJour: Number(picPrim.jour.toFixed(1)),
              picUa: Number(picPrim.valeur.toFixed(1)),
              jourProtection: protPrim === null ? null : Number(protPrim.toFixed(1)),
              tauxJ28: Number(titre(28, false).toFixed(1)),
            },
            secondaire: {
              picJour: Number(picSec.jour.toFixed(1)),
              picUa: Number(picSec.valeur.toFixed(1)),
              jourProtection: protSec === null ? null : Number(protSec.toFixed(1)),
              tauxJ28: Number(titre(28, true).toFixed(1)),
            },
          },
          exploration: {
            vues: Array.from(vuesVues),
            peaux: Array.from(peauxVues),
            regimes: Array.from(regimesVus),
          },
          qcm: { qPremier, qSpecifique, qRappel },
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
                <Shield className="h-5 w-5" />
              </span>
              L&apos;éraflure du terrain de foot
            </CardTitle>
            <Badge tone="svt">SVT · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Match sur le terrain sablonneux du quartier : tu glisses et tu te fais une <strong>éraflure au genou</strong>.
              Du sable et des milliers de microbes entrent dans la plaie. Trois jours plus tard, tout va bien : ton corps
              s&apos;est défendu <em>tout seul</em>.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> observer les <strong>défenses non spécifiques</strong> (barrière cutanée,
              phagocytose) puis les <strong>défenses spécifiques</strong> (anticorps, lymphocytes T), et mesurer la{' '}
              <strong>mémoire immunitaire</strong> qui explique le rappel du vaccin.
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
              <Syringe className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Au poste de santé, on te donne une <strong>2ᵉ dose</strong> du même vaccin (le rappel). Avant de manipuler :
            à ton avis, que fait le taux d&apos;anticorps dans ton sang après ce rappel ?
          </p>
          <QcmStep
            label="Mon hypothèse : après le rappel, le taux d'anticorps…"
            tone="action"
            hint="Souviens-toi : lors de la 1re rencontre, il faut plus d'une semaine avant d'être protégé."
            options={[
              { key: 'pareil', label: 'Monte exactement comme la première fois : rien ne change.' },
              { key: 'lent', label: 'Monte plus lentement, mais finit plus haut.' },
              { key: 'vite', label: 'Monte beaucoup plus vite ET beaucoup plus haut.' },
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
              <ShieldCheck className="h-5 w-5 text-emerald-700" /> Étape 2 — Les trois lignes de défense
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Observe <strong>les trois vues</strong> et compare <strong>la 1re rencontre</strong> avec{' '}
            <strong>le rappel du vaccin</strong>. Tourne la scène avec ta souris ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant={view === 'barriere' ? 'gradient' : 'outline'} size="sm" onClick={() => choisirVue('barriere')}>
              1 · Barrière cutanée
            </Button>
            <Button
              variant={view === 'phagocytose' ? 'gradient' : 'outline'}
              size="sm"
              onClick={() => choisirVue('phagocytose')}
            >
              2 · Phagocytose
            </Button>
            <Button
              variant={view === 'specifique' ? 'gradient' : 'outline'}
              size="sm"
              onClick={() => choisirVue('specifique')}
            >
              3 · Anticorps &amp; lymphocytes T
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <ImmuneScene view={view} peauIntacte={peauIntacte} rappel={rappel} jour={jour} taux={taux} />
            </div>
          </div>

          {view === 'barriere' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant={peauIntacte ? 'success' : 'soft'} size="sm" onClick={() => choisirPeau(true)}>
                Peau intacte
              </Button>
              <Button variant={!peauIntacte ? 'success' : 'soft'} size="sm" onClick={() => choisirPeau(false)}>
                Plaie souillée de sable
              </Button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant={!rappel ? 'success' : 'soft'} size="sm" onClick={() => choisirRegime(false)}>
              1re rencontre
            </Button>
            <Button variant={rappel ? 'success' : 'soft'} size="sm" onClick={() => choisirRegime(true)}>
              Après le rappel du vaccin
            </Button>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="j">Jours après le contact avec le microbe</Label>
              <span className="font-mono text-emerald-700">J{jour}</span>
            </div>
            <input
              id="j"
              type="range"
              min={0}
              max={JOUR_MAX}
              step={1}
              value={jour}
              onChange={(e) => setJour(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Anticorps" value={`${taux.toFixed(1)} u.a.`} />
            <Stat label="Protégé ?" value={taux >= SEUIL ? 'Oui' : 'Pas encore'} />
            <Stat label="Réponse" value={rappel ? 'secondaire' : 'primaire'} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-ink/50">
              {exploreOk
                ? 'Bien joué : tu as tout exploré.'
                : 'Il te reste une vue ou une situation (1re rencontre / rappel) à tester.'}
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
            Voici le <strong>taux d&apos;anticorps</strong> jour après jour. La courbe bleue est la{' '}
            <strong>réponse primaire</strong> (1re rencontre), la verte la <strong>réponse secondaire</strong> (après le
            rappel). Déplace le curseur pour lire une valeur.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <ImmuneScene view="memoire" peauIntacte={peauIntacte} rappel={rappel} jour={jour} taux={taux} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant={!rappel ? 'success' : 'soft'} size="sm" onClick={() => choisirRegime(false)}>
              Lire la primaire
            </Button>
            <Button variant={rappel ? 'success' : 'soft'} size="sm" onClick={() => choisirRegime(true)}>
              Lire la secondaire
            </Button>
            <span className="ml-auto font-mono text-xs text-emerald-700">J{jour}</span>
          </div>
          <input
            id="j2"
            type="range"
            min={0}
            max={JOUR_MAX}
            step={1}
            value={jour}
            onChange={(e) => setJour(Number(e.target.value))}
            className="slider-lab mt-2 w-full"
          />

          <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-4 py-2 text-left">Réponse</th>
                  <th className="px-4 py-2 text-left">Protégé à partir de</th>
                  <th className="px-4 py-2 text-left">Pic d&apos;anticorps</th>
                  <th className="px-4 py-2 text-left">Reste à J28</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Primaire (1re rencontre)</td>
                  <td className="px-4 py-2">{protPrim === null ? '—' : `J${protPrim.toFixed(0)}`}</td>
                  <td className="px-4 py-2">
                    {picPrim.valeur.toFixed(0)} u.a. (J{picPrim.jour.toFixed(0)})
                  </td>
                  <td className="px-4 py-2">{titre(28, false).toFixed(1)} u.a.</td>
                </tr>
                <tr className="border-t border-night-100 bg-emerald-50/60 font-semibold">
                  <td className="px-4 py-2">Secondaire (après rappel) 🏆</td>
                  <td className="px-4 py-2">{protSec === null ? '—' : `J${protSec.toFixed(0)}`}</td>
                  <td className="px-4 py-2">
                    {picSec.valeur.toFixed(0)} u.a. (J{picSec.jour.toFixed(0)})
                  </td>
                  <td className="px-4 py-2">{titre(28, true).toFixed(0)} u.a.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Stat label="Gain de temps" value={`${((protPrim ?? 0) - (protSec ?? 0)).toFixed(0)} jours`} />
            <Stat label="Pic × plus fort" value={`× ${(picSec.valeur / picPrim.valeur).toFixed(1)}`} />
            <Stat label="Ton hypothèse" value={hypo === 'vite' ? 'confirmée ✔' : 'à corriger'} />
          </div>

          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <Syringe className="mr-1 inline h-4 w-4" />
            Lors de la 1re rencontre, il faut environ <strong>{protPrim?.toFixed(0)} jours</strong> avant d&apos;être
            protégé : le temps que les lymphocytes B se multiplient. Après le rappel, les{' '}
            <strong>lymphocytes mémoire</strong> réagissent en <strong>{protSec?.toFixed(0)} jours</strong> seulement.
            C&apos;est exactement pour cela que le <strong>PEV</strong> (Programme élargi de vaccination) prévoit
            plusieurs doses : pentavalent à 6, 10 et 14 semaines, vaccin contre la rougeole à 9 mois puis à 15 mois.
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
              label="Des microbes viennent d'entrer par ton éraflure. Quelle défense agit la PREMIÈRE, dès les premières heures ?"
              tone="action"
              options={[
                {
                  key: 'phago',
                  label:
                    "La phagocytose : les phagocytes accourent et avalent les microbes. C'est une défense non spécifique.",
                },
                { key: 'anticorps', label: 'Les anticorps, qui sont déjà tout prêts dans le sang contre ce microbe.' },
                { key: 'vaccin', label: 'Le vaccin, qui agit directement sur la plaie au moment de la blessure.' },
              ]}
              value={qPremier}
              onChange={setQPremier}
            />
            <QcmStep
              label="Tu as été vacciné contre la rougeole. Ces anticorps peuvent-ils aussi neutraliser le microbe du tétanos ?"
              tone="action"
              options={[
                {
                  key: 'non',
                  label:
                    "Non : un anticorps est spécifique. Il ne se fixe que sur l'antigène qui lui correspond, comme une clé dans sa serrure.",
                },
                { key: 'oui', label: 'Oui : un anticorps protège contre tous les microbes une fois fabriqué.' },
                { key: 'parfois', label: "Oui, mais seulement si la plaie est propre." },
              ]}
              value={qSpecifique}
              onChange={setQSpecifique}
            />
            <QcmStep
              label="Pourquoi le rappel du vaccin (2ᵉ dose du PEV) protège-t-il beaucoup mieux ?"
              tone="action"
              options={[
                {
                  key: 'memoire',
                  label:
                    "Grâce aux lymphocytes mémoire : la réponse secondaire démarre plus vite et le taux d'anticorps monte beaucoup plus haut.",
                },
                { key: 'dose', label: 'Parce que la 2ᵉ dose contient un microbe plus fort que la première.' },
                { key: 'antibio', label: "Parce que le rappel contient un antibiotique qui tue les microbes." },
              ]}
              value={qRappel}
              onChange={setQRappel}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qPremier || !qSpecifique || !qRappel || busy} onClick={handleValidate}>
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
              Tes <strong>défenses non spécifiques</strong> agissent contre tous les microbes, tout de suite : la{' '}
              <strong>peau intacte</strong> les bloque dehors, et si une plaie s&apos;ouvre, l&apos;
              <strong>inflammation</strong> appelle les phagocytes qui pratiquent la <strong>phagocytose</strong> en
              4 temps (adhésion, ingestion, digestion, rejet des débris).
            </p>
            <p>
              Tes <strong>défenses spécifiques</strong> arrivent ensuite : les <strong>lymphocytes B</strong> deviennent
              des plasmocytes et fabriquent des <strong>anticorps</strong> qui ne se fixent que sur{' '}
              <strong>un seul antigène</strong> ; les <strong>lymphocytes T</strong> détruisent les cellules infectées.
            </p>
            <p>
              Les <strong>lymphocytes mémoire</strong> gardent le souvenir de l&apos;antigène : à la 2ᵉ rencontre tu es
              protégé en <strong>{protSec?.toFixed(0)} jours</strong> au lieu de <strong>{protPrim?.toFixed(0)}</strong>,
              avec un pic <strong>{(picSec.valeur / picPrim.valeur).toFixed(0)} fois</strong> plus élevé. C&apos;est tout
              le principe du <strong>rappel vaccinal</strong> du PEV.
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
