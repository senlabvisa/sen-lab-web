'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Eye, Lightbulb, Sun, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Sources et récepteurs de lumière, propagation rectiligne, ombres
 * (Physique-Chimie, 5ème).
 *
 * Flow Lab Premium : intro → hypothèse → manipulation 3D → observation →
 * QCM → bilan. Science juste : la lumière se propage en ligne droite dans
 * un milieu homogène ; une ombre se forme derrière un objet opaque ;
 * rapprocher la source agrandit l'ombre. Contexte : le Soleil au Sénégal
 * et l'ombre d'un baobab, immense à midi… plus grande quand le Soleil descend.
 */

const EclipseScene = dynamic(() => import('./eclipse-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-[#0B1220] text-sm text-amber-200/60">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'obs' | 'qcm' | 'done';
type HypoRep = 'plus-grande' | 'plus-petite' | 'identique' | null;

const INTRO =
  "Au Sénégal, le Soleil tape fort. À midi, sous un grand baobab, l'ombre est ramassée à ses pieds. " +
  "Mais en fin d'après-midi, quand le Soleil descend, l'ombre du baobab s'allonge sur le sol. " +
  "Le Soleil est une source qui produit sa propre lumière ; cette lumière file en ligne droite et, " +
  "quand elle rencontre le tronc opaque du baobab, elle ne passe pas : il se forme une ombre. " +
  "Aujourd'hui tu vas déplacer la source et observer comment l'ombre grandit ou rétrécit.";

const CONCLUSION =
  "Bravo ! Dans l'air, milieu transparent et homogène, la lumière se propage en ligne droite. " +
  "Derrière un objet opaque qu'elle ne traverse pas, il se forme une ombre. " +
  "Plus la source est proche de l'objet, plus l'ombre portée est grande. " +
  "Le Soleil et une lampe sont des sources primaires : elles produisent leur lumière. " +
  "La Lune ou un mur éclairé sont des objets diffusants : ils ne font que renvoyer la lumière reçue.";

export function SourcesLumiere5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [sourceX, setSourceX] = useState(15); // 0 = loin, 100 = proche
  const [positionsTried, setPositionsTried] = useState<Set<number>>(new Set());
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qPropagation, setQPropagation] = useState<string | null>(null);
  const [qSource, setQSource] = useState<string | null>(null);
  const [qOmbre, setQOmbre] = useState<string | null>(null);

  // L'élève a-t-il exploré les deux extrêmes (source loin ET proche) ?
  const sawFar = useMemo(() => [...positionsTried].some((p) => p <= 25), [positionsTried]);
  const sawNear = useMemo(() => [...positionsTried].some((p) => p >= 75), [positionsTried]);
  const explored = sawFar && sawNear;

  function move(v: number) {
    setSourceX(v);
    setPositionsTried((prev) => new Set(prev).add(v));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(15, positionsTried.size * 2); // a manipulé
    if (explored) s += 10; // a comparé les deux extrêmes
    if (hypo === 'plus-grande') s += 10; // bonne prédiction
    if (qPropagation === 'ligne-droite') s += 25;
    if (qSource === 'primaire') s += 20;
    if (qOmbre === 'opaque') s += 20;
    return Math.min(100, s);
  }, [positionsTried, explored, hypo, qPropagation, qSource, qOmbre]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'sources-lumiere-5eme',
        version: '2.0',
        steps: {
          positionsTried: Array.from(positionsTried),
          exploredExtremes: explored,
          hypothesis: hypo,
          qcm: { qPropagation, qSource, qOmbre },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-physique" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <Sun className="h-5 w-5" />
              </span>
              Le Soleil, le baobab et l&apos;ombre
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le <strong>Soleil</strong> produit sa propre lumière : c&apos;est une <strong>source primaire</strong>.
              Cette lumière se propage en <strong>ligne droite</strong>. Quand elle rencontre le tronc{' '}
              <strong>opaque</strong> d&apos;un baobab, elle ne le traverse pas : derrière l&apos;arbre se forme une{' '}
              <strong>ombre</strong>.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> déplace la source de lumière et observe comment l&apos;ombre du baobab sur le
              mur grandit ou rétrécit. À midi l&apos;ombre est courte, le soir elle s&apos;allonge.
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
              <Target className="h-5 w-5 text-amber-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si tu <strong>rapproches</strong> la source de lumière du baobab, l&apos;ombre sur le
            mur deviendra…
          </p>
          <QcmStep
            label="Mon hypothèse : en rapprochant la source de l'objet, l'ombre devient…"
            tone="amber"
            options={[
              { key: 'plus-grande', label: 'Plus grande' },
              { key: 'plus-petite', label: 'Plus petite' },
              { key: 'identique', label: 'Identique (elle ne change pas)' },
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
              <Lightbulb className="h-5 w-5 text-amber-700" /> Étape 2 — Déplace la source
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Glisse la source de la position <strong>loin</strong> à <strong>proche</strong> du baobab. Suis les rayons
            jaunes : ils vont tout droit et dessinent l&apos;ombre sur le mur. Tourne la scène avec ta souris / ton
            doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <EclipseScene sourceX={sourceX} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="src">Position de la source</Label>
              <span className="font-mono text-amber-700">{sourceX <= 40 ? 'loin (soir)' : sourceX >= 70 ? 'proche (forte ombre)' : 'milieu'}</span>
            </div>
            <input
              id="src"
              type="range"
              min={0}
              max={100}
              value={sourceX}
              onChange={(e) => move(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink/45">
              <span>← Source loin · ombre petite</span>
              <span>Source proche · ombre grande →</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Source" value="Soleil" hint="primaire" />
            <Stat label="Objet" value="Baobab" hint="opaque" />
            <Stat label="Mur" value="Écran" hint="diffusant" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              {!sawFar ? 'Place la source loin (à gauche)…' : !sawNear ? 'Maintenant rapproche-la (à droite)…' : 'Tu as comparé loin et proche ✓'}
            </span>
            <Button variant="gradient" disabled={!explored} onClick={() => setStep('obs')}>
              {explored ? 'Voir mon observation' : 'Compare loin et proche'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'obs' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-700" /> Étape 3 — Ce que tu as observé
            </CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <div className="space-y-3 text-sm text-ink/75">
            <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
              <table className="w-full text-sm">
                <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Position de la source</th>
                    <th className="px-4 py-2 text-left">Ombre sur le mur</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-night-100">
                    <td className="px-4 py-2">Loin du baobab (Soleil bas, le soir)</td>
                    <td className="px-4 py-2">Petite, ramassée</td>
                  </tr>
                  <tr className="border-t border-night-100 bg-emerald-50 font-semibold">
                    <td className="px-4 py-2">Proche du baobab</td>
                    <td className="px-4 py-2">Grande, allongée 🌑</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="rounded-xl bg-blue-50 p-3 text-blue-900 ring-1 ring-blue-100">
              Les rayons partent de la source en <strong>ligne droite</strong>. Le baobab opaque les arrête : derrière
              lui, aucune lumière n&apos;arrive sur le mur → c&apos;est l&apos;<strong>ombre portée</strong>. Plus la
              source est proche, plus le cône d&apos;ombre s&apos;élargit sur le mur.
            </p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Remanipuler
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
            <Badge tone="physique">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Dans l'air, la lumière se propage :"
              tone="amber"
              options={[
                { key: 'ligne-droite', label: 'En ligne droite' },
                { key: 'courbe', label: 'En tournant (en courbe)' },
                { key: 'zigzag', label: 'En zigzag' },
              ]}
              value={qPropagation}
              onChange={setQPropagation}
            />
            <QcmStep
              label="Le Soleil est une source :"
              tone="amber"
              options={[
                { key: 'primaire', label: 'Primaire (il produit sa propre lumière)' },
                { key: 'diffusante', label: 'Diffusante (il renvoie une lumière reçue)' },
                { key: 'aucune', label: "Ce n'est pas une source de lumière" },
              ]}
              value={qSource}
              onChange={setQSource}
            />
            <QcmStep
              label="Une ombre se forme parce que la lumière :"
              tone="amber"
              options={[
                { key: 'opaque', label: 'Ne traverse pas l’objet opaque' },
                { key: 'traverse', label: 'Traverse complètement l’objet' },
                { key: 'disparait', label: "S'éteint toute seule derrière l’objet" },
              ]}
              value={qOmbre}
              onChange={setQOmbre}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('obs')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qPropagation || !qSource || !qOmbre || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-physique">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La lumière se propage en <strong>ligne droite</strong> dans l&apos;air. Derrière un objet{' '}
              <strong>opaque</strong> qu&apos;elle ne traverse pas, il se forme une <strong>ombre</strong>. Rapprocher
              la source <strong>agrandit</strong> l&apos;ombre. Le Soleil est une <strong>source primaire</strong> ; la
              Lune ou un mur éclairé sont des <strong>objets diffusants</strong>.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100">
      <div className="text-[10px] uppercase tracking-wider text-amber-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-amber-800">{value}</div>
      <div className="text-[10px] text-amber-700/60">{hint}</div>
    </div>
  );
}
