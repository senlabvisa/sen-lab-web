'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Atom, CheckCircle2, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Désintégration radioactive du Carbone 14 (Terminale, Physique-Chimie).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (courbe de
 * décroissance, demi-vies) → QCM → bilan. Loi N(t) = N₀·(1/2)^(t/T) ;
 * T½ = 5730 ans pour le C14. Contexte : datation en archéologie.
 */

const DecayScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">Chargement de la scène 3D…</div>,
});

type Step = 'intro' | 'hypo' | 'manip' | 'qcm' | 'done';
type HypoRep = 'moitie' | 'tout' | 'rien' | null;
const T12 = 5730;

const INTRO =
  "En archéologie, on date les vestiges grâce au Carbone 14, un atome radioactif présent dans tout être vivant. " +
  "À la mort de l'organisme, le C14 n'est plus renouvelé : il se désintègre peu à peu. Tous les 5730 ans — sa demi-vie — " +
  "la moitié des atomes restants disparaît. En mesurant ce qu'il reste, on remonte le temps. Tu vas explorer cette décroissance.";

const CONCLUSION =
  "Bravo ! La demi-vie T½ est le temps au bout duquel la moitié des noyaux se sont désintégrés. Pour le C14, T½ = 5730 ans : " +
  "après une demi-vie il reste 50 %, après deux 25 %, après trois 12,5 %… La décroissance est exponentielle, jamais tout à fait nulle, " +
  "ce qui permet de dater jusqu'à environ 50 000 ans.";

export function DesintegrationRadioactiveTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [t, setT] = useState(0);
  const [tweaks, setTweaks] = useState(0);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qDef, setQDef] = useState<string | null>(null);
  const [qDeux, setQDeux] = useState<string | null>(null);

  function setTime(v: number) {
    setT(v);
    setTweaks((c) => c + 1);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, tweaks * 5);
    if (hypo === 'moitie') s += 10;
    if (qDef === 'moitie') s += 30;
    if (qDeux === 'quart') s += 30;
    return Math.max(0, Math.min(100, s));
  }, [tweaks, hypo, qDef, qDeux]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'desintegration-radioactive-terminale',
        version: '2.0',
        steps: { explore: { tweaks, lastTime: t }, hypothesis: hypo, qcm: { qDef, qDeux } },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <Atom className="h-5 w-5" />
              </span>
              Dater avec le Carbone 14
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · Terminale</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le <strong>Carbone 14</strong> est radioactif : il se désintègre lentement. Sa <strong>demi-vie</strong> est de{' '}
              <strong>5730 ans</strong>. C&apos;est ce qui permet de <strong>dater</strong> les vestiges en archéologie.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> comprendre la demi-vie et lire la courbe de décroissance{' '}
              <span className="font-mono">N(t)/N₀ = (½)^(t/T)</span>.
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
              <Sparkles className="h-5 w-5 text-amber-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Au bout d&apos;<strong>une</strong> demi-vie (5730 ans), quelle proportion de Carbone 14 reste-t-il, selon toi ?
          </p>
          <QcmStep
            label="Après une demi-vie, il reste…"
            tone="amber"
            options={[
              { key: 'moitie', label: 'La moitié (50 %)' },
              { key: 'tout', label: 'Presque tout' },
              { key: 'rien', label: 'Plus rien (0 %)' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier sur la courbe <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Atom className="h-5 w-5 text-amber-700" /> Étape 2 — Parcours le temps
            </CardTitle>
            <Badge tone="physique">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais avancer le temps. Le point rouge suit la courbe. Repère les <strong>demi-vies</strong> : à 5730 ans il reste 50 %, à 11 460 ans
            25 %…
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <DecayScene time={t} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="t">Temps écoulé</Label>
              <span className="font-mono text-amber-700">
                {t.toLocaleString('fr-FR')} ans ({(t / T12).toFixed(1)} T½)
              </span>
            </div>
            <input id="t" type="range" min={0} max={30000} step={500} value={t} onChange={(e) => setTime(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 4} onClick={() => setStep('qcm')}>
              {tweaks < 4 ? `Explore ${4 - tweaks} fois de plus` : 'Conclure'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Valide ta compréhension</CardTitle>
            <Badge tone="physique">3/3</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="La demi-vie T½ d'un noyau radioactif est…"
              tone="amber"
              options={[
                { key: 'moitie', label: 'Le temps au bout duquel la moitié des noyaux se sont désintégrés' },
                { key: 'duree', label: 'La durée totale jusqu’à disparition complète' },
                { key: 'masse', label: 'La masse divisée par deux' },
              ]}
              value={qDef}
              onChange={setQDef}
            />
            <QcmStep
              label="Au bout de DEUX demi-vies, quelle proportion reste-t-il ?"
              tone="amber"
              options={[
                { key: 'quart', label: '25 % (un quart)' },
                { key: 'zero', label: '0 %' },
                { key: 'moitie', label: '50 %' },
              ]}
              value={qDeux}
              onChange={setQDeux}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir la courbe
            </Button>
            <Button variant="success" disabled={!qDef || !qDeux || busy} onClick={handleValidate}>
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
              La <strong>demi-vie</strong> est le temps pour que la moitié des noyaux se désintègrent. Après 1 T½ il reste 50 %, après 2 T½{' '}
              <strong>25 %</strong>, après 3 T½ 12,5 %… La décroissance est <strong>exponentielle</strong> (jamais nulle), d&apos;où la datation
              jusqu&apos;à ~50 000 ans.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
