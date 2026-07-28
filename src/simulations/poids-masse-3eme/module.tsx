'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Crosshair, Gauge, Globe, Scale, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Poids et masse : la relation P = m·g (Physique-Chimie, 3ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (dynamomètre) →
 * mesures (tableau m / P) → QCM → bilan. Science juste : P en newtons,
 * m en kg, g en N/kg. La masse est invariable, le poids dépend du lieu.
 * Contexte : peser un sac d'arachides au marché.
 */

const ScaleScene = dynamic(() => import('./scale-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type PlaceId = 'terre' | 'dakar' | 'lune';
type HypoRep = 'masse' | 'poids' | 'rien' | null;

const PLACES: Record<PlaceId, { label: string; nom: string; g: number }> = {
  terre: { label: '🌍 Terre', nom: 'la Terre', g: 9.8 },
  dakar: { label: '📍 Dakar', nom: 'Dakar', g: 9.78 },
  lune: { label: '🌙 Lune', nom: 'la Lune', g: 1.6 },
};

const INTRO =
  "Au marché, un commerçant suspend un sac d'arachides à un dynamomètre : le ressort s'allonge et l'aiguille indique une force en newtons. " +
  "Cette force, c'est le poids. La masse, elle, c'est la quantité de matière du sac, en kilogrammes. " +
  "Aujourd'hui tu vas découvrir la relation entre le poids et la masse : P égale m fois g.";

const CONCLUSION =
  "Bravo ! Le poids se calcule par P = m × g. Il s'exprime en newtons et se mesure avec un dynamomètre, qui mesure une force. " +
  "La masse, en kilogrammes, ne change jamais. Mais le poids dépend du lieu, car g change : 9,8 sur Terre, 9,78 à Dakar, seulement 1,6 sur la Lune.";

export function PoidsMasse3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [mass, setMass] = useState(5);
  const [place, setPlace] = useState<PlaceId>('terre');
  const [placesTried, setPlacesTried] = useState<Set<PlaceId>>(new Set(['terre']));
  const [hypo, setHypo] = useState<HypoRep>(null);
  const [rows, setRows] = useState<{ m: number; g: number; nom: string; P: number }[]>([]);

  const [qFormule, setQFormule] = useState<string | null>(null);
  const [qMasse, setQMasse] = useState<string | null>(null);
  const [qUnite, setQUnite] = useState<string | null>(null);

  const g = PLACES[place].g;
  const weight = useMemo(() => mass * g, [mass, g]);

  function pickPlace(p: PlaceId) {
    setPlace(p);
    setPlacesTried((prev) => new Set(prev).add(p));
  }

  function recordMeasure() {
    setRows((prev) => {
      const exists = prev.some((r) => r.m === mass && r.nom === PLACES[place].nom);
      if (exists) return prev;
      return [...prev, { m: mass, g, nom: PLACES[place].nom, P: weight }];
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, placesTried.size * 7); // exploration des lieux
    s += Math.min(10, rows.length * 5); // mesures enregistrées
    if (hypo === 'poids') s += 10;
    if (qFormule === 'mg') s += 20;
    if (qMasse === 'rien') s += 20;
    if (qUnite === 'newton') s += 20;
    return Math.min(100, s);
  }, [placesTried, rows, hypo, qFormule, qMasse, qUnite]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'poids-masse-3eme',
        version: '2.0',
        steps: {
          placesTried: Array.from(placesTried),
          measures: rows,
          hypothesis: hypo,
          qcm: { qFormule, qMasse, qUnite },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-physique" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-soft ring-1 ring-amber-100">
                <Scale className="h-5 w-5" />
              </span>
              Le sac d&apos;arachides au marché
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Au marché, on suspend un sac d&apos;<strong>arachides</strong> à un <strong>dynamomètre</strong> : le
              ressort s&apos;allonge et l&apos;aiguille indique une force en newtons. Cette force, c&apos;est le{' '}
              <strong>poids</strong>.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> découvrir la relation <strong>P = m · g</strong> et comprendre la différence
              entre la <strong>masse</strong> (en kg, invariable) et le <strong>poids</strong> (en newtons, qui dépend du
              lieu).
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
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            On transporte le même sac d&apos;arachides de la Terre vers la Lune. Selon toi, qu&apos;est-ce qui{' '}
            <strong>change</strong> ?
          </p>
          <QcmStep
            label="Mon hypothèse : en allant sur la Lune, ce qui change c'est…"
            tone="amber"
            options={[
              { key: 'masse', label: 'La masse du sac (en kg)' },
              { key: 'poids', label: 'Le poids du sac (en newtons)' },
              { key: 'rien', label: 'Ni la masse, ni le poids' },
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
              <Gauge className="h-5 w-5 text-amber-700" /> Étape 2 — Pèse et change de lieu
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais varier la masse et choisis le lieu. Observe le ressort qui s&apos;allonge et le poids lu. Tourne la
            scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <ScaleScene mass={mass} g={g} place={PLACES[place].nom} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_3fr]">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="m">Masse du sac</Label>
                <span className="font-mono text-amber-700">{mass} kg</span>
              </div>
              <input
                id="m"
                type="range"
                min={1}
                max={20}
                value={mass}
                onChange={(e) => setMass(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div className="flex items-end gap-2">
              {(Object.keys(PLACES) as PlaceId[]).map((p) => (
                <Button
                  key={p}
                  variant={place === p ? 'gradient' : 'outline'}
                  size="sm"
                  onClick={() => pickPlace(p)}
                >
                  {PLACES[p].label}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Masse m" value={`${mass} kg`} />
            <Stat label="Pesanteur g" value={`${g} N/kg`} />
            <Stat label="Poids P = m·g" value={`${weight.toFixed(1)} N`} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordMeasure}>
              <Crosshair className="h-4 w-4" /> Enregistrer cette pesée
            </Button>
            <Button variant="gradient" disabled={placesTried.size < 2} onClick={() => setStep('mesures')}>
              {placesTried.size < 2 ? 'Teste un autre lieu' : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures</CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare tes pesées. À masse égale, le poids change avec le lieu (car g change) : la{' '}
            <strong>masse reste la même</strong>, le <strong>poids varie</strong>.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                <tr>
                  <th className="px-3 py-2 text-left">Lieu</th>
                  <th className="px-3 py-2 text-left">Masse m</th>
                  <th className="px-3 py-2 text-left">g (N/kg)</th>
                  <th className="px-3 py-2 text-left">Poids P = m·g</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-ink/50">
                      Aucune pesée enregistrée — reviens manipuler pour en ajouter.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i} className="border-t border-night-100">
                      <td className="px-3 py-2 capitalize">{r.nom}</td>
                      <td className="px-3 py-2 font-mono">{r.m} kg</td>
                      <td className="px-3 py-2 font-mono">{r.g}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-amber-800">{r.P.toFixed(1)} N</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Repeser
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
            <Badge tone="physique">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Le poids se calcule par :"
              tone="amber"
              options={[
                { key: 'mg', label: 'P = m × g' },
                { key: 'msurg', label: 'P = m ÷ g' },
                { key: 'gsurm', label: 'P = g ÷ m' },
              ]}
              value={qFormule}
              onChange={setQFormule}
            />
            <QcmStep
              label="Sur la Lune, par rapport à la Terre, la masse d'un objet :"
              tone="amber"
              options={[
                { key: 'rien', label: 'Ne change pas' },
                { key: 'baisse', label: 'Diminue' },
                { key: 'nulle', label: 'Devient nulle' },
              ]}
              value={qMasse}
              onChange={setQMasse}
            />
            <QcmStep
              label="Le poids s'exprime en :"
              tone="amber"
              options={[
                { key: 'newton', label: 'Newtons (N)' },
                { key: 'kg', label: 'Kilogrammes (kg)' },
                { key: 'gramme', label: 'Grammes (g)' },
              ]}
              value={qUnite}
              onChange={setQUnite}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qFormule || !qMasse || !qUnite || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-physique">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
            <Badge tone="physique">
              <Globe className="mr-1 inline h-3.5 w-3.5" /> P = m · g
            </Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le <strong>poids</strong> se calcule par <strong>P = m · g</strong> (en newtons). Un{' '}
              <strong>dynamomètre</strong> mesure une force : le poids. La <strong>masse</strong> (en kg) ne change
              jamais, mais le poids dépend du lieu car <strong>g</strong> varie : 9,8 sur Terre, 9,78 à Dakar, 1,6 sur la
              Lune.
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
    <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100">
      <div className="text-[10px] uppercase tracking-wider text-amber-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-amber-800">{value}</div>
    </div>
  );
}
