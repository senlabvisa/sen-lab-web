'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Egg, Fish, HeartPulse, Microscope, Waves } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Reproduction sexuée des animaux (4ème, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → observation 3D des gamètes, de la
 * fécondation et du développement → tableau comparatif → QCM → bilan.
 *
 * Trois animaux du Sénégal, trois stratégies :
 *   tilapia du fleuve  — fécondation EXTERNE, ovipare, ≈ 1 000 ovules ;
 *   tortue verte       — fécondation INTERNE, ovipare, ≈ 110 œufs enfouis ;
 *   mouton Ladoum      — fécondation INTERNE, vivipare, 1 à 2 agneaux.
 */

const FecondationScene = dynamic(() => import('./fecondation-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Species = 'tilapia' | 'tortue' | 'mouton';
type HypoRep = 'eau' | 'femelle' | 'sable' | null;

const STAGES: Array<{ action: string; titre: string }> = [
  { action: '1 · Les gamètes', titre: 'Les deux gamètes' },
  { action: '2 · La rencontre', titre: 'Où se rencontrent-ils ?' },
  { action: '3 · La fécondation', titre: 'La cellule-œuf' },
  { action: '4 · Le développement', titre: "Où grandit l'embryon ?" },
  { action: '5 · Les jeunes', titre: 'Combien de descendants ?' },
];

type Fiche = {
  nom: string;
  lieu: string;
  fecondation: string;
  mode: string;
  ovule: string;
  descendants: string;
  duree: string;
  protection: string;
  survie: string;
  obs: string[];
};

const FICHES: Record<Species, Fiche> = {
  tilapia: {
    nom: 'Tilapia du fleuve',
    lieu: 'Fleuve Sénégal, lac de Guiers',
    fecondation: 'Externe (dans l’eau)',
    mode: 'Ovipare',
    ovule: '2 mm — gros vitellus',
    descendants: '≈ 1 000 ovules par ponte',
    duree: 'Éclosion en 3 à 5 jours',
    protection: 'La femelle garde les œufs dans sa bouche',
    survie: '≈ 3 % deviennent adultes',
    obs: [
      "Observe les deux gamètes. L'ovule est une grosse cellule ronde de 2 mm : la boule orange à l'intérieur est le vitellus, les réserves de nourriture de l'embryon. Le spermatozoïde, lui, est minuscule (0,05 mm) : une tête qui contient le noyau, une pièce intermédiaire et un long flagelle qui ondule pour nager.",
      "La femelle lâche ses ovules dans l'eau du fleuve, le mâle libère ses spermatozoïdes juste au-dessus. Les gamètes se rencontrent DEHORS, dans l'eau : c'est la fécondation externe. Beaucoup d'ovules ne seront jamais fécondés : voilà pourquoi il en faut environ mille.",
      "Un seul spermatozoïde traverse la membrane de l'ovule. Aussitôt, une membrane de fécondation se forme et empêche les autres d'entrer. Le noyau du spermatozoïde rejoint le noyau de l'ovule et les deux fusionnent : la cellule-œuf est née. Elle contient la moitié des informations du père et la moitié de celles de la mère.",
      "L'œuf fécondé reste dans l'eau. Il est transparent : tu vois l'embryon enroulé autour de sa vésicule vitelline, sa réserve de nourriture. Aucun lien avec la mère : l'embryon se développe HORS du corps de la femelle. Le tilapia est donc ovipare. L'alevin éclot au bout de 3 à 5 jours.",
      "Une ponte donne environ 1 000 ovules. La femelle garde les œufs dans sa bouche, un soin parental rare chez les poissons, mais la plupart des alevins seront quand même mangés : à peine 3 % deviennent des adultes, soit une trentaine de poissons.",
    ],
  },
  tortue: {
    nom: 'Tortue verte',
    lieu: 'Langue de Barbarie, Saint-Louis',
    fecondation: 'Interne (accouplement en mer)',
    mode: 'Ovipare',
    ovule: '≈ 30 mm — énorme vitellus',
    descendants: '≈ 110 œufs par ponte',
    duree: 'Incubation ≈ 60 jours dans le sable',
    protection: 'Nid enfoui, puis plus aucun soin',
    survie: '≈ 1 sur 1 000',
    obs: [
      "L'ovule de la tortue verte est énorme : environ 30 mm, presque entièrement rempli de vitellus. Normal : l'embryon devra vivre 60 jours sur ces seules réserves, enfermé dans un œuf. Le spermatozoïde, lui, garde la même taille minuscule que chez tous les animaux.",
      "Le mâle et la femelle s'accouplent en mer. Les spermatozoïdes sont déposés DANS les voies génitales de la femelle : c'est la fécondation interne. Les gamètes sont à l'abri, donc très peu se perdent. La femelle ne libère qu'un ovule à la fois.",
      "Comme chez tous les animaux, un seul spermatozoïde féconde l'ovule. Les deux noyaux fusionnent et donnent la cellule-œuf. Attention : la fécondation est interne, mais l'œuf sera pondu ensuite. Fécondation interne ne veut donc PAS dire vivipare.",
      "La femelle sort de l'eau la nuit, creuse le sable de la plage et pond une centaine d'œufs à coquille souple, puis rebouche le nid et repart. Regarde l'œuf en coupe : l'embryon repose sur son jaune. Aucun échange avec la mère : la tortue est ovipare. Après 60 jours, les tortillons sortent du sable.",
      "Environ 110 œufs par ponte. Une fois le nid rebouché, il n'y a plus aucun soin : crabes, oiseaux et poissons attendent les tortillons. On estime qu'un seul individu sur mille atteint l'âge adulte.",
    ],
  },
  mouton: {
    nom: 'Mouton Ladoum',
    lieu: 'Bergeries de Dakar et de Kaolack (Tabaski)',
    fecondation: 'Interne (accouplement)',
    mode: 'Vivipare',
    ovule: '0,12 mm — presque pas de réserves',
    descendants: '1 à 2 agneaux par portée',
    duree: 'Gestation ≈ 150 jours (5 mois)',
    protection: 'Gestation puis allaitement',
    survie: '> 90 %',
    obs: [
      "Surprise : l'ovule de la brebis est minuscule, 0,12 mm, à peine visible à l'œil nu. Il n'a presque pas de vitellus. Pourquoi ? Parce que l'embryon sera nourri en continu par sa mère : il n'a pas besoin d'emporter des réserves. Autour de l'ovule, tu vois les cellules folliculaires qui le protègent.",
      "Lors de l'accouplement, le bélier dépose les spermatozoïdes dans les voies génitales de la brebis : fécondation interne. Des millions de spermatozoïdes remontent, mais un seul atteindra l'ovule libéré par l'ovaire.",
      "Le spermatozoïde entre dans l'ovule, les deux noyaux fusionnent : c'est la cellule-œuf. Elle va se diviser en 2, 4, 8 cellules… puis s'accrocher à la paroi de l'utérus. C'est le début de la gestation.",
      "L'embryon se développe DANS l'utérus de la brebis. Le placenta, collé à la paroi, et le cordon ombilical lui apportent le dioxygène et les nutriments du sang maternel, et évacuent ses déchets. La brebis est vivipare : au bout de 150 jours, elle met bas un agneau vivant, qu'elle allaitera.",
      "1 à 2 agneaux seulement par portée. Mais l'agneau est protégé 5 mois dans l'utérus, puis allaité et gardé par le troupeau : plus de 90 % des agneaux atteignent l'âge adulte. Peu de descendants, mais beaucoup de protection.",
    ],
  },
};

const ORDRE: Species[] = ['tilapia', 'tortue', 'mouton'];

const INTRO =
  "Au bord du fleuve Sénégal, à Richard-Toll, un pêcheur remonte un tilapia. Sur la plage de la Langue de Barbarie, " +
  "une tortue verte sort de la mer la nuit pour creuser le sable et pondre. Dans une bergerie de Kaolack, une brebis Ladoum " +
  "met bas un agneau avant la Tabaski. Trois animaux très différents, mais un même point de départ : la rencontre d'une " +
  "cellule mâle et d'une cellule femelle. Aujourd'hui tu vas observer les gamètes, la fécondation, puis le développement du jeune.";

const CONCLUSION =
  "Bravo ! Chez ces trois animaux la reproduction est sexuée : un spermatozoïde, gamète mâle, féconde un ovule, gamète femelle, " +
  "et il en résulte une cellule-œuf. Chez le tilapia la fécondation est externe : les gamètes se rencontrent dans l'eau du fleuve. " +
  "Chez la tortue verte et le mouton Ladoum, elle est interne : elle a lieu dans le corps de la femelle. Ensuite, le développement change. " +
  "Le tilapia et la tortue sont ovipares : leur embryon grandit dans un œuf, nourri par le vitellus. Le mouton est vivipare : " +
  "l'agneau grandit dans l'utérus, nourri par le placenta pendant cinq mois. Retiens enfin la règle : moins les jeunes sont protégés, " +
  "plus les parents en produisent. Mille ovules chez le tilapia, cent dix œufs chez la tortue, un seul agneau chez la brebis.";

export function ReproductionAnimale4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [species, setSpecies] = useState<Species>('tilapia');
  const [stage, setStage] = useState(0);
  const [seenStages, setSeenStages] = useState<Set<number>>(new Set([0]));
  const [seenSpecies, setSeenSpecies] = useState<Set<Species>>(new Set(['tilapia']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qLieu, setQLieu] = useState<string | null>(null);
  const [qMode, setQMode] = useState<string | null>(null);
  const [qNombre, setQNombre] = useState<string | null>(null);

  const fiche = FICHES[species];

  function goStage(next: number) {
    setStage(next);
    setSeenStages((prev) => new Set(prev).add(next));
  }

  function goSpecies(sp: Species) {
    setSpecies(sp);
    setSeenSpecies((prev) => new Set(prev).add(sp));
  }

  const ptsStages = Math.min(20, seenStages.size * 4);
  const ptsSpecies = Math.min(15, seenSpecies.size * 5);
  const ptsHypo = hypo === 'femelle' ? 10 : 0;
  const ptsQcm = useMemo(() => {
    let s = 0;
    if (qLieu === 'externe') s += 20;
    if (qMode === 'ovipare-interne') s += 20;
    if (qNombre === 'protection') s += 15;
    return s;
  }, [qLieu, qMode, qNombre]);

  const score = Math.max(0, Math.min(100, ptsStages + ptsSpecies + ptsHypo + ptsQcm));
  const complet = seenStages.size >= STAGES.length && seenSpecies.size >= ORDRE.length;

  async function handleValidate() {
    await onComplete(
      {
        shell: 'reproduction-animale-4eme',
        version: '2.0',
        steps: {
          stagesSeen: Array.from(seenStages).sort((a, b) => a - b),
          speciesTried: Array.from(seenSpecies),
          hypothesis: hypo,
          qcm: { qLieu, qMode, qNombre },
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
                <Fish className="h-5 w-5" />
              </span>
              Du gamète au jeune — reproduction sexuée des animaux
            </CardTitle>
            <Badge tone="action">SVT · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À Richard-Toll, un pêcheur remonte un <strong>tilapia</strong> du fleuve. Sur la{' '}
              <strong>Langue de Barbarie</strong>, une tortue verte creuse le sable pour pondre. À Kaolack, une brebis{' '}
              <strong>Ladoum</strong> met bas un agneau avant la Tabaski. Trois animaux, un même point de départ.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> reconnaître les deux <strong>gamètes</strong>, distinguer la fécondation{' '}
              <strong>externe</strong> de la fécondation <strong>interne</strong>, différencier un animal{' '}
              <strong>ovipare</strong> d&apos;un animal <strong>vivipare</strong>, et expliquer pourquoi certains
              animaux font mille descendants et d&apos;autres un seul.
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
              <Egg className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="action">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            La tortue verte pond ses œufs dans le sable de la plage, comme un poisson pond ses ovules dans l&apos;eau.
            Avant d&apos;observer : selon toi, <strong>où le spermatozoïde rencontre-t-il l&apos;ovule</strong> chez la
            tortue ?
          </p>
          <QcmStep
            label="Mon hypothèse : chez la tortue verte, la fécondation a lieu…"
            tone="action"
            hint="Attention : pondre des œufs et féconder ne se passent pas forcément au même endroit."
            options={[
              { key: 'eau', label: "Dans l'eau de mer, comme chez le poisson." },
              { key: 'femelle', label: "Dans le corps de la femelle, avant la ponte." },
              { key: 'sable', label: 'Dans le sable du nid, après la ponte.' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer au labo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-emerald-700" /> Étape 2 — Observe et compare
            </CardTitle>
            <Badge tone="action">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un animal, puis avance étape par étape. Change d&apos;animal à chaque étape pour comparer. Tourne la
            scène avec ta souris / ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {ORDRE.map((sp) => (
              <Button
                key={sp}
                size="sm"
                variant={sp === species ? 'gradient' : seenSpecies.has(sp) ? 'soft' : 'outline'}
                onClick={() => goSpecies(sp)}
              >
                {sp === 'tilapia' ? <Fish className="h-3.5 w-3.5" /> : null}
                {sp === 'tortue' ? <Waves className="h-3.5 w-3.5" /> : null}
                {sp === 'mouton' ? <HeartPulse className="h-3.5 w-3.5" /> : null}
                {FICHES[sp].nom}
              </Button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <FecondationScene species={species} stage={stage} label={STAGES[stage].titre} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {STAGES.map((s, i) => (
              <Button
                key={s.action}
                size="sm"
                variant={i === stage ? 'gradient' : seenStages.has(i) ? 'soft' : 'outline'}
                onClick={() => goStage(i)}
              >
                {seenStages.has(i) && i !== stage ? '✓ ' : ''}
                {s.action}
              </Button>
            ))}
          </div>

          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>
              {fiche.nom} — {STAGES[stage].titre} :
            </strong>{' '}
            {fiche.obs[stage]}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="Fécondation" value={fiche.fecondation} />
            <Stat label="Développement" value={fiche.mode} />
            <Stat label="Ovule" value={fiche.ovule} />
            <Stat label="Descendants" value={fiche.descendants} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              Étapes vues : {seenStages.size}/{STAGES.length} · Animaux comparés : {seenSpecies.size}/{ORDRE.length}
            </span>
            <Button variant="gradient" disabled={!complet} onClick={() => setStep('mesures')}>
              {complet
                ? 'Voir mon tableau comparatif'
                : `Encore ${STAGES.length - seenStages.size} étape(s) et ${ORDRE.length - seenSpecies.size} animal(aux)`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ton tableau comparatif</CardTitle>
            <Badge tone="action">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare tes trois observations. Lis la dernière ligne de bas en haut : plus les jeunes sont protégés, moins
            il en faut.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Critère</th>
                  {ORDRE.map((sp) => (
                    <th key={sp} className="px-3 py-2 text-left">
                      {FICHES[sp].nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Lieu au Sénégal', 'lieu'],
                    ['Fécondation', 'fecondation'],
                    ['Développement', 'mode'],
                    ["Taille de l'ovule", 'ovule'],
                    ['Durée avant la naissance', 'duree'],
                    ['Descendants', 'descendants'],
                    ['Protection des jeunes', 'protection'],
                    ['Survie jusqu’à l’adulte', 'survie'],
                  ] as Array<[string, keyof Omit<Fiche, 'obs'>]>
                ).map(([titre, cle]) => {
                  const cle2 = cle === 'descendants' || cle === 'survie';
                  return (
                    <tr key={titre} className={'border-t border-night-100 ' + (cle2 ? 'bg-emerald-50/70 font-medium' : '')}>
                      <td className="px-3 py-2 text-ink/70">{titre}</td>
                      {ORDRE.map((sp) => (
                        <td key={sp} className="px-3 py-2">
                          {FICHES[sp][cle]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Regle titre="Gamètes" texte="Spermatozoïde (petit, mobile) + ovule (gros, immobile) → une cellule-œuf." />
            <Regle
              titre="Fécondation"
              texte="Externe = dans le milieu (eau). Interne = dans le corps de la femelle. Rien à voir avec la ponte."
            />
            <Regle
              titre="Développement"
              texte="Ovipare = l'embryon grandit dans un œuf, sur ses réserves. Vivipare = dans l'utérus, nourri par le placenta."
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la 3D
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
              label="Chez le tilapia du fleuve, où le spermatozoïde rencontre-t-il l'ovule ?"
              tone="action"
              options={[
                { key: 'externe', label: "Dans l'eau, hors du corps des parents : fécondation externe." },
                { key: 'interne', label: 'Dans le corps de la femelle, comme chez le mouton.' },
                { key: 'apres', label: "Dans l'œuf, une fois que la femelle a pondu." },
              ]}
              value={qLieu}
              onChange={setQLieu}
            />
            <QcmStep
              label="La tortue verte s'accouple en mer, puis pond des œufs dans le sable. Elle est donc…"
              tone="action"
              hint="Deux questions différentes : où se fait la fécondation ? où grandit l'embryon ?"
              options={[
                { key: 'ovipare-interne', label: "À fécondation interne et ovipare : l'embryon grandit dans l'œuf, hors de la mère." },
                { key: 'vivipare', label: 'Vivipare, comme la brebis Ladoum.' },
                { key: 'ovipare-externe', label: 'À fécondation externe et ovipare, comme le tilapia.' },
              ]}
              value={qMode}
              onChange={setQMode}
            />
            <QcmStep
              label="Une brebis Ladoum met bas 1 agneau ; un tilapia pond environ 1 000 ovules. Pourquoi cette différence ?"
              tone="action"
              options={[
                { key: 'protection', label: "Moins les jeunes sont protégés, plus il en faut pour que quelques-uns survivent." },
                { key: 'taille', label: 'Parce que le tilapia est plus gros que la brebis.' },
                { key: 'eau', label: "Parce que l'eau du fleuve fabrique des ovules en plus." },
              ]}
              value={qNombre}
              onChange={setQNombre}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qLieu || !qMode || !qNombre || busy} onClick={handleValidate}>
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
              La reproduction sexuée, c&apos;est toujours la même chose : un <strong>spermatozoïde</strong> (gamète mâle,
              petit et mobile) féconde un <strong>ovule</strong> (gamète femelle, gros et immobile). Les deux noyaux
              fusionnent et donnent une <strong>cellule-œuf</strong>, première cellule du nouvel individu.
            </p>
            <p>
              Ce qui change, c&apos;est <strong>où</strong>. Fécondation <strong>externe</strong> dans l&apos;eau du
              fleuve chez le tilapia ; fécondation <strong>interne</strong>, dans le corps de la femelle, chez la tortue
              verte et le mouton Ladoum. Ensuite : <strong>ovipare</strong> (l&apos;embryon grandit dans un œuf, sur son
              vitellus) pour le tilapia et la tortue ; <strong>vivipare</strong> (l&apos;embryon grandit dans
              l&apos;utérus, nourri par le placenta) pour le mouton.
            </p>
            <p>
              Enfin : <strong>1 000 ovules</strong> chez le tilapia, <strong>110 œufs</strong> chez la tortue,{' '}
              <strong>1 agneau</strong> chez la brebis. Moins les jeunes sont protégés, plus les parents en produisent.
            </p>
            <p className="text-sm text-ink/60">
              Score : étapes observées ({ptsStages}/20) + animaux comparés ({ptsSpecies}/15) + hypothèse ({ptsHypo}/10) +
              QCM ({ptsQcm}/55).
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
      <div className="text-[11px] font-semibold leading-tight text-emerald-900">{value}</div>
    </div>
  );
}

function Regle({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="rounded-xl bg-emerald-50/60 p-3 text-sm ring-1 ring-emerald-100">
      <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{titre}</div>
      <div className="text-xs text-ink/75">{texte}</div>
    </div>
  );
}
