'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ClipboardList, Sun, Target, Thermometer, Waves } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import { ALBEDO_TERRE, CO2_ACTUEL, CO2_PREINDUSTRIEL, budget, yearForCo2 } from './physics';

/**
 * TP — Effet de serre et bilan radiatif de la Terre (SVT / Géosciences, Terminale).
 *
 * Flow Lab Premium : intro → hypothèse → manipulation 3D (bilan radiatif animé,
 * curseurs CO₂ et albédo) → mesures (tableau des essais + repères) → QCM →
 * bilan. Modèle physique réel (une couche atmosphérique grise, ΔF = 5,35·ln(C/C₀))
 * décrit dans ./physics.ts.
 *
 * Point de vigilance pédagogique : l'effet de serre NATUREL est indispensable
 * à la vie (sans lui ≈ −18 °C) ; c'est son RENFORCEMENT qui pose problème. Et
 * l'effet de serre n'a rien à voir avec le « trou dans la couche d'ozone ».
 */

const ClimatScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-sm text-white/60">
      Chargement du bilan radiatif 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'rien' | 'plus3' | 'plus30' | null;
type Essai = { co2: number; albedo: number; tsC: number; forcing: number };

const INTRO =
  "À Saint-Louis, la mer a déjà emporté des maisons de la Langue de Barbarie. Dans le Saloum, le sel remonte dans les rizières. " +
  "Au Ferlo, le désert avance et la Grande Muraille Verte tente de le freiner. Derrière tout cela, un même mécanisme : le bilan radiatif de la Terre. " +
  "La Terre reçoit l'énergie du Soleil, en renvoie une partie tout de suite, et émet le reste en rayonnement infrarouge. " +
  "Les gaz à effet de serre, comme le dioxyde de carbone, piègent une partie de cet infrarouge et le renvoient vers le sol. " +
  "Sans eux, la température moyenne serait de moins dix-huit degrés : la Terre serait gelée. Aujourd'hui, tu vas régler la quantité de dioxyde de carbone et mesurer la température d'équilibre.";

const CONCLUSION =
  "Bravo ! Retiens le bilan : la Terre absorbe environ deux cent trente-huit watts par mètre carré venus du Soleil, et doit en renvoyer autant vers l'espace. " +
  "Les gaz à effet de serre absorbent l'infrarouge émis par le sol et en renvoient une partie vers la surface : c'est le contre-rayonnement. " +
  "Grâce à lui, la surface est à quatorze degrés au lieu de moins dix-huit. L'effet de serre naturel est donc indispensable à la vie. " +
  "Le problème, c'est son renforcement : le dioxyde de carbone est passé de deux cent quatre-vingts à quatre cent vingt parties par million depuis l'industrialisation. " +
  "Attention à ne pas confondre : l'effet de serre n'est pas le trou dans la couche d'ozone, ce sont deux phénomènes différents. " +
  "Au Sénégal, ce réchauffement se traduit par la montée du niveau marin, l'érosion des côtes, la salinisation des terres et l'avancée du désert.";

const REFERENCES = [
  { co2: 280, note: 'Ère préindustrielle (carottes de glace)' },
  { co2: 420, note: "Aujourd'hui (mesures atmosphériques)" },
  { co2: 560, note: 'Doublement du CO₂ préindustriel' },
  { co2: 800, note: 'Scénario à fortes émissions, vers 2100' },
];

export function ClimatTerminale({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [co2, setCo2] = useState(CO2_PREINDUSTRIEL);
  const [albedo, setAlbedo] = useState(ALBEDO_TERRE);
  const [co2Tried, setCo2Tried] = useState<Set<number>>(new Set([CO2_PREINDUSTRIEL]));
  const [essais, setEssais] = useState<Essai[]>([]);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qNature, setQNature] = useState<string | null>(null);
  const [qNaturel, setQNaturel] = useState<string | null>(null);
  const [qSenegal, setQSenegal] = useState<string | null>(null);

  const b = useMemo(() => budget(co2, albedo), [co2, albedo]);

  function changeCo2(v: number) {
    setCo2(v);
    setCo2Tried((prev) => new Set(prev).add(v));
  }

  function recordEssai() {
    setEssais((prev) => {
      if (prev.some((e) => e.co2 === co2 && Math.abs(e.albedo - albedo) < 1e-6)) return prev;
      return [...prev, { co2, albedo, tsC: b.tsC, forcing: b.forcing }];
    });
  }

  const explorePts = Math.min(20, co2Tried.size * 5);
  const mesurePts = Math.min(10, essais.length * 5);
  const hypoPts = hypo === 'plus3' ? 10 : 0;
  const qcmPts = (qNature === 'gaz' ? 20 : 0) + (qNaturel === 'gel' ? 20 : 0) + (qSenegal === 'mer' ? 20 : 0);

  const score = useMemo(
    () => Math.max(0, Math.min(100, Math.round(explorePts + mesurePts + hypoPts + qcmPts))),
    [explorePts, mesurePts, hypoPts, qcmPts],
  );

  async function handleValidate() {
    await onComplete(
      {
        shell: 'climat-terminale',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          co2Tried: Array.from(co2Tried).sort((x, y) => x - y),
          essais,
          final: { co2, albedo, tsC: Number(b.tsC.toFixed(2)), forcing: Number(b.forcing.toFixed(2)) },
          qcm: { qNature, qNaturel, qSenegal },
        },
      },
      score,
    );
    setStep('done');
  }

  const canContinue = co2Tried.size >= 4 && essais.length >= 2;

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Sun className="h-5 w-5" />
              </span>
              L&apos;effet de serre : le bilan radiatif de la Terre
            </CardTitle>
            <Badge tone="svt">SVT · Terminale · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À <strong>Saint-Louis</strong>, la mer grignote la <strong>Langue de Barbarie</strong>. Dans le{' '}
              <strong>Saloum</strong>, le sel envahit les rizières. Au <strong>Ferlo</strong>, le désert avance et la{' '}
              <strong>Grande Muraille Verte</strong> essaie de le retenir. Un même moteur derrière ces trois scènes : le
              <strong> bilan radiatif</strong> de la planète.
            </p>
            <p>
              La Terre reçoit en moyenne <strong>340 W/m²</strong> du Soleil. Elle en renvoie une partie tout de suite
              (l&apos;<strong>albédo</strong>) et réémet le reste en <strong>infrarouge</strong>. Les gaz à effet de
              serre (CO₂, vapeur d&apos;eau, CH₄) absorbent cet infrarouge et en renvoient une partie vers le sol.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Attention :</strong> l&apos;effet de serre <strong>naturel</strong> est indispensable à la vie —
              sans lui, la surface serait à <strong>−18 °C</strong> au lieu de <strong>+14 °C</strong>. C&apos;est son{' '}
              <strong>renforcement</strong> par nos émissions qui pose problème.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> régler la concentration de CO₂ (de {CO2_PREINDUSTRIEL} ppm, avant
              l&apos;industrialisation, à 800 ppm) et mesurer la <strong>température d&apos;équilibre</strong> au sol.
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
              <Target className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler, fais une prédiction. Tu la vérifieras avec le modèle.
          </p>
          <QcmStep
            label="Si on double le CO₂ (280 → 560 ppm) sans rien changer d'autre, la température d'équilibre au sol…"
            tone="action"
            hint="Pense à l'ordre de grandeur : la Terre reste habitable, mais le climat change."
            options={[
              { key: 'rien', label: 'Ne bouge pas : le CO₂ est un gaz trop rare pour compter.' },
              { key: 'plus3', label: "Augmente d'environ 3 °C." },
              { key: 'plus30', label: "Augmente d'environ 30 °C : la Terre devient invivable tout de suite." },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Ouvrir le bilan radiatif <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-emerald-700" /> Étape 2 — Règle l&apos;atmosphère
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Observe les flèches : leur <strong>épaisseur</strong> est proportionnelle au flux d&apos;énergie en W/m².
            Ajoute du CO₂ : la couche s&apos;opacifie à l&apos;infrarouge, la flèche rouge de{' '}
            <strong>contre-rayonnement</strong> grossit, et la température monte. Tourne la scène avec ta souris ou ton
            doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <ClimatScene co2={co2} albedo={albedo} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="co2">Concentration de CO₂</Label>
                <span className="font-mono text-emerald-700">{co2} ppm (≈ {yearForCo2(co2)})</span>
              </div>
              <input
                id="co2"
                type="range"
                min={280}
                max={800}
                step={10}
                value={co2}
                onChange={(e) => changeCo2(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="alb">Albédo (part réfléchie)</Label>
                <span className="font-mono text-sky-700">{(albedo * 100).toFixed(0)} %</span>
              </div>
              <input
                id="alb"
                type="range"
                min={20}
                max={45}
                step={1}
                value={Math.round(albedo * 100)}
                onChange={(e) => setAlbedo(Number(e.target.value) / 100)}
                className="slider-lab w-full"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="T d'équilibre" value={`${b.tsC.toFixed(1)} °C`} />
            <Stat label="Sans effet de serre" value={`${b.teffC.toFixed(1)} °C`} />
            <Stat label="Forçage du CO₂" value={`${b.forcing >= 0 ? '+' : ''}${b.forcing.toFixed(2)} W/m²`} />
            <Stat label="Contre-rayonnement" value={`${b.back.toFixed(0)} W/m²`} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordEssai}>
              <ClipboardList className="h-4 w-4" /> Enregistrer cette mesure
            </Button>
            <Button variant="gradient" disabled={!canContinue} onClick={() => setStep('mesures')}>
              {co2Tried.size < 4
                ? `Teste ${4 - co2Tried.size} concentration(s) de plus`
                : essais.length < 2
                  ? `Enregistre ${2 - essais.length} mesure(s)`
                  : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-emerald-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare tes essais aux repères réels. Le modèle utilisé est le modèle « à une couche atmosphérique » du
            programme : ΔF = 5,35 × ln(C/C₀) et T d&apos;équilibre donnée par σT⁴.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">CO₂ (ppm)</th>
                  <th className="px-3 py-2 text-left">Albédo</th>
                  <th className="px-3 py-2 text-left">Forçage (W/m²)</th>
                  <th className="px-3 py-2 text-left">T d&apos;équilibre</th>
                  <th className="px-3 py-2 text-left">Écart / 280 ppm</th>
                </tr>
              </thead>
              <tbody>
                {essais.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-ink/50" colSpan={5}>
                      Aucune mesure enregistrée.
                    </td>
                  </tr>
                )}
                {essais.map((e, i) => {
                  const ref = budget(CO2_PREINDUSTRIEL, e.albedo).tsC;
                  return (
                    <tr key={`${e.co2}-${i}`} className="border-t border-night-100">
                      <td className="px-3 py-2 font-mono">{e.co2}</td>
                      <td className="px-3 py-2 font-mono">{(e.albedo * 100).toFixed(0)} %</td>
                      <td className="px-3 py-2 font-mono">
                        {e.forcing >= 0 ? '+' : ''}
                        {e.forcing.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold">{e.tsC.toFixed(1)} °C</td>
                      <td className="px-3 py-2 font-mono">
                        {e.tsC - ref >= 0 ? '+' : ''}
                        {(e.tsC - ref).toFixed(1)} °C
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-xs uppercase tracking-wider text-sky-700">
                <tr>
                  <th className="px-3 py-2 text-left">Repère</th>
                  <th className="px-3 py-2 text-left">CO₂</th>
                  <th className="px-3 py-2 text-left">T d&apos;équilibre (albédo 30 %)</th>
                </tr>
              </thead>
              <tbody>
                {REFERENCES.map((r) => (
                  <tr key={r.co2} className={'border-t border-night-100 ' + (r.co2 === CO2_ACTUEL ? 'bg-amber-50' : '')}>
                    <td className="px-3 py-2">{r.note}</td>
                    <td className="px-3 py-2 font-mono">{r.co2} ppm</td>
                    <td className="px-3 py-2 font-mono font-semibold">{budget(r.co2).tsC.toFixed(1)} °C</td>
                  </tr>
                ))}
                <tr className="border-t border-night-100 bg-slate-50">
                  <td className="px-3 py-2">Aucun gaz à effet de serre</td>
                  <td className="px-3 py-2 font-mono">—</td>
                  <td className="px-3 py-2 font-mono font-semibold text-blue-700">
                    {budget(CO2_PREINDUSTRIEL).teffC.toFixed(1)} °C
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            Entre −18 °C (sans atmosphère absorbante) et +14 °C (à 280 ppm), il y a{' '}
            <strong>+{budget(CO2_PREINDUSTRIEL).greenhouse.toFixed(0)} °C</strong> : c&apos;est l&apos;effet de serre{' '}
            <strong>naturel</strong>, celui qui rend la vie possible. Passer de 280 à {CO2_ACTUEL} ppm ajoute encore{' '}
            <strong>+{(budget(CO2_ACTUEL).tsC - budget(CO2_PREINDUSTRIEL).tsC).toFixed(1)} °C</strong> à
            l&apos;équilibre : c&apos;est l&apos;effet de serre <strong>renforcé</strong>.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner à la scène
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
            <Badge tone="svt">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="L'effet de serre, c'est…"
              tone="action"
              hint="Une seule de ces phrases décrit le mécanisme physique réel."
              options={[
                {
                  key: 'gaz',
                  label:
                    "Des gaz (CO₂, vapeur d'eau, CH₄) qui absorbent le rayonnement infrarouge émis par le sol et en renvoient une partie vers la surface.",
                },
                { key: 'ozone', label: "Le trou dans la couche d'ozone, qui laisse entrer plus de chaleur solaire." },
                { key: 'fumee', label: "La chaleur dégagée directement par les moteurs, les usines et les feux de brousse." },
              ]}
              value={qNature}
              onChange={setQNature}
            />
            <QcmStep
              label="S'il n'y avait AUCUN gaz à effet de serre dans l'atmosphère, la température moyenne au sol serait…"
              tone="action"
              hint="Tu l'as lue dans la scène : c'est la température d'équilibre sans contre-rayonnement."
              options={[
                { key: 'gel', label: "Environ −18 °C : la Terre serait gelée. L'effet de serre naturel est indispensable." },
                { key: 'idem', label: 'La même qu’aujourd’hui, environ +15 °C : les gaz ne changent rien.' },
                { key: 'chaud', label: 'Beaucoup plus chaude, environ +50 °C.' },
              ]}
              value={qNaturel}
              onChange={setQNaturel}
            />
            <QcmStep
              label="Quelle conséquence du réchauffement observe-t-on déjà au Sénégal ?"
              tone="action"
              options={[
                {
                  key: 'mer',
                  label:
                    "La montée du niveau marin et l'érosion de la Langue de Barbarie à Saint-Louis, la salinisation des rizières du Saloum, l'avancée du désert au Ferlo.",
                },
                { key: 'jour', label: 'Les journées deviennent plus longues et les nuits plus courtes.' },
                { key: 'ozone2', label: "Un trou d'ozone s'ouvre au-dessus de Dakar chaque hivernage." },
              ]}
              value={qSenegal}
              onChange={setQSenegal}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes mesures
            </Button>
            <Button variant="success" disabled={!qNature || !qNaturel || !qSenegal || busy} onClick={handleValidate}>
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              <strong>Bilan radiatif :</strong> la Terre absorbe ≈ <strong>238 W/m²</strong> du Soleil (340 reçus − 102
              réfléchis par l&apos;albédo) et doit en renvoyer autant vers l&apos;espace. Le sol émet un rayonnement{' '}
              <strong>infrarouge</strong> ; les gaz à effet de serre l&apos;absorbent et en renvoient une partie vers la
              surface (<strong>contre-rayonnement</strong>). La surface s&apos;équilibre alors plus haut.
            </p>
            <p>
              <strong>Effet de serre naturel ≈ +{budget(CO2_PREINDUSTRIEL).greenhouse.toFixed(0)} °C</strong> :{' '}
              {budget(CO2_PREINDUSTRIEL).teffC.toFixed(0)} °C sans lui, +{budget(CO2_PREINDUSTRIEL).tsC.toFixed(0)} °C
              avec (les manuels retiennent la valeur de référence +33 °C). Il est{' '}
              <strong>indispensable à la vie</strong>. Ce qui pose problème, c&apos;est son{' '}
              <strong>renforcement</strong> : le CO₂ est passé de <strong>{CO2_PREINDUSTRIEL} ppm</strong> (avant 1850)
              à <strong>{CO2_ACTUEL} ppm</strong> aujourd&apos;hui.
            </p>
            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900 ring-1 ring-rose-100">
              <strong>Ne confonds pas :</strong> l&apos;effet de serre (piégeage de l&apos;infrarouge par le CO₂) et le
              trou dans la couche d&apos;ozone (destruction de l&apos;ozone stratosphérique par les CFC, qui laisse
              passer les UV). Ce sont <strong>deux phénomènes différents</strong>.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Au Sénégal :</strong> la mer monte et emporte la <strong>Langue de Barbarie</strong> à
              Saint-Louis ; le sel remonte dans les <strong>rizières du Saloum</strong> et rend les terres stériles ; le
              désert avance sur le <strong>Ferlo</strong>, que la <strong>Grande Muraille Verte</strong> tente de
              stabiliser.
            </p>
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-ink/70 ring-1 ring-night-100">
              Détail du score : exploration {explorePts}/20 · mesures enregistrées {mesurePts}/10 · hypothèse{' '}
              {hypoPts}/10 · QCM {qcmPts}/60.
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
    <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
      <div className="text-[10px] uppercase tracking-wider text-emerald-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-emerald-800">{value}</div>
    </div>
  );
}
