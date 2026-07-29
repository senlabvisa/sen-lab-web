'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Layers, ListOrdered, RotateCcw, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import { PLACE_VALUE, RANKS, RANK_COLOR, RANK_LABEL, RANK_PIECE, NEXT_RANK, type Digits, type Rank } from './abaque-scene';

/**
 * TP — Numération décimale de position (6ème, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → abaque 3D (matériel base 10, le
 * passage à la dizaine supérieure est animé) → décomposition & rangement →
 * QCM → bilan. Cœur du TP : distinguer le CHIFFRE d'un rang du NOMBRE
 * d'unités de ce rang. Contexte : marché de Sandaga et bassin arachidier.
 */

const AbaqueScene = dynamic(() => import('./abaque-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-indigo-50 text-sm text-ink/50">
      Chargement de l&apos;abaque 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';

const TARGET = 2405; // prix d'un sac de riz au marché de Sandaga (F CFA)
const MAX = 9999;
/** Récoltes d'arachide (kg) de trois villages du bassin arachidier. */
const RECOLTES = [7480, 7408, 7840];
const RECOLTE_TRI = [7408, 7480, 7840];
const RECOLTE_VILLAGE: Record<number, string> = { 7480: 'Nioro', 7408: 'Fatick', 7840: 'Kaolack' };

const INTRO =
  "Au marché de Sandaga, à Dakar, le sac de riz est affiché à deux mille quatre cent cinq francs CFA. " +
  "Pour écrire ce nombre, on n'invente pas un symbole nouveau : on réutilise dix chiffres seulement, de zéro à neuf. " +
  "Ce qui change tout, c'est la place de chaque chiffre. Aujourd'hui tu vas construire des nombres sur un abaque en volume : " +
  "des cubes pour les unités, des barres pour les dizaines, des plaques pour les centaines, des gros cubes pour les milliers.";

const CONCLUSION =
  "Bravo ! Dans notre numération, dix unités d'un rang font toujours une unité du rang supérieur : dix cubes font une barre, " +
  "dix barres font une plaque, dix plaques font un gros cube. Retiens surtout la différence entre le chiffre et le nombre : " +
  "dans deux mille quatre cent cinq, le chiffre des dizaines est zéro, mais le nombre de dizaines est deux cent quarante. " +
  "Et pour comparer deux nombres qui ont autant de chiffres, on compare rang par rang en partant de la gauche.";

function toDigits(v: number): Digits {
  return { m: Math.floor(v / 1000) % 10, c: Math.floor(v / 100) % 10, d: Math.floor(v / 10) % 10, u: v % 10 };
}

export function Numeration6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  // Abaque
  const [value, setValue] = useState(0);
  const [grouping, setGrouping] = useState<Rank | null>(null);
  const [groupKey, setGroupKey] = useState(0);
  const [regroupCount, setRegroupCount] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [targetHit, setTargetHit] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Réponses
  const [hypo, setHypo] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [qChiffre, setQChiffre] = useState<string | null>(null);
  const [qNombre, setQNombre] = useState<string | null>(null);
  const [qDecomp, setQDecomp] = useState<string | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const digits = useMemo(() => toDigits(value), [value]);

  const apply = useCallback((v: number) => {
    setValue(v);
    if (v === TARGET) setTargetHit(true);
  }, []);

  function addOne(r: Rank) {
    if (grouping) return;
    const next = value + PLACE_VALUE[r];
    if (next > MAX) {
      setHint(`L'abaque s'arrête à ${MAX.toLocaleString('fr-FR')} : il n'y a pas de colonne pour les dizaines de milliers.`);
      return;
    }
    setHint(null);
    setClicks((c) => c + 1);
    const nextRank = NEXT_RANK[r];
    if (digits[r] === 9 && nextRank) {
      setGrouping(r);
      setGroupKey((k) => k + 1);
      setRegroupCount((n) => n + 1);
      setHint(`10 ${RANK_PIECE[r]}s = 1 ${RANK_PIECE[nextRank]} : le rang des ${RANK_LABEL[r].toLowerCase()} repasse à 0 et on ajoute 1 au rang de gauche.`);
      timer.current = setTimeout(() => {
        setGrouping(null);
        apply(next);
      }, 1250);
      return;
    }
    apply(next);
  }

  function removeOne(r: Rank) {
    if (grouping || digits[r] === 0) return;
    setHint(null);
    setClicks((c) => c + 1);
    apply(value - PLACE_VALUE[r]);
  }

  function resetAbaque() {
    if (timer.current) clearTimeout(timer.current);
    setGrouping(null);
    setHint(null);
    setValue(0);
  }

  function pickRecolte(n: number) {
    setOrder((prev) => (prev.includes(n) ? prev : [...prev, n]));
  }

  const orderDone = order.length === RECOLTES.length;
  const orderOk = orderDone && order.every((n, i) => n === RECOLTE_TRI[i]);

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, clicks * 2); // exploration de l'abaque
    if (regroupCount >= 1) s += 10; // a vu au moins un regroupement animé
    if (targetHit) s += 15; // a construit le nombre cible
    if (hypo === '240') s += 10; // hypothèse chiffre/nombre
    if (orderOk) s += 15; // rangement croissant
    if (qChiffre === '4') s += 10;
    if (qNombre === '52') s += 10;
    if (qDecomp === 'ok') s += 10;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [clicks, regroupCount, targetHit, hypo, orderOk, qChiffre, qNombre, qDecomp]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'numeration-6eme',
        version: '2.0',
        steps: {
          abaque: { clicks, regroupCount, lastValue: value, target: TARGET, targetHit },
          hypothesis: hypo,
          rangement: { ordre: order, attendu: RECOLTE_TRI, correct: orderOk },
          qcm: { qChiffre, qNombre, qDecomp },
        },
      },
      score,
    );
    setStep('done');
  }

  const tDigits = toDigits(TARGET);

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Layers className="h-5 w-5" />
              </span>
              L&apos;abaque du marché de Sandaga
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au <strong>marché de Sandaga</strong>, à Dakar, le sac de riz coûte{' '}
              <strong>{TARGET.toLocaleString('fr-FR')} F CFA</strong>. Avec seulement{' '}
              <strong>dix chiffres</strong> (0, 1, 2, … 9) on écrit tous les nombres : ce qui compte, c&apos;est la{' '}
              <strong>place</strong> de chaque chiffre.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> construire un nombre rang par rang sur un abaque en volume, découvrir que{' '}
              <strong>10 pièces d&apos;un rang = 1 pièce du rang de gauche</strong>, et ne plus confondre le{' '}
              <em>chiffre</em> d&apos;un rang avec le <em>nombre</em> d&apos;unités de ce rang.
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
            Le prix du sac de riz est <strong>2 405 F CFA</strong>. Son <strong>chiffre des dizaines</strong> est 0.
            Mais à ton avis, combien de <strong>paquets de 10 francs</strong> peut-on faire dans 2 405 ?
          </p>
          <QcmStep
            label="Mon hypothèse : dans 2 405, le nombre de dizaines est…"
            tone="violet"
            hint="Attention : « chiffre des dizaines » et « nombre de dizaines », ce n'est pas la même chose."
            options={[
              { key: '0', label: '0, comme le chiffre des dizaines' },
              { key: '40', label: '40' },
              { key: '240', label: '240' },
            ]}
            value={hypo}
            onChange={setHypo}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Aller à l&apos;abaque <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-700" /> Étape 2 — Construis le nombre
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Ajoute des pièces rang par rang jusqu&apos;à afficher <strong>{TARGET.toLocaleString('fr-FR')}</strong>.
            Quand un rang atteint 10, regarde bien : les 10 pièces glissent vers la gauche et se fondent en{' '}
            <strong>une seule</strong> pièce du rang supérieur. Tourne la scène avec ta souris ou ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <AbaqueScene digits={digits} value={value} grouping={grouping} groupKey={groupKey} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RANKS.map((r) => (
              <div key={r} className="rounded-xl bg-white p-2 text-center ring-1 ring-ink/10">
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: RANK_COLOR[r] }}>
                  {RANK_LABEL[r]}
                </div>
                <div className="text-[10px] text-ink/45">1 {RANK_PIECE[r]} = {PLACE_VALUE[r]}</div>
                <div className="my-1 font-mono text-2xl font-bold text-ink">{digits[r]}</div>
                <div className="flex justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => removeOne(r)}
                    className="rounded-full bg-ink/5 px-2.5 py-0.5 text-sm font-bold text-ink/60 hover:bg-ink/10"
                    aria-label={`Retirer une pièce au rang ${RANK_LABEL[r]}`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => addOne(r)}
                    className="rounded-full px-2.5 py-0.5 text-sm font-bold text-white"
                    style={{ backgroundColor: RANK_COLOR[r] }}
                    aria-label={`Ajouter une pièce au rang ${RANK_LABEL[r]}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-violet-50 p-3 text-sm ring-1 ring-violet-100">
            <span>
              Nombre construit : <strong className="font-mono text-violet-700">{value.toLocaleString('fr-FR')}</strong>
              {targetHit && <span className="ml-2 text-action-700">✓ cible atteinte</span>}
            </span>
            <span className="text-xs text-ink/55">Regroupements observés : {regroupCount}</span>
          </div>
          {hint && <p className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800 ring-1 ring-amber-100">{hint}</p>}

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="soft" size="sm" onClick={resetAbaque}>
                <RotateCcw className="h-4 w-4" /> Vider l&apos;abaque
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setHint(`Indice : ${TARGET.toLocaleString('fr-FR')} = ${tDigits.m} millier(s) + ${tDigits.c} centaine(s) + ${tDigits.d} dizaine(s) + ${tDigits.u} unité(s).`)
                }
              >
                Indice
              </Button>
            </div>
            <Button variant="gradient" disabled={!targetHit} onClick={() => setStep('mesures')}>
              {targetHit ? 'Analyser le nombre' : `Affiche ${TARGET.toLocaleString('fr-FR')} pour continuer`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-violet-700" /> Étape 3 — Décompose, compare, range
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>

          <p className="mb-2 text-sm text-ink/70">
            Voici le tableau de numération de <strong>{TARGET.toLocaleString('fr-FR')}</strong>. Compare bien les deux
            dernières colonnes.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Rang</th>
                  <th className="px-3 py-2 text-left">Chiffre du rang</th>
                  <th className="px-3 py-2 text-left">Ce qu&apos;il vaut</th>
                  <th className="px-3 py-2 text-left">Nombre de …</th>
                </tr>
              </thead>
              <tbody>
                {RANKS.map((r) => (
                  <tr key={r} className={'border-t border-night-100 ' + (r === 'd' ? 'bg-amber-50 font-semibold' : '')}>
                    <td className="px-3 py-2">{RANK_LABEL[r]}</td>
                    <td className="px-3 py-2 font-mono">{tDigits[r]}</td>
                    <td className="px-3 py-2 font-mono">{(tDigits[r] * PLACE_VALUE[r]).toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-2 font-mono">{Math.floor(TARGET / PLACE_VALUE[r]).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 rounded-xl bg-violet-50 p-3 text-xs text-ink/75 ring-1 ring-violet-100">
            <strong>À retenir :</strong> le <em>chiffre</em> des dizaines de {TARGET.toLocaleString('fr-FR')} est{' '}
            <strong>{tDigits.d}</strong>, mais le <em>nombre</em> de dizaines est{' '}
            <strong>{Math.floor(TARGET / 10)}</strong>, car {TARGET.toLocaleString('fr-FR')} ={' '}
            {Math.floor(TARGET / 10)} × 10 + {TARGET % 10}. Décomposition :{' '}
            <span className="font-mono">
              ({tDigits.m}×1000) + ({tDigits.c}×100) + ({tDigits.d}×10) + ({tDigits.u}×1)
            </span>
            .
          </p>

          <div className="mt-4 rounded-2xl border border-violet-100 bg-white p-3">
            <p className="mb-2 text-sm text-ink/75">
              Trois villages du <strong>bassin arachidier</strong> ont pesé leur récolte. Clique sur les sacs du{' '}
              <strong>plus léger au plus lourd</strong> (ordre croissant).
            </p>
            <div className="flex flex-wrap gap-2">
              {RECOLTES.map((n) => {
                const pos = order.indexOf(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pickRecolte(n)}
                    className={
                      'rounded-xl px-3 py-2 text-left text-sm ring-1 transition ' +
                      (pos >= 0
                        ? 'bg-violet-600 text-white ring-violet-600'
                        : 'bg-white text-ink ring-ink/15 hover:bg-violet-50')
                    }
                  >
                    <span className="block text-[10px] uppercase tracking-wider opacity-70">{RECOLTE_VILLAGE[n]}</span>
                    <span className="font-mono font-bold">{n.toLocaleString('fr-FR')} kg</span>
                    {pos >= 0 && <span className="ml-2 text-xs">#{pos + 1}</span>}
                  </button>
                );
              })}
              {order.length > 0 && (
                <button type="button" onClick={() => setOrder([])} className="self-center text-xs text-ink/50 underline">
                  recommencer
                </button>
              )}
            </div>
            {orderDone && (
              <p className={'mt-2 text-xs ' + (orderOk ? 'text-action-700' : 'text-alert-700')}>
                {orderOk
                  ? `✓ Exact : ${RECOLTE_TRI.map((n) => n.toLocaleString('fr-FR')).join(' < ')}.`
                  : 'Pas encore. Les trois nombres ont 4 chiffres : compare rang par rang en partant de la gauche (milliers, puis centaines, puis dizaines…).'}
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir l&apos;abaque
            </Button>
            <Button variant="gradient" disabled={!orderDone} onClick={() => setStep('qcm')}>
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
              label="Dans 2 405, le chiffre des centaines est…"
              tone="violet"
              options={[
                { key: '4', label: '4' },
                { key: '24', label: '24' },
                { key: '400', label: '400' },
              ]}
              value={qChiffre}
              onChange={setQChiffre}
            />
            <QcmStep
              label="Dans 5 260, le nombre de centaines est…"
              tone="violet"
              hint="Combien de paquets de 100 peut-on faire avec 5 260 ?"
              options={[
                { key: '2', label: '2' },
                { key: '52', label: '52' },
                { key: '200', label: '200' },
              ]}
              value={qNombre}
              onChange={setQNombre}
            />
            <QcmStep
              label="Quelle décomposition correspond à 2 405 ?"
              tone="violet"
              options={[
                { key: 'ok', label: '(2×1000) + (4×100) + (0×10) + (5×1)' },
                { key: 'shift', label: '(2×1000) + (4×100) + (5×10)' },
                { key: 'sum', label: '2 + 4 + 0 + 5' },
              ]}
              value={qDecomp}
              onChange={setQDecomp}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qChiffre || !qNombre || !qDecomp || busy} onClick={handleValidate}>
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
              Notre numération est <strong>décimale</strong> (dix chiffres) et <strong>de position</strong> :{' '}
              <strong>10 unités d&apos;un rang = 1 unité du rang de gauche</strong>. Tu as vu les 10 cubes se fondre en une
              barre, les 10 barres en une plaque, les 10 plaques en un gros cube.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-violet-100">
              Dans <span className="font-mono">2 405</span> : le <strong>chiffre</strong> des dizaines est{' '}
              <strong>0</strong>, mais le <strong>nombre</strong> de dizaines est <strong>240</strong>. Le zéro n&apos;est
              pas « rien » : il garde la place du rang vide.
            </p>
            <p>
              Récoltes rangées : {RECOLTE_TRI.map((n) => n.toLocaleString('fr-FR')).join(' kg < ')} kg — on compare rang
              par rang en partant de la gauche.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
