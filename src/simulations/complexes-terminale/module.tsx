'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Compass, Gauge, Sigma, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Nombres complexes : plan d'Argand, affixe, module et argument (Terminale, Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (sliders a, b) →
 * observation module/argument → QCM → bilan. Maths justes : z = a + bi,
 * affixe de M(a ; b), |z| = √(a²+b²) = OM, arg(z) = (Ox, OM), z̄ = a − bi.
 * Contexte : entraînement au Bac (épreuve de mathématiques, Série S).
 */

const ComplexScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-sky-50 text-sm text-ink/50">
      Chargement du plan complexe…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'a' | 'mod' | 'arg' | null;

const INTRO =
  "Au Bac, l'épreuve de mathématiques de Série S comporte presque toujours un exercice sur les nombres complexes. " +
  "Un nombre complexe z s'écrit z = a + b i, où a est sa partie réelle et b sa partie imaginaire. " +
  "On le représente par un point M de coordonnées (a ; b) dans un plan appelé plan d'Argand. " +
  "Le vecteur O M va de l'origine jusqu'à M : sa longueur est le module de z, l'angle qu'il fait avec l'axe réel est l'argument de z. " +
  "Aujourd'hui tu vas déplacer M dans le plan et voir vivre le module et l'argument.";

const CONCLUSION =
  "Bravo ! L'affixe du point M est z = a + b i. Le module vaut module de z égale racine carrée de a au carré plus b au carré : c'est la distance O M. " +
  "L'argument de z est l'angle entre l'axe réel et le vecteur O M. Le conjugué z barre égale a moins b i est le symétrique de M par rapport à l'axe réel. " +
  "Avec ces trois outils, tu es prêt pour l'exercice de complexes du Bac.";

function complexInfo(a: number, b: number) {
  const mod = Math.sqrt(a * a + b * b);
  const argDeg = (Math.atan2(b, a) * 180) / Math.PI;
  return { mod, argDeg };
}

export function ComplexesTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [a, setA] = useState(2);
  const [b, setB] = useState(1.5);
  const [explored, setExplored] = useState(0);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qMod, setQMod] = useState<string | null>(null);
  const [qConj, setQConj] = useState<string | null>(null);
  const [qArg, setQArg] = useState<string | null>(null);

  const info = useMemo(() => complexInfo(a, b), [a, b]);

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, explored * 3); // exploration des sliders
    if (hypo === 'mod') s += 10; // bonne intuition : la longueur OM = module
    if (qMod === 'racine') s += 22;
    if (qConj === 'amib') s += 22;
    if (qArg === 'angle') s += 21;
    return Math.min(100, s);
  }, [explored, hypo, qMod, qConj, qArg]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'complexes-terminale',
        version: '2.0',
        steps: {
          affixe: { a, b },
          module: info.mod,
          argumentDeg: info.argDeg,
          hypothesis: hypo,
          qcm: { qMod, qConj, qArg },
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
                <Sigma className="h-5 w-5" />
              </span>
              Le plan complexe d&apos;Argand
            </CardTitle>
            <Badge tone="maths">Maths · Terminale S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pour l&apos;épreuve de mathématiques du <strong>Bac</strong>, un nombre complexe{' '}
              <strong>z = a + bi</strong> se lit comme un point <strong>M(a ; b)</strong> du plan d&apos;Argand. La
              partie réelle est <strong>a = Re(z)</strong>, la partie imaginaire <strong>b = Im(z)</strong>.
            </p>
            <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
              <strong>Objectif :</strong> déplacer M dans le plan et découvrir ce que sont le <strong>module</strong>{' '}
              |z| = √(a²+b²) (longueur OM) et l&apos;<strong>argument</strong> arg(z) (angle avec l&apos;axe réel).
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
            Avant de manipuler : sur le dessin, le vecteur <strong>OM</strong> va de l&apos;origine jusqu&apos;au point
            M. Selon toi, <strong>la longueur de ce vecteur</strong> représente…
          </p>
          <QcmStep
            label="Mon hypothèse : la longueur du vecteur OM, c'est…"
            tone="violet"
            options={[
              { key: 'a', label: 'la partie réelle a de z' },
              { key: 'mod', label: 'le module |z| de z' },
              { key: 'arg', label: "l'argument (l'angle) de z" },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-sky-700" /> Étape 2 — Place le point M
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle <strong>a = Re(z)</strong> et <strong>b = Im(z)</strong>. Observe le vecteur OM, le module, l&apos;arc
            de l&apos;argument et le conjugué z̄. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-sky-100">
            <div className="aspect-[4/3] w-full">
              <ComplexScene real={a} imag={b} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="a">Partie réelle a</Label>
                <span className="font-mono text-sky-700">{a.toFixed(1)}</span>
              </div>
              <input
                id="a"
                type="range"
                min={-2.5}
                max={2.5}
                step={0.1}
                value={a}
                onChange={(e) => {
                  setA(Number(e.target.value));
                  setExplored((n) => n + 1);
                }}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="b">Partie imaginaire b</Label>
                <span className="font-mono text-sky-700">{b.toFixed(1)}</span>
              </div>
              <input
                id="b"
                type="range"
                min={-2.5}
                max={2.5}
                step={0.1}
                value={b}
                onChange={(e) => {
                  setB(Number(e.target.value));
                  setExplored((n) => n + 1);
                }}
                className="slider-lab w-full"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Affixe z" value={`${a.toFixed(1)}${b < 0 ? ' − ' : ' + '}${Math.abs(b).toFixed(1)}i`} />
            <Stat label="Module |z|" value={info.mod.toFixed(2)} />
            <Stat label="Argument" value={`${info.argDeg.toFixed(0)}°`} />
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="gradient" disabled={explored < 6} onClick={() => setStep('mesures')}>
              {explored < 6 ? `Bouge encore a et b (${6 - explored})` : 'Voir mes observations'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-sky-700" /> Étape 3 — Ce que tu observes
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour ton point actuel <strong>z = {a.toFixed(1)}{b < 0 ? ' − ' : ' + '}{Math.abs(b).toFixed(1)}i</strong>,
            voici le lien entre la géométrie et le calcul.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-xs uppercase tracking-wider text-sky-700">
                <tr>
                  <th className="px-4 py-2 text-left">Grandeur</th>
                  <th className="px-4 py-2 text-left">Lecture / formule</th>
                  <th className="px-4 py-2 text-left">Valeur</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Affixe de M</td>
                  <td className="px-4 py-2">z = a + bi</td>
                  <td className="px-4 py-2 font-mono">
                    {a.toFixed(1)}
                    {b < 0 ? ' − ' : ' + '}
                    {Math.abs(b).toFixed(1)}i
                  </td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Module |z| = OM</td>
                  <td className="px-4 py-2">√(a² + b²)</td>
                  <td className="px-4 py-2 font-mono">{info.mod.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Argument arg(z)</td>
                  <td className="px-4 py-2">angle (Ox, OM)</td>
                  <td className="px-4 py-2 font-mono">{info.argDeg.toFixed(0)}°</td>
                </tr>
                <tr className="border-t border-night-100 bg-sky-50/40">
                  <td className="px-4 py-2">Conjugué z̄</td>
                  <td className="px-4 py-2">a − bi (symétrie / axe réel)</td>
                  <td className="px-4 py-2 font-mono">
                    {a.toFixed(1)}
                    {b < 0 ? ' + ' : ' − '}
                    {Math.abs(b).toFixed(1)}i
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Re-manipuler
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
              label="Le module de z = a + bi vaut :"
              tone="violet"
              options={[
                { key: 'racine', label: '√(a² + b²)' },
                { key: 'somme', label: 'a + b' },
                { key: 'carre', label: 'a² + b²' },
              ]}
              value={qMod}
              onChange={setQMod}
            />
            <QcmStep
              label="Le conjugué de z = a + bi est :"
              tone="violet"
              options={[
                { key: 'amib', label: 'a − bi' },
                { key: 'mapb', label: '−a + bi' },
                { key: 'mamb', label: '−a − bi' },
              ]}
              value={qConj}
              onChange={setQConj}
            />
            <QcmStep
              label="L'argument de z est :"
              tone="violet"
              options={[
                { key: 'angle', label: "l'angle entre l'axe réel et le vecteur OM" },
                { key: 'long', label: 'la longueur du vecteur OM' },
                { key: 'reel', label: 'la partie réelle a de z' },
              ]}
              value={qArg}
              onChange={setQArg}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qMod || !qConj || !qArg || busy} onClick={handleValidate}>
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
              L&apos;affixe de M est <strong>z = a + bi</strong>. Le module <strong>|z| = √(a²+b²)</strong> est la
              distance <strong>OM</strong> ; l&apos;argument <strong>arg(z)</strong> est l&apos;angle (Ox, OM). Le
              conjugué <strong>z̄ = a − bi</strong> est le symétrique de M par rapport à l&apos;axe réel.
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
    <div className="rounded-xl bg-sky-50 p-2 ring-1 ring-sky-100">
      <div className="text-[10px] uppercase tracking-wider text-sky-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-sky-800">{value}</div>
    </div>
  );
}
