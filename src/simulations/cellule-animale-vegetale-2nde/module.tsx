'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Leaf, Microscope, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Cellule animale vs végétale (2nde, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (cellule en volume,
 * organites étiquetés, bascule animale ↔ végétale) → QCM → bilan. Objectif :
 * repérer les organites communs (noyau, mitochondries) et ce que la cellule
 * végétale possède en plus (paroi, chloroplastes, vacuole).
 * Contexte : observation au microscope d'une feuille de baobab et de cellules
 * de la joue.
 */

const CellScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center bg-pink-50 text-sm text-ink/50">Chargement de la scène 3D…</div>,
});

type Kind = 'animale' | 'vegetale';
type Step = 'intro' | 'hypo' | 'manip' | 'qcm' | 'done';
type HypoRep = 'chloroplastes' | 'noyau' | 'mitochondries' | null;

const INTRO =
  "Au microscope du collège, tu observes deux échantillons : une fine pelure de feuille de baobab, et des cellules prélevées à l'intérieur de la joue. " +
  "Les deux sont faites de cellules, mais elles ne se ressemblent pas tout à fait. Tu vas explorer une cellule en 3D et trouver ce qui distingue la cellule végétale de la cellule animale.";

const CONCLUSION =
  "Bravo ! Toutes les cellules ont un noyau et des mitochondries. La cellule végétale possède en plus trois choses : une paroi rigide qui lui donne sa forme, " +
  "des chloroplastes verts pour capter la lumière (photosynthèse), et une grande vacuole remplie d'eau. C'est grâce aux chloroplastes que les feuilles sont vertes.";

export function CelluleAnimaleVegetale2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [kind, setKind] = useState<Kind>('animale');
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['animale']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qPlus, setQPlus] = useState<string | null>(null);
  const [qCommun, setQCommun] = useState<string | null>(null);

  function pick(x: Kind) {
    setKind(x);
    setSeen((p) => new Set(p).add(x));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, seen.size * 15); // a comparé les deux cellules
    if (hypo === 'chloroplastes') s += 10;
    if (qPlus === 'paroi-chloro-vacuole') s += 30;
    if (qCommun === 'noyau-mito') s += 30;
    return Math.max(0, Math.min(100, s));
  }, [seen, hypo, qPlus, qCommun]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'cellule-animale-vegetale-2nde',
        version: '2.0',
        steps: {
          seen: Array.from(seen),
          hypothesis: hypo,
          qcm: { qPlus, qCommun },
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
              Cellule animale ou végétale ?
            </CardTitle>
            <Badge tone="svt">SVT · 2nde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au microscope, tu observes une pelure de <strong>feuille de baobab</strong> et des cellules de la <strong>joue</strong>. Les deux
              sont des cellules… mais elles ne sont pas identiques.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> trouver les organites <strong>communs</strong> aux deux cellules, et ce que la cellule végétale a
              <strong> en plus</strong>.
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
            <Badge tone="svt">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Une plante fabrique sa propre nourriture avec la lumière du soleil (la photosynthèse). Selon toi, quel organite lui permet de{' '}
            <strong>capter la lumière</strong> ?
          </p>
          <QcmStep
            label="L'organite qui capte la lumière est…"
            tone="action"
            options={[
              { key: 'chloroplastes', label: 'Le chloroplaste (vert)' },
              { key: 'noyau', label: 'Le noyau' },
              { key: 'mitochondries', label: 'La mitochondrie' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer les cellules <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-700" /> Étape 2 — Compare les deux cellules
            </CardTitle>
            <Badge tone="svt">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Bascule entre la cellule <strong>animale</strong> et <strong>végétale</strong>. Tourne la cellule avec ta souris / ton doigt et lis
            les étiquettes des organites. <strong>Regarde bien les deux.</strong>
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <CellScene kind={kind} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(['animale', 'vegetale'] as Kind[]).map((x) => (
              <Button key={x} variant={kind === x ? 'gradient' : 'outline'} size="sm" onClick={() => pick(x)}>
                {x === 'animale' ? '🐑 Animale' : '🌿 Végétale'} {seen.has(x) && kind !== x ? '✓' : ''}
              </Button>
            ))}
            <Badge tone={seen.size >= 2 ? 'action' : 'neutral'} size="sm">
              {seen.size >= 2 ? '2/2 observées' : '1/2 observée'}
            </Badge>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={seen.size < 2} onClick={() => setStep('qcm')}>
              {seen.size < 2 ? "Observe aussi l'autre cellule" : 'Conclure'}
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
              label="La cellule végétale possède, en plus de la cellule animale…"
              tone="action"
              options={[
                { key: 'paroi-chloro-vacuole', label: 'Une paroi, des chloroplastes et une grande vacuole' },
                { key: 'noyau', label: 'Un noyau (la cellule animale n’en a pas)' },
                { key: 'mitochondries', label: 'Des mitochondries' },
              ]}
              value={qPlus}
              onChange={setQPlus}
            />
            <QcmStep
              label="Quels organites trouve-t-on dans LES DEUX cellules ?"
              tone="action"
              options={[
                { key: 'noyau-mito', label: 'Le noyau et les mitochondries' },
                { key: 'chloro-vacuole', label: 'Les chloroplastes et la vacuole' },
                { key: 'paroi-chloro', label: 'La paroi et les chloroplastes' },
              ]}
              value={qCommun}
              onChange={setQCommun}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir les cellules
            </Button>
            <Button variant="success" disabled={!qPlus || !qCommun || busy} onClick={handleValidate}>
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
              Les deux cellules partagent le <strong>noyau</strong> et les <strong>mitochondries</strong>. La cellule végétale a en plus une{' '}
              <strong>paroi</strong> rigide, des <strong>chloroplastes</strong> (photosynthèse) et une grande <strong>vacuole</strong>.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
