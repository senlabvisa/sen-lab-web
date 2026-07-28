'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ClipboardList, Ruler, Sun, Thermometer } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { MilieuKind } from './thermometer-scene';

/**
 * TP — Mesurer une température (6ème, Physique-Chimie / mesure).
 *
 * Flow Lab Premium : intro → hypothèse → manipulation 3D (thermomètre à
 * liquide plongé dans 4 milieux, curseur « heure de la journée ») →
 * tableau de mesures (°C et K) → QCM → bilan narré.
 *
 * Contexte : une journée de saison sèche à Tambacounda. L'élève découvre
 * la dilatation du liquide, la lecture correcte, et le palier de fusion de
 * la glace (0 °C) qui sert de point fixe au thermomètre.
 */

const ThermometerScene = dynamic(() => import('./thermometer-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-amber-50 via-white to-orange-50 text-sm text-ink/50">
      Chargement du thermomètre 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'egale' | 'plus' | 'moins' | null;
type Reading = { kind: MilieuKind; hour: number; tempC: number };

const MILIEUX: Array<{ kind: MilieuKind; label: string; short: string; base: number; amp: number }> = [
  { kind: 'glace', label: 'Glace pilée fondante', short: 'Glace', base: 0, amp: 0 },
  { kind: 'canari', label: 'Eau du canari', short: 'Canari', base: 25, amp: 3 },
  { kind: 'ombre', label: "Air à l'ombre (véranda)", short: 'Ombre', base: 24, amp: 16 },
  { kind: 'sable', label: 'Sable en plein soleil', short: 'Sable', base: 26, amp: 29 },
];

/** Courbe journalière : chaud de 6 h à 18 h, maximum vers 14 h. */
function dayFactor(hour: number): number {
  return Math.sin((Math.PI * (Math.min(18, Math.max(6, hour)) - 6)) / 16);
}

function tempOf(kind: MilieuKind, hour: number): number {
  const m = MILIEUX.find((x) => x.kind === kind)!;
  return Math.round((m.base + m.amp * dayFactor(hour)) * 10) / 10;
}

const INTRO_NARRATION =
  "À Tambacounda, en pleine saison sèche, la journée commence fraîche puis devient brûlante. " +
  "Dans la cour, l'eau du canari reste fraîche, alors que le sable du milieu de la cour devient trop chaud pour marcher pieds nus. " +
  "Pour comparer sérieusement, il ne suffit pas de dire « il fait chaud » : il faut mesurer. " +
  "Tu vas apprendre à te servir d'un thermomètre à liquide et relever de vraies températures, en degrés Celsius.";

const CONCLUSION_NARRATION =
  "Bravo ! Tu sais maintenant qu'un thermomètre mesure la température parce que son liquide se dilate quand il est chauffé : il monte dans le tube. " +
  "Pour bien mesurer, on plonge tout le réservoir dans le milieu et on attend que la colonne se stabilise. " +
  "On lit en degrés Celsius. Dans le Système international, on utilise le kelvin : il suffit d'ajouter 273,15. " +
  "Et surtout : tant qu'il reste de la glace, l'eau glacée reste bloquée à zéro degré Celsius. C'est le point fixe du thermomètre.";

export function ThermometreTropical6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [kind, setKind] = useState<MilieuKind>('ombre');
  const [hour, setHour] = useState(14);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qDilat, setQDilat] = useState<string | null>(null);
  const [qLecture, setQLecture] = useState<string | null>(null);
  const [qGlace, setQGlace] = useState<string | null>(null);

  const milieu = useMemo(() => MILIEUX.find((m) => m.kind === kind)!, [kind]);
  const tempC = useMemo(() => tempOf(kind, hour), [kind, hour]);
  const explored = useMemo(() => new Set(readings.map((r) => r.kind)), [readings]);

  function record() {
    setReadings((prev) => {
      if (prev.some((r) => r.kind === kind && r.hour === hour)) return prev;
      return [...prev, { kind, hour, tempC }].slice(-10);
    });
  }

  const score = useMemo(() => {
    let s = Math.min(30, explored.size * 8); // exploration des 4 milieux
    if (hypo === 'plus') s += 10;
    if (qDilat === 'dilate') s += 25;
    if (qLecture === 'bulbe') s += 20;
    if (qGlace === 'zero') s += 15;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [explored, hypo, qDilat, qLecture, qGlace]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'thermometre-tropical-6eme',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          readings,
          milieuxExplored: Array.from(explored),
          qcm: { qDilat, qLecture, qGlace },
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
                <Thermometer className="h-5 w-5" />
              </span>
              Une journée à Tambacounda
            </CardTitle>
            <Badge tone="alert">Physique-Chimie · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              En <strong>saison sèche</strong>, à Tambacounda, la cour est fraîche au petit matin puis
              brûlante l&apos;après-midi. À l&apos;ombre de la véranda on respire ; sur le sable en plein
              soleil, on ne marche plus pieds nus. Et pourtant, l&apos;eau du <strong>canari</strong> (la
              jarre en terre cuite) reste fraîche toute la journée.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> apprendre à mesurer une température avec un thermomètre à
              liquide, puis relever les températures de 4 milieux de la cour au fil de la journée.
              L&apos;unité de lecture est le <strong>degré Celsius (°C)</strong>.
            </p>
            <div className="pt-2">
              <NarrationButton text={INTRO_NARRATION} label="Écouter l'introduction" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypo')}>
              Commencer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'hypo' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-700" />
              Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="alert">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : en début d&apos;après-midi, tu poses le thermomètre sur le sable en
            plein soleil, puis à l&apos;ombre de la véranda.
          </p>
          <QcmStep
            label="Selon toi, la température du sable au soleil sera…"
            tone="amber"
            hint="Réfléchis à ce que tu ressens sous les pieds vers 14 h."
            options={[
              { key: 'egale', label: "La même que celle de l'air à l'ombre" },
              { key: 'plus', label: "Nettement plus élevée que celle de l'air à l'ombre" },
              { key: 'moins', label: "Plus basse que celle de l'air à l'ombre" },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Prendre le thermomètre
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-amber-700" />
              Étape 2 — Mesure les 4 milieux
            </CardTitle>
            <Badge tone="alert">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un milieu : le <strong>réservoir</strong> du thermomètre y est plongé. Attends que la
            colonne se stabilise, lis la valeur, puis clique sur <strong>Relever la mesure</strong>. Fais
            aussi varier l&apos;heure de la journée. Tourne la scène avec ta souris ou ton doigt.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <ThermometerScene temperature={tempC} milieuLabel={milieu.label} milieuKind={kind} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {MILIEUX.map((m) => (
              <button
                key={m.kind}
                type="button"
                onClick={() => setKind(m.kind)}
                className={
                  'rounded-xl border px-3 py-1.5 text-xs font-semibold transition ' +
                  (kind === m.kind
                    ? 'border-amber-600 bg-amber-100 text-amber-900'
                    : explored.has(m.kind)
                      ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                      : 'border-ink/15 bg-white text-ink/70 hover:bg-amber-50')
                }
              >
                {explored.has(m.kind) && kind !== m.kind ? '✓ ' : ''}
                {m.short}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="hour">Heure de la journée</Label>
                <span className="font-mono text-amber-700">{hour} h</span>
              </div>
              <input
                id="hour"
                type="range"
                min={6}
                max={18}
                step={1}
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="slider-lab w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] text-ink/40">
                <span>6 h</span>
                <span>12 h</span>
                <span>18 h</span>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-2 text-center ring-1 ring-amber-100">
              <div className="text-[10px] uppercase tracking-wider text-amber-700/70">Lecture</div>
              <div className="font-mono text-lg font-bold text-amber-800">{tempC.toFixed(1)} °C</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={record}>
              <ClipboardList className="h-4 w-4" /> Relever la mesure
            </Button>
            <div className="flex items-center gap-2">
              <Badge tone={explored.size >= 4 ? 'action' : 'neutral'} size="sm">
                {explored.size}/4 milieux relevés
              </Badge>
              <Button variant="gradient" disabled={explored.size < 4} onClick={() => setStep('mesures')}>
                {explored.size < 4 ? `Relève ${4 - explored.size} milieu(x)` : 'Voir mes mesures'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ton tableau de mesures</CardTitle>
            <Badge tone="alert">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici tes relevés. La 3ᵉ colonne donne la même température en <strong>kelvin (K)</strong>,
            l&apos;unité du Système international : <strong>T = θ + 273,15</strong>.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                <tr>
                  <th className="px-4 py-2 text-left">Milieu</th>
                  <th className="px-4 py-2 text-left">Heure</th>
                  <th className="px-4 py-2 text-left">θ (°C)</th>
                  <th className="px-4 py-2 text-left">T (K)</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r, i) => (
                  <tr key={`${r.kind}-${r.hour}-${i}`} className="border-t border-night-100">
                    <td className="px-4 py-2">{MILIEUX.find((m) => m.kind === r.kind)?.label}</td>
                    <td className="px-4 py-2">{r.hour} h</td>
                    <td className="px-4 py-2 font-mono">{r.tempC.toFixed(1)}</td>
                    <td className="px-4 py-2 font-mono text-ink/60">{(r.tempC + 273.15).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
            <strong>Observe :</strong> quelle que soit l&apos;heure, la glace pilée fondante affiche
            toujours <strong>0 °C</strong>. Tant qu&apos;il reste de la glace, la température ne monte
            pas : toute la chaleur reçue sert à faire fondre la glace. C&apos;est le <strong>point fixe</strong>{' '}
            qui sert à régler les thermomètres.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Reprendre des mesures
            </Button>
            <Button variant="gradient" onClick={() => setStep('qcm')}>
              Conclure
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'qcm' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 4 — Valide ta compréhension</CardTitle>
            <Badge tone="alert">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Quand la température augmente, le liquide coloré du thermomètre…"
              tone="amber"
              options={[
                { key: 'dilate', label: 'Se dilate : il occupe plus de place et monte dans le tube' },
                { key: 'plus', label: "Devient plus abondant : il y a plus de liquide qu'avant" },
                { key: 'air', label: "C'est l'air du tube qui pousse le liquide vers le haut" },
              ]}
              value={qDilat}
              onChange={setQDilat}
            />
            <QcmStep
              label="Pour relever correctement une température, il faut…"
              tone="amber"
              options={[
                { key: 'bulbe', label: 'Plonger tout le réservoir dans le milieu et attendre que la colonne se stabilise' },
                { key: 'vite', label: 'Lire tout de suite, avant que la colonne ait fini de bouger' },
                { key: 'main', label: 'Tenir le réservoir entre ses doigts pendant la mesure' },
              ]}
              value={qLecture}
              onChange={setQLecture}
            />
            <QcmStep
              label="Tu mesures la glace pilée fondante à 8 h, à 14 h puis à 18 h. Que lis-tu ?"
              tone="amber"
              options={[
                { key: 'zero', label: '0 °C à chaque fois, tant qu’il reste de la glace' },
                { key: 'monte', label: "Une température qui monte comme celle de l'air" },
                { key: 'negatif', label: 'Une température de plus en plus froide' },
              ]}
              value={qGlace}
              onChange={setQGlace}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes mesures
            </Button>
            <Button
              variant="success"
              disabled={!qDilat || !qLecture || !qGlace || busy}
              onClick={handleValidate}
            >
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
              TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Un thermomètre à liquide fonctionne par <strong>dilatation</strong> : chauffé, le liquide du
              réservoir occupe plus de place et monte dans le tube gradué. On plonge tout le réservoir,
              on attend la stabilisation, puis on lit en <strong>degrés Celsius (°C)</strong>.
            </p>
            <p>
              Dans la cour de Tambacounda, vers 14 h, le sable au soleil dépasse{' '}
              <strong>{tempOf('sable', 14).toFixed(0)} °C</strong> alors que l&apos;air à l&apos;ombre est
              à <strong>{tempOf('ombre', 14).toFixed(0)} °C</strong> : le soleil chauffe directement le
              sol. L&apos;eau du canari, elle, reste vers{' '}
              <strong>{tempOf('canari', 14).toFixed(0)} °C</strong>, car l&apos;eau qui traverse la terre
              cuite s&apos;évapore et refroidit la jarre.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-amber-100">
              <strong>Pour aller plus loin :</strong> l&apos;unité du Système international est le{' '}
              <strong>kelvin (K)</strong>, avec T = θ + 273,15. La glace fondante (0 °C = 273,15 K) est le
              point fixe qui sert à graduer les thermomètres.
            </p>
            <NarrationButton text={CONCLUSION_NARRATION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
