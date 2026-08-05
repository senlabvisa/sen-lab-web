'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dna,
  Microscope,
  Sprout,
  Target,
} from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Les divisions cellulaires : mitose et méiose (SVT, Terminale S, Bac).
 *
 * Caryotype simplifié 2n = 4 (deux paires d'homologues, bleu = paternel,
 * rouge = maternel). L'élève pilote la phase de la division et lit en direct
 * le nombre de chromosomes par cellule et la quantité d'ADN (en Q = ADN d'un
 * lot haploïde : 2Q en G1, 4Q après la phase S, Q dans un gamète).
 *
 *   Mitose : 1 division → 2 cellules à 2n = 4, clones de la cellule mère.
 *   Méiose : 2 divisions → 4 cellules à n = 2, toutes différentes
 *            (crossing-over en prophase I + brassage interchromosomique).
 *
 * Flow Lab Premium : intro → hypothèse → manip 3D → mesures → QCM → bilan.
 */

const DivisionScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-pink-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Mode = 'mitose' | 'meiose';
type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'moitie' | 'identique' | 'double' | null;

type PhaseInfo = { name: string; short: string; nChr: number; adn: number; cells: number; note: string };

const PHASES: Record<Mode, PhaseInfo[]> = {
  mitose: [
    {
      name: 'Interphase — après la phase S',
      short: 'Interphase',
      nChr: 4,
      adn: 4,
      cells: 1,
      note: "L'ADN vient d'être répliqué : chaque chromosome porte maintenant 2 chromatides sœurs identiques. La quantité d'ADN a doublé (2Q → 4Q) mais le nombre de chromosomes n'a pas bougé.",
    },
    {
      name: 'Prophase',
      short: 'Prophase',
      nChr: 4,
      adn: 4,
      cells: 1,
      note: "Les chromosomes se condensent et deviennent visibles. L'enveloppe nucléaire se rompt, les centrosomes gagnent les pôles et le fuseau achromatique se construit.",
    },
    {
      name: 'Métaphase',
      short: 'Métaphase',
      nChr: 4,
      adn: 4,
      cells: 1,
      note: 'Les 4 chromosomes, chacun à 2 chromatides, s’alignent un par un sur la plaque équatoriale. Chaque centromère est tiré par les deux pôles à la fois.',
    },
    {
      name: 'Anaphase',
      short: 'Anaphase',
      nChr: 8,
      adn: 4,
      cells: 1,
      note: 'Les centromères se clivent : les chromatides sœurs se séparent et migrent aux pôles opposés. Chaque chromatide devient un chromosome à part entière : la cellule contient provisoirement 8 chromosomes.',
    },
    {
      name: 'Télophase & cytodiérèse',
      short: 'Télophase',
      nChr: 4,
      adn: 2,
      cells: 2,
      note: 'Les enveloppes nucléaires se reforment, le cytoplasme se partage. Résultat : 2 cellules filles à 2n = 4, avec 2Q d’ADN chacune — des copies conformes de la cellule mère.',
    },
  ],
  meiose: [
    {
      name: 'Interphase — après la phase S',
      short: 'Interphase',
      nChr: 4,
      adn: 4,
      cells: 1,
      note: "Comme pour la mitose, la méiose démarre sur une cellule 2n dont l'ADN a été répliqué : 4 chromosomes à 2 chromatides, 4Q d'ADN.",
    },
    {
      name: 'Prophase I — appariement & crossing-over',
      short: 'Prophase I',
      nChr: 4,
      adn: 4,
      cells: 1,
      note: 'Les chromosomes homologues s’apparient deux par deux : ce sont les bivalents. Des chromatides échangent des segments : c’est le crossing-over, ou brassage intrachromosomique. Regarde la chromatide bleue qui reçoit un morceau rouge.',
    },
    {
      name: 'Métaphase I',
      short: 'Métaphase I',
      nChr: 4,
      adn: 4,
      cells: 1,
      note: 'Les bivalents s’alignent sur la plaque : les deux homologues se font face de part et d’autre. L’orientation de chaque bivalent est tirée au hasard : c’est le brassage interchromosomique.',
    },
    {
      name: 'Anaphase I',
      short: 'Anaphase I',
      nChr: 4,
      adn: 4,
      cells: 1,
      note: 'Attention, différence clé : les centromères ne se clivent PAS. Ce sont les chromosomes homologues entiers, encore à 2 chromatides, qui migrent chacun vers un pôle.',
    },
    {
      name: 'Télophase I — réduction chromatique',
      short: 'Télophase I',
      nChr: 2,
      adn: 2,
      cells: 2,
      note: 'Deux cellules à n = 2 chromosomes (toujours à 2 chromatides), 2Q d’ADN chacune. La réduction chromatique 2n → n est faite : c’est tout l’intérêt de la méiose.',
    },
    {
      name: 'Métaphase II',
      short: 'Métaphase II',
      nChr: 2,
      adn: 2,
      cells: 2,
      note: 'Une deuxième division commence, sans nouvelle réplication de l’ADN. Dans chaque cellule, les 2 chromosomes s’alignent sur une nouvelle plaque équatoriale.',
    },
    {
      name: 'Anaphase II & télophase II',
      short: 'Ana/télophase II',
      nChr: 2,
      adn: 1,
      cells: 4,
      note: 'Cette fois les centromères se clivent, comme en mitose. Bilan : 4 cellules à n = 2 chromosomes et Q d’ADN — quatre gamètes génétiquement différents.',
    },
  ],
};

const INTRO =
  "Tu te blesses au genou pendant un match de foot au quartier. Quelques jours plus tard, la plaie est refermée : " +
  "des milliers de cellules de ta peau se sont divisées à l'identique, par mitose. " +
  "Pendant ce temps, dans les organes reproducteurs, une autre division fabrique les gamètes : la méiose. " +
  "À l'Institut sénégalais de recherches agricoles, c'est justement ce brassage-là qui permet de croiser des variétés " +
  "d'arachide ou de mil et d'en obtenir de nouvelles, plus résistantes à la sécheresse. " +
  "Dans ce TP, tu vas piloter phase par phase ces deux divisions et compter les chromosomes.";

const CONCLUSION =
  "Bravo ! La mitose est une seule division : elle donne deux cellules filles à deux n chromosomes, copies conformes de la cellule mère. " +
  "Elle sert à la croissance, à la cicatrisation et au renouvellement des tissus. " +
  "La méiose enchaîne deux divisions sans nouvelle réplication de l'ADN et donne quatre cellules à n chromosomes : les gamètes. " +
  "Retiens la différence essentielle : en anaphase de mitose et en anaphase deux, les centromères se clivent et ce sont les chromatides sœurs qui migrent ; " +
  "en anaphase un, les centromères restent intacts et ce sont les chromosomes homologues entiers qui se séparent. " +
  "Le crossing-over de la prophase un et l'orientation au hasard des bivalents rendent chaque gamète unique : c'est la source de la diversité des individus.";

export function MeioseMitoseTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [mode, setMode] = useState<Mode>('mitose');
  const [phase, setPhase] = useState(0);
  const [seenMit, setSeenMit] = useState<Set<number>>(new Set([0]));
  const [seenMei, setSeenMei] = useState<Set<number>>(new Set());
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qAna, setQAna] = useState<string | null>(null);
  const [qAnaI, setQAnaI] = useState<string | null>(null);
  const [qCross, setQCross] = useState<string | null>(null);

  const list = PHASES[mode];
  const info = list[Math.min(phase, list.length - 1)];
  const seen = mode === 'mitose' ? seenMit : seenMei;
  const mitDone = seenMit.size >= PHASES.mitose.length;
  const meiDone = seenMei.size >= PHASES.meiose.length;
  const manipDone = mitDone && meiDone;

  function goPhase(next: number) {
    const p = Math.max(0, Math.min(list.length - 1, next));
    setPhase(p);
    if (mode === 'mitose') setSeenMit((prev) => new Set(prev).add(p));
    else setSeenMei((prev) => new Set(prev).add(p));
  }

  function switchMode(m: Mode) {
    setMode(m);
    setPhase(0);
    if (m === 'mitose') setSeenMit((prev) => new Set(prev).add(0));
    else setSeenMei((prev) => new Set(prev).add(0));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(15, seenMit.size * 3); // exploration mitose
    s += Math.min(15, seenMei.size * 3); // exploration méiose
    if (hypo === 'identique') s += 10;
    if (qAna === 'chromatides') s += 20;
    if (qAnaI === 'homologues') s += 20;
    if (qCross === 'prophase1') s += 20;
    return Math.min(100, Math.round(s));
  }, [seenMit, seenMei, hypo, qAna, qAnaI, qCross]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'meiose-mitose-terminale',
        version: '2.0',
        steps: {
          caryotype: '2n = 4 (2 paires d’homologues)',
          phasesMitose: Array.from(seenMit).sort((a, b) => a - b),
          phasesMeiose: Array.from(seenMei).sort((a, b) => a - b),
          hypothesis: hypo,
          qcm: { anaphaseMitose: qAna, anaphase1: qAnaI, crossingOver: qCross },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-action-700 shadow-soft ring-1 ring-action-100">
                <Dna className="h-5 w-5" />
              </span>
              Deux façons de se diviser
            </CardTitle>
            <Badge tone="svt">SVT · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Tu te blesses au genou pendant un match au quartier. En quelques jours la plaie se referme :
              des cellules de ta peau se sont divisées <strong>à l&apos;identique</strong>. C&apos;est la{' '}
              <strong>mitose</strong>, celle qui assure aussi ta croissance et le renouvellement de tes tissus.
            </p>
            <p>
              Mais pour fabriquer les <strong>gamètes</strong>, l&apos;organisme utilise une autre division : la{' '}
              <strong>méiose</strong>. À l&apos;<strong>ISRA</strong>, c&apos;est ce brassage qui permet de croiser des
              variétés d&apos;arachide ou de mil pour en créer de plus résistantes à la sécheresse.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> piloter phase par phase la mitose puis la méiose sur un caryotype simplifié à{' '}
              <strong>2n = 4</strong> chromosomes, et suivre le nombre de chromosomes et la quantité d&apos;ADN de chaque
              cellule.
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
              <Target className="h-5 w-5 text-action-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Une cellule de ta peau contient 46 chromosomes. Elle se divise par <strong>mitose</strong> pour refermer ta
            plaie. Selon toi, combien de chromosomes contient chacune des deux cellules filles ?
          </p>
          <QcmStep
            label="Mon hypothèse : après une mitose, chaque cellule fille possède…"
            tone="action"
            options={[
              { key: 'moitie', label: '23 chromosomes : la moitié, comme un gamète.' },
              { key: 'identique', label: '46 chromosomes : exactement autant que la cellule mère.' },
              { key: 'double', label: '92 chromosomes : le double, puisque l’ADN a été copié.' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Aller au microscope <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-action-700" /> Étape 2 — Pilote la division
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais défiler les phases avec le curseur et observe les chromosomes se condenser, s&apos;aligner puis migrer.
            Bleu <strong>à bouts carrés</strong> = homologue d&apos;origine paternelle, rouge{' '}
            <strong>à bouts pointus</strong> = maternelle ; l&apos;anneau violet marque le point de{' '}
            <strong>crossing-over</strong>. Dans la scène, le fil des phases se coche à mesure que tu avances, et
            pendant l&apos;anaphase la <strong>position précédente reste en trace</strong> : regarde les chromosomes
            ralentir en arrivant aux pôles. Parcours <strong>toutes</strong> les phases de la mitose{' '}
            <strong>et</strong> de la méiose. Tourne la scène avec ta souris ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant={mode === 'mitose' ? 'gradient' : 'outline'} size="sm" onClick={() => switchMode('mitose')}>
              Mitose {mitDone ? '✓' : `(${seenMit.size}/${PHASES.mitose.length})`}
            </Button>
            <Button variant={mode === 'meiose' ? 'gradient' : 'outline'} size="sm" onClick={() => switchMode('meiose')}>
              Méiose {meiDone ? '✓' : `(${seenMei.size}/${PHASES.meiose.length})`}
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100">
            <div className="aspect-[4/3] w-full">
              <DivisionScene mode={mode} phase={phase} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="ph">Phase de la division</Label>
              <span className="font-mono text-action-700">
                {phase + 1} / {list.length} — {info.short}
              </span>
            </div>
            <input
              id="ph"
              type="range"
              min={0}
              max={list.length - 1}
              step={1}
              value={phase}
              onChange={(e) => goPhase(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button variant="soft" size="sm" disabled={phase === 0} onClick={() => goPhase(phase - 1)}>
                <ChevronLeft className="h-4 w-4" /> Phase précédente
              </Button>
              <Button variant="soft" size="sm" disabled={phase === list.length - 1} onClick={() => goPhase(phase + 1)}>
                Phase suivante <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs text-ink/50">
                Phases vues : {seen.size}/{list.length}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Chromosomes / cellule" value={String(info.nChr)} />
            <Stat label="ADN / cellule" value={`${info.adn} Q`} />
            <Stat label="Nombre de cellules" value={String(info.cells)} />
          </div>

          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>{info.name} —</strong> {info.note}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              {manipDone
                ? 'Les deux divisions ont été parcourues en entier.'
                : 'Parcours les 5 phases de la mitose et les 7 phases de la méiose.'}
            </span>
            <Button variant="gradient" disabled={!manipDone} onClick={() => setStep('mesures')}>
              Voir mes résultats <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-action-700" /> Étape 3 — Tes résultats
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare ce que tu viens d&apos;observer sur le caryotype 2n = 4. Rappel : Q est la quantité d&apos;ADN
            d&apos;un lot haploïde (n chromosomes à une chromatide).
          </p>

          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Critère</th>
                  <th className="px-3 py-2 text-left">Mitose</th>
                  <th className="px-3 py-2 text-left">Méiose</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r.k} className={'border-t border-night-100 ' + (r.cle ? 'bg-amber-50' : '')}>
                    <td className="px-3 py-2 font-medium">{r.k}</td>
                    <td className="px-3 py-2 text-xs text-ink/80">{r.mit}</td>
                    <td className="px-3 py-2 text-xs text-ink/80">{r.mei}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PhaseTable mode="mitose" />
            <PhaseTable mode="meiose" />
          </div>

          <p className="mt-3 text-sm text-ink/70">
            {hypo === 'identique'
              ? '✅ Ton hypothèse était juste : la mitose conserve le caryotype, 46 chromosomes donnent 46 chromosomes.'
              : '↪ Ton hypothèse était fausse : la mitose CONSERVE le caryotype (46 → 46). C’est la méiose qui divise le nombre de chromosomes par deux (46 → 23).'}
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner au microscope
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
              label="En anaphase de mitose, ce qui migre vers chaque pôle, ce sont…"
              tone="action"
              hint="Regarde ce qui arrive au centromère à cette phase."
              options={[
                { key: 'chromatides', label: 'Les chromatides sœurs : le centromère s’est clivé.' },
                { key: 'homologues', label: 'Les chromosomes homologues entiers, à 2 chromatides.' },
                { key: 'bivalents', label: 'Les bivalents formés à la phase précédente.' },
              ]}
              value={qAna}
              onChange={setQAna}
            />
            <QcmStep
              label="En anaphase I de la méiose, ce qui se sépare, ce sont…"
              tone="action"
              options={[
                { key: 'chromatides', label: 'Les chromatides sœurs, comme en mitose.' },
                { key: 'homologues', label: 'Les chromosomes homologues entiers : les centromères ne se clivent pas.' },
                { key: 'chromosomes', label: 'Les chromosomes coupés en deux au milieu des bras.' },
              ]}
              value={qAnaI}
              onChange={setQAnaI}
            />
            <QcmStep
              label="Le crossing-over (échange de segments entre chromatides d’homologues) a lieu…"
              tone="action"
              options={[
                { key: 'prophase1', label: 'En prophase I de la méiose, quand les homologues sont appariés.' },
                { key: 'anaphase2', label: 'En anaphase II de la méiose.' },
                { key: 'mitose', label: 'En métaphase de la mitose.' },
              ]}
              value={qCross}
              onChange={setQCross}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qAna || !qAnaI || !qCross || busy} onClick={handleValidate}>
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
              <strong>Mitose :</strong> une seule division, 2n → 2n + 2n. Deux cellules filles identiques à la cellule
              mère : croissance, cicatrisation de ta plaie, renouvellement des tissus.
            </p>
            <p>
              <strong>Méiose :</strong> deux divisions qui s&apos;enchaînent sans nouvelle réplication, 2n → n + n + n +
              n. Quatre gamètes, tous différents grâce au <strong>crossing-over</strong> (prophase I) et au{' '}
              <strong>brassage interchromosomique</strong> (métaphase I).
            </p>
            <p>
              La différence à retenir pour le Bac : en <strong>anaphase de mitose</strong> et en{' '}
              <strong>anaphase II</strong>, les centromères se clivent et les chromatides sœurs se séparent. En{' '}
              <strong>anaphase I</strong>, les centromères restent intacts : ce sont les homologues entiers qui migrent.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              <strong>Détail du score :</strong> phases de mitose parcourues 15 · phases de méiose parcourues 15 ·
              hypothèse 10 · QCM 3 × 20 = 60.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

const COMPARE: { k: string; mit: string; mei: string; cle?: boolean }[] = [
  { k: 'Nombre de divisions', mit: '1 seule', mei: '2 qui s’enchaînent (méiose I puis méiose II)' },
  { k: 'Réplication de l’ADN', mit: '1 fois, en phase S', mei: '1 seule fois, avant la méiose I' },
  { k: 'Cellules filles', mit: '2', mei: '4' },
  { k: 'Garniture chromosomique', mit: '2n → 2n (4 → 4) : conservée', mei: '2n → n (4 → 2) : réduite de moitié' },
  { k: 'Appariement des homologues', mit: 'Non', mei: 'Oui, en prophase I : les bivalents' },
  { k: 'Crossing-over', mit: 'Non', mei: 'Oui, en prophase I (brassage intrachromosomique)' },
  {
    k: 'Ce qui migre en anaphase',
    mit: 'Chromatides sœurs (centromère clivé)',
    mei: 'Anaphase I : homologues entiers · Anaphase II : chromatides sœurs',
    cle: true,
  },
  { k: 'Cellules filles identiques ?', mit: 'Oui, des clones', mei: 'Non, toutes génétiquement différentes' },
  {
    k: 'Rôle dans l’organisme',
    mit: 'Croissance, cicatrisation, renouvellement',
    mei: 'Formation des gamètes, diversité des individus',
  },
];

function PhaseTable({ mode }: { mode: Mode }) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
      <table className="w-full text-xs">
        <thead className={mode === 'mitose' ? 'bg-sky-50 text-sky-700' : 'bg-pink-50 text-pink-700'}>
          <tr>
            <th className="px-3 py-2 text-left uppercase tracking-wider">
              {mode === 'mitose' ? 'Mitose' : 'Méiose'}
            </th>
            <th className="px-2 py-2 text-right">Chr.</th>
            <th className="px-2 py-2 text-right">ADN</th>
            <th className="px-2 py-2 text-right">Cell.</th>
          </tr>
        </thead>
        <tbody>
          {PHASES[mode].map((p) => (
            <tr key={p.short} className="border-t border-night-100">
              <td className="px-3 py-1.5">{p.short}</td>
              <td className="px-2 py-1.5 text-right font-mono">{p.nChr}</td>
              <td className="px-2 py-1.5 text-right font-mono">{p.adn} Q</td>
              <td className="px-2 py-1.5 text-right font-mono">{p.cells}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
