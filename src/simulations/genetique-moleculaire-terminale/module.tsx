'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Dna, FlaskConical, HeartPulse, Microscope, Play, Square, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Génétique moléculaire : de l'ADN à la protéine (SVT, Terminale S, Bac).
 *
 * Séquence réelle du début du gène de la bêta-globine humaine (HBB) :
 *   brin codant     5' ATG GTG CAC CTG ACT CCT GAG 3'
 *   brin transcrit  3' TAC CAC GTG GAC TGA GGA CTC 5'
 *   ARNm            5' AUG GUG CAC CUG ACU CCU GAG 3'
 *   protéine           Met  Val  His  Leu  Thr  Pro  Glu
 *
 * Le 7ᵉ codon (GAG, acide glutamique) devient l'acide aminé n° 6 de la
 * bêta-globine mature (la méthionine initiale est retirée après la synthèse).
 * Trois substitutions d'UNE seule base y sont comparées :
 *   GAG → GAA  silencieuse  (Glu → Glu, redondance du code)
 *   GAG → GUG  faux-sens    (Glu → Val) → hémoglobine S, drépanocytose
 *   GAG → UAG  non-sens     (STOP)      → protéine tronquée
 *
 * Flow Lab Premium : intro → hypothèse → manip 3D → mesures → QCM → bilan.
 */

const GeneScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Phase = 'transcription' | 'traduction';
type Mut = 'aucune' | 'silencieuse' | 'fauxsens' | 'nonsens';
type HypoRep = 'jamais' | 'toujours' | 'variable' | null;

/** 6 premiers codons, identiques quelle que soit la mutation étudiée. */
const TEMPLATE_HEAD = 'TACCACGTGGACTGAGGA'; // 18 nt = codons 1 → 6
const CODON_COUNT = 7;

const MUTATIONS: Record<
  Mut,
  { label: string; short: string; tplCodon: string; mrnaCodon: string; offset: number | null; adn: string }
> = {
  aucune: { label: 'Séquence normale (allèle A)', short: 'Normale', tplCodon: 'CTC', mrnaCodon: 'GAG', offset: null, adn: 'GAG' },
  silencieuse: { label: 'Mutation silencieuse', short: 'Silencieuse', tplCodon: 'CTT', mrnaCodon: 'GAA', offset: 2, adn: 'GAA' },
  fauxsens: { label: 'Mutation faux-sens (allèle S)', short: 'Faux-sens', tplCodon: 'CAC', mrnaCodon: 'GUG', offset: 1, adn: 'GTG' },
  nonsens: { label: 'Mutation non-sens', short: 'Non-sens', tplCodon: 'ATC', mrnaCodon: 'UAG', offset: 0, adn: 'TAG' },
};

/** Extrait du code génétique limité aux codons rencontrés dans ce TP. */
const CODE: Record<string, { court: string; nom: string }> = {
  AUG: { court: 'Met', nom: 'Méthionine (codon initiateur)' },
  GUG: { court: 'Val', nom: 'Valine' },
  CAC: { court: 'His', nom: 'Histidine' },
  CUG: { court: 'Leu', nom: 'Leucine' },
  ACU: { court: 'Thr', nom: 'Thréonine' },
  CCU: { court: 'Pro', nom: 'Proline' },
  GAG: { court: 'Glu', nom: 'Acide glutamique' },
  GAA: { court: 'Glu', nom: 'Acide glutamique' },
  UAG: { court: 'STOP', nom: 'Codon stop (fin de traduction)' },
};

const TRANSCRIT: Record<string, string> = { A: 'U', T: 'A', G: 'C', C: 'G' };

function build(mut: Mut) {
  const m = MUTATIONS[mut];
  const template = TEMPLATE_HEAD + m.tplCodon;
  const mrna = template
    .split('')
    .map((b) => TRANSCRIT[b] ?? b)
    .join('');
  const codons: string[] = [];
  for (let i = 0; i < CODON_COUNT; i++) codons.push(mrna.slice(3 * i, 3 * i + 3));
  const aminos = codons.map((c) => CODE[c]?.court ?? '???');
  const mutIndex = m.offset === null ? null : 18 + m.offset;
  return { template, mrna, codons, aminos, mutIndex };
}

const INTRO =
  "Au Sénégal, on estime que près d'une personne sur dix porte le trait drépanocytaire. " +
  "Tout vient d'une seule lettre changée dans l'ADN du gène de la bêta-globine, une protéine de l'hémoglobine. " +
  "Dans ce TP, tu vas transcrire ce gène en ARN messager, le traduire en protéine au niveau du ribosome, " +
  "puis provoquer toi-même des mutations pour comprendre pourquoi une seule lettre peut tout changer.";

const CONCLUSION =
  "Bravo ! Le gène est d'abord transcrit en ARN messager par complémentarité : A donne U, T donne A, G donne C et C donne G. " +
  "Le ribosome lit ensuite l'ARN messager codon par codon et enfile les acides aminés grâce au code génétique. " +
  "Une mutation d'une seule base peut être silencieuse, car le code est redondant ; faux-sens, comme la mutation GAG vers GTG " +
  "qui remplace l'acide glutamique par la valine et provoque la drépanocytose ; ou non-sens, quand elle crée un codon stop " +
  "et arrête la synthèse. Le dépistage néonatal et le conseil génétique aident les familles à vivre avec cette maladie.";

export function GenetiqueMoleculaireTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [phase, setPhase] = useState<Phase>('transcription');
  const [mut, setMut] = useState<Mut>('aucune');
  const [nt, setNt] = useState(0);
  const [codonIndex, setCodonIndex] = useState(0);
  const [transcribed, setTranscribed] = useState(false);
  const [traduites, setTraduites] = useState<Set<Mut>>(new Set());
  const [hypo, setHypo] = useState<HypoRep>(null);
  /** Film automatique de la synthèse (transcription puis traduction). */
  const [cine, setCine] = useState(false);
  const [runKey, setRunKey] = useState(0);

  const [qComp, setQComp] = useState<string | null>(null);
  const [qDrep, setQDrep] = useState<string | null>(null);
  const [qSil, setQSil] = useState<string | null>(null);

  const bio = useMemo(() => build(mut), [mut]);
  /** Référence allèle A : sert de témoin fantôme dans la scène 3D. */
  const ref = useMemo(() => build('aucune'), []);
  const chain = useMemo(() => bio.aminos.slice(0, codonIndex).filter((a) => a !== 'STOP'), [bio.aminos, codonIndex]);
  const allMutTested = (['silencieuse', 'fauxsens', 'nonsens'] as Mut[]).every((m) => traduites.has(m));
  const manipDone = transcribed && traduites.has('aucune') && allMutTested;

  function changeNt(v: number) {
    setNt(v);
    if (v >= 21) setTranscribed(true);
  }

  function changeCodon(v: number) {
    setCodonIndex(v);
    if (v >= CODON_COUNT) setTraduites((prev) => new Set(prev).add(mut));
  }

  function pickMutation(m: Mut) {
    setMut(m);
    setCodonIndex(0);
    setCine(false);
    if (transcribed) setNt(21);
  }

  /** Lance (ou relance) le film : la scène déroule les 6 temps du dogme central. */
  function playFilm() {
    setPhase('transcription');
    setNt(0);
    setCodonIndex(0);
    setRunKey((k) => k + 1);
    setCine(true);
  }

  /**
   * Fin du film : équivaut à avoir cliqué « Transcrire tout le gène » puis
   * « Traduire jusqu'au bout ». Le barème du TP est inchangé.
   */
  function finishFilm() {
    setCine(false);
    setNt(21);
    setTranscribed(true);
    setPhase('traduction');
    setCodonIndex(CODON_COUNT);
    setTraduites((prev) => new Set(prev).add(mut));
  }

  const score = useMemo(() => {
    let s = 0;
    if (transcribed) s += 10; // transcription menée jusqu'au bout
    if (traduites.has('aucune')) s += 10; // traduction de référence
    s += (['silencieuse', 'fauxsens', 'nonsens'] as Mut[]).filter((m) => traduites.has(m)).length * 5; // 15 max
    if (hypo === 'variable') s += 10;
    if (qComp === 'U') s += 20;
    if (qDrep === 'fauxsens') s += 20;
    if (qSil === 'silencieuse') s += 15;
    return Math.min(100, Math.round(s));
  }, [transcribed, traduites, hypo, qComp, qDrep, qSil]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'genetique-moleculaire-terminale',
        version: '2.0',
        steps: {
          gene: 'HBB (bêta-globine) — 7 premiers codons',
          transcriptionComplete: transcribed,
          traductionsCompletes: Array.from(traduites),
          hypothesis: hypo,
          qcm: { complementarite: qComp, drepanocytose: qDrep, silencieuse: qSil },
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
              Une seule lettre change tout
            </CardTitle>
            <Badge tone="svt">SVT · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              L&apos;hémoglobine transporte l&apos;oxygène dans ton sang. Elle contient une protéine, la{' '}
              <strong>bêta-globine</strong>, fabriquée à partir d&apos;un gène : une portion d&apos;<strong>ADN</strong>.
            </p>
            <p>
              Au Sénégal, on estime que près d&apos;une personne sur dix porte le <strong>trait drépanocytaire</strong>{' '}
              (forme AS, en bonne santé). La forme SS, elle, provoque la <strong>drépanocytose</strong> : les globules
              rouges se déforment en faucille. L&apos;origine ? Une seule base changée dans le gène.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> transcrire le gène en ARNm, le traduire en protéine au ribosome, puis comparer
              l&apos;effet de trois mutations d&apos;une seule base sur la protéine obtenue.
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
            Avant de manipuler : un gène contient des milliers de bases. Si <strong>une seule</strong> base est
            remplacée par une autre, que se passe-t-il pour la protéine fabriquée ?
          </p>
          <QcmStep
            label="Mon hypothèse : remplacer une seule base dans un gène…"
            tone="action"
            options={[
              { key: 'jamais', label: "N'a jamais d'effet : une base sur des milliers, c'est trop peu." },
              { key: 'toujours', label: 'Rend toujours la protéine inutilisable.' },
              { key: 'variable', label: 'Peut ne rien changer, ou changer un acide aminé, ou arrêter la synthèse.' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Aller au labo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-action-700" /> Étape 2 — De l&apos;ADN à la protéine
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Regarde d&apos;abord le <strong>film de la synthèse</strong> : l&apos;ADN s&apos;ouvre, l&apos;ARN polymérase
            écrit l&apos;ARNm, puis le ribosome le lit codon par codon. Ensuite, refais-le toi-même : <strong>transcris</strong>{' '}
            tout le gène (21 nucléotides), puis <strong>traduis</strong> l&apos;ARNm codon par codon. Enfin, provoque
            chaque mutation et recommence la traduction. Tourne la scène avec ta souris ou ton doigt.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <GeneScene
                phase={phase}
                nt={nt}
                codonIndex={codonIndex}
                template={bio.template}
                mrna={bio.mrna}
                aminos={bio.aminos}
                mutIndex={bio.mutIndex}
                refMrna={ref.mrna}
                refAminos={ref.aminos}
                cine={cine}
                runKey={runKey}
                onCineEnd={finishFilm}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant={cine ? 'danger' : 'soft'} size="sm" onClick={cine ? () => setCine(false) : playFilm}>
              {cine ? (
                <>
                  <Square className="h-4 w-4" /> Arrêter le film
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Voir le film de la synthèse
                </>
              )}
            </Button>
            <Button
              variant={phase === 'transcription' && !cine ? 'gradient' : 'outline'}
              size="sm"
              disabled={cine}
              onClick={() => setPhase('transcription')}
            >
              1. Transcription {transcribed ? '✓' : ''}
            </Button>
            <Button
              variant={phase === 'traduction' && !cine ? 'gradient' : 'outline'}
              size="sm"
              disabled={cine || nt < 21}
              onClick={() => setPhase('traduction')}
            >
              2. Traduction {traduites.has(mut) ? '✓' : ''}
            </Button>
            {cine ? (
              <span className="self-center text-xs text-action-700">
                Le film se déroule tout seul : suis la légende « Ce que tu observes ».
              </span>
            ) : (
              nt < 21 && <span className="self-center text-xs text-ink/50">Termine la transcription pour traduire.</span>
            )}
          </div>

          {phase === 'transcription' ? (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="nt">ARN polymérase — nucléotides ajoutés</Label>
                <span className="font-mono text-action-700">{nt} / 21</span>
              </div>
              <input
                id="nt"
                type="range"
                min={0}
                max={21}
                step={1}
                value={nt}
                disabled={cine}
                onChange={(e) => changeNt(Number(e.target.value))}
                className="slider-lab w-full"
              />
              <div className="mt-2 flex gap-2">
                <Button variant="soft" size="sm" disabled={cine} onClick={() => changeNt(Math.min(21, nt + 1))}>
                  + 1 nucléotide
                </Button>
                <Button variant="soft" size="sm" disabled={cine} onClick={() => changeNt(21)}>
                  Transcrire tout le gène
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="cod">Ribosome — codons lus</Label>
                <span className="font-mono text-action-700">
                  {codonIndex} / {CODON_COUNT}
                </span>
              </div>
              <input
                id="cod"
                type="range"
                min={0}
                max={CODON_COUNT}
                step={1}
                value={codonIndex}
                disabled={cine}
                onChange={(e) => changeCodon(Number(e.target.value))}
                className="slider-lab w-full"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  variant="soft"
                  size="sm"
                  disabled={cine}
                  onClick={() => changeCodon(Math.min(CODON_COUNT, codonIndex + 1))}
                >
                  + 1 codon
                </Button>
                <Button variant="soft" size="sm" disabled={cine} onClick={() => changeCodon(CODON_COUNT)}>
                  Traduire jusqu&apos;au bout
                </Button>
              </div>
            </div>
          )}

          {/* Séquences lisibles */}
          <div className="mt-4 space-y-2 rounded-2xl bg-night-900 p-3 font-mono text-[11px] leading-relaxed text-white/90 sm:text-xs">
            <SeqLine tag="ADN transcrit" prefix="3'" suffix="5'" seq={bio.template} highlight={bio.mutIndex} shown={21} />
            <SeqLine
              tag="ARNm"
              prefix="5'"
              suffix="3'"
              seq={bio.mrna}
              highlight={bio.mutIndex}
              shown={cine || phase === 'traduction' ? 21 : nt}
            />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="w-24 shrink-0 text-white/40">Protéine</span>
              <span className="text-emerald-300">
                {phase === 'traduction' && chain.length > 0 ? chain.join(' – ') : '—'}
                {phase === 'traduction' && bio.aminos[codonIndex - 1] === 'STOP' ? '  ⟨STOP⟩' : ''}
              </span>
            </div>
          </div>

          {/* Choix de la mutation */}
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-ink">Provoque une mutation sur le 7ᵉ codon (GAG) :</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MUTATIONS) as Mut[]).map((m) => (
                <Button key={m} variant={mut === m ? 'gradient' : 'outline'} size="sm" onClick={() => pickMutation(m)}>
                  {MUTATIONS[m].short} {traduites.has(m) ? '✓' : ''}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/60">
              ADN codant : <span className="font-mono font-bold">{MUTATIONS[mut].adn}</span> · ARNm :{' '}
              <span className="font-mono font-bold">{MUTATIONS[mut].mrnaCodon}</span> →{' '}
              <span className="font-semibold">{CODE[MUTATIONS[mut].mrnaCodon]?.nom}</span>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              {manipDone ? 'Toutes les traductions sont faites.' : 'Traduis les 4 versions du gène pour continuer.'}
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
              <FlaskConical className="h-5 w-5 text-action-700" /> Étape 3 — Tes résultats
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici les quatre versions du 7ᵉ codon que tu as traduites. Ce codon donne l&apos;acide aminé n° 6 de la
            bêta-globine mature (la méthionine initiale est retirée après la synthèse).
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Version du gène</th>
                  <th className="px-3 py-2 text-left">ADN → ARNm</th>
                  <th className="px-3 py-2 text-left">Acide aminé n° 6</th>
                  <th className="px-3 py-2 text-left">Protéine obtenue</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.k} className={'border-t border-night-100 ' + (r.k === 'fauxsens' ? 'bg-rose-50' : '')}>
                    <td className="px-3 py-2 font-medium">{r.titre}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.adn} → {r.arn}
                    </td>
                    <td className="px-3 py-2">{r.aa}</td>
                    <td className="px-3 py-2 text-xs text-ink/70">{r.effet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <p className="mb-1 font-semibold">Le code génétique est redondant</p>
              <p className="text-xs">
                Plusieurs codons donnent le même acide aminé : GAA et GAG donnent tous deux l&apos;acide glutamique ;
                GUU, GUC, GUA et GUG donnent tous la valine. C&apos;est pourquoi certaines mutations sont muettes.
              </p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-100">
              <p className="mb-1 flex items-center gap-1.5 font-semibold">
                <HeartPulse className="h-4 w-4" /> Drépanocytose au Sénégal
              </p>
              <p className="text-xs">
                L&apos;acide glutamique est hydrophile, la valine est hydrophobe : les hémoglobines S s&apos;assemblent
                en fibres et déforment le globule rouge en faucille. Le <strong>dépistage néonatal</strong> et le{' '}
                <strong>conseil génétique</strong> permettent une prise en charge précoce et un accompagnement des
                familles.
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-ink/70">
            {hypo === 'variable'
              ? '✅ Ton hypothèse était juste : l’effet dépend de la base touchée et du codon obtenu.'
              : '↪ Ton hypothèse était incomplète : une même mutation ponctuelle peut être silencieuse, faux-sens ou non-sens.'}
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner au labo
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
              label="Lors de la transcription, en face d'un A du brin transcrit d'ADN, l'ARNm porte…"
              tone="action"
              hint="Attention : l'ARN n'utilise pas de thymine (T)."
              options={[
                { key: 'A', label: 'Un A' },
                { key: 'T', label: 'Un T' },
                { key: 'U', label: 'Un U (uracile)' },
                { key: 'G', label: 'Un G' },
              ]}
              value={qComp}
              onChange={setQComp}
            />
            <QcmStep
              label="Dans le gène de la bêta-globine, la mutation GAG → GTG (ARNm : GAG → GUG) est…"
              tone="action"
              options={[
                { key: 'silencieuse', label: 'Silencieuse : la protéine est identique.' },
                { key: 'fauxsens', label: "Faux-sens : la valine remplace l'acide glutamique → drépanocytose." },
                { key: 'nonsens', label: 'Non-sens : la traduction s’arrête tout de suite.' },
              ]}
              value={qDrep}
              onChange={setQDrep}
            />
            <QcmStep
              label="Une mutation qui transforme le codon GAG en GAA est…"
              tone="action"
              options={[
                { key: 'silencieuse', label: 'Silencieuse : GAA code aussi l’acide glutamique.' },
                { key: 'fauxsens', label: 'Faux-sens : elle change l’acide aminé.' },
                { key: 'nonsens', label: 'Non-sens : elle crée un codon stop.' },
              ]}
              value={qSil}
              onChange={setQSil}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qComp || !qDrep || !qSil || busy} onClick={handleValidate}>
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
              <strong>Transcription :</strong> l&apos;ARN polymérase lit le brin transcrit et construit l&apos;ARNm par
              complémentarité (A→U, T→A, G→C, C→G). <strong>Traduction :</strong> le ribosome lit l&apos;ARNm codon par
              codon et enfile les acides aminés selon le code génétique.
            </p>
            <p>
              Une <strong>mutation ponctuelle</strong> peut être silencieuse (GAG→GAA, Glu inchangé), faux-sens
              (GAG→GUG, Glu remplacé par Val : c&apos;est la <strong>drépanocytose</strong>) ou non-sens (GAG→UAG :
              protéine tronquée).
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              <strong>Détail du score :</strong> transcription complète 10 · traduction de référence 10 · 3 mutations
              testées 15 · hypothèse 10 · QCM 55.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

const ROWS: { k: Mut; titre: string; adn: string; arn: string; aa: string; effet: string }[] = [
  {
    k: 'aucune',
    titre: 'Normale (allèle A)',
    adn: 'GAG',
    arn: 'GAG',
    aa: 'Glu (acide glutamique)',
    effet: 'Bêta-globine complète (146 acides aminés) — hémoglobine A fonctionnelle.',
  },
  {
    k: 'silencieuse',
    titre: 'Silencieuse',
    adn: 'GAA',
    arn: 'GAA',
    aa: 'Glu (acide glutamique)',
    effet: 'Protéine identique : aucun effet. Le code génétique est redondant.',
  },
  {
    k: 'fauxsens',
    titre: 'Faux-sens (allèle S)',
    adn: 'GTG',
    arn: 'GUG',
    aa: 'Val (valine)',
    effet: '1 acide aminé changé sur 146 → hémoglobine S : drépanocytose.',
  },
  {
    k: 'nonsens',
    titre: 'Non-sens',
    adn: 'TAG',
    arn: 'UAG',
    aa: 'STOP (aucun acide aminé)',
    effet: 'Traduction arrêtée : protéine tronquée à 5 acides aminés, non fonctionnelle.',
  },
];

function SeqLine({
  tag,
  prefix,
  suffix,
  seq,
  highlight,
  shown,
}: {
  tag: string;
  prefix: string;
  suffix: string;
  seq: string;
  highlight: number | null;
  shown: number;
}) {
  const letters = seq.split('');
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="w-24 shrink-0 text-white/40">{tag}</span>
      <span className="text-white/40">{prefix}</span>
      <span className="tracking-[0.12em]">
        {letters.map((l, i) => (
          <span
            key={i}
            className={
              i >= shown
                ? 'text-white/15'
                : i === highlight
                  ? 'rounded bg-rose-500/30 font-bold text-rose-200'
                  : 'text-white/90'
            }
          >
            {l}
            {i % 3 === 2 ? ' ' : ''}
          </span>
        ))}
      </span>
      <span className="text-white/40">{suffix}</span>
    </div>
  );
}
