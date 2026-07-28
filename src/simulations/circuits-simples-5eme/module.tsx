'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Lightbulb, Power, Target, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { Mode } from './circuit-scene';

/**
 * TP — Circuits électriques simples : série et dérivation (Physique-Chimie, 5ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → observation →
 * QCM → bilan. Science juste : en série une seule boucle (une lampe grillée
 * coupe tout) ; en dérivation chaque branche est indépendante. Interrupteur
 * ouvert = circuit coupé. Contexte : l'éclairage d'une maison (Woyofal).
 */

const CircuitScene = dynamic(() => import('./circuit-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Grilled = 0 | 1 | 2;
type HypoRep = 'serie' | 'derivation' | 'pareil' | null;

const INTRO =
  "Le soir, à la maison, on recharge le compteur Woyofal et on allume les lampes. " +
  "Mais comment les ampoules sont-elles branchées entre elles ? " +
  "Il y a deux façons de monter un circuit : en série, sur une seule boucle, ou en dérivation, " +
  "chaque lampe sur sa propre branche. Aujourd'hui tu vas découvrir laquelle garde la lumière " +
  "quand une ampoule grille.";

const CONCLUSION =
  "Bravo ! Dans un montage en série, toutes les lampes sont sur une seule boucle : si une grille, " +
  "le circuit est coupé et tout s'éteint. Dans un montage en dérivation, chaque lampe a sa propre " +
  "branche : si une grille, les autres restent allumées. Et dans tous les cas, il faut un interrupteur " +
  "fermé pour que le courant circule. C'est pour ça que les maisons sont câblées en dérivation.";

export function CircuitsSimples5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [mode, setMode] = useState<Mode>('serie');
  const [closed, setClosed] = useState(false);
  const [grilled, setGrilled] = useState<Grilled>(0);

  // Exploration : on note les manipulations clés réalisées.
  const [explored, setExplored] = useState<Set<string>>(new Set());

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qSerie, setQSerie] = useState<string | null>(null);
  const [qDeriv, setQDeriv] = useState<string | null>(null);
  const [qInter, setQInter] = useState<string | null>(null);

  function mark(key: string) {
    setExplored((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  // Observation live (même logique que la scène).
  const lit1 = closed && grilled !== 1 && (mode === 'derivation' || grilled === 0);
  const lit2 = closed && grilled !== 2 && (mode === 'derivation' || grilled === 0);

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, explored.size * 6); // exploration (5 manips → 30)
    if (hypo === 'derivation') s += 10; // bonne intuition
    if (qSerie === 'eteignent') s += 20;
    if (qDeriv === 'restent') s += 20;
    if (qInter === 'ferme') s += 20;
    return Math.min(100, s);
  }, [explored, hypo, qSerie, qDeriv, qInter]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'circuits-simples-5eme',
        version: '2.0',
        steps: {
          explored: Array.from(explored),
          hypothesis: hypo,
          qcm: { qSerie, qDeriv, qInter },
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
                <Lightbulb className="h-5 w-5" />
              </span>
              La lumière de la maison
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le soir, on recharge le compteur <strong>Woyofal</strong> et on allume les lampes. Les ampoules
              peuvent être branchées de deux façons : en <strong>série</strong> (une seule boucle) ou en{' '}
              <strong>dérivation</strong> (chaque lampe sur sa branche).
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> comprendre ce qui se passe quand une ampoule grille, selon le montage,
              et le rôle de l&apos;interrupteur.
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
            Avant de manipuler : selon toi, avec quel montage les <strong>autres lampes restent allumées</strong>{' '}
            quand une ampoule grille ?
          </p>
          <QcmStep
            label="Mon hypothèse : pour garder la lumière, il vaut mieux brancher les lampes…"
            tone="amber"
            options={[
              { key: 'serie', label: 'En série (sur une seule boucle).' },
              { key: 'derivation', label: 'En dérivation (chaque lampe sur sa branche).' },
              { key: 'pareil', label: 'C’est pareil, ça ne change rien.' },
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
              <Zap className="h-5 w-5 text-amber-700" /> Étape 2 — Manipule le circuit
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Change le montage, ouvre/ferme l&apos;interrupteur et fais « griller » une ampoule. Observe les deux
            lampes. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <CircuitScene mode={mode} closed={closed} grilled={grilled} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <Label className="text-xs">Montage</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Button
                  variant={mode === 'serie' ? 'gradient' : 'soft'}
                  size="sm"
                  onClick={() => {
                    setMode('serie');
                    mark('serie');
                  }}
                >
                  Série
                </Button>
                <Button
                  variant={mode === 'derivation' ? 'gradient' : 'soft'}
                  size="sm"
                  onClick={() => {
                    setMode('derivation');
                    mark('derivation');
                  }}
                >
                  Dérivation
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant={closed ? 'success' : 'soft'}
                size="sm"
                onClick={() => {
                  setClosed((c) => !c);
                  mark('inter');
                }}
              >
                <Power className="h-4 w-4" /> Interrupteur {closed ? 'fermé' : 'ouvert'}
              </Button>
              <Button
                variant={grilled !== 0 ? 'danger' : 'soft'}
                size="sm"
                onClick={() => {
                  setGrilled((g) => ((g + 1) % 3) as Grilled);
                  mark('grill');
                }}
              >
                <Lightbulb className="h-4 w-4" />
                {grilled === 0 ? 'Faire griller une lampe' : grilled === 1 ? 'L1 grillée' : 'L2 grillée'}
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
            <Stat label="Lampe L1" value={lit1 ? '💡 allumée' : '⚫ éteinte'} on={lit1} />
            <Stat label="Lampe L2" value={lit2 ? '💡 allumée' : '⚫ éteinte'} on={lit2} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">Manips : {explored.size}/5</span>
            <Button variant="gradient" disabled={explored.size < 4} onClick={() => setStep('mesures')}>
              {explored.size < 4 ? `Explore encore (${4 - explored.size})` : 'Voir mes observations'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes observations</CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare ce que font les autres lampes quand une ampoule grille, selon le montage.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                <tr>
                  <th className="px-4 py-2 text-left">Situation</th>
                  <th className="px-4 py-2 text-left">Résultat</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Interrupteur ouvert</td>
                  <td className="px-4 py-2">Circuit coupé · tout est éteint</td>
                </tr>
                <tr className="border-t border-night-100 bg-red-50">
                  <td className="px-4 py-2">Série · une lampe grille</td>
                  <td className="px-4 py-2 font-semibold text-red-700">Tout s&apos;éteint ⚫</td>
                </tr>
                <tr className="border-t border-night-100 bg-emerald-50">
                  <td className="px-4 py-2">Dérivation · une lampe grille</td>
                  <td className="px-4 py-2 font-semibold text-emerald-700">L&apos;autre reste allumée 💡</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retester
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
              label="Dans un circuit en série, si une ampoule grille, les autres :"
              tone="amber"
              options={[
                { key: 'eteignent', label: "S'éteignent aussi (la boucle est coupée)." },
                { key: 'restent', label: 'Restent allumées.' },
                { key: 'brillent', label: 'Brillent plus fort.' },
              ]}
              value={qSerie}
              onChange={setQSerie}
            />
            <QcmStep
              label="Dans un circuit en dérivation, si une ampoule grille, les autres :"
              tone="amber"
              options={[
                { key: 'restent', label: 'Restent allumées (chaque branche est indépendante).' },
                { key: 'eteignent', label: "S'éteignent aussi." },
                { key: 'clignotent', label: 'Se mettent à clignoter.' },
              ]}
              value={qDeriv}
              onChange={setQDeriv}
            />
            <QcmStep
              label="Pour que le courant circule, l'interrupteur doit être :"
              tone="amber"
              options={[
                { key: 'ferme', label: 'Fermé (il ferme la boucle).' },
                { key: 'ouvert', label: 'Ouvert (il ouvre la boucle).' },
                { key: 'indiff', label: "Peu importe, ça n'a pas d'effet." },
              ]}
              value={qInter}
              onChange={setQInter}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qSerie || !qDeriv || !qInter || busy} onClick={handleValidate}>
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
              En <strong>série</strong>, tout est sur une seule boucle : une lampe grillée coupe tout. En{' '}
              <strong>dérivation</strong>, chaque lampe a sa branche : les autres restent allumées. Et il faut un{' '}
              <strong>interrupteur fermé</strong> pour que le courant circule. Voilà pourquoi les maisons sont
              câblées en dérivation.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, on }: { label: string; value: string; on: boolean }) {
  return (
    <div className={'rounded-xl p-2 ring-1 ' + (on ? 'bg-amber-50 ring-amber-200' : 'bg-night-50 ring-night-100')}>
      <div className="text-[10px] uppercase tracking-wider text-ink/45">{label}</div>
      <div className={'font-mono text-sm font-bold ' + (on ? 'text-amber-800' : 'text-ink/50')}>{value}</div>
    </div>
  );
}
