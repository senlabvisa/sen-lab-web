'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Thermometer } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';

/**
 * TP — Thermomètre tropical (6ème, Physique-Chimie)
 *
 * Lab Premium PC : grand thermomètre 3D, l'élève sélectionne 4 villes
 * sénégalaises et observe leurs températures moyennes en avril (pleine
 * saison sèche). Découvre la continentalité (intérieur > côte).
 */

const ThermometerScene = dynamic(() => import('./thermometer-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-orange-50 text-sm text-ink/50">
      Chargement du thermomètre 3D…
    </div>
  ),
});

type CityKey = 'dakar' | 'saint-louis' | 'tambacounda' | 'ziguinchor';
type Step = 'intro' | 'mesure' | 'classer' | 'done';
type Order = CityKey[];

const CITIES: Record<CityKey, { label: string; subLabel: string; temp: number; tone: 'science' | 'violet' | 'action' | 'alert' }> = {
  'saint-louis': { label: 'Saint-Louis', subLabel: 'Côte nord', temp: 22, tone: 'science' },
  dakar: { label: 'Dakar', subLabel: 'Côte ouest', temp: 23.5, tone: 'violet' },
  ziguinchor: { label: 'Ziguinchor', subLabel: 'Sud (Casamance)', temp: 28, tone: 'action' },
  tambacounda: { label: 'Tambacounda', subLabel: 'Intérieur est', temp: 35, tone: 'alert' },
};

const ALL_KEYS: CityKey[] = ['saint-louis', 'dakar', 'ziguinchor', 'tambacounda'];
const CORRECT_ORDER: CityKey[] = ['saint-louis', 'dakar', 'ziguinchor', 'tambacounda']; // du moins chaud au plus chaud

const INTRO_NARRATION =
  "Au Sénégal, il ne fait pas la même chaleur partout ! À Dakar, sur la côte, la mer adoucit le climat. " +
  "À Tambacounda, loin de la mer, il fait beaucoup plus chaud, surtout en avril, à la fin de la saison sèche. " +
  "Tu vas comparer les températures de 4 villes sénégalaises avec un grand thermomètre virtuel.";

const CONCLUSION_NARRATION =
  "Tu as découvert que les températures dépendent de la position : plus on s'éloigne de la mer, plus il fait chaud en saison sèche. " +
  "C'est ce qu'on appelle la continentalité. Saint-Louis et Dakar profitent de l'air frais venant de l'océan, " +
  "tandis que Tambacounda et le Sahel sont beaucoup plus chauds.";

export function ThermometreTropical6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [city, setCity] = useState<CityKey>('dakar');
  const [tested, setTested] = useState<Set<CityKey>>(new Set(['dakar']));
  const [order, setOrder] = useState<Order>([]);

  function selectCity(k: CityKey) {
    setCity(k);
    setTested((prev) => {
      if (prev.has(k)) return prev;
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  }

  function pickForOrder(k: CityKey) {
    if (order.includes(k)) return;
    setOrder((prev) => [...prev, k]);
  }
  function resetOrder() {
    setOrder([]);
  }

  const correctCount = useMemo(
    () => order.filter((c, i) => c === CORRECT_ORDER[i]).length,
    [order],
  );
  const orderComplete = order.length === ALL_KEYS.length;

  const score = useMemo(() => {
    let s = 0;
    s += tested.size * 10; // max 40
    if (orderComplete) s += correctCount * 15; // max 60
    return Math.max(0, Math.min(100, s));
  }, [tested, orderComplete, correctCount]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'thermometre-tropical-6eme',
        version: '1.0',
        steps: {
          tested: Array.from(tested),
          order,
          correctOrder: CORRECT_ORDER,
          correctCount,
        },
      },
      score,
    );
    setStep('done');
  }

  const current = CITIES[city];

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-amber" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <Thermometer className="h-5 w-5" />
              </span>
              La température au Sénégal
            </CardTitle>
            <Badge tone="alert">Physique-Chimie · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              En avril, à <strong>Tambacounda</strong>, il peut faire <strong>38&nbsp;°C</strong> à
              midi. Le même jour, à <strong>Dakar</strong>, il fait souvent <strong>24&nbsp;°C</strong>.
              Pourquoi cette différence sur la même journée ?
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Mission :</strong> compare 4 villes sénégalaises sur un grand thermomètre
              virtuel.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('mesure')}>
              Voir le thermomètre
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesure' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-amber-700" />
              Étape 1 — Mesure dans 4 villes
            </CardTitle>
            <Badge tone="alert">1/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Sélectionne chacune des 4 villes (boutons ci-dessous). Le mercure du thermomètre
            monte ou descend pour afficher la température moyenne d&apos;avril.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <ThermometerScene
                temperature={current.temp}
                cityLabel={current.label}
                cityTone={current.tone}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {ALL_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => selectCity(k)}
                  className={
                    'rounded-xl border px-3 py-1.5 text-xs font-semibold transition ' +
                    (city === k
                      ? 'border-amber-600 bg-amber-100 text-amber-900'
                      : tested.has(k)
                        ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                        : 'border-ink/15 bg-white text-ink/70 hover:bg-amber-50')
                  }
                >
                  {tested.has(k) && city !== k ? '✓ ' : ''}
                  {CITIES[k].label}
                </button>
              ))}
            </div>
            <Badge tone={tested.size === 4 ? 'action' : 'neutral'} size="sm">
              {tested.size}/4 villes
            </Badge>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={tested.size < 4} onClick={() => setStep('classer')}>
              Classer du plus frais au plus chaud
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'classer' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Classement par température</CardTitle>
            <Badge tone="alert">2/2</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Clique sur les villes <strong>dans l&apos;ordre du plus frais au plus chaud</strong>{' '}
            (1 = plus frais, 4 = plus chaud).
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_KEYS.map((k) => {
              const idx = order.indexOf(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={idx >= 0}
                  onClick={() => pickForOrder(k)}
                  className={
                    'flex items-center justify-between rounded-xl border p-3 text-left text-sm transition ' +
                    (idx >= 0
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-ink/10 bg-white hover:border-amber-300 hover:bg-amber-50')
                  }
                >
                  <div>
                    <div className="font-semibold">{CITIES[k].label}</div>
                    <div className="text-xs opacity-60">{CITIES[k].subLabel}</div>
                  </div>
                  {idx >= 0 ? (
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                  ) : (
                    <span className="text-xs text-ink/40">Cliquer</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {orderComplete && (
              <span
                className={
                  'rounded-full px-3 py-1 text-xs font-semibold ' +
                  (correctCount === ALL_KEYS.length
                    ? 'bg-action-50 text-action-700'
                    : 'bg-alert-50 text-alert-700')
                }
              >
                {correctCount}/{ALL_KEYS.length} dans le bon ordre
              </span>
            )}
            {order.length > 0 && (
              <Button variant="outline" size="sm" onClick={resetOrder}>
                Recommencer
              </Button>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesure')}>
              Revoir le thermomètre
            </Button>
            <Button variant="success" disabled={!orderComplete || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" />
              {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-amber">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" />
              TP terminé !
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Tu as classé <strong>{correctCount}/4</strong> villes dans le bon ordre. Du plus frais
              au plus chaud en avril : <strong>Saint-Louis</strong> →{' '}
              <strong>Dakar</strong> → <strong>Ziguinchor</strong> →{' '}
              <strong>Tambacounda</strong>.
            </p>
            <p>
              Plus on s&apos;éloigne de la mer, plus il fait chaud en saison sèche. C&apos;est la{' '}
              <strong>continentalité</strong> : la mer agit comme un climatiseur géant pour les
              villes côtières.
            </p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
