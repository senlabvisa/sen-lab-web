'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Droplets, FlaskConical, Gauge, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Dosage acido-basique (titrage), Première S.
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (burette + robinet,
 * gouttes, virage de l'indicateur à l'équivalence) → observation → QCM →
 * bilan. Science réelle : à l'équivalence Ca·Va = Cb·Vb ; le virage de la
 * phénolphtaléine (incolore → rose) repère l'équivalence. Contexte : doser
 * l'acidité d'un jus de bissap / bouye vendu au marché de Dakar.
 */

const DosageScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement du montage de dosage…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = '8' | '10' | '12' | null;

const VA = 20; // mL d'acide dosé (prise d'essai)
const CB = 0.1; // mol/L (base titrante connue)
const VB_EQ = 10; // mL versés à l'équivalence
const VB_MAX = 20; // capacité burette
// Ca déduite à l'équivalence : Ca = Cb·Veq / Va
const CA = (CB * VB_EQ) / VA; // = 0,05 mol/L

const INTRO =
  "Au marché de Dakar, on veut connaître l'acidité d'un jus de bissap. " +
  "On verse goutte à goutte une base de concentration connue (la soude) dans une prise du jus, " +
  "avec un indicateur coloré : la phénolphtaléine. Tant qu'il reste de l'acide, le liquide reste incolore. " +
  "Pile au bon volume — l'équivalence — il vire d'un coup au rose : tout l'acide est neutralisé. Ce volume nous donne la concentration.";

const CONCLUSION =
  "Bravo ! À l'équivalence, les réactifs ont réagi en proportions stœchiométriques : le nombre de moles d'acide " +
  "égale le nombre de moles de base versée, donc Ca multiplié par Va égale Cb multiplié par Vb. " +
  "Le virage de la phénolphtaléine, de l'incolore au rose, repère cette équivalence. Avant le virage il reste de l'acide ; après, c'est la base qui est en excès.";

/** Courbe de titrage réaliste (soude versée dans un acide faible) : pH = f(Vb). */
function phAt(vb: number) {
  if (vb <= 0) return 2.9;
  if (vb < VB_EQ) {
    // tampon avant équivalence : montée douce de ~2,9 vers ~6,5
    return 2.9 + (vb / VB_EQ) * 3.6;
  }
  if (vb <= VB_EQ + 0.5) {
    // saut brutal de pH au passage de l'équivalence
    const t = (vb - VB_EQ) / 0.5;
    return 6.5 + t * 4.5; // 6,5 → 11
  }
  // après équivalence : plateau basique qui tend vers ~12,5
  return Math.min(12.6, 11 + (vb - VB_EQ - 0.5) * 0.16);
}

export function DosageAcideBase1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [vb, setVb] = useState(0);
  const [explored, setExplored] = useState(false); // a versé un peu
  const [reachedEq, setReachedEq] = useState(false); // a atteint l'équivalence
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qEquiv, setQEquiv] = useState<string | null>(null);
  const [qRelation, setQRelation] = useState<string | null>(null);
  const [qIndic, setQIndic] = useState<string | null>(null);

  const ph = useMemo(() => phAt(vb), [vb]);

  // points de la courbe pH=f(Vb) en coordonnées scène (cadre 1,7 × 1,7)
  const curve = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    const N = 48;
    const vMax = Math.max(vb, 0.001);
    for (let i = 0; i <= N; i++) {
      const v = (i / N) * vMax;
      const x = (v / VB_MAX) * 3.2; // 0 → 3,2
      const y = ((phAt(v) - 2) / 12) * 3.0; // pH 2..14 → 0..3
      pts.push([x, y, 0]);
    }
    return pts;
  }, [vb]);

  function setVolume(v: number) {
    setVb(v);
    if (v > 0.5) setExplored(true);
    if (Math.abs(v - VB_EQ) < 0.6 || v > VB_EQ) setReachedEq(true);
  }

  const score = useMemo(() => {
    let s = 0;
    if (explored) s += 10; // a manipulé le robinet
    if (reachedEq) s += 20; // a trouvé/dépassé l'équivalence (virage observé)
    if (hypo === '10') s += 5; // bonne prédiction
    if (qEquiv === 'stoechio') s += 25;
    if (qRelation === 'cavacbvb') s += 25;
    if (qIndic === 'reperer') s += 15;
    return Math.min(100, s);
  }, [explored, reachedEq, hypo, qEquiv, qRelation, qIndic]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'dosage-acide-base-1ere',
        version: '2.0',
        steps: {
          vbEquivalence: VB_EQ,
          caDeduite: CA,
          explored,
          reachedEq,
          hypothesis: hypo,
          qcm: { qEquiv, qRelation, qIndic },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-amber" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <FlaskConical className="h-5 w-5" />
              </span>
              Doser l&apos;acidité d&apos;un jus de bissap
            </CardTitle>
            <Badge tone="science">Physique-Chimie · Première S</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au marché de Dakar, on veut connaître l&apos;<strong>acidité</strong> d&apos;un jus de bissap. On verse
              goutte à goutte une base connue (la soude) dans une prise du jus, avec un indicateur : la{' '}
              <strong>phénolphtaléine</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> verser jusqu&apos;à l&apos;<strong>équivalence</strong> — l&apos;instant où le
              liquide vire de l&apos;incolore au rose — pour repérer le volume Vb qui neutralise tout l&apos;acide.
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
              <Target className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            On dose Va = {VA} mL de jus avec de la soude à Cb = {CB} mol/L. Selon toi, vers quel{' '}
            <strong>volume versé Vb</strong> le liquide va-t-il virer au rose (l&apos;équivalence) ?
          </p>
          <QcmStep
            label="Mon hypothèse : le virage a lieu vers…"
            tone="violet"
            options={[
              { key: '8', label: 'Vb ≈ 8 mL' },
              { key: '10', label: 'Vb ≈ 10 mL' },
              { key: '12', label: 'Vb ≈ 12 mL' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Verser ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Ouvre le robinet
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais glisser le curseur pour verser la base. Regarde le niveau de la burette baisser, les gouttes tomber et
            le pH monter. Repère le <strong>virage au rose</strong>. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <DosageScene vb={vb} vbMax={VB_MAX} vbEq={VB_EQ} ph={ph} curve={curve} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="vb">Volume de base versé Vb</Label>
              <span className="font-mono text-violet-700">{vb.toFixed(1)} mL</span>
            </div>
            <input
              id="vb"
              type="range"
              min={0}
              max={VB_MAX}
              step={0.5}
              value={vb}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Vb versé" value={`${vb.toFixed(1)} mL`} />
            <Stat label="pH" value={ph.toFixed(1)} />
            <Stat label="État" value={vb < VB_EQ ? 'incolore' : 'rose'} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            {reachedEq ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600">
                <Droplets className="h-4 w-4" /> Virage observé à l&apos;équivalence !
              </span>
            ) : (
              <span className="text-xs text-ink/50">Continue à verser jusqu&apos;au virage…</span>
            )}
            <Button variant="gradient" disabled={!reachedEq} onClick={() => setStep('mesures')}>
              {reachedEq ? 'Voir le bilan' : 'Atteins le virage'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — L&apos;équivalence</CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Au virage, tu as versé <strong>Vb = {VB_EQ} mL</strong> de soude. À cet instant, tout l&apos;acide a réagi :
            n(acide) = n(base versée).
          </p>
          <div className="space-y-2">
            <Row k="Volume d'acide dosé Va" v={`${VA} mL`} />
            <Row k="Concentration de la base Cb" v={`${CB} mol/L`} />
            <Row k="Volume à l'équivalence Vb" v={`${VB_EQ} mL`} hi />
            <Row k="Relation à l'équivalence" v="Ca · Va = Cb · Vb" />
            <Row k="Concentration trouvée Ca = Cb·Vb / Va" v={`${CA.toFixed(3)} mol/L`} hi />
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-violet-900 ring-1 ring-violet-100">
            Avant le virage : l&apos;acide est en excès (incolore). Après : la base est en excès (rose). Le saut de pH
            est brutal autour de l&apos;équivalence.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Reverser
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
            <Badge tone="science">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="À l'équivalence d'un dosage :"
              tone="violet"
              options={[
                { key: 'stoechio', label: 'Les réactifs ont été introduits en proportions stœchiométriques (n acide = n base).' },
                { key: 'exces', label: 'La base est toujours en large excès.' },
                { key: 'rien', label: 'Aucune réaction ne se produit.' },
              ]}
              value={qEquiv}
              onChange={setQEquiv}
            />
            <QcmStep
              label="La relation à l'équivalence est :"
              tone="violet"
              options={[
                { key: 'cavacbvb', label: 'Ca · Va = Cb · Vb' },
                { key: 'cacb', label: 'Ca = Cb' },
                { key: 'vavb', label: 'Va = Vb' },
              ]}
              value={qRelation}
              onChange={setQRelation}
            />
            <QcmStep
              label="Le virage de l'indicateur coloré sert à :"
              tone="violet"
              options={[
                { key: 'reperer', label: "Repérer l'équivalence." },
                { key: 'colorer', label: 'Simplement colorer la solution.' },
                { key: 'chauffer', label: 'Accélérer la réaction.' },
              ]}
              value={qIndic}
              onChange={setQIndic}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qEquiv || !qRelation || !qIndic || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-amber">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À l&apos;équivalence, n(acide) = n(base versée), donc <strong>Ca · Va = Cb · Vb</strong>. Le virage de la
              phénolphtaléine (incolore → rose) repère l&apos;équivalence. Ici Vb = {VB_EQ} mL donne Ca ={' '}
              {CA.toFixed(3)} mol/L pour le jus.
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

function Row({ k, v, hi = false }: { k: string; v: string; hi?: boolean }) {
  return (
    <div
      className={
        'flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ' +
        (hi ? 'bg-emerald-50 font-semibold text-emerald-900 ring-1 ring-emerald-100' : 'bg-night-50 text-ink/80')
      }
    >
      <span>{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}
