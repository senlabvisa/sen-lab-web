'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Droplets, FlaskConical, Timer, Utensils } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Digestion : du plat au sang (SVT, 5ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (parcours du bol
 * alimentaire dans le tube digestif) → mesures (expérience de digestion
 * enzymatique : amidon + salive vs amidon + eau, révélés à l'eau iodée) →
 * QCM → bilan. Contexte : le riz du thiéboudiène et la bouillie de mil (laax).
 */

const DigestiveScene = dynamic(() => import('./digestive-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-rose-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'salive' | 'eau' | 'deux' | null;

const ORGANES = [
  { name: 'Bouche', role: 'Les dents broient, la salive humidifie et son amylase attaque déjà l’amidon.' },
  { name: 'Œsophage', role: 'Simple couloir : ses muscles poussent le bol par vagues (péristaltisme).' },
  { name: 'Estomac', role: 'Le suc gastrique (acide + pepsine) brasse et transforme le bol en bouillie.' },
  { name: 'Intestin grêle', role: 'Fin de la digestion, puis ABSORPTION : les nutriments passent dans le sang.' },
  { name: 'Gros intestin', role: 'Il récupère l’eau ; ce qui reste forme les selles.' },
];

/** Amidon restant dans le tube « salive » après t minutes à 37 °C (k ≈ 0,15 min⁻¹). */
function starchLeft(minutes: number) {
  return Math.exp(-0.15 * minutes);
}

function verdict(minutes: number) {
  const s = starchLeft(minutes);
  if (s > 0.5) return 'Bleu-noir (amidon présent)';
  if (s > 0.2) return 'Violet pâle (amidon en partie digéré)';
  return 'Jaune-orangé (plus d’amidon)';
}

const INTRO =
  'À midi tu manges du thiéboudiène : du riz, du poisson, des légumes. Le matin, c’est souvent le laax, la bouillie de mil. ' +
  'Le riz et le mil sont pleins d’amidon, une très grosse molécule que ton sang ne peut pas absorber telle quelle. ' +
  'Ton corps doit donc la découper en petits morceaux. Tu vas suivre le voyage du bol alimentaire dans le tube digestif, ' +
  'puis prouver au laboratoire que la salive coupe vraiment l’amidon.';

const CONCLUSION =
  'Bravo ! Les aliments traversent la bouche, l’œsophage, l’estomac, l’intestin grêle puis le gros intestin. ' +
  'Tout au long du trajet, des sucs digestifs contenant des enzymes découpent les gros aliments en nutriments. ' +
  'L’eau iodée l’a prouvé : dans le tube avec la salive, l’amidon a disparu. ' +
  'C’est dans l’intestin grêle que les nutriments traversent la paroi et passent dans le sang. ' +
  'Le gros intestin, lui, récupère surtout l’eau.';

export function Digestion5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  // Étape manipulation 3D
  const [organ, setOrgan] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set([0]));

  // Étape expérience
  const [minutes, setMinutes] = useState(0);
  const [iodine, setIodine] = useState(false);
  const [essais, setEssais] = useState<number[]>([]);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qAbsorption, setQAbsorption] = useState<string | null>(null);
  const [qEnzyme, setQEnzyme] = useState<string | null>(null);
  const [qColon, setQColon] = useState<string | null>(null);

  function visit(i: number) {
    setOrgan(i);
    setSeen((prev) => new Set(prev).add(i));
  }

  function noter() {
    setEssais((prev) => (prev.includes(minutes) ? prev : [...prev, minutes].sort((a, b) => a - b)));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, seen.size * 5); // exploration des 5 organes
    s += Math.min(15, essais.length * 8); // expérience enzymatique menée
    if (hypo === 'salive') s += 10;
    if (qAbsorption === 'grele') s += 20;
    if (qEnzyme === 'amylase') s += 20;
    if (qColon === 'eau') s += 10;
    return Math.max(0, Math.min(100, s));
  }, [seen, essais, hypo, qAbsorption, qEnzyme, qColon]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'digestion-5eme',
        version: '2.0',
        steps: {
          organesVisites: Array.from(seen).map((i) => ORGANES[i].name),
          hypothesis: hypo,
          experience: essais.map((m) => ({ minutes: m, tubeSalive: verdict(m), tubeTemoin: 'Bleu-noir (amidon présent)' })),
          qcm: { qAbsorption, qEnzyme, qColon },
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
                <Utensils className="h-5 w-5" />
              </span>
              Du thiéboudiène au sang
            </CardTitle>
            <Badge tone="svt">SVT · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le riz du <strong>thiéboudiène</strong> et le mil du <strong>laax</strong> sont pleins d&apos;<strong>amidon</strong>. Cette
              molécule est bien trop grosse pour traverser la paroi de ton intestin : ton corps doit d&apos;abord la découper.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> suivre le bol alimentaire dans le tube digestif, repérer <strong>où</strong> les nutriments passent
              dans le sang, et <strong>prouver</strong> que la salive digère l&apos;amidon.
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
              <FlaskConical className="h-5 w-5 text-emerald-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Au labo, tu prépares deux tubes d&apos;empois d&apos;amidon de mil. Dans le premier tu ajoutes de la <strong>salive</strong>, dans le
            second de l&apos;<strong>eau</strong>. Tu les laisses 20 minutes à 37 °C, puis tu verses de l&apos;<strong>eau iodée</strong>.
          </p>
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
            <strong>Rappel :</strong> l&apos;eau iodée devient <strong>bleu-noir</strong> s&apos;il y a de l&apos;amidon, et reste
            <strong> jaune-orangé</strong> s&apos;il n&apos;y en a plus.
          </p>
          <QcmStep
            label="Selon toi, dans quel tube l'eau iodée restera JAUNE-ORANGÉ ?"
            tone="action"
            options={[
              { key: 'salive', label: 'Le tube avec la salive' },
              { key: 'eau', label: 'Le tube avec l’eau' },
              { key: 'deux', label: 'Les deux tubes' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Explorer le tube digestif <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-emerald-700" /> Étape 2 — Suis le bol alimentaire
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Clique sur chaque organe : le bol alimentaire avance et rétrécit, car il est digéré. Tourne l&apos;appareil digestif avec ta souris
            / ton doigt. <strong>Visite les 5 organes.</strong>
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <DigestiveScene view="tube" organ={organ} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ORGANES.map((o, i) => (
              <Button key={o.name} variant={organ === i ? 'gradient' : 'outline'} size="sm" onClick={() => visit(i)}>
                {i + 1}. {o.name} {seen.has(i) && organ !== i ? '✓' : ''}
              </Button>
            ))}
            <Badge tone={seen.size >= 5 ? 'action' : 'neutral'} size="sm">
              {seen.size}/5 visités
            </Badge>
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>{ORGANES[organ].name} —</strong> {ORGANES[organ].role}
          </p>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={seen.size < 5} onClick={() => setStep('mesures')}>
              {seen.size < 5 ? `Visite encore ${5 - seen.size} organe(s)` : 'Passer à l’expérience'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-emerald-700" /> Étape 3 — Prouve-le au laboratoire
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Règle la durée d&apos;incubation à 37 °C (la température du corps), puis verse l&apos;<strong>eau iodée</strong> et observe la
            couleur des deux tubes. Enregistre au moins <strong>deux</strong> essais.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <DigestiveScene view="enzyme" minutes={minutes} iodine={iodine} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="dur">Durée d&apos;incubation à 37 °C</Label>
              <span className="font-mono text-emerald-700">{minutes} min</span>
            </div>
            <input
              id="dur"
              type="range"
              min={0}
              max={30}
              step={5}
              value={minutes}
              onChange={(e) => {
                setMinutes(Number(e.target.value));
                setIodine(false);
              }}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant={iodine ? 'outline' : 'gradient'} size="sm" onClick={() => setIodine(true)} disabled={iodine}>
              <Droplets className="h-4 w-4" /> Verser l&apos;eau iodée
            </Button>
            <Button variant="soft" size="sm" onClick={noter} disabled={!iodine}>
              <Timer className="h-4 w-4" /> Noter ce résultat
            </Button>
            <Badge tone={essais.length >= 2 ? 'action' : 'neutral'} size="sm">
              {essais.length} essai(s) noté(s)
            </Badge>
          </div>

          {essais.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-night-100">
              <table className="w-full text-sm">
                <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Durée</th>
                    <th className="px-3 py-2 text-left">Tube « amidon + salive »</th>
                    <th className="px-3 py-2 text-left">Tube témoin « amidon + eau »</th>
                  </tr>
                </thead>
                <tbody>
                  {essais.map((m) => (
                    <tr key={m} className={'border-t border-night-100 ' + (starchLeft(m) < 0.2 ? 'bg-emerald-50 font-semibold' : '')}>
                      <td className="px-3 py-2">{m} min</td>
                      <td className="px-3 py-2">{verdict(m)}</td>
                      <td className="px-3 py-2">Bleu-noir (amidon présent)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir le trajet
            </Button>
            <Button variant="gradient" disabled={essais.length < 2} onClick={() => setStep('qcm')}>
              {essais.length < 2 ? `Note ${2 - essais.length} essai(s) de plus` : 'Conclure'}
              <ArrowRight className="h-4 w-4" />
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
              label="Dans quel organe les nutriments passent-ils dans le sang ?"
              tone="action"
              hint="Souviens-toi de l'organe le plus long, replié en anses."
              options={[
                { key: 'grele', label: 'L’intestin grêle, à travers sa paroi très fine' },
                { key: 'estomac', label: 'L’estomac' },
                { key: 'colon', label: 'Le gros intestin' },
              ]}
              value={qAbsorption}
              onChange={setQAbsorption}
            />
            <QcmStep
              label="Dans le tube « amidon + salive », l'eau iodée reste jaune-orangé. Pourquoi ?"
              tone="action"
              options={[
                { key: 'amylase', label: 'Une enzyme de la salive (l’amylase) a découpé l’amidon en sucres simples' },
                { key: 'dilution', label: 'La salive a simplement dilué l’amidon' },
                { key: 'iode', label: 'L’eau iodée ne marche pas avec la salive' },
              ]}
              value={qEnzyme}
              onChange={setQEnzyme}
            />
            <QcmStep
              label="À quoi sert surtout le gros intestin ?"
              tone="action"
              options={[
                { key: 'eau', label: 'À récupérer l’eau et à former les selles' },
                { key: 'broyer', label: 'À broyer les aliments' },
                { key: 'suc', label: 'À fabriquer le suc gastrique' },
              ]}
              value={qColon}
              onChange={setQColon}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes essais
            </Button>
            <Button variant="success" disabled={!qAbsorption || !qEnzyme || !qColon || busy} onClick={handleValidate}>
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
              Trajet : <strong>bouche → œsophage → estomac → intestin grêle → gros intestin</strong>. Des <strong>enzymes</strong> contenues
              dans les sucs digestifs découpent les gros aliments en <strong>nutriments</strong>. Ton expérience l&apos;a prouvé : avec la
              salive, l&apos;amidon disparaît (l&apos;eau iodée ne bleuit plus). L&apos;<strong>absorption</strong> a lieu dans l&apos;
              <strong>intestin grêle</strong> ; le <strong>gros intestin</strong> récupère l&apos;eau.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Ton score :</strong> {Math.min(25, seen.size * 5)}/25 pour l&apos;exploration des organes,{' '}
              {Math.min(15, essais.length * 8)}/15 pour l&apos;expérience, {hypo === 'salive' ? 10 : 0}/10 pour l&apos;hypothèse, et{' '}
              {(qAbsorption === 'grele' ? 20 : 0) + (qEnzyme === 'amylase' ? 20 : 0) + (qColon === 'eau' ? 10 : 0)}/50 au QCM.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
