'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Snowflake,
  Sun,
  Thermometer,
} from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import type { WaterStateMode } from './water-states-scene';

/**
 * TP — États de la matière (6ème, Physique-Chimie)
 *
 * Premier TP du palier 6ème en mode "Lab Premium" : scène 3D immersive
 * (bécher + 28 particules animées), narration audio FR pour l'intro et la
 * conclusion, manipulation directe d'un slider de température, hotspot
 * coach qui suit l'état en cours.
 *
 * Contexte sénégalais : évaporation de l'eau de mer dans les bassins de
 * Foundiougne et du Saloum (production de sel).
 */

const WaterStatesScene = dynamic(() => import('./water-states-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-violet-50 via-white to-science-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'manipulate' | 'qcm' | 'application' | 'done';
type YesNo = 'glace' | 'liquide' | 'vapeur';

const INTRO_NARRATION =
  "À Foundiougne, dans le delta du Saloum, on récolte le sel marin depuis des siècles. " +
  "On verse l'eau de mer dans des bassins peu profonds. Avec le soleil, l'eau disparaît dans l'air, " +
  "et le sel reste au fond. Mais que devient l'eau ? Aujourd'hui, tu vas observer les particules de l'eau " +
  "à l'échelle invisible, et comprendre comment elles changent quand on chauffe ou refroidit l'eau.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu as découvert que l'eau est faite de petites particules. Quand il fait très froid, elles s'organisent " +
  "et forment de la glace. Quand il fait chaud, elles s'agitent et bougent dans tous les sens : c'est de la vapeur. " +
  "C'est pour ça que dans le Saloum, l'eau de mer s'évapore et laisse le sel : les particules d'eau partent dans l'air.";

function modeForTemp(temp: number): WaterStateMode {
  if (temp < 0) return 'solid';
  if (temp >= 100) return 'gas';
  return 'liquid';
}

export function EtatsMatiere6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [temperature, setTemperature] = useState(25);
  const [statesTried, setStatesTried] = useState<Set<WaterStateMode>>(new Set(['liquid']));

  const [qOrganise, setQOrganise] = useState<YesNo | null>(null);
  const [qAgite, setQAgite] = useState<YesNo | null>(null);
  const [qBouillir, setQBouillir] = useState<'0' | '50' | '100' | '150' | null>(null);
  const [qEvap, setQEvap] = useState<'sel-reste' | 'eau-reste' | 'rien' | null>(null);

  const mode = useMemo(() => modeForTemp(temperature), [temperature]);

  useEffect(() => {
    setStatesTried((prev) => {
      if (prev.has(mode)) return prev;
      const next = new Set(prev);
      next.add(mode);
      return next;
    });
  }, [mode]);

  const score = useMemo(() => {
    let s = 0;
    s += statesTried.size * 10;
    if (qOrganise === 'glace') s += 20;
    if (qAgite === 'vapeur') s += 20;
    if (qBouillir === '100') s += 20;
    if (qEvap === 'sel-reste') s += 10;
    return Math.max(0, Math.min(100, s));
  }, [statesTried, qOrganise, qAgite, qBouillir, qEvap]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'etats-matiere-6eme',
        version: '1.0',
        steps: {
          temperature,
          statesTried: Array.from(statesTried),
          qcm: { qOrganise, qAgite, qBouillir, qEvap },
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
                <Droplets className="h-5 w-5" />
              </span>
              Les états de l&apos;eau du Saloum
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À <strong>Foundiougne</strong>, dans le delta du Saloum, les pêcheurs récoltent le
              sel marin depuis des siècles. Ils versent l&apos;eau de mer dans de grands bassins
              peu profonds. Le soleil fait disparaître l&apos;eau, et le sel reste au fond.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Question :</strong> mais où va l&apos;eau quand elle disparaît ? Et que se
              passe-t-il quand on la refroidit jusqu&apos;à la glace ?
            </p>
            <p>
              Tu vas observer les <strong>particules d&apos;eau</strong> à l&apos;échelle
              invisible, comme avec un super-microscope. Tu pourras les chauffer, les refroidir,
              et voir comment elles bougent.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('manipulate')}>
              Ouvrir le bécher 3D
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manipulate' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-violet-700" />
              Étape 1 — Chauffe et refroidis l&apos;eau
            </CardTitle>
            <Badge tone="science">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais glisser le thermomètre. Observe les particules dans le bécher. Tourne la scène
            avec ta souris/ton doigt pour bien voir. <strong>Essaie les 3 états</strong> : glace,
            liquide et vapeur.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <WaterStatesScene
                mode={mode}
                temperature={temperature}
                showHotspot
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <label htmlFor="temp" className="font-semibold uppercase tracking-wider text-ink/60">
                  Température
                </label>
                <span className="font-mono text-sm font-bold text-violet-700">
                  {temperature} °C
                </span>
              </div>
              <input
                id="temp"
                type="range"
                min={-20}
                max={130}
                step={1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="slider-lab w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] text-ink/40">
                <span>−20°C</span>
                <span>0°C</span>
                <span>100°C</span>
                <span>130°C</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => setTemperature(-10)}>
                <Snowflake className="h-3.5 w-3.5" />
                Glace
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTemperature(25)}>
                <Droplets className="h-3.5 w-3.5" />
                Liquide
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTemperature(110)}>
                <Sun className="h-3.5 w-3.5" />
                Vapeur
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2 text-xs text-ink/70">
              <Badge tone={statesTried.has('solid') ? 'science' : 'neutral'} size="sm">
                Glace {statesTried.has('solid') ? '✓' : ''}
              </Badge>
              <Badge tone={statesTried.has('liquid') ? 'maths' : 'neutral'} size="sm">
                Liquide {statesTried.has('liquid') ? '✓' : ''}
              </Badge>
              <Badge tone={statesTried.has('gas') ? 'action' : 'neutral'} size="sm">
                Vapeur {statesTried.has('gas') ? '✓' : ''}
              </Badge>
            </div>
            <Badge tone={statesTried.size >= 3 ? 'action' : 'neutral'} size="sm">
              {statesTried.size >= 3 ? '3/3 états explorés' : `${statesTried.size}/3 états`}
            </Badge>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={statesTried.size < 3} onClick={() => setStep('qcm')}>
              Répondre aux questions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Ce que tu as observé</CardTitle>
            <Badge tone="science">2/3</Badge>
          </CardHeader>

          <div className="space-y-5">
            <Qcm
              label="Dans quel état les particules sont-elles le plus organisées ?"
              options={[
                { key: 'glace', label: 'Dans la glace' },
                { key: 'liquide', label: "Dans l'eau liquide" },
                { key: 'vapeur', label: 'Dans la vapeur' },
              ]}
              value={qOrganise}
              onChange={(v) => setQOrganise(v as YesNo)}
            />
            <Qcm
              label="Dans quel état les particules s'agitent-elles le plus ?"
              options={[
                { key: 'glace', label: 'Dans la glace' },
                { key: 'liquide', label: "Dans l'eau liquide" },
                { key: 'vapeur', label: 'Dans la vapeur' },
              ]}
              value={qAgite}
              onChange={(v) => setQAgite(v as YesNo)}
            />
            <Qcm
              label="À quelle température l'eau commence-t-elle à bouillir ?"
              options={[
                { key: '0', label: '0 °C' },
                { key: '50', label: '50 °C' },
                { key: '100', label: '100 °C' },
                { key: '150', label: '150 °C' },
              ]}
              value={qBouillir}
              onChange={(v) => setQBouillir(v as '0' | '50' | '100' | '150')}
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manipulate')}>
              Revoir le bécher
            </Button>
            <Button
              variant="gradient"
              disabled={!qOrganise || !qAgite || !qBouillir}
              onClick={() => setStep('application')}
            >
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'application' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Retour au Saloum</CardTitle>
            <Badge tone="science">3/3</Badge>
          </CardHeader>
          <p className="mb-4 text-ink/80">
            Reprends le bassin de récolte de sel à Foundiougne. L&apos;eau de mer (eau + sel) est
            exposée au soleil. Au bout de plusieurs jours :
          </p>
          <Qcm
            label="Que reste-t-il dans le bassin ?"
            options={[
              { key: 'sel-reste', label: 'Le sel reste, l’eau s’est transformée en vapeur dans l’air' },
              { key: 'eau-reste', label: "L'eau reste, le sel a disparu" },
              { key: 'rien', label: 'Rien ne reste : tout disparaît' },
            ]}
            value={qEvap}
            onChange={(v) => setQEvap(v as 'sel-reste' | 'eau-reste' | 'rien')}
          />

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('qcm')}>
              Revoir les questions
            </Button>
            <Button variant="success" disabled={!qEvap || busy} onClick={handleValidate}>
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
              Bien joué ! Tu sais maintenant que l&apos;eau peut être <strong>solide</strong>{' '}
              (glace, sous 0 °C), <strong>liquide</strong> (entre 0 et 100 °C) ou <strong>gaz</strong>{' '}
              (vapeur, au-dessus de 100 °C). Plus il fait chaud, plus les particules s&apos;agitent.
            </p>
            <p>
              Dans les bassins du Saloum, c&apos;est exactement ce qui se passe : l&apos;eau
              s&apos;évapore, les particules d&apos;eau partent dans l&apos;air, et le sel reste.
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
              'flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ' +
              (value === opt.key
                ? 'border-violet-500 bg-violet-50'
                : 'border-ink/10 hover:border-violet-200 hover:bg-violet-50/50')
            }
          >
            <input
              type="radio"
              className="accent-violet-700"
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
