'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Gauge, Ruler, Sigma, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Racines carrées (Mathématiques, 3ème).
 *
 * Flow Lab Premium : intro → hypothèse → manipulation 3D (slider d'AIRE) →
 * mesures → QCM → bilan. La racine carrée comme côté d'un carré : √a est le
 * nombre positif dont le carré vaut a, donc (√a)² = a. Contexte sénégalais :
 * carreler une cour carrée à Dakar, mesurer un champ du bassin arachidier.
 */

const SquareScene = dynamic(() => import('./square-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = '4' | '6' | '8' | null;

// Aires proposées au slider : carrés parfaits → côté entier, lisible sur la grille.
const AREAS = [1, 4, 9, 16, 25];

const INTRO =
  "À Dakar, un maçon veut carreler une cour carrée. Il connaît l'aire à couvrir, " +
  "par exemple 36 mètres carrés, et il doit retrouver la longueur d'un côté pour commander " +
  "les carreaux. Ce côté, c'est la racine carrée de l'aire : √36 = 6 mètres. " +
  "Aujourd'hui tu vas faire grandir un carré et découvrir que son côté vaut toujours √(son aire).";

const CONCLUSION =
  "Bravo ! La racine carrée √a est le nombre positif dont le carré vaut a, donc (√a)² = a. " +
  "Pour un carré, l'aire vaut côté², donc le côté vaut √aire. " +
  "Et √a × √b = √(ab) : par exemple √9 × √4 = 3 × 2 = 6 = √36.";

export function RacinesCarrees3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [areaIdx, setAreaIdx] = useState(1); // démarre sur a = 4
  const [areasTried, setAreasTried] = useState<Set<number>>(new Set([AREAS[1]]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qCote, setQCote] = useState<string | null>(null);
  const [qCarre, setQCarre] = useState<string | null>(null);
  const [qProduit, setQProduit] = useState<string | null>(null);

  const area = AREAS[areaIdx];
  const side = useMemo(() => Math.sqrt(area), [area]);

  function setArea(idx: number) {
    setAreaIdx(idx);
    setAreasTried((prev) => new Set(prev).add(AREAS[idx]));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, areasTried.size * 6); // exploration : carrés essayés
    if (hypo === '6') s += 10; // hypothèse : √36 = 6
    if (qCote === '7') s += 22;
    if (qCarre === 'a') s += 22;
    if (qProduit === '6') s += 21;
    return Math.min(100, s);
  }, [areasTried, hypo, qCote, qCarre, qProduit]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'racines-carrees-3eme',
        version: '2.0',
        steps: {
          areasTried: Array.from(areasTried),
          hypothesis: hypo,
          qcm: { qCote, qCarre, qProduit },
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
                <Sigma className="h-5 w-5" />
              </span>
              Racine carrée : le côté d&apos;un carré
            </CardTitle>
            <Badge tone="maths">Maths · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À Dakar, un maçon veut <strong>carreler une cour carrée</strong>. Il connaît l&apos;aire à couvrir
              et doit retrouver la longueur d&apos;un <strong>côté</strong> pour commander les carreaux.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Idée clé :</strong> pour un carré, aire = côté². Donc le côté = √aire. La racine carrée
              √a est le nombre positif dont le carré vaut a, et <strong>(√a)² = a</strong>.
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
            Avant de manipuler : une cour carrée a une aire de <strong>36 m²</strong>. Selon toi, combien
            mesure son côté ?
          </p>
          <QcmStep
            label="Mon hypothèse : le côté de la cour mesure…"
            tone="violet"
            options={[
              { key: '4', label: '4 m' },
              { key: '6', label: '6 m' },
              { key: '8', label: '8 m' },
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
              <Gauge className="h-5 w-5 text-violet-700" /> Étape 2 — Fais grandir le carré
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle l&apos;<strong>aire a</strong> avec le curseur. Compte les cases : l&apos;aire est le nombre de
            carreaux. Observe le <strong>côté c = √a</strong> qui s&apos;ajuste. Tourne la scène avec ta souris /
            ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <SquareScene area={area} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="a">Aire a du carré</Label>
              <span className="font-mono text-violet-700">{area} u²</span>
            </div>
            <input
              id="a"
              type="range"
              min={0}
              max={AREAS.length - 1}
              step={1}
              value={areaIdx}
              onChange={(e) => setArea(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <div className="mt-1 flex justify-between px-0.5 font-mono text-[10px] text-ink/40">
              {AREAS.map((a) => (
                <span key={a}>{a}</span>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Aire a" value={`${area} u²`} />
            <Stat label="Côté c = √a" value={`${side.toFixed(0)} u`} />
            <Stat label="(√a)² " value={`${(side * side).toFixed(0)} = a`} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-ink/50">
              <Ruler className="h-3.5 w-3.5" /> {areasTried.size} aire(s) explorée(s)
            </span>
            <Button variant="gradient" disabled={areasTried.size < 3} onClick={() => setStep('mesures')}>
              {areasTried.size < 3 ? `Essaie ${3 - areasTried.size} aire(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour chaque aire, le côté du carré vaut sa racine carrée. Vérifie que (√a)² redonne bien a.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Aire a</th>
                  <th className="px-4 py-2 text-left">Côté c = √a</th>
                  <th className="px-4 py-2 text-left">c² = (√a)²</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(areasTried)
                  .sort((a, b) => a - b)
                  .map((a) => {
                    const c = Math.sqrt(a);
                    return (
                      <tr key={a} className="border-t border-night-100">
                        <td className="px-4 py-2">{a} u²</td>
                        <td className="px-4 py-2 font-mono">{c.toFixed(0)} u</td>
                        <td className="px-4 py-2 font-mono text-emerald-700">{(c * c).toFixed(0)} = a ✓</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Manipuler encore
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
              label="Le côté d'un carré d'aire 49 m² mesure :"
              tone="violet"
              options={[
                { key: '7', label: '7 m' },
                { key: '24.5', label: '24,5 m' },
                { key: '98', label: '98 m' },
              ]}
              value={qCote}
              onChange={setQCote}
            />
            <QcmStep
              label="(√a)² est égal à :"
              tone="violet"
              options={[
                { key: 'a', label: 'a' },
                { key: '2a', label: '2a' },
                { key: 'sqrt', label: '√a' },
              ]}
              value={qCarre}
              onChange={setQCarre}
            />
            <QcmStep
              label="√9 × √4 ="
              tone="violet"
              options={[
                { key: '6', label: '6 (= √36)' },
                { key: '13', label: '13' },
                { key: '36', label: '36' },
              ]}
              value={qProduit}
              onChange={setQProduit}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qCote || !qCarre || !qProduit || busy} onClick={handleValidate}>
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
              La racine carrée <strong>√a</strong> est le nombre positif dont le carré vaut a, donc
              <strong> (√a)² = a</strong>. Pour un carré, le côté vaut <strong>√aire</strong> (côté d&apos;aire 49
              → 7). Et <strong>√a × √b = √(ab)</strong> : √9 × √4 = 6 = √36.
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
