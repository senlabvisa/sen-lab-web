'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, FlaskConical, Filter, Droplets, Beaker as BeakerIcon } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Mélanges et séparations (Physique-Chimie, 5ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (choix du mélange +
 * technique de séparation, animation) → observation → QCM → bilan.
 * Science juste : homogène = constituants non distinguables (eau salée) ;
 * hétérogène = distinguables (eau + sable). Filtration → résidu sur le filtre +
 * filtrat. Décantation → dépôt au fond. Contexte : eau de puits/forage trouble
 * qu'on clarifie au village. Tutoiement, score exploration + QCM.
 */

const BeakerScene = dynamic(() => import('./beaker-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'observe' | 'qcm' | 'done';
type Melange = 'sable' | 'sel';
type Technique = 'aucune' | 'filtration' | 'decantation';
type HypoRep = 'filtration' | 'decantation' | 'chauffer' | null;

const INTRO =
  "Au village, l'eau du puits est parfois trouble : elle contient du sable en suspension. " +
  "Avant de la boire, il faut la clarifier, c'est-à-dire séparer le sable de l'eau. " +
  "Dans ce TP, tu compares deux mélanges et tu choisis la bonne technique pour les séparer : " +
  "la filtration ou la décantation.";

const CONCLUSION =
  "Bravo ! L'eau salée est un mélange homogène : on ne distingue pas le sel, il est dissous. " +
  "L'eau et le sable forment un mélange hétérogène : on voit les grains. " +
  "Pour séparer un solide insoluble comme le sable, on filtre : le sable reste sur le filtre (c'est le résidu) " +
  "et l'eau qui passe est le filtrat. On peut aussi laisser décanter : les grains se déposent au fond.";

export function MelangesSolutions5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [melange, setMelange] = useState<Melange>('sable');
  const [technique, setTechnique] = useState<Technique>('aucune');
  const [running, setRunning] = useState(false);
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qSel, setQSel] = useState<string | null>(null);
  const [qSepare, setQSepare] = useState<string | null>(null);
  const [qResidu, setQResidu] = useState<string | null>(null);

  function lancer(t: Technique) {
    setTechnique(t);
    setRunning(true);
    setExplored((prev) => new Set(prev).add(`${melange}-${t}`));
  }

  function changeMelange(m: Melange) {
    setMelange(m);
    setRunning(false);
    setTechnique('aucune');
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, explored.size * 10); // exploration (jusqu'à 3 essais)
    if (hypo === 'filtration' || hypo === 'decantation') s += 10; // hypothèse plausible
    if (qSel === 'homogene') s += 20;
    if (qSepare === 'filtration') s += 25;
    if (qResidu === 'filtre') s += 15;
    return Math.min(100, s);
  }, [explored, hypo, qSel, qSepare, qResidu]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'melanges-solutions-5eme',
        version: '2.0',
        steps: {
          explored: Array.from(explored),
          hypothesis: hypo,
          qcm: { qSel, qSepare, qResidu },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <FlaskConical className="h-5 w-5" />
              </span>
              Clarifier l&apos;eau du puits
            </CardTitle>
            <Badge tone="maths">Physique-Chimie · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au village, l&apos;eau du <strong>puits</strong> ou du <strong>forage</strong> est parfois trouble : elle
              contient du <strong>sable</strong>. Avant de la boire, il faut la <strong>clarifier</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> reconnaître un mélange homogène ou hétérogène, puis choisir la bonne technique
              pour séparer le sable de l&apos;eau (filtration ou décantation).
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
              <Filter className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : selon toi, comment séparer le <strong>sable</strong> de l&apos;eau du puits ?
          </p>
          <QcmStep
            label="Mon hypothèse : pour retirer le sable, le mieux est de…"
            tone="violet"
            options={[
              { key: 'filtration', label: 'Filtrer le mélange (le faire passer à travers un filtre)' },
              { key: 'decantation', label: 'Laisser reposer pour que le sable tombe au fond (décanter)' },
              { key: 'chauffer', label: 'Chauffer pour faire bouillir le sable' },
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
              <BeakerIcon className="h-5 w-5 text-violet-700" /> Étape 2 — Mélange et sépare
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un mélange, puis lance une technique. Observe ce qui se passe. Tourne la scène avec ta souris / ton
            doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <BeakerScene melange={melange} technique={technique} running={running} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <Label className="mb-1 block text-xs">Le mélange</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant={melange === 'sable' ? 'gradient' : 'outline'} size="sm" onClick={() => changeMelange('sable')}>
                  Eau + sable
                </Button>
                <Button variant={melange === 'sel' ? 'gradient' : 'outline'} size="sm" onClick={() => changeMelange('sel')}>
                  Eau + sel
                </Button>
              </div>
              <p className="mt-1 text-xs text-ink/55">
                {melange === 'sable'
                  ? "On distingue les grains de sable : c'est un mélange hétérogène."
                  : "Le sel est dissous, on ne le distingue plus : c'est un mélange homogène."}
              </p>
            </div>

            <div>
              <Label className="mb-1 block text-xs">La technique de séparation</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant={technique === 'filtration' && running ? 'success' : 'soft'} size="sm" onClick={() => lancer('filtration')}>
                  <Filter className="h-4 w-4" /> Filtrer
                </Button>
                <Button variant={technique === 'decantation' && running ? 'success' : 'soft'} size="sm" onClick={() => lancer('decantation')}>
                  <Droplets className="h-4 w-4" /> Décanter
                </Button>
              </div>
              <p className="mt-1 text-xs text-ink/55">
                {melange === 'sel'
                  ? "Le sel reste dissous : ni la filtration ni la décantation ne le retirent."
                  : technique === 'filtration'
                    ? 'Le sable est retenu sur le filtre (résidu), l’eau passe (filtrat).'
                    : technique === 'decantation'
                      ? 'Laisse reposer : les grains se déposent au fond du bécher.'
                      : 'Lance une technique pour séparer le sable.'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">{explored.size} essai(s) réalisé(s)</span>
            <Button variant="gradient" disabled={explored.size < 1} onClick={() => setStep('observe')}>
              {explored.size < 1 ? 'Lance une séparation' : 'Voir le résultat'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ce que tu observes</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Mélange</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Séparation</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Eau + sable</td>
                  <td className="px-4 py-2 font-semibold text-violet-700">Hétérogène</td>
                  <td className="px-4 py-2">Filtration (résidu sur le filtre) ou décantation</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Eau + sel</td>
                  <td className="px-4 py-2 font-semibold text-violet-700">Homogène</td>
                  <td className="px-4 py-2">Ni filtration ni décantation (sel dissous)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            La <strong>filtration</strong> sépare un solide insoluble d&apos;un liquide : le sable reste sur le filtre
            (le <strong>résidu</strong>), l&apos;eau qui passe est le <strong>filtrat</strong>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Refaire un essai
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
            <Badge tone="maths">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="L'eau salée est un mélange :"
              tone="violet"
              options={[
                { key: 'homogene', label: 'Homogène (on ne distingue pas le sel)' },
                { key: 'heterogene', label: 'Hétérogène (on distingue le sel)' },
                { key: 'purs', label: 'Un corps pur (pas un mélange)' },
              ]}
              value={qSel}
              onChange={setQSel}
            />
            <QcmStep
              label="Pour séparer le sable de l'eau, on utilise :"
              tone="violet"
              options={[
                { key: 'filtration', label: 'La filtration' },
                { key: 'evaporation', label: "L'évaporation" },
                { key: 'rien', label: 'Rien, c’est impossible' },
              ]}
              value={qSepare}
              onChange={setQSepare}
            />
            <QcmStep
              label="Après filtration, le sable reste :"
              tone="violet"
              options={[
                { key: 'filtre', label: 'Sur le filtre (c’est le résidu)' },
                { key: 'filtrat', label: 'Dans le liquide qui passe (le filtrat)' },
                { key: 'disparait', label: 'Il disparaît complètement' },
              ]}
              value={qResidu}
              onChange={setQResidu}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qSel || !qSepare || !qResidu || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              L&apos;eau salée est <strong>homogène</strong> (sel dissous). L&apos;eau + sable est{' '}
              <strong>hétérogène</strong>. On sépare le sable par <strong>filtration</strong> : il reste sur le filtre
              (le <strong>résidu</strong>), l&apos;eau passe (le <strong>filtrat</strong>). La <strong>décantation</strong>{' '}
              laisse les grains se déposer au fond.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
