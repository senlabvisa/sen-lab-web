'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Bug, CheckCircle2, Flower2, RefreshCcw, Scissors, Sprout, Wind } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Reproduction sexuée des plantes à fleurs (4ème, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → dissection florale 3D (pétales,
 * étamines, pistil, ovaire en coupe, fruit) → tableau des pièces florales et
 * des agents pollinisateurs → QCM → bilan.
 * Contexte : les vergers de manguiers et d'anacardiers de Casamance, le bissap
 * de la cour, les champs de mil du bassin arachidier.
 */

const FlowerScene = dynamic(() => import('./flower-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-pink-50 text-sm text-ink/50">
      Chargement de la fleur 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Vector = 'insecte' | 'vent';
type HypoRep = 'petale' | 'ovaire' | 'etamine' | null;

const LAYERS: Array<{ title: string; action: string; obs: string }> = [
  {
    title: 'Fleur entière',
    action: 'Fleur entière',
    obs:
      "Observe une fleur de bissap. À l'extérieur, le calice : 5 sépales verts qui protégeaient le bouton. " +
      "Au-dessus, la corolle : 5 pétales rouges. Leur couleur et leur parfum attirent les insectes.",
  },
  {
    title: 'Pétales retirés',
    action: 'Retire les pétales',
    obs:
      "Tu poses les pétales sur la paillasse. Apparaît l'androcée : 8 étamines. Chaque étamine = un filet " +
      "fin surmonté d'une anthère. L'anthère est un sac plein de grains de pollen : ce sont les cellules mâles.",
  },
  {
    title: 'Étamines retirées',
    action: 'Retire les étamines',
    obs:
      "Il ne reste que le pistil (le gynécée). Repère ses 3 parties : le stigmate collant tout en haut, " +
      "le style qui l'allonge, et l'ovaire renflé à la base.",
  },
  {
    title: 'Ovaire en coupe',
    action: "Coupe l'ovaire",
    obs:
      "L'ovaire ouvert contient 3 ovules : les cellules femelles. Un grain de pollen déposé sur le stigmate " +
      "germe : son tube pollinique traverse le style et atteint un ovule. Cellule mâle + cellule femelle = fécondation.",
  },
  {
    title: 'Après la fécondation',
    action: 'Regarde après la fécondation',
    obs:
      "Pétales et étamines fanent et tombent : leur travail est fini. L'ovaire fécondé grossit et devient le FRUIT " +
      "(ici une mangue, coupée en deux). Chaque ovule fécondé devient une GRAINE (le noyau).",
  },
];

const PIECES: Array<{ piece: string; role: string; devient: string }> = [
  { piece: 'Sépale (calice)', role: 'Protège le bouton floral', devient: 'Reste souvent sur le fruit' },
  { piece: 'Pétale (corolle)', role: 'Attire les insectes (couleur, parfum, nectar)', devient: 'Fane et tombe' },
  { piece: 'Filet', role: "Porte l'anthère et l'expose", devient: 'Fane et tombe' },
  { piece: 'Anthère', role: 'Fabrique les grains de pollen (cellules mâles)', devient: 'Fane et tombe' },
  { piece: 'Stigmate', role: 'Retient le grain de pollen (surface collante)', devient: 'Se dessèche' },
  { piece: 'Style', role: 'Traversé par le tube pollinique', devient: 'Se dessèche' },
  { piece: 'Ovaire', role: 'Contient et protège les ovules', devient: '➜ devient le FRUIT' },
  { piece: 'Ovule', role: 'Cellule femelle, fécondée par le pollen', devient: '➜ devient la GRAINE' },
];

const AGENTS: Array<{ plante: string; agent: string; indice: string }> = [
  { plante: 'Manguier, anacardier', agent: 'Insectes (abeilles, mouches)', indice: 'Fleurs parfumées, nectar sucré' },
  { plante: 'Bissap (hibiscus)', agent: 'Insectes', indice: 'Grands pétales rouges très visibles' },
  { plante: 'Mil, maïs, riz', agent: 'Vent (anémogamie)', indice: 'Fleurs vertes, sans pétales colorés' },
  { plante: 'Baobab', agent: 'Chauves-souris, la nuit', indice: 'Grandes fleurs blanches qui s’ouvrent le soir' },
];

const INTRO =
  "Dans un verger de manguiers en Casamance, chaque mangue que tu manges vient d'une fleur. " +
  "Mais comment une fleur devient-elle un fruit rempli de graines ? Aujourd'hui tu vas disséquer une fleur de bissap en 3D : " +
  "tu retires les pétales, puis les étamines, tu coupes l'ovaire, et tu suis un grain de pollen jusqu'à l'ovule.";

const CONCLUSION =
  "Bravo ! Dans une fleur, les étamines fabriquent le pollen, cellules mâles, et l'ovaire abrite les ovules, cellules femelles. " +
  "La pollinisation transporte le pollen jusqu'au stigmate : par les insectes chez le manguier et le bissap, par le vent chez le mil et le maïs. " +
  "Le grain de pollen germe, son tube pollinique descend le style et atteint un ovule : c'est la fécondation. " +
  "Ensuite, l'ovaire devient le fruit et chaque ovule fécondé devient une graine. Sans pollinisation, pas de fécondation, donc pas de fruit ni de récolte.";

export function ReproductionPlantes4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [layer, setLayer] = useState(0);
  const [vector, setVector] = useState<Vector>('insecte');
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));
  const [vectorsTried, setVectorsTried] = useState<Set<Vector>>(new Set(['insecte']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qFruit, setQFruit] = useState<string | null>(null);
  const [qTube, setQTube] = useState<string | null>(null);
  const [qVent, setQVent] = useState<string | null>(null);

  const current = LAYERS[layer];

  function goLayer(next: number) {
    setLayer(next);
    setSeen((prev) => new Set(prev).add(next));
  }

  function chooseVector(v: Vector) {
    setVector(v);
    setVectorsTried((prev) => new Set(prev).add(v));
    setLayer(0);
    setSeen((prev) => new Set(prev).add(0));
  }

  const explore = Math.min(30, seen.size * 6);
  const bonusHypo = hypo === 'ovaire' ? 10 : 0;

  const score = useMemo(() => {
    let s = explore + bonusHypo;
    if (qFruit === 'fruit') s += 20;
    if (qTube === 'tube') s += 20;
    if (qVent === 'vent') s += 20;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [explore, bonusHypo, qFruit, qTube, qVent]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'reproduction-plantes-4eme',
        version: '2.0',
        steps: {
          layersSeen: Array.from(seen).sort((a, b) => a - b),
          vectorsTried: Array.from(vectorsTried),
          hypothesis: hypo,
          qcm: { qFruit, qTube, qVent },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-pink-700 shadow-soft ring-1 ring-pink-100">
                <Flower2 className="h-5 w-5" />
              </span>
              De la fleur au fruit — dissection et fécondation
            </CardTitle>
            <Badge tone="action">SVT · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans un verger de <strong>manguiers</strong> en Casamance, chaque mangue vient d&apos;une fleur. Dans la
              cour, le <strong>bissap</strong> fleurit puis donne des graines. Dans les champs du bassin arachidier, le{' '}
              <strong>mil</strong> aussi fleurit… mais ses fleurs n&apos;ont pas de pétales colorés.
            </p>
            <p className="rounded-xl bg-pink-50 p-3 text-sm text-pink-900 ring-1 ring-pink-100">
              <strong>Objectif :</strong> disséquer une fleur pièce par pièce, trouver où sont les{' '}
              <strong>cellules mâles</strong> (pollen) et les <strong>cellules femelles</strong> (ovules), suivre le{' '}
              <strong>tube pollinique</strong> jusqu&apos;à l&apos;ovule, et comprendre ce que deviennent
              l&apos;<strong>ovaire</strong> et l&apos;<strong>ovule</strong> après la fécondation.
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
              <Sprout className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="action">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Une fleur de manguier se transforme en mangue. Avant de disséquer : selon toi, <strong>quelle pièce</strong>{' '}
            de la fleur grossit et devient le fruit ?
          </p>
          <QcmStep
            label="Mon hypothèse : le fruit vient…"
            tone="action"
            options={[
              { key: 'petale', label: "Du pétale, qui s'épaissit et devient charnu." },
              { key: 'ovaire', label: "De l'ovaire du pistil, qui grossit après la fécondation." },
              { key: 'etamine', label: "De l'étamine, qui se remplit de sucre." },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Disséquer la fleur <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-pink-700" /> Étape 2 — Dissèque la fleur
            </CardTitle>
            <Badge tone="action">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Retire les pièces florales <strong>une par une</strong> et lis les étiquettes posées sur chaque organe.
            Tourne la fleur avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100">
            <div className="aspect-[4/3] w-full">
              <FlowerScene layer={layer} vector={vector} stage={current.title} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {LAYERS.map((l, i) => (
              <Button
                key={l.title}
                size="sm"
                variant={i === layer ? 'gradient' : seen.has(i) ? 'soft' : 'outline'}
                onClick={() => goLayer(i)}
              >
                {seen.has(i) && i !== layer ? '✓ ' : ''}
                {l.action}
              </Button>
            ))}
          </div>

          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>{current.title} :</strong> {current.obs}
          </p>

          <div className="mt-4 rounded-xl bg-pink-50/60 p-3 ring-1 ring-pink-100">
            <p className="mb-2 text-sm font-medium text-ink">Qui transporte le pollen jusqu&apos;au stigmate ?</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={vector === 'insecte' ? 'gradient' : 'outline'} onClick={() => chooseVector('insecte')}>
                <Bug className="h-3.5 w-3.5" /> Un insecte (manguier, bissap)
              </Button>
              <Button size="sm" variant={vector === 'vent' ? 'gradient' : 'outline'} onClick={() => chooseVector('vent')}>
                <Wind className="h-3.5 w-3.5" /> Le vent (mil, maïs)
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink/60">
              {vector === 'insecte'
                ? "L'abeille vient chercher le nectar : le pollen se colle à son corps velu, puis se dépose sur la fleur suivante."
                : "Les fleurs de mil n'ont pas de pétales colorés : elles libèrent énormément de pollen très léger, que le vent emporte."}
            </p>
            <p className="mt-1 text-xs text-ink/50">
              (Ce choix se voit sur la <strong>fleur entière</strong>.)
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={() => goLayer(0)}>
              <RefreshCcw className="h-3.5 w-3.5" /> Revoir la fleur entière
            </Button>
            <Button variant="gradient" disabled={seen.size < LAYERS.length} onClick={() => setStep('mesures')}>
              {seen.size < LAYERS.length
                ? `Encore ${LAYERS.length - seen.size} étape(s) à observer`
                : 'Voir ma fiche de dissection'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ta fiche de dissection</CardTitle>
            <Badge tone="action">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici les pièces que tu as séparées, leur rôle, et ce qu&apos;elles deviennent après la fécondation.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-pink-50 text-xs uppercase tracking-wider text-pink-700">
                <tr>
                  <th className="px-3 py-2 text-left">Pièce florale</th>
                  <th className="px-3 py-2 text-left">Rôle</th>
                  <th className="px-3 py-2 text-left">Après la fécondation</th>
                </tr>
              </thead>
              <tbody>
                {PIECES.map((p) => {
                  const key = p.devient.startsWith('➜');
                  return (
                    <tr key={p.piece} className={'border-t border-night-100 ' + (key ? 'bg-emerald-50 font-semibold' : '')}>
                      <td className="px-3 py-2">{p.piece}</td>
                      <td className="px-3 py-2 text-ink/75">{p.role}</td>
                      <td className="px-3 py-2">{p.devient}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mb-2 mt-4 text-sm font-medium text-ink">Les agents de pollinisation au Sénégal</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {AGENTS.map((a) => (
              <div key={a.plante} className="rounded-xl bg-emerald-50/60 p-3 text-sm ring-1 ring-emerald-100">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{a.plante}</div>
                <div className="font-medium text-ink/85">{a.agent}</div>
                <div className="text-xs text-ink/60">{a.indice}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la fleur
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
              label="Après la fécondation, l'ovaire de la fleur devient…"
              tone="action"
              hint="Souviens-toi de la mangue coupée en deux à la dernière étape."
              options={[
                { key: 'fruit', label: "Le fruit (et chaque ovule fécondé devient une graine)." },
                { key: 'graine', label: "La graine (et l'ovule devient le fruit)." },
                { key: 'fleur', label: 'Une nouvelle fleur identique.' },
              ]}
              value={qFruit}
              onChange={setQFruit}
            />
            <QcmStep
              label="Comment le grain de pollen atteint-il l'ovule ?"
              tone="action"
              options={[
                { key: 'tube', label: 'Il germe sur le stigmate et son tube pollinique traverse le style.' },
                { key: 'seve', label: "Il descend par la sève, dans la tige, jusqu'à l'ovaire." },
                { key: 'racine', label: "Il entre par les racines et remonte jusqu'à la fleur." },
              ]}
              value={qTube}
              onChange={setQTube}
            />
            <QcmStep
              label="Les fleurs de mil et de maïs sont vertes, sans pétales colorés ni nectar. Elles sont pollinisées surtout par…"
              tone="action"
              options={[
                { key: 'vent', label: 'Le vent, qui emporte un pollen très léger et très abondant.' },
                { key: 'insectes', label: 'Les abeilles, attirées par leurs pétales.' },
                { key: 'eau', label: "L'eau de pluie, qui lave le pollen vers le sol." },
              ]}
              value={qVent}
              onChange={setQVent}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qFruit || !qTube || !qVent || busy} onClick={handleValidate}>
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
              Les <strong>étamines</strong> (filet + anthère) fabriquent le <strong>pollen</strong>, cellules mâles.
              L&apos;<strong>ovaire</strong> du pistil abrite les <strong>ovules</strong>, cellules femelles.
            </p>
            <p>
              La <strong>pollinisation</strong> dépose le pollen sur le stigmate — par les <strong>insectes</strong>{' '}
              (manguier, anacardier, bissap) ou par le <strong>vent</strong> (mil, maïs, riz). Le grain germe, son{' '}
              <strong>tube pollinique</strong> traverse le style et atteint un ovule : c&apos;est la{' '}
              <strong>fécondation</strong>.
            </p>
            <p>
              Ensuite l&apos;<strong>ovaire devient le fruit</strong> et chaque <strong>ovule devient une graine</strong>.
              Pas de pollinisation ⇒ pas de fécondation ⇒ pas de mangues dans le verger.
            </p>
            <p className="text-sm text-ink/60">
              Score : dissection ({explore}/30) + hypothèse ({bonusHypo}/10) + QCM ({score - explore - bonusHypo}/60).
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
