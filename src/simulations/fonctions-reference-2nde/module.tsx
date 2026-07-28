'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Lightbulb, LineChart, Sigma, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { FnKind } from './scene';

/**
 * TP — Fonctions de référence (Seconde, Mathématiques).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (l'élève choisit
 * la fonction et observe la courbe changer) → observation → QCM → bilan.
 * Maths justes : affine = droite, carré = parabole (ℝ, ≥0), inverse =
 * hyperbole (ℝ*, deux branches), racine (croissante sur [0;+∞[).
 * Contexte : la facture d'eau de la SDE à Dakar.
 */

const FnScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'obs' | 'qcm' | 'done';
type HypoRep = 'droite' | 'parabole' | 'hyperbole' | null;

const KINDS: FnKind[] = ['affine', 'carre', 'inverse', 'racine'];

const META: Record<FnKind, { btn: string; name: string; allure: string; domaine: string; note: string }> = {
  affine: {
    btn: 'x ↦ x',
    name: 'Fonction identité (affine)',
    allure: 'une droite passant par O',
    domaine: 'ℝ (tous les réels)',
    note: 'Croissante. La courbe est une droite : à chaque pas en x, même pas en y.',
  },
  carre: {
    btn: 'x ↦ x²',
    name: 'Fonction carré',
    allure: 'une parabole, sommet en O',
    domaine: 'ℝ, et f(x) ≥ 0',
    note: 'Fonction paire : la parabole est symétrique par rapport à l’axe Oy. Jamais négative.',
  },
  inverse: {
    btn: 'x ↦ 1/x',
    name: 'Fonction inverse',
    allure: 'une hyperbole en deux branches',
    domaine: 'ℝ* (x ≠ 0)',
    note: 'Fonction impaire : symétrique par rapport à l’origine O. Interdit en x = 0 (asymptotes).',
  },
  racine: {
    btn: 'x ↦ √x',
    name: 'Fonction racine carrée',
    allure: 'une demi-parabole couchée, croissante',
    domaine: '[0 ; +∞[ (x ≥ 0)',
    note: 'Définie seulement pour x ≥ 0 (pas de racine d’un négatif). Croissante mais de plus en plus lentement.',
  },
};

const INTRO =
  "À Dakar, la facture d'eau de la SDE dépend de la quantité que tu consommes : c'est une fonction. " +
  "En seconde, quatre fonctions reviennent partout : la fonction affine x qui donne x, la fonction carré qui donne x², " +
  "la fonction inverse qui donne 1 sur x, et la fonction racine carrée. " +
  "Chacune a une courbe d'allure bien à elle. Aujourd'hui tu vas les reconnaître d'un coup d'œil.";

const CONCLUSION =
  "Bravo ! Tu as relié chaque fonction à sa courbe. La fonction affine donne une droite. " +
  "La fonction carré donne une parabole, toujours positive et symétrique par rapport à l'axe des ordonnées. " +
  "La fonction inverse donne une hyperbole en deux branches, interdite en zéro. " +
  "La fonction racine carrée n'existe que pour des nombres positifs ou nuls et croît de plus en plus lentement.";

export function FonctionsReference2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [kind, setKind] = useState<FnKind>('carre');
  const [seen, setSeen] = useState<Set<FnKind>>(new Set(['carre']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qForme, setQForme] = useState<string | null>(null);
  const [qInverse, setQInverse] = useState<string | null>(null);
  const [qRacine, setQRacine] = useState<string | null>(null);

  function pick(x: FnKind) {
    setKind(x);
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(x);
      return next;
    });
  }

  const meta = META[kind];
  const allSeen = seen.size >= KINDS.length;

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, seen.size * 7); // exploration : avoir affiché les 4 courbes
    if (hypo === 'parabole') s += 10; // bonne prédiction pour x²
    if (qForme === 'parabole') s += 22;
    if (qInverse === 'non-nul') s += 22;
    if (qRacine === 'positif') s += 21;
    return Math.min(100, s);
  }, [seen, hypo, qForme, qInverse, qRacine]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'fonctions-reference-2nde',
        version: '2.0',
        steps: {
          functionsSeen: Array.from(seen),
          hypothesis: hypo,
          qcm: { qForme, qInverse, qRacine },
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
                <Sigma className="h-5 w-5" />
              </span>
              Les fonctions de référence
            </CardTitle>
            <Badge tone="maths">Mathématiques · Seconde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À Dakar, ta facture d&apos;eau de la <strong>SDE</strong> dépend de ce que tu consommes : c&apos;est une{' '}
              <strong>fonction</strong>. En seconde, quatre fonctions reviennent partout, et chacune a une{' '}
              <strong>courbe d&apos;allure bien à elle</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> reconnaître la courbe de x ↦ x (affine), x ↦ x² (carré), x ↦ 1/x (inverse) et
              x ↦ √x (racine carrée), et connaître leur ensemble de définition.
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
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : selon toi, quelle est l&apos;allure de la courbe de la fonction{' '}
            <strong>carré</strong> (x ↦ x²) ?
          </p>
          <QcmStep
            label="Mon hypothèse : la courbe de x ↦ x² est…"
            tone="violet"
            options={[
              { key: 'droite', label: 'Une droite' },
              { key: 'parabole', label: 'Une parabole (forme de U)' },
              { key: 'hyperbole', label: 'Une hyperbole (deux branches)' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-violet-700" /> Étape 2 — Choisis la fonction
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Touche un bouton : la courbe change dans le repère. Le point orange parcourt la courbe. Affiche les{' '}
            <strong>quatre</strong> fonctions, puis observe l&apos;allure et l&apos;ensemble de définition.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <FnScene kind={kind} />
            </div>
          </div>
          <div className="mt-4">
            <Label>Fonction affichée</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {KINDS.map((x) => (
                <Button key={x} variant={kind === x ? 'gradient' : 'outline'} size="sm" onClick={() => pick(x)}>
                  {META[x].btn} {seen.has(x) && kind !== x ? '✓' : ''}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-violet-50/70 p-3 text-sm ring-1 ring-violet-100">
            <div className="font-semibold text-violet-800">{meta.name}</div>
            <div className="mt-0.5 text-ink/70">
              Allure : {meta.allure} · Définie sur {meta.domaine}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">{seen.size}/4 fonctions vues</span>
            <Button variant="gradient" disabled={!allSeen} onClick={() => setStep('obs')}>
              {allSeen ? 'Continuer' : `Affiche ${KINDS.length - seen.size} courbe(s) de plus`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'obs' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-violet-700" /> Étape 3 — Ce que tu as observé
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Récapitulons les quatre fonctions de référence et leur courbe. Garde ce tableau en tête pour le QCM.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Fonction</th>
                  <th className="px-3 py-2 text-left">Courbe</th>
                  <th className="px-3 py-2 text-left">Définie sur</th>
                </tr>
              </thead>
              <tbody>
                {KINDS.map((x) => (
                  <tr key={x} className="border-t border-night-100">
                    <td className="px-3 py-2 font-mono">{META[x].btn}</td>
                    <td className="px-3 py-2">{META[x].allure}</td>
                    <td className="px-3 py-2">{META[x].domaine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
            À retenir : x² est <strong>paire</strong> (symétrique par rapport à Oy) ; 1/x est <strong>impaire</strong>{' '}
            (symétrique par rapport à O).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la 3D
            </Button>
            <Button variant="gradient" onClick={() => setStep('qcm')}>
              Au QCM <ArrowRight className="h-4 w-4" />
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
              label="La courbe de x ↦ x² est :"
              tone="violet"
              options={[
                { key: 'parabole', label: 'Une parabole' },
                { key: 'droite', label: 'Une droite' },
                { key: 'cercle', label: 'Un cercle' },
              ]}
              value={qForme}
              onChange={setQForme}
            />
            <QcmStep
              label="La fonction inverse x ↦ 1/x est définie pour :"
              tone="violet"
              options={[
                { key: 'non-nul', label: 'Tous les réels sauf x = 0' },
                { key: 'positif', label: 'Seulement x ≥ 0' },
                { key: 'tous', label: 'Tous les réels, y compris 0' },
              ]}
              value={qInverse}
              onChange={setQInverse}
            />
            <QcmStep
              label="La fonction racine carrée x ↦ √x est définie pour :"
              tone="violet"
              options={[
                { key: 'positif', label: 'x ≥ 0' },
                { key: 'tous', label: 'Tous les réels' },
                { key: 'non-nul', label: 'x ≠ 0' },
              ]}
              value={qRacine}
              onChange={setQRacine}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('obs')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qForme || !qInverse || !qRacine || busy}
              onClick={handleValidate}
            >
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
              <strong>Affine</strong> → droite (sur ℝ). <strong>Carré</strong> → parabole (sur ℝ, toujours ≥ 0, paire).{' '}
              <strong>Inverse</strong> → hyperbole en deux branches (sur ℝ*, impaire). <strong>Racine</strong> → courbe
              croissante sur [0 ; +∞[.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
