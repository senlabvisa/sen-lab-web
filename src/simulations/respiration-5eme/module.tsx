'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, CheckCircle2, FlaskConical, Sparkles, Wind } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — La respiration ventilatoire (SVT, 5ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (thorax animé,
 * alvéole, test à l'eau de chaux) → mesures (composition de l'air, débit
 * ventilatoire) → QCM → bilan.
 *
 * Objet d'étude : l'appareil respiratoire — mouvements du diaphragme et des
 * côtes, trajet de l'air, échanges gazeux dans les alvéoles, mise en évidence
 * du CO₂ expiré à l'eau de chaux. À NE PAS confondre avec le TP de Première
 * « respiration cellulaire » (mitochondries, glucose → ATP).
 *
 * Contexte sénégalais : l'harmattan et la qualité de l'air à Dakar.
 */

const LungsScene = dynamic(() => import('./lungs-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-pink-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type View = 'thorax' | 'alveole' | 'chaux';
type HypoRep = 'vite-profond' | 'vite-seulement' | 'rien' | null;

const VIEWS: { key: View; label: string; hint: string }[] = [
  { key: 'thorax', label: '🫁 Thorax', hint: 'Comment l’air entre et sort' },
  { key: 'alveole', label: '🔬 Alvéole', hint: 'Où O₂ et CO₂ traversent' },
  { key: 'chaux', label: '🧪 Eau de chaux', hint: 'Preuve du CO₂ expiré' },
];

const INTRO =
  "Pendant l'harmattan, le vent sec venu du Sahara charge l'air de Dakar de fines poussières : on tousse, on respire moins bien. " +
  "Pourtant, jour et nuit, sans y penser, ta cage thoracique se soulève environ quinze fois par minute. " +
  "Dans ce TP, tu vas ouvrir le thorax en trois dimensions pour comprendre comment l'air entre et sort, " +
  "puis descendre jusqu'à l'alvéole pulmonaire, là où le dioxygène passe dans le sang. " +
  "Enfin, tu prouveras avec de l'eau de chaux que l'air que tu rejettes n'est plus le même que celui que tu as pris.";

const CONCLUSION =
  "Bravo ! L'inspiration est un mouvement actif : le diaphragme se contracte et descend, les côtes se soulèvent, " +
  "le volume de la cage thoracique augmente, alors l'air entre. À l'expiration, tout se relâche et l'air sort. " +
  "Dans les alvéoles pulmonaires, le dioxygène passe de l'air vers le sang et le dioxyde de carbone fait le chemin inverse. " +
  "C'est pourquoi l'air expiré contient moins de dioxygène, seize pour cent au lieu de vingt et un, " +
  "et beaucoup plus de dioxyde de carbone, quatre pour cent au lieu de zéro virgule zéro quatre. " +
  "Ce dioxyde de carbone trouble l'eau de chaux. Et quand tu cours, tu respires à la fois plus vite et plus profondément.";

/** Physiologie ventilatoire (valeurs de référence, collège). */
function ventilation(freq: number) {
  const f = Math.max(12, Math.min(40, freq));
  const vc = 0.5 + ((f - 12) / 28) * 1.5; // volume courant (L) : 0,5 L au repos → 2,0 L à l'effort
  const debit = f * vc; // débit ventilatoire (L/min) : ≈ 6 L/min au repos
  const vo2 = debit * 0.05; // O₂ absorbé (L/min) : 21 % inspiré − 16 % expiré
  const vco2 = debit * 0.04; // CO₂ rejeté (L/min) : 4 % expiré − 0,04 % inspiré
  return { vc, debit, vo2, vco2 };
}

export function Respiration5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [freq, setFreq] = useState(14);
  const [view, setView] = useState<View>('thorax');
  const [seen, setSeen] = useState<Set<View>>(new Set<View>(['thorax']));
  const [tested, setTested] = useState(false);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qMeca, setQMeca] = useState<string | null>(null);
  const [qChaux, setQChaux] = useState<string | null>(null);
  const [qLieu, setQLieu] = useState<string | null>(null);

  const v = useMemo(() => ventilation(freq), [freq]);

  function pick(next: View) {
    setView(next);
    setSeen((prev) => new Set(prev).add(next));
  }

  function changeFreq(next: number) {
    setFreq(next);
    setTested(true);
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, seen.size * 10); // exploration des 3 vues
    if (hypo === 'vite-profond') s += 10;
    if (qMeca === 'descend') s += 20;
    if (qChaux === 'co2') s += 20;
    if (qLieu === 'alveoles') s += 20;
    return Math.max(0, Math.min(100, s));
  }, [seen, hypo, qMeca, qChaux, qLieu]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'respiration-5eme',
        version: '2.0',
        steps: {
          views: Array.from(seen),
          frequence: freq,
          volumeCourant: Number(v.vc.toFixed(2)),
          debitVentilatoire: Number(v.debit.toFixed(1)),
          hypothesis: hypo,
          qcm: { qMeca, qChaux, qLieu },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-soft ring-1 ring-emerald-100">
                <Wind className="h-5 w-5" />
              </span>
              Comment l&apos;air entre-t-il dans tes poumons ?
            </CardTitle>
            <Badge tone="svt">SVT · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Pendant l&apos;<strong>harmattan</strong>, le vent sec venu du Sahara charge l&apos;air de Dakar de fines
              poussières : on tousse, on respire mal. Pourtant, jour et nuit, ta <strong>cage thoracique</strong> se
              soulève environ <strong>15 fois par minute</strong>, sans que tu y penses.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> expliquer comment l&apos;air <strong>entre et sort</strong> des poumons
              (diaphragme, côtes), repérer <strong>où</strong> se font les échanges gazeux, et <strong>prouver</strong>{' '}
              que l&apos;air expiré est plus riche en dioxyde de carbone.
            </p>
            <p className="text-xs text-ink/50">
              Ici on étudie la <strong>respiration ventilatoire</strong> : le trajet de l&apos;air dans l&apos;appareil
              respiratoire. Ce qui se passe ensuite à l&apos;intérieur des cellules est un autre TP.
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
              <Sparkles className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tu cours 400 m au stade. Tes muscles réclament beaucoup plus de dioxygène. Selon toi, comment ton corps
            fait-il pour en faire entrer davantage ?
          </p>
          <QcmStep
            label="Pendant l'effort, la respiration devient…"
            tone="action"
            options={[
              { key: 'vite-profond', label: 'Plus rapide ET plus profonde (chaque inspiration prend plus d’air)' },
              { key: 'vite-seulement', label: 'Seulement plus rapide (le volume d’air reste le même)' },
              { key: 'rien', label: 'Identique : le corps prend toujours la même quantité d’air' },
            ]}
            value={hypo}
            onChange={(x) => setHypo(x as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Ouvrir le thorax <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-700" /> Étape 2 — Observe et manipule
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle le <strong>rythme respiratoire</strong>, puis visite les <strong>trois vues</strong> : le thorax en
            mouvement, l&apos;alvéole pulmonaire et le test à l&apos;eau de chaux. Tourne la scène avec ta souris ou
            ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-pink-100">
            <div className="aspect-[4/3] w-full">
              <LungsScene view={view} freq={freq} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {VIEWS.map((x) => (
              <Button key={x.key} variant={view === x.key ? 'gradient' : 'outline'} size="sm" onClick={() => pick(x.key)}>
                {x.label} {seen.has(x.key) && view !== x.key ? '✓' : ''}
              </Button>
            ))}
            <Badge tone={seen.size >= 3 ? 'action' : 'neutral'} size="sm">
              {seen.size}/3 vues observées
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink/50">{VIEWS.find((x) => x.key === view)?.hint}</p>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="freq">Rythme respiratoire</Label>
              <span className="font-mono text-sm font-semibold text-emerald-700">{freq} resp/min</span>
            </div>
            <input
              id="freq"
              type="range"
              min={12}
              max={40}
              step={1}
              value={freq}
              onChange={(e) => changeFreq(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink/40">
              <span>Repos (12)</span>
              <span>Marche (20)</span>
              <span>Course (32)</span>
              <span>Sprint (40)</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="Volume courant" value={`${v.vc.toFixed(2)} L`} />
            <Stat label="Débit ventilatoire" value={`${v.debit.toFixed(1)} L/min`} />
            <Stat label="O₂ absorbé" value={`${v.vo2.toFixed(2)} L/min`} />
            <Stat label="CO₂ rejeté" value={`${v.vco2.toFixed(2)} L/min`} />
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={seen.size < 3 || !tested} onClick={() => setStep('mesures')}>
              {seen.size < 3
                ? `Visite encore ${3 - seen.size} vue(s)`
                : !tested
                  ? 'Fais varier le rythme'
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
              <FlaskConical className="h-5 w-5 text-emerald-700" /> Étape 3 — Tes mesures
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare l&apos;air que tu <strong>inspires</strong> et l&apos;air que tu <strong>expires</strong>. Deux gaz
            seulement changent vraiment.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-4 py-2 text-left">Gaz</th>
                  <th className="px-4 py-2 text-left">Air inspiré</th>
                  <th className="px-4 py-2 text-left">Air expiré</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100 bg-emerald-50/40 font-semibold">
                  <td className="px-4 py-2">Dioxygène O₂</td>
                  <td className="px-4 py-2">21 %</td>
                  <td className="px-4 py-2">16 % ↓</td>
                </tr>
                <tr className="border-t border-night-100 bg-emerald-50/40 font-semibold">
                  <td className="px-4 py-2">Dioxyde de carbone CO₂</td>
                  <td className="px-4 py-2">0,04 %</td>
                  <td className="px-4 py-2">4 % ↑</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Diazote N₂</td>
                  <td className="px-4 py-2">78 %</td>
                  <td className="px-4 py-2">78 % =</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Vapeur d&apos;eau</td>
                  <td className="px-4 py-2">variable</td>
                  <td className="px-4 py-2">saturée ↑</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            À <strong>{freq} resp/min</strong>, tu déplaces <strong>{v.debit.toFixed(1)} L d&apos;air par minute</strong>{' '}
            ({freq} × {v.vc.toFixed(2)} L). Ton corps y prélève <strong>{v.vo2.toFixed(2)} L de O₂</strong> et rejette{' '}
            <strong>{v.vco2.toFixed(2)} L de CO₂</strong> chaque minute.
            <br />
            <span className="text-emerald-800/80">
              Au repos (12 resp/min) le débit n&apos;est que de 6,0 L/min : à l&apos;effort il augmente parce que la
              respiration devient plus <em>rapide</em> et plus <em>profonde</em>.
            </span>
          </div>
          <p className="mt-3 text-sm text-ink/70">
            Ton hypothèse de départ était{' '}
            <strong className={hypo === 'vite-profond' ? 'text-emerald-700' : 'text-alert-700'}>
              {hypo === 'vite-profond' ? 'correcte' : 'à corriger'}
            </strong>{' '}
            : à l&apos;effort la respiration est <strong>plus rapide ET plus profonde</strong>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner au labo
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
              label="Pendant l'inspiration, le diaphragme…"
              tone="action"
              options={[
                { key: 'descend', label: 'Se contracte et s’abaisse : le volume du thorax augmente, l’air entre.' },
                { key: 'monte', label: 'Se relâche et remonte : le volume du thorax augmente quand même.' },
                { key: 'fixe', label: 'Ne bouge pas : seules les côtes travaillent.' },
              ]}
              value={qMeca}
              onChange={setQMeca}
            />
            <QcmStep
              label="L'eau de chaux se trouble avec l'air expiré. Quel gaz met-elle en évidence ?"
              tone="action"
              options={[
                { key: 'co2', label: 'Le dioxyde de carbone CO₂' },
                { key: 'o2', label: 'Le dioxygène O₂' },
                { key: 'n2', label: 'Le diazote N₂' },
              ]}
              value={qChaux}
              onChange={setQChaux}
            />
            <QcmStep
              label="Où l'air et le sang échangent-ils leurs gaz ?"
              tone="action"
              options={[
                { key: 'alveoles', label: 'Dans les alvéoles pulmonaires, à travers une paroi très fine.' },
                { key: 'trachee', label: 'Dans la trachée.' },
                { key: 'nez', label: 'Dans les fosses nasales.' },
              ]}
              value={qLieu}
              onChange={setQLieu}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qMeca || !qChaux || !qLieu || busy} onClick={handleValidate}>
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
              <strong>Inspiration :</strong> le diaphragme se contracte et descend, les côtes se soulèvent → le volume de
              la cage thoracique augmente → l&apos;air entre. <strong>Expiration :</strong> tout se relâche, le volume
              diminue, l&apos;air sort.
            </p>
            <p>
              Dans les <strong>alvéoles pulmonaires</strong>, le <strong>O₂</strong> passe de l&apos;air vers le sang et
              le <strong>CO₂</strong> du sang vers l&apos;air : l&apos;air expiré ne contient plus que 16 % de O₂ mais
              4 % de CO₂ — c&apos;est lui qui <strong>trouble l&apos;eau de chaux</strong>.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              <strong>À ne pas confondre :</strong> ce TP traite de la respiration <strong>ventilatoire</strong>
              (l&apos;appareil respiratoire). L&apos;utilisation du dioxygène à l&apos;intérieur des cellules, dans les
              mitochondries, s&apos;appelle la <strong>respiration cellulaire</strong> : tu l&apos;étudieras au lycée.
            </p>
            <p className="text-xs text-ink/50">
              Score : {Math.min(30, seen.size * 10)}/30 pour l&apos;exploration des 3 vues, {hypo === 'vite-profond' ? 10 : 0}/10
              pour l&apos;hypothèse, {(qMeca === 'descend' ? 20 : 0) + (qChaux === 'co2' ? 20 : 0) + (qLieu === 'alveoles' ? 20 : 0)}/60
              pour le QCM.
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
