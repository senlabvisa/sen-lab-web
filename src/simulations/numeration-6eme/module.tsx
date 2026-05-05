'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ShoppingBag, Trash2 } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { ITEM_PRICES, type ItemKey } from './market-scene';

/**
 * TP — Numération et opérations, marché de Sandaga (6ème, Maths).
 *
 * Lab Premium Maths : étal de marché 3D à Dakar, l'élève achète des
 * articles, calcule le total et la monnaie rendue. Apprentissage des
 * opérations (addition, soustraction) avec une situation concrète.
 */

const MarketScene = dynamic(() => import('./market-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-orange-50 text-sm text-ink/50">
      Chargement de l&apos;étal 3D…
    </div>
  ),
});

type Step = 'intro' | 'shop' | 'total' | 'change' | 'done';

const ITEM_LABELS: Record<ItemKey, string> = {
  mangue: 'Mangue',
  papaye: 'Papaye',
  baguette: 'Baguette',
  lait: 'Lait (1L)',
};

const PAYMENT = 2000;

const INTRO_NARRATION =
  "Bienvenue au marché de Sandaga, à Dakar ! C'est l'un des plus grands marchés du Sénégal. " +
  "Aujourd'hui, tu vas faire les courses pour ta famille avec 2000 francs CFA. " +
  "Choisis les articles que tu veux acheter, calcule combien tu dois payer, et combien la marchande va te rendre.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu sais maintenant calculer un total et la monnaie à rendre. " +
  "C'est ce que font les marchands au quotidien à Sandaga. Avec les opérations d'addition et de soustraction, " +
  "tu peux déjà gérer un petit budget familial.";

export function Numeration6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [cart, setCart] = useState<Record<ItemKey, number>>({
    mangue: 0,
    papaye: 0,
    baguette: 0,
    lait: 0,
  });

  const total = useMemo(
    () =>
      (Object.entries(cart) as [ItemKey, number][]).reduce(
        (sum, [k, n]) => sum + n * ITEM_PRICES[k],
        0,
      ),
    [cart],
  );
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  // Étape total : l'élève saisit le total qu'il calcule
  const [totalGuess, setTotalGuess] = useState('');
  const totalGuessNum = Number(totalGuess.replace(/[^\d]/g, ''));
  const totalCorrect = totalGuessNum === total;

  // Étape monnaie : monnaie due = paiement - total (si possible)
  const [changeGuess, setChangeGuess] = useState('');
  const changeGuessNum = Number(changeGuess.replace(/[^\d]/g, ''));
  const correctChange = PAYMENT - total;
  const changeCorrect = changeGuessNum === correctChange;

  function add(k: ItemKey) {
    setCart((prev) => ({ ...prev, [k]: prev[k] + 1 }));
  }
  function remove(k: ItemKey) {
    setCart((prev) => ({ ...prev, [k]: Math.max(0, prev[k] - 1) }));
  }
  function reset() {
    setCart({ mangue: 0, papaye: 0, baguette: 0, lait: 0 });
    setTotalGuess('');
    setChangeGuess('');
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, totalItems * 5); // max 20 pour avoir essayé d'acheter
    if (totalCorrect && total > 0 && total <= PAYMENT) s += 40;
    if (changeCorrect && total > 0 && total <= PAYMENT) s += 40;
    return Math.max(0, Math.min(100, s));
  }, [totalItems, totalCorrect, total, changeCorrect]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'numeration-6eme',
        version: '1.0',
        steps: {
          cart,
          total,
          totalGuess: totalGuessNum,
          totalCorrect,
          changeGuess: changeGuessNum,
          changeCorrect,
          payment: PAYMENT,
        },
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
                <ShoppingBag className="h-5 w-5" />
              </span>
              Faire les courses au marché Sandaga
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le <strong>marché de Sandaga</strong>, en plein cœur de Dakar, c&apos;est l&apos;un
              des plus grands marchés d&apos;Afrique de l&apos;Ouest. Mangues, papayes, baguettes,
              lait, tout y est !
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Mission :</strong> tu as <strong>{PAYMENT} F&nbsp;CFA</strong>. Choisis tes
              achats, calcule le total, puis la monnaie qu&apos;on doit te rendre.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('shop')}>
              Aller au marché
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'shop' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-700" />
              Étape 1 — Remplis ton panier
            </CardTitle>
            <Badge tone="maths">1/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Clique sur les articles 3D pour les ajouter à ton panier. Tu peux en prendre plusieurs.
          </p>

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
              <div className="aspect-[4/3] w-full">
                <MarketScene cart={cart} onAdd={add} />
              </div>
            </div>

            {/* Panier */}
            <div className="rounded-2xl border border-amber-100 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-ink">Ton panier</h3>
                {totalItems > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1 text-xs text-ink/50 hover:text-alert-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Vider
                  </button>
                )}
              </div>

              {totalItems === 0 ? (
                <p className="text-sm text-ink/50">Ton panier est vide.</p>
              ) : (
                <ul className="space-y-1.5">
                  {(Object.entries(cart) as [ItemKey, number][])
                    .filter(([, n]) => n > 0)
                    .map(([k, n]) => (
                      <li
                        key={k}
                        className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm"
                      >
                        <span>
                          <strong>{n}</strong> × {ITEM_LABELS[k]}{' '}
                          <span className="text-ink/50">({ITEM_PRICES[k]} F)</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => remove(k)}
                            className="rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-ink/15 hover:bg-ink/5"
                          >
                            −
                          </button>
                          <span className="font-mono font-bold text-amber-700">
                            {n * ITEM_PRICES[k]} F
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-sm">
                <span className="text-ink/60">Total</span>
                <span className="font-mono text-lg font-bold text-violet-700">{total} F CFA</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={totalItems === 0} onClick={() => setStep('total')}>
              Calculer le total
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'total' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 2 — Calcule ton total</CardTitle>
            <Badge tone="maths">2/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Sans regarder le panier, écris le total que tu dois payer.
          </p>

          <ul className="mb-4 space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
            {(Object.entries(cart) as [ItemKey, number][])
              .filter(([, n]) => n > 0)
              .map(([k, n]) => (
                <li key={k}>
                  {n} × {ITEM_LABELS[k]} à {ITEM_PRICES[k]} F = ?
                </li>
              ))}
          </ul>

          <div className="space-y-2">
            <Label htmlFor="totalGuess">Ton total (en F CFA)</Label>
            <Input
              id="totalGuess"
              inputMode="numeric"
              value={totalGuess}
              onChange={(e) => setTotalGuess(e.target.value)}
              placeholder="ex : 1250"
            />
            {totalGuess && (
              <p className={'text-xs ' + (totalCorrect ? 'text-action-700' : 'text-alert-700')}>
                {totalCorrect
                  ? `✓ Bravo ! Le total est bien ${total} F CFA.`
                  : `Réessaie. Pense à multiplier puis additionner.`}
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('shop')}>
              Revoir le panier
            </Button>
            <Button variant="gradient" disabled={!totalCorrect} onClick={() => setStep('change')}>
              Calculer la monnaie
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'change' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — La monnaie rendue</CardTitle>
            <Badge tone="maths">3/3</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tu donnes <strong>{PAYMENT} F CFA</strong> à la marchande. Ton total est de{' '}
            <strong>{total} F CFA</strong>. Combien doit-elle te rendre ?
          </p>

          <div className="space-y-2">
            <Label htmlFor="changeGuess">Monnaie à rendre (F CFA)</Label>
            <Input
              id="changeGuess"
              inputMode="numeric"
              value={changeGuess}
              onChange={(e) => setChangeGuess(e.target.value)}
              placeholder={`ex : ${PAYMENT - total}`}
            />
            {changeGuess && (
              <p className={'text-xs ' + (changeCorrect ? 'text-action-700' : 'text-alert-700')}>
                {changeCorrect
                  ? `✓ Exact ! ${PAYMENT} − ${total} = ${correctChange} F CFA.`
                  : `Indice : la monnaie = ${PAYMENT} − ${total}.`}
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('total')}>
              Revoir le total
            </Button>
            <Button variant="success" disabled={!changeCorrect || busy} onClick={handleValidate}>
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
              Tu as fait tes courses : <strong>{total} F CFA</strong> au total. La monnaie
              rendue : <strong>{correctChange} F CFA</strong>.
            </p>
            <p>
              Avec les <strong>opérations</strong> (addition, multiplication, soustraction), tu
              gères déjà un budget. Au marché Sandaga, c&apos;est exactement ce que les marchands
              et les clients calculent à chaque transaction.
            </p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
