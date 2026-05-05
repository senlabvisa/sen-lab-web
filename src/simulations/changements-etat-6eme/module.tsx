'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Flame, Pause, Play, RotateCcw } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';

/**
 * TP — Changements d'état (6ème, Physique-Chimie)
 *
 * Lab Premium PC : on chauffe progressivement la glace, on observe
 * la fusion (à 0°C) puis la vaporisation (à 100°C). T° évolue dans
 * le temps via un timer, l'élève peut jouer/pause/reset.
 */

const HeatingScene = dynamic(() => import('./heating-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-blue-50 text-sm text-ink/50">
      Chargement du bécher 3D…
    </div>
  ),
});

type Step = 'intro' | 'heat' | 'qfusion' | 'qvap' | 'done';
type Fusion = 'fusion' | 'vaporisation' | 'condensation' | null;
type Vap = 'fusion' | 'vaporisation' | 'solidification' | null;

const T_START = -10;
const T_END = 110;

const INTRO_NARRATION =
  "Tu connais l'eau dans 3 états : glace, eau liquide, et vapeur. " +
  "Mais comment passe-t-on de l'un à l'autre ? Tu vas chauffer un bécher contenant de la glace, et observer en direct ce qui se passe. " +
  "Tu verras que la température reste bloquée à 0 degré pendant que la glace fond, puis à 100 degrés pendant que l'eau bout.";

const CONCLUSION_NARRATION =
  "Tu as observé deux changements d'état : la fusion (de la glace à l'eau liquide à 0 degré) et la vaporisation (de l'eau liquide à la vapeur à 100 degrés). " +
  "Ce sont les changements que tu vois quand ta maman fait bouillir de l'eau pour le café Touba ou que tu sors un glaçon du congélateur.";

export function ChangementsEtat6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [temperature, setTemperature] = useState(T_START);
  const [playing, setPlaying] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = window.setInterval(() => {
      setTemperature((t) => {
        // Plateaux à 0°C (fusion) et 100°C (vaporisation)
        if (t < 0) return t + 1;
        if (t < 5) return t + 0.3; // fusion lente
        if (t < 95) return t + 1.5;
        if (t < 105) return t + 0.3; // vaporisation lente
        if (t < T_END) return t + 0.6;
        // Fin
        setPlaying(false);
        return T_END;
      });
    }, 200);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [playing]);

  function reset() {
    setPlaying(false);
    setTemperature(T_START);
  }

  const reachedFusion = temperature >= 5;
  const reachedVap = temperature >= 105;

  const [fusion, setFusion] = useState<Fusion>(null);
  const [vap, setVap] = useState<Vap>(null);

  const score = useMemo(() => {
    let s = 0;
    if (reachedFusion) s += 15;
    if (reachedVap) s += 15;
    if (fusion === 'fusion') s += 35;
    if (vap === 'vaporisation') s += 35;
    return Math.max(0, Math.min(100, s));
  }, [reachedFusion, reachedVap, fusion, vap]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'changements-etat-6eme',
        version: '1.0',
        steps: {
          finalTemp: temperature,
          reachedFusion,
          reachedVap,
          fusion,
          vap,
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-700 shadow-soft ring-1 ring-blue-100">
                <Flame className="h-5 w-5" />
              </span>
              De la glace à la vapeur
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Quand ta maman prépare le <strong>café Touba</strong>, elle chauffe l&apos;eau dans
              une casserole jusqu&apos;à ce qu&apos;elle bouille. Et quand tu sors un{' '}
              <strong>glaçon</strong> du congélateur, il fond. Mais comment ces transformations se
              passent-elles ?
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Mission :</strong> chauffe la glace progressivement et observe ce qui se
              passe à 0&nbsp;°C et à 100&nbsp;°C.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('heat')}>
              Allumer le feu
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'heat' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-700" />
              Étape 1 — Chauffe et observe
            </CardTitle>
            <Badge tone="science">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Lance la simulation et observe : la T° monte, mais elle <strong>se bloque</strong> à
            certains moments. Pourquoi ?
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <HeatingScene temperature={temperature} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="gradient" size="sm" onClick={() => setPlaying((p) => !p)}>
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? 'Pause' : 'Chauffer'}
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge tone={reachedFusion ? 'action' : 'neutral'} size="sm">
                {reachedFusion ? '✓ ' : ''}Fusion 0°C
              </Badge>
              <Badge tone={reachedVap ? 'action' : 'neutral'} size="sm">
                {reachedVap ? '✓ ' : ''}Vaporisation 100°C
              </Badge>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={!reachedFusion || !reachedVap} onClick={() => setStep('qfusion')}>
              Questions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qfusion' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Glace → eau liquide</CardTitle>
            <Badge tone="science">2/3</Badge>
          </CardHeader>
          <Qcm
            label="Comment s'appelle le passage de l'état solide (glace) à l'état liquide (eau) ?"
            options={[
              { key: 'fusion', label: 'La fusion' },
              { key: 'vaporisation', label: 'La vaporisation' },
              { key: 'condensation', label: 'La condensation' },
            ]}
            value={fusion}
            onChange={(v) => setFusion(v as Fusion)}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('heat')}>
              Revoir
            </Button>
            <Button variant="gradient" disabled={!fusion} onClick={() => setStep('qvap')}>
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qvap' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Eau liquide → vapeur</CardTitle>
            <Badge tone="science">3/3</Badge>
          </CardHeader>
          <Qcm
            label="Comment s'appelle le passage de l'état liquide (eau) à l'état gaz (vapeur) ?"
            options={[
              { key: 'fusion', label: 'La fusion' },
              { key: 'vaporisation', label: 'La vaporisation (ou ébullition)' },
              { key: 'solidification', label: 'La solidification' },
            ]}
            value={vap}
            onChange={(v) => setVap(v as Vap)}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('qfusion')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!vap || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              <strong>Fusion</strong> = solide → liquide (à 0 °C pour l&apos;eau).{' '}
              <strong>Vaporisation</strong> = liquide → gaz (à 100 °C pour l&apos;eau).
              Pendant le changement, la <strong>température ne monte plus</strong> car toute la
              chaleur sert à transformer l&apos;eau, pas à la chauffer.
            </p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Qcm({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  value: string | null;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      <div className="grid gap-2">
        {options.map((opt) => (
          <label
            key={opt.key}
            className={
              'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ' +
              (value === opt.key
                ? 'border-blue-500 bg-blue-50'
                : 'border-ink/10 hover:border-blue-200 hover:bg-blue-50/50')
            }
          >
            <input
              type="radio"
              className="mt-0.5 accent-blue-600"
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
