'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ClipboardList, Grid3x3, Percent, Scale, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Les pourcentages : t % de N, hausses et remises (5ème, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (grille de 100
 * carreaux + barres de prix) → mesures (tableau des relevés) → QCM (3
 * questions) → bilan.
 *
 * Angle 5ème : le pourcentage est une fraction de dénominateur 100 ;
 * appliquer un taux (t % de N = N × t/100), calculer un taux (part/tout × 100),
 * augmenter (× (1 + t/100)) et réduire (× (1 − t/100)).
 * Misconception traitée frontalement : +t % puis −t % ne ramène PAS au prix de
 * départ, car ×(1 + t/100) × (1 − t/100) = 1 − t²/10 000.
 */

const StoreScene = dynamic(() => import('./store-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-sky-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'egal' | 'plus' | 'moins' | null;
type Mode = 'part' | 'hausse' | 'remise' | 'chaine';
type Obs = { mode: Mode; price: number; rate: number; result: number };

const MODES: { key: Mode; label: string }[] = [
  { key: 'part', label: 'Prendre t % de N' },
  { key: 'hausse', label: 'Augmenter de t %' },
  { key: 'remise', label: 'Réduire de t %' },
  { key: 'chaine', label: '+ t % puis − t %' },
];

const MODE_TEXT: Record<Mode, string> = {
  part: 'la part',
  hausse: 'prix augmenté',
  remise: 'prix payé',
  chaine: 'prix final',
};

const INTRO =
  "Au marché HLM, à Dakar, les pancartes annoncent moins vingt pour cent, moins trente pour cent. " +
  "Pour cent, ça veut dire sur cent. Un pourcentage, c'est simplement une fraction dont le dénominateur est cent : " +
  "vingt pour cent, c'est vingt sur cent. Dans le laboratoire, tu vas voir cent carreaux rangés en dix lignes de dix. " +
  "Colorier vingt carreaux sur les cent, c'est prendre vingt pour cent. À côté, une barre montre le prix qui monte ou qui descend. " +
  "Attention à un piège de vendeur : augmenter un prix de vingt pour cent puis le baisser de vingt pour cent ne redonne pas le prix de départ.";

const CONCLUSION =
  "Bravo ! Un pourcentage est une fraction de dénominateur cent. Prendre t pour cent d'un nombre N, c'est calculer N multiplié par t divisé par cent. " +
  "Pour trouver un taux quand on connaît la part et le tout, on divise la part par le tout, puis on multiplie par cent. " +
  "Augmenter de t pour cent, c'est multiplier par un plus t sur cent ; réduire de t pour cent, c'est multiplier par un moins t sur cent. " +
  "Et surtout : augmenter de vingt pour cent puis réduire de vingt pour cent revient à multiplier par un virgule deux fois zéro virgule huit, " +
  "c'est-à-dire par zéro virgule quatre-vingt-seize. Le prix final est donc quatre pour cent plus bas que le prix de départ, pas égal.";

const fmt = (v: number) => Math.round(v).toLocaleString('fr-FR');

function resultOf(price: number, rate: number, mode: Mode) {
  const k = rate / 100;
  if (mode === 'part') return price * k;
  if (mode === 'hausse') return price * (1 + k);
  if (mode === 'remise') return price * (1 - k);
  return price * (1 + k) * (1 - k);
}

function formulaOf(price: number, rate: number, mode: Mode) {
  const k = rate / 100;
  if (mode === 'part') return `${fmt(price)} × ${rate}/100 = ${fmt(price * k)} F`;
  if (mode === 'hausse') return `${fmt(price)} × (1 + ${rate}/100) = ${fmt(price * (1 + k))} F`;
  if (mode === 'remise') return `${fmt(price)} × (1 − ${rate}/100) = ${fmt(price * (1 - k))} F`;
  return `${fmt(price)} × ${(1 + k).toFixed(2)} × ${(1 - k).toFixed(2)} = ${fmt(price * (1 - k * k))} F`;
}

export function Pourcentages5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [price, setPrice] = useState(10000);
  const [rate, setRate] = useState(20);
  const [mode, setMode] = useState<Mode>('part');

  const [ratesTried, setRatesTried] = useState<Set<number>>(new Set([20]));
  const [modesTried, setModesTried] = useState<Set<Mode>>(new Set<Mode>(['part']));
  const [records, setRecords] = useState<Obs[]>([]);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qPart, setQPart] = useState<string | null>(null);
  const [qTaux, setQTaux] = useState<string | null>(null);
  const [qChaine, setQChaine] = useState<string | null>(null);

  const result = resultOf(price, rate, mode);
  const chainLoss = (rate * rate) / 100; // perte totale en % après +t % puis −t %

  function changeRate(v: number) {
    setRate(v);
    setRatesTried((prev) => new Set(prev).add(v));
  }
  function changeMode(m: Mode) {
    setMode(m);
    setModesTried((prev) => new Set(prev).add(m));
  }
  function noter() {
    setRecords((prev) => {
      if (prev.some((r) => r.mode === mode && r.price === price && r.rate === rate)) return prev;
      return [...prev, { mode, price, rate, result }];
    });
  }

  const chainSeen = modesTried.has('chaine');
  const canGo = ratesTried.size >= 4 && chainSeen && records.length >= 2;

  const scoreExplore = Math.min(20, ratesTried.size * 4);
  const scoreModes = Math.min(10, modesTried.size * 3);
  const scoreNotes = Math.min(10, records.length * 4);
  const scoreHypo = hypo === 'moins' ? 15 : 0;
  const scoreQcm =
    (qPart === '2400' ? 15 : 0) + (qTaux === '69' ? 15 : 0) + (qChaine === 'baisse4' ? 15 : 0);

  const score = useMemo(
    () => Math.max(0, Math.min(100, Math.round(scoreExplore + scoreModes + scoreNotes + scoreHypo + scoreQcm))),
    [scoreExplore, scoreModes, scoreNotes, scoreHypo, scoreQcm],
  );

  async function handleValidate() {
    await onComplete(
      {
        shell: 'pourcentages-5eme',
        version: '2.0',
        steps: {
          explore: {
            rates: Array.from(ratesTried).sort((a, b) => a - b),
            modes: Array.from(modesTried),
            last: { price, rate, mode, result: Math.round(result) },
          },
          hypothesis: hypo,
          records,
          chainSeen,
          qcm: { qPart, qTaux, qChaine },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sky-700 shadow-soft ring-1 ring-sky-100">
                <Percent className="h-5 w-5" />
              </span>
              Pour cent, c&apos;est sur cent
            </CardTitle>
            <Badge tone="maths">Maths · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au <strong>marché HLM</strong>, les pancartes annoncent <strong>−20 %</strong>, <strong>−30 %</strong>. Sur
              la facture d&apos;une boutique, la <strong>TVA est de 18 %</strong> au Sénégal. Et au collège, on parle du{' '}
              <strong>taux de réussite au BFEM</strong>. Partout, le même outil : le pourcentage.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-center font-mono text-lg font-bold text-sky-700 ring-1 ring-sky-100">
              20 % = 20/100 = 20 carreaux coloriés sur 100
            </p>
            <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
              <strong>Objectif :</strong> appliquer un taux (<span className="font-mono">t % de N = N × t/100</span>),
              calculer un taux (<span className="font-mono">part ÷ tout × 100</span>), augmenter (
              <span className="font-mono">× (1 + t/100)</span>) et réduire (<span className="font-mono">× (1 − t/100)</span>
              ) — puis démasquer le piège du vendeur.
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
              <Target className="h-5 w-5 text-sky-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Au marché HLM, un pagne est affiché à <strong>10 000 F</strong>. Le vendeur <strong>augmente</strong> son prix
            de <strong>20 %</strong> le matin. L&apos;après-midi, il annonce : « pour toi, <strong>−20 %</strong> ! » et
            applique cette remise sur le <strong>nouveau</strong> prix.
          </p>
          <QcmStep
            label="Selon toi, ce que tu paies finalement est…"
            tone="science"
            hint="Les deux 20 % ne portent pas sur le même prix : le premier sur 10 000 F, le second sur le prix déjà augmenté."
            options={[
              { key: 'egal', label: 'Exactement 10 000 F : les deux 20 % s’annulent' },
              { key: 'moins', label: 'Moins de 10 000 F' },
              { key: 'plus', label: 'Plus de 10 000 F' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier sur la grille <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5 text-sky-700" /> Étape 2 — Colorie les carreaux
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            À gauche, <strong>100 carreaux</strong> (10 lignes de 10) : le tout, c&apos;est 100 %. Colorie{' '}
            <strong>t</strong> carreaux avec le curseur du taux. À droite, les <strong>barres de prix</strong> montent ou
            descendent, et le trait pointillé garde la trace du prix de départ. Tourne la scène avec ta souris ou ton
            doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-sky-100">
            <div className="aspect-[4/3] w-full">
              <StoreScene price={price} rate={rate} mode={mode} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {MODES.map((m) => (
              <Button
                key={m.key}
                size="sm"
                variant={m.key === mode ? 'gradient' : 'outline'}
                onClick={() => changeMode(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="p">Prix de départ N</Label>
                <span className="font-mono text-sm font-semibold text-sky-700">{fmt(price)} F</span>
              </div>
              <input
                id="p"
                type="range"
                min={1000}
                max={20000}
                step={500}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="t">Taux t (carreaux coloriés)</Label>
                <span className="font-mono text-sm font-semibold text-sky-700">{rate} %</span>
              </div>
              <input
                id="t"
                type="range"
                min={0}
                max={50}
                step={5}
                value={rate}
                onChange={(e) => changeRate(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-sky-50 p-3 text-center text-sm ring-1 ring-sky-100">
            <span className="font-mono text-base font-bold text-sky-700">{formulaOf(price, rate, mode)}</span>
            <div className="mt-1 text-xs text-ink/70">
              {mode === 'chaine' ? (
                <>
                  ×{(1 + rate / 100).toFixed(2)} puis ×{(1 - rate / 100).toFixed(2)} donne{' '}
                  <strong>×{(1 - (rate * rate) / 10000).toFixed(4)}</strong> — soit{' '}
                  <strong>−{chainLoss.toFixed(2)} %</strong> par rapport au départ, jamais 0 %.
                </>
              ) : mode === 'part' ? (
                <>
                  {rate} carreaux sur 100, c&apos;est la fraction <span className="font-mono">{rate}/100</span> du prix.
                </>
              ) : mode === 'remise' ? (
                <>
                  Tu paies les <strong>{100 - rate}</strong> carreaux qui restent, soit{' '}
                  <span className="font-mono">{100 - rate}/100</span> du prix affiché.
                </>
              ) : (
                <>
                  On ajoute <strong>{rate}</strong> carreaux aux 100 de départ : le prix devient{' '}
                  <span className="font-mono">{100 + rate}/100</span> du prix initial.
                </>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white p-3 text-xs text-ink/70 ring-1 ring-night-100">
            <strong>Consigne :</strong> essaie au moins 4 taux différents, teste les 4 opérations (surtout{' '}
            <strong>« + t % puis − t % »</strong>) et note 2 relevés. Taux essayés : <strong>{ratesTried.size}</strong> ·
            Opérations testées : <strong>{modesTried.size}/4</strong> · Relevés : <strong>{records.length}</strong>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={noter}>
              <ClipboardList className="h-4 w-4" /> Noter ce relevé
            </Button>
            <Button variant="gradient" disabled={!canGo} onClick={() => setStep('mesures')}>
              {ratesTried.size < 4
                ? `Essaie ${4 - ratesTried.size} taux de plus`
                : !chainSeen
                  ? 'Teste « + t % puis − t % »'
                  : records.length < 2
                    ? `Note ${2 - records.length} relevé(s)`
                    : 'Voir mes relevés'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-sky-700" /> Étape 3 — Tes relevés
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>

          <div
            className={
              'mb-3 rounded-xl p-3 text-sm ring-1 ' +
              (hypo === 'moins'
                ? 'bg-action-50 text-action-700 ring-action-100'
                : 'bg-amber-50 text-amber-800 ring-amber-100')
            }
          >
            <strong>Ton hypothèse :</strong>{' '}
            {hypo === 'moins'
              ? 'juste ! 10 000 × 1,2 = 12 000, puis 12 000 × 0,8 = 9 600 F. Tu paies 400 F de moins que le prix affiché au départ.'
              : 'à corriger. +20 % puis −20 % ne s’annulent pas : 10 000 × 1,2 = 12 000 F, puis 12 000 × 0,8 = 9 600 F. Les 20 % de remise sont pris sur 12 000 F (soit 2 400 F), pas sur 10 000 F.'}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-xs uppercase tracking-wider text-sky-700">
                <tr>
                  <th className="px-3 py-2 text-left">Opération</th>
                  <th className="px-3 py-2 text-left">Prix N</th>
                  <th className="px-3 py-2 text-left">Taux t</th>
                  <th className="px-3 py-2 text-left">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={i}
                    className={'border-t border-night-100 ' + (r.mode === 'chaine' ? 'bg-emerald-50 font-semibold' : '')}
                  >
                    <td className="px-3 py-2">{MODES.find((m) => m.key === r.mode)?.label}</td>
                    <td className="px-3 py-2 font-mono">{fmt(r.price)} F</td>
                    <td className="px-3 py-2 font-mono">{r.rate} %</td>
                    <td className="px-3 py-2 font-mono">
                      {fmt(r.result)} F <span className="text-xs font-normal text-ink/50">({MODE_TEXT[r.mode]})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-ink/80 ring-1 ring-violet-100">
            <strong>Le piège du vendeur, une bonne fois pour toutes :</strong>
            <p className="mt-1 font-mono text-xs">
              +20 % puis −20 % → ×1,20 × 0,80 = ×0,96 → le prix a baissé de <strong>4 %</strong> (et non 0 %).
            </p>
            <p className="mt-1 text-xs">
              Règle générale : +t % puis −t % donne ×(1 − t²/10 000), soit une baisse de{' '}
              <span className="font-mono">t²/100 %</span>. Avec t = 10 : −1 %. Avec t = 50 : −25 %. Un pourcentage ne se
              calcule jamais tout seul : il faut toujours savoir <strong>de quoi</strong> on prend le pourcentage.
            </p>
          </div>

          <div className="mt-3 rounded-xl bg-white p-3 text-sm text-ink/80 ring-1 ring-night-100">
            <strong>Dans l&apos;autre sens — calculer un taux :</strong> si tu connais la part et le tout, tu divises puis
            tu multiplies par 100. Exemple BFEM : <span className="font-mono">138 admis ÷ 200 candidats × 100 = 69 %</span>{' '}
            de réussite.
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner à la grille
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
              label="Un sac de riz de 25 kg coûte 16 000 F. Le boutiquier t’accorde 15 % de remise. Combien économises-tu ?"
              tone="science"
              hint="15 % de 16 000, c’est 16 000 × 15/100."
              options={[
                { key: '2400', label: '2 400 F' },
                { key: '1500', label: '1 500 F' },
                { key: '15', label: '15 F' },
              ]}
              value={qPart}
              onChange={setQPart}
            />
            <QcmStep
              label="Dans ton collège, 138 candidats sur 200 sont admis au BFEM. Quel est le taux de réussite ?"
              tone="science"
              hint="Taux = part ÷ tout × 100."
              options={[
                { key: '69', label: '69 %' },
                { key: '62', label: '62 %' },
                { key: '138', label: '138 %' },
              ]}
              value={qTaux}
              onChange={setQTaux}
            />
            <QcmStep
              label="Un prix augmente de 20 %, puis baisse de 20 %. Par rapport au prix de départ…"
              tone="science"
              hint="×1,20 puis ×0,80 : fais le produit."
              options={[
                { key: 'baisse4', label: 'Il a baissé de 4 % (×0,96)' },
                { key: 'retour', label: 'Il revient exactement au prix de départ' },
                { key: 'hausse4', label: 'Il a augmenté de 4 %' },
              ]}
              value={qChaine}
              onChange={setQChaine}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qPart || !qTaux || !qChaine || busy} onClick={handleValidate}>
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
              Un pourcentage est une <strong>fraction de dénominateur 100</strong> : t % = t/100, c&apos;est t carreaux
              coloriés sur les 100 de la grille. Appliquer un taux :{' '}
              <span className="font-mono">t % de N = N × t/100</span>. Calculer un taux :{' '}
              <span className="font-mono">part ÷ tout × 100</span> (138/200 × 100 = 69 %).
            </p>
            <p>
              Augmenter de t %, c&apos;est <span className="font-mono">× (1 + t/100)</span> ; réduire de t %, c&apos;est{' '}
              <span className="font-mono">× (1 − t/100)</span>. Donc <strong>+20 % puis −20 %</strong> donne{' '}
              <span className="font-mono">×1,2 × 0,8 = ×0,96</span> : le prix final est <strong>4 % plus bas</strong> que
              le prix de départ. Un pourcentage se lit toujours <em>par rapport à quoi</em>.
            </p>
            <div className="rounded-xl bg-white/70 p-3 text-xs text-ink/70 ring-1 ring-sky-100">
              <strong>Détail du score :</strong> taux explorés {scoreExplore}/20 · opérations testées {scoreModes}/10 ·
              relevés notés {scoreNotes}/10 · hypothèse {scoreHypo}/15 · QCM {scoreQcm}/45
            </div>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
