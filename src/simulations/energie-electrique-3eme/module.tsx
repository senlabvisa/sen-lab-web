'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Gauge, Lightbulb, Receipt, Target, Zap } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Puissance et énergie électrique (Physique-Chimie, 3ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → tableau d'appareils →
 * QCM → bilan. Science juste : P = U·I (watts), E = P·t (kWh). Contexte fort :
 * le compteur prépayé Woyofal de la Senelec, le coût du kWh, la facture.
 */

const MeterScene = dynamic(() => import('./meter-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-amber-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

const TARIF = 100; // F CFA / kWh (tarif Senelec simplifié)
type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'puissance' | 'duree' | 'les-deux' | null;

/** Appareils ménagers courants au Sénégal (tension secteur 220 V, puissances réalistes). */
type Appliance = { key: string; nom: string; emoji: string; p: number; heating: boolean };
const APPLIANCES: Appliance[] = [
  { key: 'lampe', nom: 'Lampe basse conso', emoji: '💡', p: 60, heating: false },
  { key: 'tele', nom: 'Télévision', emoji: '📺', p: 100, heating: false },
  { key: 'fer', nom: 'Fer à repasser', emoji: '🔥', p: 1000, heating: true },
];
const U_SECTEUR = 220; // V (réseau Senelec)

const INTRO =
  "Chez toi, le compteur Woyofal de la Senelec affiche tes kilowattheures. Quand tu recharges, tu achètes de l'énergie qui s'épuise au fil des jours. " +
  "Une lampe consomme peu, un fer à repasser consomme beaucoup : tout dépend de leur puissance. Aujourd'hui tu vas comprendre comment se calculent la puissance d'un appareil et l'énergie qu'il consomme.";

const CONCLUSION =
  "Bravo ! La puissance se calcule par P égale U fois I, en watts. L'énergie consommée dépend à la fois de la puissance ET de la durée : E égale P fois t, comptée en kilowattheures par le compteur Woyofal. " +
  "Plus un appareil est puissant et plus tu le laisses allumé longtemps, plus ta recharge Woyofal s'épuise vite.";

export function EnergieElectrique3eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [u, setU] = useState(220);
  const [i, setI] = useState(0.5);
  const [appliance, setAppliance] = useState<Appliance>(APPLIANCES[0]);
  const [tested, setTested] = useState<Set<string>>(new Set([APPLIANCES[0].key]));
  const [hours, setHours] = useState(2);

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qPuissance, setQPuissance] = useState<string | null>(null);
  const [qEnergie, setQEnergie] = useState<string | null>(null);
  const [qWoyofal, setQWoyofal] = useState<string | null>(null);

  const power = useMemo(() => u * i, [u, i]); // P = U·I (watts)

  function chooseAppliance(a: Appliance) {
    setAppliance(a);
    setU(U_SECTEUR);
    setI(Number((a.p / U_SECTEUR).toFixed(2))); // I = P / U au secteur 220 V
    setTested((prev) => new Set(prev).add(a.key));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, tested.size * 10); // exploration : appareils essayés
    if (hypo === 'les-deux') s += 10;
    if (qPuissance === 'ui') s += 20;
    if (qEnergie === 'les-deux') s += 20;
    if (qWoyofal === 'kwh') s += 20;
    return Math.min(100, s);
  }, [tested, hypo, qPuissance, qEnergie, qWoyofal]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'energie-electrique-3eme',
        version: '2.0',
        steps: {
          appliancesTested: Array.from(tested),
          lastSetting: { u, i, power },
          hypothesis: hypo,
          qcm: { qPuissance, qEnergie, qWoyofal },
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
                <Zap className="h-5 w-5" />
              </span>
              Le compteur Woyofal
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 3ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Chez toi, le compteur <strong>Woyofal</strong> de la Senelec compte l&apos;énergie que tu consommes. Tu
              recharges des crédits, et chaque appareil branché les fait baisser.
            </p>
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-100">
              <strong>Objectif :</strong> découvrir comment se calcule la <strong>puissance</strong> d&apos;un appareil
              (P = U × I, en watts) et l&apos;<strong>énergie</strong> qu&apos;il consomme (E = P × t, en kWh).
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
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : selon toi, l&apos;énergie consommée par un appareil (ce que compte le Woyofal) dépend
            de quoi ?
          </p>
          <QcmStep
            label="Mon hypothèse : l'énergie consommée dépend de…"
            tone="amber"
            options={[
              { key: 'puissance', label: 'Seulement de la puissance de l’appareil' },
              { key: 'duree', label: 'Seulement de la durée d’utilisation' },
              { key: 'les-deux', label: 'De la puissance ET de la durée' },
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
              <Gauge className="h-5 w-5 text-amber-700" /> Étape 2 — Branche un appareil
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Choisis un appareil (sa puissance change), ou règle toi-même la tension U et l&apos;intensité I. Observe le
            courant, la lampe qui s&apos;allume et la puissance P = U × I. Tourne la scène avec ta souris / ton doigt.
          </p>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {APPLIANCES.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => chooseAppliance(a)}
                className={
                  'rounded-xl border p-2 text-center text-xs transition ' +
                  (appliance.key === a.key
                    ? 'border-amber-500 bg-amber-50 font-semibold text-amber-800'
                    : 'border-ink/10 hover:bg-amber-50/50')
                }
              >
                <div className="text-lg">{a.emoji}</div>
                {a.nom}
                <div className="font-mono text-[11px] text-amber-700">{a.p} W</div>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-amber-100">
            <div className="aspect-[4/3] w-full">
              <MeterScene u={u} i={i} heating={appliance.heating} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="u">Tension U</Label>
                <span className="font-mono text-amber-700">{u} V</span>
              </div>
              <input id="u" type="range" min={3} max={240} step={1} value={u} onChange={(e) => setU(Number(e.target.value))} className="slider-lab w-full" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="i">Intensité I</Label>
                <span className="font-mono text-amber-700">{i.toFixed(1)} A</span>
              </div>
              <input id="i" type="range" min={0.1} max={8} step={0.1} value={i} onChange={(e) => setI(Number(e.target.value))} className="slider-lab w-full" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Tension U" value={`${u} V`} />
            <Stat label="Intensité I" value={`${i.toFixed(1)} A`} />
            <Stat label="Puissance P = U×I" value={`${power.toFixed(0)} W`} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              <Lightbulb className="mr-1 inline h-3.5 w-3.5 text-amber-600" />
              Appareils essayés : {tested.size}/3
            </span>
            <Button variant="gradient" disabled={tested.size < 2} onClick={() => setStep('mesures')}>
              {tested.size < 2 ? 'Essaie un autre appareil' : 'Voir la consommation'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-700" /> Étape 3 — Énergie et facture Woyofal
            </CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Sur le secteur 220 V, voici l&apos;énergie consommée par chaque appareil pendant{' '}
            <strong>{hours} h</strong>, et son coût Woyofal ({TARIF} F/kWh). E = P × t.
          </p>

          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="h">Durée d&apos;utilisation t</Label>
              <span className="font-mono text-amber-700">{hours} h</span>
            </div>
            <input id="h" type="range" min={1} max={8} step={1} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="slider-lab w-full" />
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-xs uppercase tracking-wider text-amber-700">
                <tr>
                  <th className="px-3 py-2 text-left">Appareil</th>
                  <th className="px-3 py-2 text-right">P (W)</th>
                  <th className="px-3 py-2 text-right">E = P×t (kWh)</th>
                  <th className="px-3 py-2 text-right">Coût Woyofal</th>
                </tr>
              </thead>
              <tbody>
                {APPLIANCES.map((a) => {
                  const kwh = (a.p * hours) / 1000; // Wh → kWh
                  const cout = kwh * TARIF;
                  const isTested = tested.has(a.key);
                  return (
                    <tr key={a.key} className={'border-t border-night-100 ' + (isTested ? 'bg-emerald-50/60' : '')}>
                      <td className="px-3 py-2">
                        {a.emoji} {a.nom}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{a.p}</td>
                      <td className="px-3 py-2 text-right font-mono">{kwh.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-amber-800">{cout.toFixed(0)} F</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
            Rappel : <strong>1 kWh</strong> = un appareil de <strong>1000 W</strong> allumé pendant <strong>1 h</strong>.
            Le fer (1000 W) épuise donc ton crédit Woyofal bien plus vite que la lampe (60 W).
          </p>

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
              label="La puissance électrique se calcule par :"
              tone="amber"
              options={[
                { key: 'ui', label: 'P = U × I' },
                { key: 'ut', label: 'P = U × t' },
                { key: 'it', label: 'P = I × t' },
              ]}
              value={qPuissance}
              onChange={setQPuissance}
            />
            <QcmStep
              label="L'énergie consommée dépend de :"
              tone="amber"
              options={[
                { key: 'puissance', label: 'La puissance seulement' },
                { key: 'duree', label: 'La durée seulement' },
                { key: 'les-deux', label: 'La puissance ET la durée' },
              ]}
              value={qEnergie}
              onChange={setQEnergie}
            />
            <QcmStep
              label="Le compteur Woyofal compte l'énergie en :"
              tone="amber"
              options={[
                { key: 'w', label: 'Watts (W)' },
                { key: 'kwh', label: 'Kilowattheures (kWh)' },
                { key: 'v', label: 'Volts (V)' },
              ]}
              value={qWoyofal}
              onChange={setQWoyofal}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qPuissance || !qEnergie || !qWoyofal || busy} onClick={handleValidate}>
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
              La puissance s&apos;obtient par <strong>P = U × I</strong> (watts). L&apos;énergie consommée dépend de la
              puissance <em>et</em> de la durée : <strong>E = P × t</strong>, comptée en <strong>kWh</strong> par ton
              compteur Woyofal. Un fer à repasser (1000 W) épuise ton crédit bien plus vite qu&apos;une lampe (60 W).
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
