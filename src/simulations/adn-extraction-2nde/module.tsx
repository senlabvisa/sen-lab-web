'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Dna, FlaskConical, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Extraction de l'ADN d'une banane (2nde, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (protocole en 4
 * étapes, double hélice révélée à la fin) → QCM → bilan. Protocole réalisable
 * à la maison : banane + liquide vaisselle + sel + alcool. Objectif : l'ADN est
 * dans le noyau de chaque cellule, on le rend visible en le faisant précipiter.
 */

const DnaScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center bg-pink-50 text-sm text-ink/50">Chargement de la scène 3D…</div>,
});

type Step = 'intro' | 'hypo' | 'manip' | 'qcm' | 'done';
type HypoRep = 'precipite' | 'colore' | 'chauffe' | null;

const STAGE_HINTS = [
  "On écrase la banane : on sépare les cellules les unes des autres.",
  "On ajoute le liquide vaisselle (savon) et du sel : le savon casse les membranes et libère l'ADN.",
  "On filtre pour retirer les gros morceaux : il reste un jus contenant l'ADN dissous.",
  "On verse de l'alcool froid : l'ADN n'y est pas soluble, il précipite et devient visible (filaments blancs).",
];

const INTRO =
  "Savais-tu qu'avec une banane, du liquide vaisselle, du sel et de l'alcool, tu peux extraire de l'ADN dans ta cuisine ? " +
  "L'ADN est la molécule qui contient les informations de chaque être vivant. Il est rangé dans le noyau de chaque cellule. " +
  "Tu vas suivre le protocole étape par étape et voir l'ADN apparaître pour de vrai.";

const CONCLUSION =
  "Bravo ! L'ADN est présent dans le noyau de toutes les cellules. Le savon casse les membranes pour le libérer, le sel le regroupe, " +
  "et l'alcool froid le fait précipiter en filaments blancs visibles à l'œil nu. La même molécule porte l'information de la banane… et la tienne.";

export function AdnExtraction2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [stage, setStage] = useState(0);
  const [maxStage, setMaxStage] = useState(0);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qLieu, setQLieu] = useState<string | null>(null);
  const [qSavon, setQSavon] = useState<string | null>(null);

  function go(next: number) {
    const n = Math.max(0, Math.min(3, next));
    setStage(n);
    setMaxStage((m) => Math.max(m, n));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, maxStage * 10); // a déroulé le protocole jusqu'au bout
    if (hypo === 'precipite') s += 10;
    if (qLieu === 'noyau') s += 30;
    if (qSavon === 'membranes') s += 30;
    return Math.max(0, Math.min(100, s));
  }, [maxStage, hypo, qLieu, qSavon]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'adn-extraction-2nde',
        version: '2.0',
        steps: { maxStage, hypothesis: hypo, qcm: { qLieu, qSavon } },
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
                <Dna className="h-5 w-5" />
              </span>
              Extraire l&apos;ADN d&apos;une banane
            </CardTitle>
            <Badge tone="svt">SVT · 2nde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Avec une <strong>banane</strong>, du <strong>liquide vaisselle</strong>, du <strong>sel</strong> et de l&apos;
              <strong>alcool</strong>, on peut extraire l&apos;ADN — la molécule de la vie — et le voir à l&apos;œil nu.
            </p>
            <p className="rounded-xl bg-pink-50 p-3 text-sm text-pink-900 ring-1 ring-pink-100">
              <strong>Objectif :</strong> comprendre où se trouve l&apos;ADN dans la cellule et à quoi sert chaque ingrédient du protocole.
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
              <Sparkles className="h-5 w-5 text-pink-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            La dernière étape consiste à verser de l&apos;<strong>alcool froid</strong>. Selon toi, à quoi sert-il ?
          </p>
          <QcmStep
            label="L'alcool sert à…"
            tone="action"
            options={[
              { key: 'precipite', label: 'Faire précipiter l’ADN pour le rendre visible' },
              { key: 'colore', label: 'Colorer l’ADN en blanc' },
              { key: 'chauffe', label: 'Chauffer le mélange' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Faire le protocole <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-pink-700" /> Étape 2 — Suis le protocole
            </CardTitle>
            <Badge tone="svt">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avance étape par étape. Observe le mélange dans le bécher. <strong>Va jusqu&apos;à l&apos;étape 4</strong> pour voir l&apos;ADN
            précipiter.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100">
            <div className="aspect-[4/3] w-full">
              <DnaScene stage={stage} />
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-pink-50 p-3 text-sm text-ink/80 ring-1 ring-pink-100">{STAGE_HINTS[stage]}</div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={stage === 0} onClick={() => go(stage - 1)}>
              ← Précédent
            </Button>
            <Badge tone="action" size="sm">
              Étape {stage + 1}/4
            </Badge>
            <Button variant="gradient" size="sm" disabled={stage === 3} onClick={() => go(stage + 1)}>
              Suivant →
            </Button>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={maxStage < 3} onClick={() => setStep('qcm')}>
              {maxStage < 3 ? "Va jusqu'à l'ADN visible" : 'Conclure'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Valide ta compréhension</CardTitle>
            <Badge tone="svt">3/3</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Dans une cellule, l'ADN se trouve principalement dans…"
              tone="action"
              options={[
                { key: 'noyau', label: 'Le noyau' },
                { key: 'sang', label: 'Le sang' },
                { key: 'cytoplasme', label: 'Le cytoplasme uniquement' },
              ]}
              value={qLieu}
              onChange={setQLieu}
            />
            <QcmStep
              label="À quoi sert le liquide vaisselle (savon) ?"
              tone="action"
              options={[
                { key: 'membranes', label: 'À casser les membranes pour libérer l’ADN' },
                { key: 'gout', label: 'À donner du goût' },
                { key: 'couleur', label: 'À colorer l’ADN' },
              ]}
              value={qSavon}
              onChange={setQSavon}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir le protocole
            </Button>
            <Button variant="success" disabled={!qLieu || !qSavon || busy} onClick={handleValidate}>
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
              L&apos;ADN est dans le <strong>noyau</strong> de chaque cellule. Le <strong>savon</strong> casse les membranes, le{' '}
              <strong>sel</strong> regroupe l&apos;ADN, et l&apos;<strong>alcool</strong> froid le fait précipiter en filaments visibles.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
