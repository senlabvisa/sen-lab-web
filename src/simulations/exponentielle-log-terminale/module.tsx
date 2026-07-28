'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, FlipHorizontal2, Gauge, Sparkles, TrendingUp } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Exponentielle exp(x) et logarithme népérien ln(x) (Terminale, Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (exp / ln / les
 * deux) → observation → QCM → bilan. Science juste : exp définie sur ℝ et
 * toujours > 0, ln définie sur ]0;+∞[ ; ln et exp réciproques, courbes
 * symétriques par rapport à la droite y = x. Contexte : croissances et
 * décroissances réelles (population de Dakar, radioactivité, pH).
 */

const ExpScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Show = 'exp' | 'log' | 'both';
type Step = 'intro' | 'hypo' | 'manip' | 'observation' | 'qcm' | 'done';
type HypoRep = 'identiques' | 'symetriques' | 'opposees' | null;

const INTRO =
  "À Dakar, la population grandit d'année en année : c'est une croissance exponentielle, décrite par la fonction exp. " +
  "À l'inverse, le nombre de noyaux radioactifs dans une roche diminue, et c'est le logarithme népérien ln qui mesure le temps écoulé. " +
  "Ces deux fonctions sont liées : ln défait ce que exp construit. Aujourd'hui tu vas découvrir comment leurs courbes se répondent.";

const CONCLUSION =
  "Bravo ! exp est définie sur tout ℝ et reste toujours positive ; ln n'existe que pour x strictement positif. " +
  "Surtout, ln et exp sont réciproques : ln(exp(x)) = x et exp(ln(x)) = x. " +
  "C'est pour cela que leurs courbes sont symétriques par rapport à la droite y = x. Tu es prêt pour le Bac.";

export function ExponentielleLogTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [show, setShow] = useState<Show>('exp');
  const [seen, setSeen] = useState<Set<Show>>(new Set(['exp']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qDomaine, setQDomaine] = useState<string | null>(null);
  const [qExp0, setQExp0] = useState<string | null>(null);
  const [qSymetrie, setQSymetrie] = useState<string | null>(null);

  function pick(x: Show) {
    setShow(x);
    setSeen((prev) => new Set(prev).add(x));
  }

  // Score = exploration (avoir manipulé exp, ln et les deux) + bonnes réponses.
  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, seen.size * 9); // exploration : jusqu'à 3 vues × 9 ≈ 25
    if (hypo === 'symetriques') s += 10; // bonne prédiction
    if (qDomaine === 'positif') s += 22;
    if (qExp0 === 'un') s += 21;
    if (qSymetrie === 'yx') s += 22;
    return Math.min(100, s);
  }, [seen, hypo, qDomaine, qExp0, qSymetrie]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'exponentielle-log-terminale',
        version: '2.0',
        steps: {
          viewsSeen: Array.from(seen),
          hypothesis: hypo,
          qcm: { qDomaine, qExp0, qSymetrie },
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
                <TrendingUp className="h-5 w-5" />
              </span>
              Exponentielle et logarithme
            </CardTitle>
            <Badge tone="maths">Maths · Terminale · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La population de <strong>Dakar</strong> croît de façon <strong>exponentielle</strong> (fonction exp).
              La radioactivité d&apos;une roche, elle, décroît, et c&apos;est le <strong>logarithme népérien</strong> ln
              qui mesure le temps écoulé.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> comprendre que exp et ln sont des <strong>fonctions réciproques</strong> —
              ln(exp(x)) = x — et voir pourquoi leurs courbes sont symétriques par rapport à la droite y = x.
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
              <Sparkles className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : selon toi, dans un même repère, les courbes de exp et de ln sont…
          </p>
          <QcmStep
            label="Mon hypothèse : les courbes de exp et ln sont…"
            tone="violet"
            options={[
              { key: 'identiques', label: 'Identiques (la même courbe).' },
              { key: 'symetriques', label: 'Symétriques par rapport à la droite y = x.' },
              { key: 'opposees', label: "Opposées (l'une au-dessus de l'axe, l'autre en dessous)." },
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
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Explore les courbes
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Affiche exp, puis ln, puis <strong>les deux</strong> avec la droite y = x. Tourne la scène avec ta souris /
            ton doigt et observe la symétrie.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <ExpScene show={show} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(['exp', 'log', 'both'] as Show[]).map((x) => (
              <Button key={x} variant={show === x ? 'gradient' : 'outline'} size="sm" onClick={() => pick(x)}>
                {x === 'exp' ? 'exp(x)' : x === 'log' ? 'ln(x)' : 'Les deux'}
                {seen.has(x) && show !== x ? ' ✓' : ''}
              </Button>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Fact label="exp" value="ℝ → ]0;+∞[" note="exp(0) = 1, toujours > 0" />
            <Fact label="ln" value="]0;+∞[ → ℝ" note="ln(1) = 0, ln(e) = 1" />
            <Fact label="lien" value="réciproques" note="ln(exp(x)) = x" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-violet-700">
              <FlipHorizontal2 className="h-4 w-4" /> Vues explorées : {seen.size}/3
            </span>
            <Button variant="gradient" disabled={seen.size < 3} onClick={() => setStep('observation')}>
              {seen.size < 3 ? 'Affiche les 3 vues' : 'Continuer'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observation' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ce que tu as observé</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Repère les points clés sur les deux courbes. Ils se correspondent par échange des coordonnées (x ↔ y).
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Point sur exp</th>
                  <th className="px-4 py-2 text-left">Point sur ln (symétrique)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2 font-mono">exp(0) = 1 → (0 ; 1)</td>
                  <td className="px-4 py-2 font-mono">ln(1) = 0 → (1 ; 0)</td>
                </tr>
                <tr className="border-t border-night-100 bg-emerald-50/50">
                  <td className="px-4 py-2 font-mono">exp(1) = e → (1 ; 2,718)</td>
                  <td className="px-4 py-2 font-mono">ln(e) = 1 → (2,718 ; 1)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            Chaque point (a ; b) de exp donne le point (b ; a) de ln : c&apos;est exactement la symétrie par rapport à
            la droite <strong>y = x</strong>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la scène
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
              label="La fonction ln est définie pour :"
              tone="violet"
              options={[
                { key: 'positif', label: 'x > 0 (réels strictement positifs)' },
                { key: 'tous', label: 'tous les réels x' },
                { key: 'negatif', label: 'x < 0 seulement' },
              ]}
              value={qDomaine}
              onChange={setQDomaine}
            />
            <QcmStep
              label="exp(0) vaut :"
              tone="violet"
              options={[
                { key: 'zero', label: '0' },
                { key: 'un', label: '1' },
                { key: 'e', label: 'e ≈ 2,718' },
              ]}
              value={qExp0}
              onChange={setQExp0}
            />
            <QcmStep
              label="Les courbes de exp et ln sont symétriques par rapport à :"
              tone="violet"
              options={[
                { key: 'yx', label: 'la droite y = x' },
                { key: 'ox', label: "l'axe des abscisses (Ox)" },
                { key: 'oy', label: "l'axe des ordonnées (Oy)" },
              ]}
              value={qSymetrie}
              onChange={setQSymetrie}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observation')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qDomaine || !qExp0 || !qSymetrie || busy} onClick={handleValidate}>
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
              exp est définie sur <strong>ℝ</strong> et toujours <strong>&gt; 0</strong> ; ln est définie sur{' '}
              <strong>]0 ; +∞[</strong>. Elles sont <strong>réciproques</strong> : ln(exp(x)) = x et exp(ln(x)) = x, donc
              leurs courbes sont symétriques par rapport à la droite <strong>y = x</strong>.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
      <div className="text-[10px] uppercase tracking-wider text-violet-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-violet-800">{value}</div>
      <div className="mt-0.5 text-[11px] text-ink/55">{note}</div>
    </div>
  );
}
