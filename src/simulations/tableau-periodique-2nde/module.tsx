'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Atom, CheckCircle2, Orbit, Sparkles, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import { ELEMENTS, type ElementKey } from './scene';

/**
 * TP — Classification périodique & structure de l'atome (Seconde, PC).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (modèle de l'atome,
 * couches K/L/M animées) → observation → QCM → bilan. Science juste :
 * Z = nombre de protons = nombre d'électrons (atome neutre) ; remplissage
 * des couches K(2) / L(8) / M ; une colonne du tableau = une famille.
 * Contexte : le sel marin de Joal-Fadiouth (sodium + chlore).
 */

const AtomScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-indigo-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'protons' | 'neutrons' | 'masse' | null;

const ELS: ElementKey[] = ['H', 'He', 'C', 'O', 'Na', 'Cl'];

const INTRO =
  "Sur les marais salants de Joal-Fadiouth, on récolte le sel : c'est du chlorure de sodium, formé de sodium et de chlore. " +
  "Mais qu'est-ce qui distingue un atome de sodium d'un atome de chlore ? Tout part d'un seul nombre : le numéro atomique Z, " +
  "le nombre de protons du noyau. Dans le tableau périodique, les éléments sont rangés par Z croissant. Explore le modèle de l'atome pour comprendre.";

const CONCLUSION =
  "Bravo ! Le numéro atomique Z, c'est le nombre de protons du noyau, et dans un atome neutre il y a autant d'électrons que de protons. " +
  "Les électrons se répartissent par couches : K en premier (2 maxi), puis L (8 maxi), puis M. " +
  "Dans le tableau périodique, une même colonne réunit des éléments aux propriétés chimiques voisines : c'est une famille.";

export function TableauPeriodique2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [el, setEl] = useState<ElementKey>('Na');
  const [seen, setSeen] = useState<Set<ElementKey>>(new Set(['Na']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qZ, setQZ] = useState<string | null>(null);
  const [qNeutre, setQNeutre] = useState<string | null>(null);
  const [qColonne, setQColonne] = useState<string | null>(null);

  const cur = ELEMENTS[el];

  function pick(x: ElementKey) {
    setEl(x);
    setSeen((p) => new Set(p).add(x));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, seen.size * 6); // exploration : observer plusieurs atomes
    if (hypo === 'protons') s += 10;
    if (qZ === 'protons') s += 20;
    if (qNeutre === 'protons') s += 20;
    if (qColonne === 'voisines') s += 20;
    return Math.min(100, s);
  }, [seen, hypo, qZ, qNeutre, qColonne]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'tableau-periodique-2nde',
        version: '2.0',
        steps: {
          elementsSeen: Array.from(seen),
          hypothesis: hypo,
          qcm: { qZ, qNeutre, qColonne },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Atom className="h-5 w-5" />
              </span>
              Le sel de Joal et le cœur des atomes
            </CardTitle>
            <Badge tone="science">Physique-Chimie · Seconde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le sel récolté à <strong>Joal-Fadiouth</strong> est du chlorure de sodium :{' '}
              <strong>sodium (Na)</strong> + <strong>chlore (Cl)</strong>. Ce qui distingue ces atomes, c&apos;est leur{' '}
              <strong>numéro atomique Z</strong> = le nombre de protons du noyau.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> comprendre la structure de l&apos;atome (Z protons, Z électrons) et comment le
              tableau périodique range les éléments par Z croissant, en familles.
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
            Avant de manipuler : d&apos;après toi, le numéro atomique Z compte… ?
          </p>
          <QcmStep
            label="Mon hypothèse : Z est le nombre de…"
            tone="violet"
            options={[
              { key: 'protons', label: 'Protons du noyau' },
              { key: 'neutrons', label: 'Neutrons du noyau' },
              { key: 'masse', label: 'Grammes de l’atome' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Orbit className="h-5 w-5 text-violet-700" /> Étape 2 — Explore le modèle de l&apos;atome
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un élément et observe son noyau ({cur.Z} protons) et ses électrons sur les couches K, L, M. Tourne la
            scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <AtomScene element={el} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ELS.map((x) => (
              <Button key={x} variant={el === x ? 'gradient' : 'outline'} size="sm" onClick={() => pick(x)}>
                {x}
                {seen.has(x) && el !== x ? ' ✓' : ''}
              </Button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Élément" value={`${el}`} />
            <Stat label="Z (protons)" value={`${cur.Z}`} />
            <Stat label="Config." value={cur.config} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              {seen.size}/3 éléments observés
            </span>
            <Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('mesures')}>
              {seen.size < 3 ? `Observe ${3 - seen.size} élément(s) de plus` : 'Voir le récap'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-700" /> Étape 3 — Ce que tu as observé
            </CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Les éléments sont rangés par Z croissant. Remarque : pour chaque atome neutre, le nombre d&apos;électrons est
            égal à Z.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Élément</th>
                  <th className="px-3 py-2 text-left">Z</th>
                  <th className="px-3 py-2 text-left">Électrons</th>
                  <th className="px-3 py-2 text-left">Couches (K·L·M)</th>
                </tr>
              </thead>
              <tbody>
                {ELS.filter((x) => seen.has(x))
                  .sort((a, b) => ELEMENTS[a].Z - ELEMENTS[b].Z)
                  .map((x) => {
                    const e = ELEMENTS[x];
                    return (
                      <tr key={x} className="border-t border-night-100">
                        <td className="px-3 py-2 font-semibold">
                          {e.name} ({x})
                        </td>
                        <td className="px-3 py-2 font-mono">{e.Z}</td>
                        <td className="px-3 py-2 font-mono">{e.Z}</td>
                        <td className="px-3 py-2 font-mono text-violet-700">{e.shells.join(' · ')}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Réexplorer
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
              label="Le numéro atomique Z représente :"
              tone="violet"
              options={[
                { key: 'protons', label: 'Le nombre de protons du noyau' },
                { key: 'neutrons', label: 'Le nombre de neutrons' },
                { key: 'couches', label: 'Le nombre de couches électroniques' },
              ]}
              value={qZ}
              onChange={setQZ}
            />
            <QcmStep
              label="Dans un atome neutre, le nombre d'électrons est égal au nombre de :"
              tone="violet"
              options={[
                { key: 'protons', label: 'Protons' },
                { key: 'neutrons', label: 'Neutrons' },
                { key: 'couches', label: 'Couches' },
              ]}
              value={qNeutre}
              onChange={setQNeutre}
            />
            <QcmStep
              label="Les éléments d'une même colonne du tableau ont :"
              tone="violet"
              options={[
                { key: 'voisines', label: 'Des propriétés chimiques voisines' },
                { key: 'memeZ', label: 'Le même numéro atomique Z' },
                { key: 'memeMasse', label: 'La même masse' },
              ]}
              value={qColonne}
              onChange={setQColonne}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qZ || !qNeutre || !qColonne || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              <strong>Z = nombre de protons = nombre d&apos;électrons</strong> (atome neutre). Les électrons remplissent
              les couches K (2 maxi), puis L (8 maxi), puis M. Le sel de Joal = NaCl : sodium (Z=11) + chlore (Z=17).
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              Dans le tableau, une colonne = une <strong>famille</strong> (propriétés voisines) : He et les gaz nobles,
              Cl et les halogènes, Na et les alcalins.
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
