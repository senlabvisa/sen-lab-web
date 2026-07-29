'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ActivitySquare, ArrowRight, CalendarDays, CheckCircle2, Microscope, RefreshCcw } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Procréation humaine : cycle menstruel, fécondation et nidation (3ème, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (deux vues :
 * graphe hormonal et thermique du cycle sur 28 jours / rencontre des gamètes
 * puis segmentation et nidation) → mesures (tableaux du cycle, des gamètes et
 * des grandes étapes de la grossesse) → QCM → bilan.
 *
 * Le TP est recadré sur l'objet d'étude scientifique — les cellules
 * reproductrices et les courbes du cycle — conformément au programme de SVT
 * de 3ème (éducation à la santé de la reproduction, BFEM).
 */

const CycleScene = dynamic(() => import('./cycle-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type View = 'cycle' | 'fecondation';
type HypoRep = 'j5' | 'j14' | 'j28' | null;

// ── Les quatre phases du cycle menstruel (cycle de référence : 28 jours) ──
type PhaseKey = 'menstruelle' | 'folliculaire' | 'ovulation' | 'luteale';

const PHASES: Array<{ key: PhaseKey; to: number; jours: string; title: string; obs: string; hormone: string; court: string }> = [
  {
    key: 'menstruelle',
    to: 5,
    jours: 'j1 – j5',
    title: 'Phase menstruelle (les règles)',
    obs: "La muqueuse utérine se détache et est éliminée : ce sont les règles. Le jour 1 du cycle est le premier jour des règles.",
    hormone: 'Hormones ovariennes au plus bas',
    court: 'Aucune (taux bas)',
  },
  {
    key: 'folliculaire',
    to: 13,
    jours: 'j6 – j13',
    title: 'Phase folliculaire',
    obs: "Un follicule mûrit dans l'ovaire. Les œstrogènes augmentent et la muqueuse utérine s'épaissit à nouveau.",
    hormone: 'Œstrogènes en hausse',
    court: 'Œstrogènes ↑',
  },
  {
    key: 'ovulation',
    to: 14,
    jours: 'j14',
    title: 'Ovulation',
    obs: "Le follicule mûr libère l'ovule dans la trompe. Juste après, la température basale monte d'environ 0,3 à 0,5 °C.",
    hormone: "Pic d'œstrogènes",
    court: 'Pic d’œstrogènes',
  },
  {
    key: 'luteale',
    to: 28,
    jours: 'j15 – j28',
    title: 'Phase lutéale',
    obs: "Le follicule devient corps jaune et sécrète la progestérone : la muqueuse utérine reste épaisse. Sans fécondation, elle se détache et un nouveau cycle commence.",
    hormone: 'Progestérone dominante',
    court: 'Progestérone',
  },
];

function phaseAt(day: number) {
  return PHASES.find((p) => day <= p.to) ?? PHASES[PHASES.length - 1];
}

// ── Du gamète à la nidation (jours après la fécondation) ────────────────
type DevKey = 'fecondation' | 'zygote' | 'segmentation' | 'morula' | 'blastocyste' | 'nidation';

const DEV: Array<{ key: DevKey; to: number; title: string; obs: string }> = [
  {
    key: 'fecondation',
    to: 0,
    title: 'Fécondation, dans la trompe',
    obs: "Des milliers de spermatozoïdes atteignent l'ovule, mais un seul traverse la zone pellucide. Aussitôt, la membrane devient infranchissable : les autres sont bloqués.",
  },
  {
    key: 'zygote',
    to: 1,
    title: 'Cellule-œuf (zygote)',
    obs: "Les deux noyaux fusionnent : une seule cellule à 46 chromosomes, 23 apportés par l'ovule et 23 par le spermatozoïde.",
  },
  {
    key: 'segmentation',
    to: 4,
    title: 'Segmentation',
    obs: "La cellule-œuf se divise : 2, puis 4, puis 8 cellules. L'embryon ne grossit pas — ce sont ses cellules qui deviennent plus petites.",
  },
  {
    key: 'morula',
    to: 5,
    title: 'Morula (16 cellules)',
    obs: "Les cellules serrées forment une petite mûre. L'embryon descend la trompe vers l'utérus.",
  },
  {
    key: 'blastocyste',
    to: 6,
    title: 'Blastocyste',
    obs: "L'embryon devient creux et arrive dans la cavité utérine. Il perd sa zone pellucide.",
  },
  {
    key: 'nidation',
    to: 9,
    title: 'Nidation',
    obs: "Vers le 6e ou 7e jour, l'embryon s'enfonce dans la muqueuse utérine épaissie. La grossesse commence : elle durera environ 9 mois.",
  },
];

function devAt(d: number) {
  return DEV.find((s) => d <= s.to) ?? DEV[DEV.length - 1];
}

const GAMETES: Array<{ cellule: string; origine: string; duree: string; chr: string }> = [
  { cellule: 'Ovule', origine: "Libéré par l'ovaire à j14 (un seul par cycle)", duree: 'Environ 24 heures', chr: '23 chromosomes' },
  { cellule: 'Spermatozoïde', origine: 'Produit en continu par les testicules', duree: 'De 3 à 5 jours dans les voies génitales', chr: '23 chromosomes' },
  { cellule: 'Cellule-œuf', origine: 'Fusion des deux gamètes (fécondation)', duree: 'Se divise dès les premières heures', chr: '46 chromosomes' },
];

const GROSSESSE: Array<{ periode: string; etape: string }> = [
  { periode: '1er mois', etape: "Nidation, puis mise en place des premiers organes. L'embryon mesure environ 5 mm." },
  { periode: '2e mois', etape: "Les organes se forment (organogenèse). L'embryon mesure environ 3 cm." },
  { periode: '3e mois', etape: "L'embryon devient fœtus : tous les organes existent, ils vont grandir. Environ 9 cm." },
  { periode: '4e – 6e mois', etape: 'Le fœtus grandit vite et bouge ; la mère perçoit les mouvements. Environ 30 cm à 6 mois.' },
  { periode: '7e – 8e mois', etape: 'Prise de poids importante et maturation des poumons.' },
  { periode: '9e mois', etape: 'Le fœtus mesure environ 50 cm et pèse environ 3,3 kg. Accouchement vers 9 mois.' },
];

const INTRO =
  "Au Sénégal, les séances d'éducation à la santé de la reproduction, au collège comme au poste de santé, " +
  "s'appuient toutes sur la même base scientifique : le cycle menstruel. Chez la femme, un ovule est libéré par l'ovaire " +
  "vers le quatorzième jour du cycle. Cet ovule ne vit qu'environ vingt-quatre heures, alors que les spermatozoïdes " +
  "peuvent survivre trois à cinq jours. Si les deux cellules reproductrices se rencontrent, il y a fécondation. " +
  "Aujourd'hui tu vas lire les courbes du cycle, puis observer la rencontre des gamètes jusqu'à la nidation.";

const CONCLUSION =
  "Le cycle menstruel dure environ vingt-huit jours et commence au premier jour des règles. L'ovulation a lieu vers le " +
  "quatorzième jour : l'ovaire libère un ovule. Les hormones ovariennes, œstrogènes puis progestérone, préparent la muqueuse " +
  "utérine ; après l'ovulation, la température basale augmente d'environ trois dixièmes de degré. " +
  "Dans la trompe, un seul spermatozoïde pénètre dans l'ovule : c'est la fécondation. La cellule-œuf obtenue possède " +
  "quarante-six chromosomes. Elle se divise en deux, quatre, huit cellules, forme une morula puis un blastocyste, et " +
  "s'implante dans la muqueuse utérine vers le septième jour : c'est la nidation. La grossesse commence et dure environ neuf mois.";

export function ProcreationHumaine3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [view, setView] = useState<View>('cycle');
  const [day, setDay] = useState(1);
  const [devDay, setDevDay] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(new Set(['menstruelle', 'fecondation']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qOvul, setQOvul] = useState<string | null>(null);
  const [qSperm, setQSperm] = useState<string | null>(null);
  const [qNidation, setQNidation] = useState<string | null>(null);

  const phase = useMemo(() => phaseAt(day), [day]);
  const stage = useMemo(() => devAt(devDay), [devDay]);
  const fertile = day >= 9 && day <= 15;

  function changeDay(next: number) {
    setDay(next);
    setSeen((prev) => new Set(prev).add(phaseAt(next).key));
  }

  function changeDevDay(next: number) {
    setDevDay(next);
    setSeen((prev) => new Set(prev).add(devAt(next).key));
  }

  const exploration = Math.min(30, seen.size * 3);
  const score = useMemo(() => {
    let s = exploration;
    if (hypo === 'j14') s += 10;
    if (qOvul === 'j14') s += 20;
    if (qSperm === 'un') s += 20;
    if (qNidation === 'muqueuse') s += 20;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [exploration, hypo, qOvul, qSperm, qNidation]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'procreation-humaine-3eme',
        version: '2.0',
        steps: {
          stagesSeen: Array.from(seen),
          lastCycleDay: day,
          lastDevDay: devDay,
          hypothesis: hypo,
          qcm: { qOvul, qSperm, qNidation },
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
                <Microscope className="h-5 w-5" />
              </span>
              Procréation humaine — du cycle à la nidation
            </CardTitle>
            <Badge tone="action">SVT · 3ème · BFEM</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans les postes de santé du Sénégal, le suivi de la santé de la reproduction et la planification familiale
              reposent sur une même base scientifique : le <strong>cycle menstruel</strong>. Il dure en moyenne{' '}
              <strong>28 jours</strong> et se répète du premier jour des règles au premier jour des règles suivantes.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> lire les courbes hormonales et thermiques du cycle pour situer l&apos;
              <strong>ovulation</strong>, puis observer la <strong>rencontre des gamètes</strong>, la{' '}
              <strong>fécondation</strong> et la <strong>nidation</strong> dans la muqueuse utérine.
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
              <CalendarDays className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="action">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le cycle commence au <strong>jour 1</strong>, premier jour des règles, et dure <strong>28 jours</strong>.
            Avant d&apos;observer les courbes : selon toi, quel jour l&apos;ovaire libère-t-il l&apos;ovule ?
          </p>
          <QcmStep
            label="Mon hypothèse : l'ovulation a lieu vers le…"
            tone="action"
            options={[
              { key: 'j5', label: 'Jour 5, pendant les règles' },
              { key: 'j14', label: 'Jour 14, au milieu du cycle' },
              { key: 'j28', label: 'Jour 28, à la fin du cycle' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivitySquare className="h-5 w-5 text-emerald-700" /> Étape 2 — Observe et mesure
            </CardTitle>
            <Badge tone="action">2/4</Badge>
          </CardHeader>

          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant={view === 'cycle' ? 'gradient' : 'outline'} size="sm" onClick={() => setView('cycle')}>
              Vue 1 — Le cycle en courbes
            </Button>
            <Button variant={view === 'fecondation' ? 'gradient' : 'outline'} size="sm" onClick={() => setView('fecondation')}>
              Vue 2 — Gamètes et nidation
            </Button>
          </div>

          <p className="mb-3 text-sm text-ink/70">
            {view === 'cycle'
              ? 'Fais glisser le curseur du jour 1 au jour 28. Suis les deux courbes hormonales et la courbe de température basale. Repère la bande jaune : l’ovulation.'
              : "Fais glisser le curseur du jour 0 (fécondation) au jour 9 (nidation). Compte les cellules à chaque division. Tourne la scène avec ta souris / ton doigt."}
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <CycleScene view={view} day={day} devDay={devDay} phaseLabel={phase.title} stageLabel={stage.title} />
            </div>
          </div>

          {view === 'cycle' ? (
            <>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="jour">Jour du cycle</Label>
                  <span className="font-mono text-emerald-700">
                    j{day} · {phase.title}
                  </span>
                </div>
                <input
                  id="jour"
                  type="range"
                  min={1}
                  max={28}
                  step={1}
                  value={day}
                  onChange={(e) => changeDay(Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="Jour" value={`${day} / 28`} />
                <Stat label="Hormone dominante" value={phase.court} />
                <Stat label="Fenêtre de fécondité" value={fertile ? 'Oui (j9 – j15)' : 'Non'} />
              </div>
              <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
                <strong>Jour {day} — {phase.title} :</strong> {phase.obs}
              </p>
            </>
          ) : (
            <>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="dev">Jours après la fécondation</Label>
                  <span className="font-mono text-emerald-700">
                    j{devDay} · {stage.title}
                  </span>
                </div>
                <input
                  id="dev"
                  type="range"
                  min={0}
                  max={9}
                  step={1}
                  value={devDay}
                  onChange={(e) => changeDevDay(Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>
              <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
                <strong>Jour {devDay} — {stage.title} :</strong> {stage.obs}
              </p>
            </>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            {[...PHASES, ...DEV].map((s) => (
              <Badge key={s.key} tone={seen.has(s.key) ? 'action' : 'neutral'} size="sm">
                {seen.has(s.key) ? '✓ ' : ''}
                {s.title}
              </Badge>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                changeDay(1);
                changeDevDay(0);
              }}
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Recommencer
            </Button>
            <Button variant="gradient" disabled={seen.size < 8} onClick={() => setStep('mesures')}>
              {seen.size < 8 ? `Observe encore ${8 - seen.size} étape(s)` : 'Voir mes relevés'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes relevés</CardTitle>
            <Badge tone="action">3/4</Badge>
          </CardHeader>

          <p className="mb-2 text-sm font-medium text-ink">Le cycle menstruel (référence : 28 jours)</p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Jours</th>
                  <th className="px-3 py-2 text-left">Phase</th>
                  <th className="px-3 py-2 text-left">Ce qui se passe</th>
                  <th className="px-3 py-2 text-left">Hormone</th>
                </tr>
              </thead>
              <tbody>
                {PHASES.map((p) => (
                  <tr key={p.key} className="border-t border-night-100">
                    <td className="px-3 py-2 font-mono">{p.jours}</td>
                    <td className="px-3 py-2 font-medium">{p.title}</td>
                    <td className="px-3 py-2 text-ink/75">{p.obs}</td>
                    <td className="px-3 py-2 text-ink/75">{p.hormone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            Température basale : environ 36,5 °C avant l&apos;ovulation, environ 36,9 °C après. Ce{' '}
            <strong>plateau thermique</strong> est dû à la progestérone : il confirme que l&apos;ovulation a eu lieu.
          </p>

          <p className="mb-2 mt-4 text-sm font-medium text-ink">Les cellules reproductrices (gamètes)</p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Cellule</th>
                  <th className="px-3 py-2 text-left">Origine</th>
                  <th className="px-3 py-2 text-left">Durée de vie</th>
                  <th className="px-3 py-2 text-left">Noyau</th>
                </tr>
              </thead>
              <tbody>
                {GAMETES.map((g) => (
                  <tr key={g.cellule} className="border-t border-night-100">
                    <td className="px-3 py-2 font-medium">{g.cellule}</td>
                    <td className="px-3 py-2 text-ink/75">{g.origine}</td>
                    <td className="px-3 py-2 font-mono text-ink/75">{g.duree}</td>
                    <td className="px-3 py-2 font-mono text-ink/75">{g.chr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            L&apos;ovule vit 24 h et les spermatozoïdes 3 à 5 jours : la <strong>fenêtre de fécondité</strong> s&apos;étend
            donc d&apos;environ <strong>j9 à j15</strong> dans un cycle régulier de 28 jours.
          </p>

          <p className="mb-2 mt-4 text-sm font-medium text-ink">Les grandes étapes de la grossesse (≈ 9 mois)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {GROSSESSE.map((g) => (
              <div key={g.periode} className="rounded-xl bg-emerald-50/60 p-3 text-sm ring-1 ring-emerald-100">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{g.periode}</div>
                <div className="text-ink/80">{g.etape}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la scène
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
              label="Dans un cycle régulier de 28 jours, l'ovulation se produit vers le…"
              tone="action"
              hint="Repère le pic d'œstrogènes et la montée de la température."
              options={[
                { key: 'j5', label: 'Jour 5' },
                { key: 'j14', label: 'Jour 14' },
                { key: 'j28', label: 'Jour 28' },
              ]}
              value={qOvul}
              onChange={setQOvul}
            />
            <QcmStep
              label="Lors de la fécondation, combien de spermatozoïdes pénètrent dans l'ovule ?"
              tone="action"
              options={[
                { key: 'un', label: "Un seul : dès son entrée, la membrane de l'ovule devient infranchissable." },
                { key: 'plusieurs', label: 'Plusieurs, pour être sûr que la fécondation réussisse.' },
                { key: 'tous', label: 'Tous ceux qui arrivent jusqu’à l’ovule.' },
              ]}
              value={qSperm}
              onChange={setQSperm}
            />
            <QcmStep
              label="La nidation, c'est…"
              tone="action"
              options={[
                { key: 'muqueuse', label: "l'implantation de l'embryon dans la muqueuse utérine, vers le 7e jour." },
                { key: 'ovulation', label: "la libération de l'ovule par l'ovaire." },
                { key: 'regles', label: "l'élimination de la muqueuse utérine pendant les règles." },
              ]}
              value={qNidation}
              onChange={setQNidation}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qOvul || !qSperm || !qNidation || busy} onClick={handleValidate}>
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
              Le cycle menstruel dure environ <strong>28 jours</strong> et l&apos;<strong>ovulation</strong> a lieu vers
              le <strong>jour 14</strong>. Les <strong>œstrogènes</strong> puis la <strong>progestérone</strong>{' '}
              épaississent la muqueuse utérine ; après l&apos;ovulation, la température basale monte d&apos;environ
              0,3 à 0,5 °C (plateau thermique).
            </p>
            <p>
              Dans la trompe, <strong>un seul spermatozoïde</strong> pénètre dans l&apos;ovule : c&apos;est la{' '}
              <strong>fécondation</strong>. La <strong>cellule-œuf</strong> obtenue possède{' '}
              <strong>46 chromosomes</strong> (23 + 23). Elle se divise (2, 4, 8, 16 cellules), devient morula puis
              blastocyste, et s&apos;implante dans la muqueuse utérine vers le <strong>7e jour</strong> : c&apos;est la{' '}
              <strong>nidation</strong>. La grossesse dure alors environ <strong>9 mois</strong>.
            </p>
            <p className="text-sm text-ink/60">
              Score : exploration des phases et des stades ({exploration}/30) + hypothèse ({hypo === 'j14' ? 10 : 0}/10) +
              QCM ({score - exploration - (hypo === 'j14' ? 10 : 0)}/60).
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
      <div className="font-mono text-xs font-bold text-emerald-800">{value}</div>
    </div>
  );
}
