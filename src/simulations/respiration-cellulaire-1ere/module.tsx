'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, BatteryCharging, CheckCircle2, FlaskConical, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — La respiration CELLULAIRE (SVT, Première S).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (mitochondrie en
 * coupe, étapes de l'oxydation du glucose, comparaison des rendements) →
 * mesures (bilan chiffré respiration / fermentation) → QCM → bilan.
 *
 * Objet d'étude : ce qui se passe À L'INTÉRIEUR de la cellule — glycolyse
 * dans le cytoplasme, cycle de Krebs dans la matrice mitochondriale, chaîne
 * respiratoire sur les crêtes, production d'ATP. À NE PAS confondre avec le
 * TP de 5ème « respiration ventilatoire » (thorax, alvéoles, eau de chaux).
 *
 * Contexte sénégalais : le lutteur de l'arène nationale, les courbatures
 * d'après-combat (acide lactique), le lait caillé (soow) et le pain.
 */

const MitoScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-pink-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type View = 'mitochondrie' | 'etapes' | 'bilan';
type HypoRep = 'autant' | 'beaucoup-moins' | 'plus' | null;

const ATP_RESPIRATION = 36;
const ATP_FERMENTATION = 2;

const VIEWS: { key: View; label: string; hint: string }[] = [
  { key: 'mitochondrie', label: '🔬 Mitochondrie', hint: 'La coupe : double membrane, crêtes, matrice. Regarde ce qui entre et ce qui sort.' },
  { key: 'etapes', label: '⚙️ Les 3 étapes', hint: 'Glycolyse (cytoplasme) → cycle de Krebs (matrice) → chaîne respiratoire (crêtes).' },
  { key: 'bilan', label: '📊 Rendements', hint: 'Compare l’ATP produit avec dioxygène et sans dioxygène.' },
];

const INTRO =
  "À l'arène nationale, le lutteur explose pendant trente secondes de combat. " +
  "Ses muscles réclament de l'énergie tout de suite. Cette énergie ne vient pas directement du riz du déjeuner : " +
  "elle vient d'une molécule fabriquée dans chacune de ses cellules, l'ATP. " +
  "Attention, ici on ne parle plus des poumons ni de l'air qui entre et qui sort : cela, c'est la respiration ventilatoire, vue en cinquième. " +
  "Aujourd'hui tu descends à l'intérieur de la cellule, dans la mitochondrie, " +
  "pour voir comment le glucose et le dioxygène y sont transformés en dioxyde de carbone, en eau et surtout en ATP.";

const CONCLUSION =
  "Bravo ! La respiration cellulaire est une oxydation complète du glucose. " +
  "Son équation bilan est la suivante : une molécule de glucose plus six molécules de dioxygène donnent " +
  "six molécules de dioxyde de carbone, six molécules d'eau et de l'énergie, environ trente-six molécules d'ATP. " +
  "Elle se déroule en trois temps : la glycolyse dans le cytoplasme, deux ATP ; " +
  "le cycle de Krebs dans la matrice de la mitochondrie, deux ATP ; " +
  "et la chaîne respiratoire sur les crêtes de la membrane interne, environ trente-deux ATP. " +
  "Quand le dioxygène manque, comme dans le muscle du lutteur en plein effort, la cellule s'arrête à la fermentation lactique : " +
  "elle ne récupère que deux ATP par glucose et fabrique de l'acide lactique, responsable des courbatures. " +
  "La respiration est donc dix-huit fois plus rentable que la fermentation. " +
  "Enfin, retiens que la respiration cellulaire concerne toutes les cellules du corps, " +
  "alors que la respiration ventilatoire ne concerne que l'appareil respiratoire.";

/** Bilan matière pour n molécules de glucose (valeurs des manuels de Première). */
function bilan(n: number) {
  return {
    respiration: { o2: 6 * n, atp: ATP_RESPIRATION * n, co2: 6 * n, h2o: 6 * n, lactate: 0 },
    fermentation: { o2: 0, atp: ATP_FERMENTATION * n, co2: 0, h2o: 0, lactate: 2 * n },
  };
}

export function RespirationCellulaire1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [view, setView] = useState<View>('mitochondrie');
  const [seen, setSeen] = useState<Set<View>>(new Set<View>(['mitochondrie']));
  const [glucose, setGlucose] = useState(1);
  const [aerobie, setAerobie] = useState(true);
  const [testedAnaerobie, setTestedAnaerobie] = useState(false);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qLieu, setQLieu] = useState<string | null>(null);
  const [qEquation, setQEquation] = useState<string | null>(null);
  const [qCourbature, setQCourbature] = useState<string | null>(null);

  const b = useMemo(() => bilan(glucose), [glucose]);
  const courant = aerobie ? b.respiration : b.fermentation;

  function pick(next: View) {
    setView(next);
    setSeen((prev) => new Set(prev).add(next));
  }

  function setMode(next: boolean) {
    setAerobie(next);
    if (!next) setTestedAnaerobie(true);
  }

  const scoreDetail = useMemo(() => {
    const exploration = Math.min(24, seen.size * 8) + (testedAnaerobie ? 6 : 0);
    const hypothese = hypo === 'beaucoup-moins' ? 10 : 0;
    const qcm =
      (qLieu === 'mitochondrie' ? 20 : 0) +
      (qEquation === 'oxydation' ? 20 : 0) +
      (qCourbature === 'lactique' ? 20 : 0);
    return { exploration, hypothese, qcm };
  }, [seen, testedAnaerobie, hypo, qLieu, qEquation, qCourbature]);

  const score = useMemo(
    () => Math.max(0, Math.min(100, Math.round(scoreDetail.exploration + scoreDetail.hypothese + scoreDetail.qcm))),
    [scoreDetail],
  );

  async function handleValidate() {
    await onComplete(
      {
        shell: 'respiration-cellulaire-1ere',
        version: '2.0',
        steps: {
          views: Array.from(seen),
          glucoseMolecules: glucose,
          modeTesteSansO2: testedAnaerobie,
          atpRespiration: b.respiration.atp,
          atpFermentation: b.fermentation.atp,
          hypothesis: hypo,
          qcm: { qLieu, qEquation, qCourbature },
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
                <BatteryCharging className="h-5 w-5" />
              </span>
              D&apos;où vient l&apos;énergie du lutteur ?
            </CardTitle>
            <Badge tone="svt">SVT · Première S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À l&apos;<strong>arène nationale</strong>, le lutteur explose pendant 30 secondes de combat. Ses muscles
              réclament de l&apos;énergie <em>immédiatement</em>. Cette énergie ne vient pas directement du riz du
              déjeuner : elle vient d&apos;une molécule fabriquée dans chacune de ses cellules, l&apos;<strong>ATP</strong>.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> localiser dans la cellule les étapes de l&apos;oxydation du glucose
              (glycolyse, cycle de Krebs, chaîne respiratoire), écrire l&apos;<strong>équation bilan</strong> de la
              respiration cellulaire et comparer son <strong>rendement en ATP</strong> à celui de la fermentation.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-xs text-ink/60 ring-1 ring-emerald-100">
              <strong>Ne confonds pas :</strong> en 5ème tu as étudié la respiration <strong>ventilatoire</strong> — le
              trajet de l&apos;air, le diaphragme, les alvéoles. Ici on étudie la respiration{' '}
              <strong>cellulaire</strong> : ce que la cellule fait du dioxygène une fois qu&apos;il est arrivé, à
              l&apos;intérieur de la <strong>mitochondrie</strong>.
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
            Au marché, le <strong>lait caillé (soow)</strong> et la pâte à pain sont transformés par des micro-organismes
            qui travaillent <strong>sans dioxygène</strong> : ils font une <strong>fermentation</strong>. Le muscle du
            lutteur en fait autant quand le dioxygène n&apos;arrive plus assez vite.
          </p>
          <QcmStep
            label="Pour UNE même molécule de glucose, la fermentation (sans O₂) fournit…"
            tone="action"
            hint="Souviens-toi : sans dioxygène, le glucose n'est pas dégradé jusqu'au bout."
            options={[
              { key: 'autant', label: 'Autant d’ATP que la respiration : c’est le même glucose au départ.' },
              { key: 'beaucoup-moins', label: 'Beaucoup moins d’ATP : le glucose n’est dégradé qu’en partie.' },
              { key: 'plus', label: 'Plus d’ATP : sans dioxygène, la cellule travaille plus vite.' },
            ]}
            value={hypo}
            onChange={(x) => setHypo(x as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Entrer dans la cellule <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-700" /> Étape 2 — Observe et manipule
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Visite les <strong>trois vues</strong>, fais varier le nombre de molécules de glucose, puis{' '}
            <strong>coupe le dioxygène</strong> pour voir ce qui change. Tourne la scène avec ta souris ou ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100">
            <div className="aspect-[4/3] w-full">
              <MitoScene view={view} glucose={glucose} aerobie={aerobie} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {VIEWS.map((x) => (
              <Button key={x.key} variant={view === x.key ? 'gradient' : 'outline'} size="sm" onClick={() => pick(x.key)}>
                {x.label} {seen.has(x.key) && view !== x.key ? '✓' : ''}
              </Button>
            ))}
            <Badge tone={seen.size >= 3 ? 'action' : 'neutral'} size="sm">
              {seen.size}/3 vues observées
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink/50">{VIEWS.find((x) => x.key === view)?.hint}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="glc">Glucose à dégrader</Label>
                <span className="font-mono text-sm font-semibold text-emerald-700">
                  {glucose} molécule{glucose > 1 ? 's' : ''}
                </span>
              </div>
              <input
                id="glc"
                type="range"
                min={1}
                max={10}
                step={1}
                value={glucose}
                onChange={(e) => setGlucose(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 text-xs">
                <Label htmlFor="mode">Dioxygène disponible</Label>
              </div>
              <div id="mode" className="flex gap-2">
                <Button variant={aerobie ? 'success' : 'outline'} size="sm" onClick={() => setMode(true)}>
                  Avec O₂ · respiration
                </Button>
                <Button variant={!aerobie ? 'gradient' : 'outline'} size="sm" onClick={() => setMode(false)}>
                  Sans O₂ · fermentation
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="ATP produits" value={`${courant.atp}`} />
            <Stat label="O₂ consommé" value={`${courant.o2}`} />
            <Stat label="CO₂ rejeté" value={`${courant.co2}`} />
            <Stat label={aerobie ? 'H₂O formée' : 'Acide lactique'} value={`${aerobie ? courant.h2o : courant.lactate}`} />
          </div>
          <p className="mt-2 text-xs text-ink/50">
            Rendement actuel : <strong>{aerobie ? ATP_RESPIRATION : ATP_FERMENTATION} ATP par glucose</strong>{' '}
            {aerobie ? '(oxydation complète)' : '(le glucose n’est dégradé qu’en acide lactique)'}.
          </p>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={seen.size < 3 || !testedAnaerobie} onClick={() => setStep('mesures')}>
              {seen.size < 3
                ? `Visite encore ${3 - seen.size} vue(s)`
                : !testedAnaerobie
                  ? 'Teste le mode « sans O₂ »'
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
              <FlaskConical className="h-5 w-5 text-emerald-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici le bilan pour les <strong>{glucose} molécule{glucose > 1 ? 's' : ''} de glucose</strong> que tu as
            choisies, selon que la cellule dispose ou non de dioxygène.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-4 py-2 text-left">Grandeur</th>
                  <th className="px-4 py-2 text-left">Respiration (avec O₂)</th>
                  <th className="px-4 py-2 text-left">Fermentation lactique (sans O₂)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">O₂ consommé</td>
                  <td className="px-4 py-2">{b.respiration.o2}</td>
                  <td className="px-4 py-2">0</td>
                </tr>
                <tr className="border-t border-night-100 bg-emerald-50/50 font-semibold">
                  <td className="px-4 py-2">ATP produits</td>
                  <td className="px-4 py-2">{b.respiration.atp} 🏆</td>
                  <td className="px-4 py-2">{b.fermentation.atp}</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">CO₂ rejeté</td>
                  <td className="px-4 py-2">{b.respiration.co2}</td>
                  <td className="px-4 py-2">0</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">H₂O formée</td>
                  <td className="px-4 py-2">{b.respiration.h2o}</td>
                  <td className="px-4 py-2">0</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Acide lactique formé</td>
                  <td className="px-4 py-2">0</td>
                  <td className="px-4 py-2">{b.fermentation.lactate}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>Équation bilan de la respiration cellulaire :</strong>
            <br />
            C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + énergie (≈ 36 ATP)
            <br />
            <strong>Fermentation lactique :</strong> C₆H₁₂O₆ → 2 acide lactique + énergie (2 ATP), sans dioxygène.
            <br />
            <span className="text-emerald-800/80">
              La respiration rapporte {ATP_RESPIRATION / ATP_FERMENTATION} fois plus d&apos;ATP par glucose : ces{' '}
              {ATP_RESPIRATION} ATP se répartissent en 2 (glycolyse) + 2 (cycle de Krebs) + ≈ 32 (chaîne
              respiratoire).
            </span>
          </div>
          <p className="mt-3 text-sm text-ink/70">
            Ton hypothèse de départ était{' '}
            <strong className={hypo === 'beaucoup-moins' ? 'text-emerald-700' : 'text-alert-700'}>
              {hypo === 'beaucoup-moins' ? 'correcte' : 'à corriger'}
            </strong>{' '}
            : sans dioxygène, le glucose n&apos;est dégradé qu&apos;<strong>en partie</strong>, donc la cellule ne
            récupère que <strong>2 ATP</strong> au lieu de <strong>36</strong>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner dans la cellule
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
              label="Où se déroulent le cycle de Krebs et la chaîne respiratoire ?"
              tone="action"
              options={[
                { key: 'mitochondrie', label: 'Dans la mitochondrie : matrice pour Krebs, crêtes de la membrane interne pour la chaîne respiratoire.' },
                { key: 'cytoplasme', label: 'Dans le cytoplasme, comme la glycolyse.' },
                { key: 'noyau', label: 'Dans le noyau, à côté de l’ADN.' },
              ]}
              value={qLieu}
              onChange={setQLieu}
            />
            <QcmStep
              label="Quelle est l'équation bilan de la respiration cellulaire ?"
              tone="action"
              options={[
                { key: 'oxydation', label: 'C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + énergie (≈ 36 ATP)' },
                { key: 'photosynthese', label: '6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂ (c’est la photosynthèse)' },
                { key: 'fermentation', label: 'C₆H₁₂O₆ → 2 acide lactique + énergie (c’est la fermentation)' },
              ]}
              value={qEquation}
              onChange={setQEquation}
            />
            <QcmStep
              label="Après un long combat, le lutteur a des courbatures. Pourquoi ?"
              tone="action"
              options={[
                { key: 'lactique', label: 'Le dioxygène n’arrivait plus assez vite : ses muscles ont fait une fermentation lactique et accumulé de l’acide lactique.' },
                { key: 'trop-o2', label: 'Ses muscles ont reçu trop de dioxygène.' },
                { key: 'trop-atp', label: 'Ses cellules ont fabriqué trop d’ATP.' },
              ]}
              value={qCourbature}
              onChange={setQCourbature}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qLieu || !qEquation || !qCourbature || busy}
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
              La <strong>respiration cellulaire</strong> est l&apos;oxydation complète du glucose :
              <br />
              <strong>C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + énergie (≈ 36 ATP)</strong>.
            </p>
            <p>
              Elle se fait en trois temps : <strong>glycolyse</strong> dans le cytoplasme (2 ATP),{' '}
              <strong>cycle de Krebs</strong> dans la matrice de la mitochondrie (2 ATP) et{' '}
              <strong>chaîne respiratoire</strong> sur les <strong>crêtes</strong> de la membrane interne (≈ 32 ATP).
              Selon les manuels, on écrit 36 à 38 ATP.
            </p>
            <p>
              Sans dioxygène, la cellule s&apos;arrête à la <strong>fermentation lactique</strong> : 2 ATP seulement et
              de l&apos;<strong>acide lactique</strong> — c&apos;est lui qui donne les courbatures du lutteur. Les
              bactéries du <strong>lait caillé (soow)</strong> font la même fermentation ; la levure du{' '}
              <strong>pain</strong>, elle, fait une fermentation alcoolique (2 ATP aussi). La respiration est donc{' '}
              <strong>18 fois plus rentable</strong>.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              <strong>À ne pas confondre :</strong> la respiration <strong>ventilatoire</strong> (TP de 5ème) fait
              entrer l&apos;air dans les poumons ; la respiration <strong>cellulaire</strong>, étudiée ici, utilise ce
              dioxygène dans les <strong>mitochondries</strong> de toutes les cellules pour fabriquer l&apos;ATP.
            </p>
            <p className="text-xs text-ink/50">
              Score : {scoreDetail.exploration}/30 pour l&apos;exploration (3 vues + test sans O₂),{' '}
              {scoreDetail.hypothese}/10 pour l&apos;hypothèse, {scoreDetail.qcm}/60 pour le QCM.
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
