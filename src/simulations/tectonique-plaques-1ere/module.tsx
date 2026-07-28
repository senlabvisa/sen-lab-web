'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Globe, Mountain, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Tectonique des plaques (1ère, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (deux plaques qui
 * convergent, montagnes + séisme) → QCM → bilan. La lithosphère est découpée
 * en plaques mobiles ; leurs frontières concentrent séismes et reliefs.
 * Contexte : la plaque africaine et la formation des reliefs.
 */

const TectoScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[320px] place-items-center bg-slate-900 text-sm text-white/50">Chargement de la scène 3D…</div>,
});

type Step = 'intro' | 'hypo' | 'manip' | 'qcm' | 'done';
type HypoRep = 'frontieres' | 'centre' | 'partout' | null;

const INTRO =
  "La couche solide de la Terre, la lithosphère, n'est pas d'un seul bloc : elle est découpée en plaques qui glissent lentement sur le manteau, " +
  "de quelques centimètres par an. Là où deux plaques se rencontrent, l'énergie s'accumule. Quand elle se libère d'un coup, c'est un séisme ; " +
  "sur le long terme, la collision soulève des chaînes de montagnes. Tu vas faire monter la tension à une frontière et observer.";

const CONCLUSION =
  "Bravo ! Les séismes et les reliefs se concentrent aux frontières de plaques. Quand deux plaques se rapprochent (convergence), " +
  "la tension monte puis se libère brutalement (séisme), et la collision soulève des montagnes. Au milieu d'une plaque, c'est beaucoup plus calme.";

export function TectoniquePlaques1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [t, setT] = useState(0.3);
  const [tweaks, setTweaks] = useState(0);
  const [sawQuake, setSawQuake] = useState(false);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qCause, setQCause] = useState<string | null>(null);
  const [qMontagne, setQMontagne] = useState<string | null>(null);

  function setTension(v: number) {
    setT(v);
    setTweaks((c) => c + 1);
    if (v > 0.7) setSawQuake(true);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, tweaks * 5);
    if (sawQuake) s += 5; // a déclenché un séisme
    if (hypo === 'frontieres') s += 10;
    if (qCause === 'mouvements') s += 30;
    if (qMontagne === 'rapprochent') s += 30;
    return Math.max(0, Math.min(100, s));
  }, [tweaks, sawQuake, hypo, qCause, qMontagne]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'tectonique-plaques-1ere',
        version: '2.0',
        steps: { explore: { tweaks, sawQuake, lastTension: t }, hypothesis: hypo, qcm: { qCause, qMontagne } },
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
                <Globe className="h-5 w-5" />
              </span>
              La danse des plaques
            </CardTitle>
            <Badge tone="svt">SVT · 1ère</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              La <strong>lithosphère</strong> est découpée en <strong>plaques</strong> qui se déplacent lentement sur le manteau. À leurs{' '}
              <strong>frontières</strong>, l&apos;énergie s&apos;accumule puis se libère : séismes et reliefs.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> comprendre pourquoi séismes et montagnes se concentrent aux frontières de plaques.
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
          <p className="mb-3 text-sm text-ink/70">Selon toi, où se produisent surtout les séismes sur Terre ?</p>
          <QcmStep
            label="Les séismes se concentrent…"
            tone="action"
            options={[
              { key: 'frontieres', label: 'Aux frontières entre plaques' },
              { key: 'centre', label: 'Au centre des plaques' },
              { key: 'partout', label: 'Partout, au hasard' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-emerald-700" /> Étape 2 — Fais monter la tension
            </CardTitle>
            <Badge tone="svt">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Augmente la tension à la frontière : les plaques se rapprochent, une chaîne de montagnes se soulève.{' '}
            <strong>Dépasse 70 %</strong> pour déclencher un séisme.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <TectoScene tension={t} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="t">Tension à la faille</Label>
              <span className="font-mono text-emerald-700">{(t * 100).toFixed(0)} %</span>
            </div>
            <input id="t" type="range" min={0} max={1} step={0.05} value={t} onChange={(e) => setTension(Number(e.target.value))} className="slider-lab w-full" />
          </div>
          <div
            className={
              'mt-3 rounded-xl p-3 text-sm ring-1 ' +
              (t > 0.7 ? 'bg-alert-50 text-alert-700 ring-alert-100' : 'bg-emerald-50 text-emerald-800 ring-emerald-100')
            }
          >
            {t > 0.7 ? '⚠ Séisme : l’énergie accumulée se libère d’un coup, le sol tremble.' : 'La tension monte et soulève lentement les reliefs (orogenèse).'}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tweaks < 4 || !sawQuake} onClick={() => setStep('qcm')}>
              {!sawQuake ? 'Déclenche un séisme (> 70 %)' : tweaks < 4 ? `Bouge ${4 - tweaks} fois de plus` : 'Conclure'}
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
              label="Les séismes sont causés par…"
              tone="action"
              options={[
                { key: 'mouvements', label: 'Les mouvements et frottements entre plaques' },
                { key: 'noyau', label: 'Le noyau de la Terre directement' },
                { key: 'atmosphere', label: "L'atmosphère" },
              ]}
              value={qCause}
              onChange={setQCause}
            />
            <QcmStep
              label="Les chaînes de montagnes (comme l'Atlas) se forment quand deux plaques…"
              tone="action"
              options={[
                { key: 'rapprochent', label: 'Se rapprochent et se heurtent (convergence)' },
                { key: 'ecartent', label: "S'écartent l'une de l'autre" },
                { key: 'rien', label: 'Restent parfaitement immobiles' },
              ]}
              value={qMontagne}
              onChange={setQMontagne}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir les plaques
            </Button>
            <Button variant="success" disabled={!qCause || !qMontagne || busy} onClick={handleValidate}>
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
              Séismes et reliefs se concentrent aux <strong>frontières de plaques</strong>. La <strong>convergence</strong> accumule de la
              tension qui se libère en séismes et soulève des montagnes. Le centre des plaques, lui, reste calme.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
