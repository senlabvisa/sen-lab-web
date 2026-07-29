'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ClipboardList, Divide, PieChart, Scale, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Fractions simples : le sens du partage (6ème, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (galette partagée en
 * n parts ÉGALES + placement de la fraction sur une demi-droite graduée) →
 * mesures (tableau des observations) → QCM (3 questions) → bilan.
 *
 * Angle 6ème : sens de la fraction (partage en parts égales), rôle du
 * numérateur et du dénominateur, comparaison, fractions équivalentes,
 * repérage sur une demi-droite. (Le passage à l'écriture décimale est traité
 * dans le TP de 5ème « fractions et nombres décimaux ».)
 */

const FractionScene = dynamic(() => import('./fraction-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'plus-petite' | 'plus-grande' | 'pareille' | null;
type Temoin = { num: number; den: number; label: string };
type Obs = { num: number; den: number; refNum: number; refDen: number };

const TEMOINS: Temoin[] = [
  { num: 1, den: 2, label: '1/2 (la moitié)' },
  { num: 1, den: 3, label: '1/3 (le tiers)' },
  { num: 3, den: 4, label: '3/4 (trois quarts)' },
];

const INTRO =
  "À la maison, quand le bol de thiéboudiène arrive, on partage. Et pour que personne ne se plaigne, " +
  "il faut des parts ÉGALES. C'est exactement ça, une fraction : on coupe un tout en parts toutes de la même taille, " +
  "puis on dit combien de parts on prend. Si la galette est coupée en 4 parts égales et que tu en prends 3, " +
  "tu as pris trois quarts, on écrit 3 sur 4. Le nombre du bas dit en combien de parts on a coupé, " +
  "le nombre du haut dit combien de parts on prend. Aujourd'hui tu vas couper, colorier, comparer.";

const CONCLUSION =
  "Bravo ! Dans une fraction, le dénominateur, le nombre du bas, dit en combien de parts ÉGALES on partage le tout. " +
  "Le numérateur, le nombre du haut, dit combien de ces parts on prend. " +
  "Attention : si les parts ne sont pas égales, on n'a pas le droit d'écrire une fraction. " +
  "Plus le dénominateur est grand, plus chaque part est petite : un huitième de galette est plus petit qu'un quart. " +
  "Enfin, deux fractions différentes peuvent désigner la même quantité : deux quarts, c'est la même chose qu'une moitié. " +
  "Sur la demi-droite graduée, elles tombent exactement au même point.";

/** Comparaison sans division : produits en croix. */
function compare(a: Obs) {
  return a.num * a.refDen - a.refNum * a.den;
}

function pgcd(a: number, b: number): number {
  return b === 0 ? a : pgcd(b, a % b);
}

export function FractionsSimples6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [den, setDen] = useState(4);
  const [num, setNum] = useState(1);
  const [temoin, setTemoin] = useState<Temoin>(TEMOINS[0]);
  const [tried, setTried] = useState<Set<string>>(new Set(['1/4']));
  const [records, setRecords] = useState<Obs[]>([]);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qParts, setQParts] = useState<string | null>(null);
  const [qDen, setQDen] = useState<string | null>(null);
  const [qEquiv, setQEquiv] = useState<string | null>(null);

  function changeDen(v: number) {
    const nextNum = Math.min(num, v);
    setDen(v);
    setNum(nextNum);
    setTried((prev) => new Set(prev).add(`${nextNum}/${v}`));
  }
  function changeNum(v: number) {
    const nextNum = Math.min(v, den);
    setNum(nextNum);
    setTried((prev) => new Set(prev).add(`${nextNum}/${den}`));
  }

  const current: Obs = { num, den, refNum: temoin.num, refDen: temoin.den };
  const diff = compare(current);
  const sign = diff === 0 ? '=' : diff > 0 ? '>' : '<';

  /** Fraction équivalente au témoin mais écrite avec un autre dénominateur. */
  const equivalentFound = useMemo(
    () => records.some((r) => compare(r) === 0 && r.den !== r.refDen),
    [records],
  );

  const simplified = useMemo(() => {
    if (num === 0) return '0';
    const g = pgcd(num, den);
    return `${num / g}/${den / g}`;
  }, [num, den]);

  function noter() {
    setRecords((prev) => {
      if (prev.some((r) => r.num === num && r.den === den && r.refNum === temoin.num && r.refDen === temoin.den)) {
        return prev;
      }
      return [...prev, { ...current }];
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, tried.size * 4); // exploration des découpages
    if (hypo === 'plus-petite') s += 10; // hypothèse juste
    s += Math.min(10, records.length * 4); // relevés d'observations
    if (equivalentFound) s += 15; // a trouvé une fraction équivalente
    if (qParts === 'egales') s += 15;
    if (qDen === 'total') s += 15;
    if (qEquiv === 'meme') s += 15;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [tried, hypo, records, equivalentFound, qParts, qDen, qEquiv]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'fractions-simples-6eme',
        version: '2.0',
        steps: {
          explore: { count: tried.size, fractions: Array.from(tried), last: { num, den } },
          hypothesis: hypo,
          records,
          equivalentFound,
          qcm: { qParts, qDen, qEquiv },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <PieChart className="h-5 w-5" />
              </span>
              Partager en parts égales
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Autour du bol de <strong>thiéboudiène</strong>, ou quand on coupe une{' '}
              <strong>tapalapa</strong> pour les frères et sœurs, on partage. Pour que ce soit juste, il faut des{' '}
              <strong>parts égales</strong>.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-center font-mono text-lg font-bold text-amber-700 ring-1 ring-amber-100">
              3/4 &nbsp;=&nbsp; 3 parts prises sur 4 parts égales
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> comprendre le <strong>dénominateur</strong> (le nombre du bas : en combien de
              parts égales on coupe) et le <strong>numérateur</strong> (le nombre du haut : combien de parts on prend),
              puis placer la fraction sur une <strong>demi-droite graduée</strong>.
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
              <Target className="h-5 w-5 text-amber-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : on prend <strong>la même galette</strong>. Au lieu de la couper en{' '}
            <strong>4</strong> parts égales, on la coupe en <strong>8</strong> parts égales.
          </p>
          <QcmStep
            label="Chaque part devient alors…"
            tone="amber"
            hint="Attention : la galette entière ne change pas de taille, seul le nombre de parts change."
            options={[
              { key: 'plus-petite', label: 'Plus petite (deux fois plus petite)' },
              { key: 'plus-grande', label: 'Plus grande (parce que 8 > 4)' },
              { key: 'pareille', label: 'De la même taille qu’avant' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier sur la galette <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Divide className="h-5 w-5 text-amber-700" /> Étape 2 — Coupe et colorie
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Coupe la galette de gauche (curseur du <strong>dénominateur</strong>), colorie des parts (curseur du{' '}
            <strong>numérateur</strong>). En bas, la même fraction est placée sur la <strong>demi-droite graduée</strong>{' '}
            entre 0 et 1. Compare avec la galette témoin à droite. Tourne la scène avec ta souris ou ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <FractionScene num={num} den={den} refNum={temoin.num} refDen={temoin.den} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="den">Dénominateur — parts égales</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{den}</span>
              </div>
              <input
                id="den"
                type="range"
                min={2}
                max={12}
                step={1}
                value={den}
                onChange={(e) => changeDen(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="num">Numérateur — parts coloriées</Label>
                <span className="font-mono text-sm font-semibold text-amber-700">{num}</span>
              </div>
              <input
                id="num"
                type="range"
                min={0}
                max={den}
                step={1}
                value={num}
                onChange={(e) => changeNum(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1 text-xs text-ink/60">Galette témoin (à droite) :</div>
            <div className="flex flex-wrap gap-2">
              {TEMOINS.map((t) => (
                <Button
                  key={`${t.num}/${t.den}`}
                  size="sm"
                  variant={t.num === temoin.num && t.den === temoin.den ? 'gradient' : 'outline'}
                  onClick={() => setTemoin(t)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-center text-sm ring-1 ring-amber-100">
            <span className="font-mono text-base font-bold text-amber-700">
              {num}/{den} {sign} {temoin.num}/{temoin.den}
            </span>
            <div className="mt-1 text-xs text-ink/70">
              {diff === 0 ? (
                <>
                  Les deux galettes ont la <strong>même quantité coloriée</strong> : ce sont des{' '}
                  <strong>fractions équivalentes</strong>.
                </>
              ) : (
                <>
                  {num}/{den} est {diff > 0 ? 'plus grand' : 'plus petit'} que {temoin.num}/{temoin.den} — regarde les
                  deux points sur la demi-droite.
                </>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white p-3 text-xs text-ink/70 ring-1 ring-night-100">
            <strong>Observe :</strong> quand le dénominateur augmente, chaque part devient plus petite (la galette, elle,
            ne grandit pas). Découpages essayés : <strong>{tried.size}</strong> · Observations notées :{' '}
            <strong>{records.length}</strong>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={noter}>
              <ClipboardList className="h-4 w-4" /> Noter cette observation
            </Button>
            <Button variant="gradient" disabled={tried.size < 5 || records.length < 3} onClick={() => setStep('mesures')}>
              {tried.size < 5
                ? `Essaie ${5 - tried.size} fraction(s) de plus`
                : records.length < 3
                  ? `Note ${3 - records.length} observation(s)`
                  : 'Voir mes observations'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-700" /> Étape 3 — Tes observations
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>

          <div
            className={
              'mb-3 rounded-xl p-3 text-sm ring-1 ' +
              (hypo === 'plus-petite'
                ? 'bg-action-50 text-action-700 ring-action-100'
                : 'bg-amber-50 text-amber-800 ring-amber-100')
            }
          >
            <strong>Ton hypothèse :</strong>{' '}
            {hypo === 'plus-petite'
              ? 'juste ! En coupant la même galette en 8 au lieu de 4, chaque part est deux fois plus petite.'
              : 'à corriger. La galette ne change pas de taille : si on la coupe en 8 au lieu de 4, chaque part devient deux fois plus PETITE. Un grand dénominateur = de petites parts.'}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                <tr>
                  <th className="px-3 py-2 text-left">Ma fraction</th>
                  <th className="px-3 py-2 text-left">Témoin</th>
                  <th className="px-3 py-2 text-left">Comparaison</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const d = compare(r);
                  const equiv = d === 0;
                  return (
                    <tr key={i} className={'border-t border-night-100 ' + (equiv ? 'bg-emerald-50 font-semibold' : '')}>
                      <td className="px-3 py-2 font-mono">
                        {r.num}/{r.den}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {r.refNum}/{r.refDen}
                      </td>
                      <td className="px-3 py-2">
                        {equiv ? '= (équivalentes) 🏆' : d > 0 ? 'plus grande' : 'plus petite'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-ink/80 ring-1 ring-violet-100">
            <strong>À retenir :</strong> sur la même galette,{' '}
            <span className="font-mono">1/2 &gt; 1/4 &gt; 1/8</span> — plus le dénominateur est grand, plus la part est
            petite.
            {equivalentFound ? (
              <p className="mt-2 text-action-700">
                Tu as trouvé une <strong>fraction équivalente</strong> écrite avec un autre dénominateur : deux écritures
                différentes, la même quantité (comme 2/4 et 1/2).
              </p>
            ) : (
              <p className="mt-2 text-amber-800">
                Astuce : reviens à la galette et cherche une fraction <strong>égale au témoin</strong> mais avec un autre
                dénominateur (par exemple 2/4 pour le témoin 1/2).
              </p>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner à la galette
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
              label="On peut écrire une fraction d’une galette seulement si…"
              tone="amber"
              options={[
                { key: 'egales', label: 'Toutes les parts sont ÉGALES' },
                { key: 'grandes', label: 'Les parts sont grandes' },
                { key: 'pair', label: 'Le nombre de parts est pair' },
              ]}
              value={qParts}
              onChange={setQParts}
            />
            <QcmStep
              label="Dans la fraction 3/8, que représente le 8 (le nombre du bas) ?"
              tone="amber"
              options={[
                { key: 'total', label: 'Le nombre total de parts égales de la galette' },
                { key: 'prises', label: 'Le nombre de parts prises' },
                { key: 'reste', label: 'Le nombre de parts qui restent' },
              ]}
              value={qDen}
              onChange={setQDen}
            />
            <QcmStep
              label="Fatou colorie 2 parts sur 4 de sa galette ; Ousmane colorie 1 part sur 2 de la même galette."
              tone="amber"
              hint="Repense aux deux points sur la demi-droite graduée."
              options={[
                { key: 'meme', label: 'Ils ont colorié la même quantité : 2/4 = 1/2' },
                { key: 'fatou', label: 'Fatou a colorié plus, car 2 > 1' },
                { key: 'ousmane', label: 'Ousmane a colorié plus, car ses parts sont plus grandes' },
              ]}
              value={qEquiv}
              onChange={setQEquiv}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qParts || !qDen || !qEquiv || busy} onClick={handleValidate}>
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
              Une fraction, c’est un <strong>partage en parts égales</strong>. Le{' '}
              <strong>dénominateur</strong> dit en combien de parts égales on coupe le tout ; le{' '}
              <strong>numérateur</strong> dit combien de parts on prend. Sans parts égales, pas de fraction !
            </p>
            <p>
              Plus le dénominateur est grand, plus chaque part est <strong>petite</strong> :{' '}
              <span className="font-mono">1/2 &gt; 1/4 &gt; 1/8</span>. Et deux écritures différentes peuvent désigner la
              même quantité : <span className="font-mono">2/4 = 1/2</span> — sur la demi-droite graduée, elles tombent au
              même point. Ta dernière fraction <span className="font-mono">{num}/{den}</span> s’écrit aussi{' '}
              <span className="font-mono">{simplified}</span>.
            </p>
            <div className="rounded-xl bg-white/70 p-3 text-xs text-ink/70 ring-1 ring-amber-100">
              <strong>Détail du score :</strong> exploration des découpages {Math.min(20, tried.size * 4)}/20 ·
              hypothèse {hypo === 'plus-petite' ? 10 : 0}/10 · observations notées {Math.min(10, records.length * 4)}/10
              · fraction équivalente trouvée {equivalentFound ? 15 : 0}/15 · QCM{' '}
              {(qParts === 'egales' ? 15 : 0) + (qDen === 'total' ? 15 : 0) + (qEquiv === 'meme' ? 15 : 0)}/45
            </div>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
