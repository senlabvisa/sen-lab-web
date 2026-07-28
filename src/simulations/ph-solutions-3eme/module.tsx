'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Crosshair, Droplets, FlaskConical, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — L'échelle de pH : solutions acides, basiques et neutres (Physique-Chimie, 3ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (slider pH +
 * bécher dont le liquide change de couleur avec l'indicateur BBT) → mesures
 * → QCM → bilan. Contexte sénégalais : bissap, jus de citron, eau, savon,
 * cendre. Science juste : pH < 7 acide, pH = 7 neutre, pH > 7 basique.
 */

const PhScene = dynamic(() => import('./ph-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'acide' | 'neutre' | 'basique' | null;

const INTRO =
  "Dans la cuisine, le jus de citron pique la langue : il est acide. " +
  "Le bissap aussi est acide. L'eau pure, elle, est neutre. " +
  "Le savon et l'eau de cendre, au contraire, sont basiques. " +
  "Pour les classer, les chimistes utilisent le pH, une échelle qui va de 0 à 14. " +
  "Avec un indicateur coloré, le BBT, la solution change de couleur selon son pH. " +
  "Aujourd'hui tu vas explorer cette échelle.";

const CONCLUSION =
  "Bravo ! Le pH classe les solutions sur une échelle de 0 à 14. " +
  "En dessous de 7, la solution est acide, comme le citron ou le bissap. " +
  "À 7 exactement, elle est neutre, comme l'eau pure. " +
  "Au-dessus de 7, elle est basique, comme le savon. " +
  "Et plus le pH est petit, plus la solution est acide.";

/** Quelques solutions repères du quotidien sénégalais (pH approchés). */
const REFERENCES: { name: string; ph: number; nature: string }[] = [
  { name: 'Jus de citron', ph: 2, nature: 'acide' },
  { name: 'Bissap', ph: 3, nature: 'acide' },
  { name: 'Eau pure', ph: 7, nature: 'neutre' },
  { name: 'Eau de mer', ph: 8, nature: 'basique' },
  { name: 'Savon', ph: 10, nature: 'basique' },
  { name: 'Eau de cendre', ph: 12, nature: 'basique' },
];

function nature(ph: number): 'acide' | 'neutre' | 'basique' {
  if (ph < 7) return 'acide';
  if (ph > 7) return 'basique';
  return 'neutre';
}

function bbtColor(ph: number): string {
  if (ph < 7) return 'Jaune / orangé';
  if (ph > 7) return 'Bleu / violet';
  return 'Vert';
}

export function PhSolutions3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [ph, setPh] = useState(7);
  const [tested, setTested] = useState<Set<number>>(new Set([7]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qPh3, setQPh3] = useState<string | null>(null);
  const [qNeutre, setQNeutre] = useState<string | null>(null);
  const [qPetit, setQPetit] = useState<string | null>(null);

  const nat = useMemo(() => nature(ph), [ph]);
  // A-t-on observé au moins un acide, un neutre et un basique ?
  const seenAcide = useMemo(() => Array.from(tested).some((p) => p < 7), [tested]);
  const seenNeutre = useMemo(() => tested.has(7), [tested]);
  const seenBasique = useMemo(() => Array.from(tested).some((p) => p > 7), [tested]);
  const coverage = (seenAcide ? 1 : 0) + (seenNeutre ? 1 : 0) + (seenBasique ? 1 : 0);

  function setPhValue(v: number) {
    setPh(v);
    setTested((s) => {
      const n = new Set(s);
      n.add(v);
      return n;
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(15, tested.size * 2); // exploration : variété des pH testés
    s += coverage * 5; // avoir vu acide + neutre + basique (max 15)
    if (hypo === 'acide') s += 10; // hypothèse correcte (citron acide)
    if (qPh3 === 'acide') s += 20;
    if (qNeutre === '7') s += 20;
    if (qPetit === 'petit') s += 20;
    return Math.min(100, s);
  }, [tested, coverage, hypo, qPh3, qNeutre, qPetit]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'ph-solutions-3eme',
        version: '2.0',
        steps: {
          phTested: Array.from(tested).sort((a, b) => a - b),
          coverage: { acide: seenAcide, neutre: seenNeutre, basique: seenBasique },
          hypothesis: hypo,
          qcm: { qPh3, qNeutre, qPetit },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <FlaskConical className="h-5 w-5" />
              </span>
              L&apos;échelle de pH
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le <strong>jus de citron</strong> et le <strong>bissap</strong> piquent la langue : ils sont{' '}
              <strong>acides</strong>. L&apos;<strong>eau pure</strong> est <strong>neutre</strong>. Le{' '}
              <strong>savon</strong> et l&apos;eau de cendre sont <strong>basiques</strong>.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> explorer l&apos;échelle de pH (de 0 à 14) et reconnaître si une solution est
              acide, neutre ou basique grâce à la couleur de l&apos;indicateur (le BBT).
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
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : le <strong>jus de citron</strong> a un pH de 2. Selon toi, c&apos;est une solution…
          </p>
          <QcmStep
            label="Mon hypothèse : une solution de pH 2 (le citron) est…"
            tone="amber"
            options={[
              { key: 'acide', label: 'Acide' },
              { key: 'neutre', label: 'Neutre' },
              { key: 'basique', label: 'Basique' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Tester ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-violet-700" /> Étape 2 — Règle le pH
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Déplace le curseur de pH et observe la couleur du liquide dans le bécher. Repère-toi sur l&apos;échelle
            colorée. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <PhScene ph={ph} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="ph">pH de la solution</Label>
              <span className="font-mono text-violet-700">
                {ph} · {nat}
              </span>
            </div>
            <input
              id="ph"
              type="range"
              min={0}
              max={14}
              value={ph}
              onChange={(e) => setPhValue(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="pH" value={String(ph)} />
            <Stat label="Nature" value={nat.charAt(0).toUpperCase() + nat.slice(1)} />
            <Stat label="Couleur BBT" value={bbtColor(ph)} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-ink/60">
              <Crosshair className="h-4 w-4 text-violet-600" />
              Vu : {seenAcide ? 'acide ✓' : 'acide …'} · {seenNeutre ? 'neutre ✓' : 'neutre …'} ·{' '}
              {seenBasique ? 'basique ✓' : 'basique …'}
            </span>
            <Button variant="gradient" disabled={coverage < 3} onClick={() => setStep('mesures')}>
              {coverage < 3 ? 'Teste acide, neutre ET basique' : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes repères</CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici quelques solutions du quotidien et leur pH. Remarque : plus le pH est petit, plus la solution est
            acide.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Solution</th>
                  <th className="px-4 py-2 text-left">pH</th>
                  <th className="px-4 py-2 text-left">Nature</th>
                </tr>
              </thead>
              <tbody>
                {REFERENCES.map((r) => {
                  const isAcide = r.nature === 'acide';
                  const isBasique = r.nature === 'basique';
                  return (
                    <tr key={r.name} className="border-t border-night-100">
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 font-mono">{r.ph}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                            (isAcide
                              ? 'bg-amber-100 text-amber-800'
                              : isBasique
                                ? 'bg-violet-100 text-violet-800'
                                : 'bg-emerald-100 text-emerald-800')
                          }
                        >
                          {r.nature}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retester
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
            <Badge tone="science">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Une solution de pH = 3 est :"
              tone="amber"
              options={[
                { key: 'acide', label: 'Acide' },
                { key: 'neutre', label: 'Neutre' },
                { key: 'basique', label: 'Basique' },
              ]}
              value={qPh3}
              onChange={setQPh3}
            />
            <QcmStep
              label="Une solution neutre a un pH de :"
              tone="amber"
              options={[
                { key: '0', label: '0' },
                { key: '7', label: '7' },
                { key: '14', label: '14' },
              ]}
              value={qNeutre}
              onChange={setQNeutre}
            />
            <QcmStep
              label="Plus une solution est acide, plus son pH est :"
              tone="amber"
              options={[
                { key: 'petit', label: 'Petit (proche de 0)' },
                { key: 'grand', label: 'Grand (proche de 14)' },
                { key: 'egal7', label: 'Égal à 7' },
              ]}
              value={qPetit}
              onChange={setQPetit}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qPh3 || !qNeutre || !qPetit || busy}
              onClick={handleValidate}
            >
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
              Le <strong>pH</strong> va de 0 à 14. Une solution est <strong>acide si pH &lt; 7</strong> (citron,
              bissap), <strong>neutre si pH = 7</strong> (eau pure) et <strong>basique si pH &gt; 7</strong> (savon).
              Plus le pH est <strong>petit</strong>, plus c&apos;est acide. Le BBT est jaune en acide, vert au neutre,
              bleu en basique.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
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
