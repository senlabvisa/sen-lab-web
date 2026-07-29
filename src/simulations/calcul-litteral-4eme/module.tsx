'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Grid3x3, Ruler, Shuffle, Sigma, Sprout } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Calcul littéral : développer et factoriser par les aires (4ème, Maths).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (champ rectangulaire
 * (a+b)×(c+d) dallé en quatre parcelles qui s'écartent et se recollent) →
 * mesures (tableau des découpes + substitution numérique) → QCM → bilan.
 *
 * Contexte : M. Sarr agrandit son champ maraîcher des Niayes (ceinture verte
 * de Dakar). Maths justes : k(a+b) = ka + kb, (a+b)(c+d) = ac+ad+bc+bd,
 * et le piège du signe moins devant une parenthèse : −(x − 3) = −x + 3.
 */

const AiresScene = dynamic(() => import('./aires-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'quatre' | 'deux' | 'somme' | null;
type Mode = 'developper' | 'factoriser';
type Decoupe = { a: number; b: number; c: number; d: number };

// Application chiffrée du bilan : le champ agrandi de M. Sarr.
const APP = { a: 15, b: 5, c: 8, d: 2 };
const APP_TOTAL = (APP.a + APP.b) * (APP.c + APP.d); // 20 × 10 = 200 m²

const INTRO =
  "Aux Niayes, la ceinture maraîchère de Dakar, monsieur Sarr cultive un champ rectangulaire. " +
  "Cette année il l'agrandit : il ajoute quelques mètres en longueur et quelques mètres en largeur. " +
  "Le nouveau champ mesure a plus b mètres sur c plus d mètres. Son aire peut se calculer de deux façons : " +
  "d'un seul bloc, ou en additionnant les quatre parcelles obtenues par le découpage. " +
  "Ces deux façons donnent toujours le même résultat : c'est la double distributivité.";

const CONCLUSION =
  "Bravo ! Développer, c'est transformer un produit en somme : a plus b, fois c plus d, égale a c plus a d plus b c plus b d. " +
  "Factoriser, c'est le chemin inverse : on repère le facteur commun et on remet les morceaux dans une seule parenthèse. " +
  "Et attention au signe moins devant une parenthèse : il change le signe de chaque terme. Moins, parenthèse x moins 3, donne moins x plus 3.";

export function CalculLitteral4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  // Dimensions du champ (en mètres). b et d = l'agrandissement (peuvent être nuls).
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [c, setC] = useState(4);
  const [d, setD] = useState(1);
  const [spread, setSpread] = useState(false);
  const [spreadUsed, setSpreadUsed] = useState(false);
  const [mode, setMode] = useState<Mode>('developper');
  const [decoupes, setDecoupes] = useState<Decoupe[]>([]);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [appAnswer, setAppAnswer] = useState('');
  const [qDouble, setQDouble] = useState<string | null>(null);
  const [qSigne, setQSigne] = useState<string | null>(null);
  const [qFacto, setQFacto] = useState<string | null>(null);

  const total = (a + b) * (c + d);
  const parts = { ac: a * c, ad: a * d, bc: b * c, bd: b * d };
  const somme = parts.ac + parts.ad + parts.bc + parts.bd;

  const appNum = Number(appAnswer.replace(',', '.').replace(/\s/g, ''));
  const appValid = appAnswer.trim() !== '' && !Number.isNaN(appNum);
  const appOk = appValid && appNum === APP_TOTAL;

  function noterDecoupe() {
    setDecoupes((prev) => {
      if (prev.some((p) => p.a === a && p.b === b && p.c === c && p.d === d)) return prev;
      return [...prev, { a, b, c, d }].slice(-6);
    });
  }

  function toggleSpread() {
    setSpread((s) => !s);
    setSpreadUsed(true);
  }

  const score = useMemo(() => {
    let s = 0;
    if (decoupes.length >= 3) s += 20;
    else if (decoupes.length === 2) s += 12;
    else if (decoupes.length === 1) s += 6;
    if (spreadUsed) s += 10;
    if (hypo === 'quatre') s += 10;
    if (appOk) s += 20;
    if (qDouble === 'x2_7x_10') s += 15;
    if (qSigne === 'moinsx_plus3') s += 15;
    if (qFacto === 'sept_x_plus3') s += 10;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [decoupes.length, spreadUsed, hypo, appOk, qDouble, qSigne, qFacto]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'calcul-litteral-4eme',
        version: '2.0',
        steps: {
          explore: { decoupes, spreadUsed, lastMode: mode, last: { a, b, c, d } },
          hypothesis: hypo,
          application: { ...APP, answer: appValid ? appNum : null, target: APP_TOTAL, correct: appOk },
          qcm: { qDouble, qSigne, qFacto },
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
                <Sprout className="h-5 w-5" />
              </span>
              Le champ agrandi de monsieur Sarr
            </CardTitle>
            <Badge tone="maths">Maths · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Aux <strong>Niayes</strong>, la ceinture maraîchère de Dakar, monsieur Sarr agrandit son champ
              rectangulaire : <strong>+ b mètres</strong> en longueur et <strong>+ d mètres</strong> en largeur.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-center font-mono text-base font-semibold text-violet-700 ring-1 ring-violet-100">
              (a + b) × (c + d) = a·c + a·d + b·c + b·d
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> lire cette égalité <em>sur la figure</em>. Tu découperas le champ en quatre
              parcelles, tu les écarteras, puis tu les recolleras. L&apos;aire ne change jamais : c&apos;est ça,{' '}
              <strong>développer</strong> et <strong>factoriser</strong>.
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
              <Sigma className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : si on découpe le champ <span className="font-mono">(a + b) × (c + d)</span> en
            parcelles, combien de morceaux obtient-on et que vaut l&apos;aire totale ?
          </p>
          <QcmStep
            label="Mon hypothèse : (a + b)(c + d) est égal à…"
            tone="violet"
            hint="Pense au découpage : chaque bout de la longueur rencontre chaque bout de la largeur."
            options={[
              { key: 'deux', label: 'a·c + b·d  (deux morceaux seulement)' },
              { key: 'quatre', label: 'a·c + a·d + b·c + b·d  (quatre morceaux)' },
              { key: 'somme', label: 'a + b + c + d' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier sur le champ <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5 text-violet-700" /> Étape 2 — Découpe le champ
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle <strong>a</strong>, <strong>b</strong>, <strong>c</strong>, <strong>d</strong>, puis écarte les quatre
            parcelles. Les deux afficheurs verts donnent <span className="font-mono">(a+b)(c+d)</span> et{' '}
            <span className="font-mono">ac+ad+bc+bd</span> : ils sont <strong>toujours égaux</strong>. Chaque petit carré
            gravé vaut 1 m².
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <AiresScene a={a} b={b} c={c} d={d} spread={spread} mode={mode} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SliderRow id="a" label="a (longueur de départ)" value={a} min={1} max={6} onChange={setA} />
            <SliderRow id="b" label="b (allongement)" value={b} min={0} max={5} onChange={setB} />
            <SliderRow id="c" label="c (largeur de départ)" value={c} min={1} max={6} onChange={setC} />
            <SliderRow id="d" label="d (élargissement)" value={d} min={0} max={5} onChange={setD} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="a × c" value={`${parts.ac} m²`} />
            <Stat label="a × d" value={`${parts.ad} m²`} />
            <Stat label="b × c" value={`${parts.bc} m²`} />
            <Stat label="b × d" value={`${parts.bd} m²`} />
          </div>
          <div className="mt-2 rounded-xl bg-action-50 p-3 text-center text-sm font-semibold text-action-700 ring-1 ring-action-100">
            ({a} + {b}) × ({c} + {d}) = {total} m² &nbsp;=&nbsp; {parts.ac} + {parts.ad} + {parts.bc} + {parts.bd} ={' '}
            {somme} m²
          </div>
          {b === 0 && (
            <p className="mt-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-900 ring-1 ring-violet-100">
              <strong>Cas particulier :</strong> avec b = 0 il ne reste que deux parcelles :{' '}
              <span className="font-mono">a(c + d) = a·c + a·d</span>. C&apos;est la <strong>distributivité simple</strong>{' '}
              <span className="font-mono">k(a + b) = k·a + k·b</span>.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="soft" size="sm" onClick={toggleSpread}>
              <Shuffle className="h-4 w-4" /> {spread ? 'Recoller les parcelles' : 'Écarter les parcelles'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode((m) => (m === 'developper' ? 'factoriser' : 'developper'))}
            >
              Mode : {mode === 'developper' ? 'développer' : 'factoriser'}
            </Button>
            <Button variant="soft" size="sm" onClick={noterDecoupe}>
              <Ruler className="h-4 w-4" /> Noter cette découpe
            </Button>
            <span className="text-xs text-ink/50">{decoupes.length} découpe(s) notée(s)</span>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={decoupes.length < 3} onClick={() => setStep('mesures')}>
              {decoupes.length < 3 ? `Note ${3 - decoupes.length} découpe(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures et une application</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare les deux dernières colonnes : le produit et la somme des quatre morceaux tombent toujours sur le même
            nombre.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Découpe</th>
                  <th className="px-3 py-2 text-left">(a+b)(c+d)</th>
                  <th className="px-3 py-2 text-left">ac + ad + bc + bd</th>
                  <th className="px-3 py-2 text-left">Égal ?</th>
                </tr>
              </thead>
              <tbody>
                {decoupes.map((p, i) => {
                  const t = (p.a + p.b) * (p.c + p.d);
                  const s = p.a * p.c + p.a * p.d + p.b * p.c + p.b * p.d;
                  return (
                    <tr key={`${p.a}-${p.b}-${p.c}-${p.d}-${i}`} className="border-t border-night-100">
                      <td className="px-3 py-2 font-mono text-xs">
                        a={p.a} b={p.b} c={p.c} d={p.d}
                      </td>
                      <td className="px-3 py-2 font-mono">{t} m²</td>
                      <td className="px-3 py-2 font-mono">
                        {p.a * p.c} + {p.a * p.d} + {p.b * p.c} + {p.b * p.d} = {s} m²
                      </td>
                      <td className="px-3 py-2 text-action-700">{t === s ? '✓ oui' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-ink/80 ring-1 ring-violet-100">
            <strong>Application.</strong> Le vrai champ de monsieur Sarr mesure <strong>{APP.a} m</strong> de long sur{' '}
            <strong>{APP.c} m</strong> de large. Il l&apos;agrandit de <strong>{APP.b} m</strong> en longueur et de{' '}
            <strong>{APP.d} m</strong> en largeur.
            <p className="mt-2">
              Quelle est l&apos;aire du nouveau champ, en m² ? (Tu peux calculer{' '}
              <span className="font-mono">
                ({APP.a}+{APP.b})×({APP.c}+{APP.d})
              </span>{' '}
              ou la somme des quatre parcelles.)
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <Label htmlFor="appAns">Aire du nouveau champ (m²)</Label>
            <Input
              id="appAns"
              inputMode="numeric"
              value={appAnswer}
              onChange={(e) => setAppAnswer(e.target.value)}
              placeholder="ex : 150"
            />
            {appValid && (
              <div
                className={
                  'rounded-xl p-3 text-xs ring-1 ' +
                  (appOk ? 'bg-action-50 text-action-700 ring-action-100' : 'bg-amber-50 text-amber-800 ring-amber-100')
                }
              >
                {appOk
                  ? `Exact : 20 × 10 = 200, et ${APP.a * APP.c} + ${APP.a * APP.d} + ${APP.b * APP.c} + ${APP.b * APP.d} = 200 m².`
                  : `Indice : additionne d'abord ${APP.a} + ${APP.b}, puis ${APP.c} + ${APP.d}, et multiplie les deux résultats.`}
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner au champ
            </Button>
            <Button variant="gradient" disabled={!appValid} onClick={() => setStep('qcm')}>
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
              label="Développe (x + 2)(x + 5)."
              tone="violet"
              hint="Quatre produits, comme les quatre parcelles : x·x, x·5, 2·x, 2·5."
              options={[
                { key: 'x2_7x_10', label: 'x² + 7x + 10' },
                { key: 'x2_10', label: 'x² + 10' },
                { key: 'x2_7x_7', label: 'x² + 7x + 7' },
              ]}
              value={qDouble}
              onChange={setQDouble}
            />
            <QcmStep
              label="Supprime la parenthèse : −(x − 3) = …"
              tone="violet"
              hint="Le signe − devant la parenthèse, c'est ×(−1) : il change le signe de CHAQUE terme."
              options={[
                { key: 'moinsx_moins3', label: '−x − 3' },
                { key: 'moinsx_plus3', label: '−x + 3' },
                { key: 'x_moins3', label: 'x − 3' },
              ]}
              value={qSigne}
              onChange={setQSigne}
            />
            <QcmStep
              label="Factorise 7x + 21."
              tone="violet"
              hint="Cherche le facteur commun : 21 = 7 × 3."
              options={[
                { key: 'sept_x_plus3', label: '7(x + 3)' },
                { key: 'sept_x_plus21', label: '7(x + 21)' },
                { key: 'x_sept_plus3', label: 'x(7 + 21)' },
              ]}
              value={qFacto}
              onChange={setQFacto}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qDouble || !qSigne || !qFacto || busy} onClick={handleValidate}>
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
              <strong>Développer</strong> : <span className="font-mono">(a + b)(c + d) = ac + ad + bc + bd</span> — le
              rectangle se découpe en quatre parcelles. Cas simple :{' '}
              <span className="font-mono">k(a + b) = ka + kb</span>.
            </p>
            <p>
              <strong>Factoriser</strong> : le chemin inverse, on recolle. <span className="font-mono">7x + 21 = 7(x + 3)</span>.
            </p>
            <p>
              <strong>Piège du signe :</strong> <span className="font-mono">−(x − 3) = −x + 3</span>. Le signe moins
              change le signe de chaque terme de la parenthèse.
            </p>
            <ul className="rounded-xl bg-white/70 p-3 text-xs text-ink/70 ring-1 ring-violet-100">
              <li>Découpes notées : {decoupes.length}/3 → {decoupes.length >= 3 ? 20 : decoupes.length === 2 ? 12 : decoupes.length === 1 ? 6 : 0}/20</li>
              <li>Parcelles écartées : {spreadUsed ? 10 : 0}/10</li>
              <li>Hypothèse : {hypo === 'quatre' ? 10 : 0}/10</li>
              <li>Aire du champ de M. Sarr ({APP_TOTAL} m²) : {appOk ? 20 : 0}/20</li>
              <li>Double distributivité : {qDouble === 'x2_7x_10' ? 15 : 0}/15</li>
              <li>Signe moins : {qSigne === 'moinsx_plus3' ? 15 : 0}/15</li>
              <li>Factorisation : {qFacto === 'sept_x_plus3' ? 10 : 0}/10</li>
            </ul>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function SliderRow({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <Label htmlFor={id}>{label}</Label>
        <span className="font-mono text-violet-700">{value} m</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-lab w-full"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
      <div className="text-[10px] uppercase tracking-wider text-violet-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-violet-800">{value}</div>
    </div>
  );
}
