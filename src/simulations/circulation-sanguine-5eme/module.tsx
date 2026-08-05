'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowRight, CheckCircle2, Droplets, Heart, HelpCircle } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Le cœur et la double circulation sanguine (SVT, 5ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (cœur battant,
 * hématies animées le long des vaisseaux, isolation de la petite / grande
 * circulation) → mesures (débit cardiaque) → QCM → bilan.
 * Physiologie réelle : Q = VES × Fc avec VES ≈ 70 mL.
 * Contexte : un match de navétanes, on prend son pouls avant / après.
 */

const HeartScene = dynamic(() => import('./heart-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-red-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

// La pièce anatomique pèse quelques Mo : elle n'est chargée que si l'élève
// bascule sur « Cœur réel », jamais à l'ouverture du TP.
const CoeurReelScene = dynamic(() => import('./coeur-reel-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-red-50 text-sm text-ink/50">
      Chargement du cœur réel…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Vue = 'schema' | 'reel';
type Focus = 'double' | 'pulmonaire' | 'generale';
type HypoRep = 'augmente' | 'diminue' | 'constante' | null;

const VES_ML = 70; // volume d'éjection systolique, en millilitres
const debitLmin = (bpm: number) => (bpm * VES_ML) / 1000;

const FOCUS_LABEL: Record<Focus, string> = {
  double: 'Les deux circulations',
  pulmonaire: 'Petite circulation (poumons)',
  generale: 'Grande circulation (organes)',
};

const INTRO =
  "Après un match de navétanes, tu poses deux doigts sur ton poignet : ton cœur cogne beaucoup plus vite qu'au repos. " +
  "Ce muscle gros comme ton poing ne s'arrête jamais : il pousse le sang dans deux circuits fermés. " +
  "Un petit circuit va chercher le dioxygène dans les poumons, un grand circuit le distribue à tous les organes. " +
  "Aujourd'hui tu vas suivre le sang dans ces deux circuits et mesurer le débit du cœur.";

const CONCLUSION =
  "Bravo ! Le cœur est une double pompe. Le cœur droit envoie le sang pauvre en dioxygène vers les poumons : c'est la petite circulation. " +
  "Le sang y prend du dioxygène, devient rouge vif et revient au cœur gauche. Le cœur gauche l'envoie ensuite dans tout le corps par l'aorte : c'est la grande circulation. " +
  "Les vaisseaux qui partent du cœur sont les artères, ceux qui y reviennent sont les veines. " +
  "À chaque battement le cœur éjecte environ 70 millilitres de sang : si la fréquence double, le débit double aussi.";

export function CirculationSanguine5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [bpm, setBpm] = useState(70);
  const [vue, setVue] = useState<Vue>('schema');
  const [coupeReel, setCoupeReel] = useState(false);
  const [focus, setFocus] = useState<Focus>('double');
  const [seen, setSeen] = useState<Set<Focus>>(new Set<Focus>(['double']));
  const [measures, setMeasures] = useState<Set<number>>(new Set<number>());

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qVaisseau, setQVaisseau] = useState<string | null>(null);
  const [qPoumons, setQPoumons] = useState<string | null>(null);
  const [qDebit, setQDebit] = useState<string | null>(null);

  const debit = debitLmin(bpm);
  const circuitsOk = seen.has('pulmonaire') && seen.has('generale');
  const manipOk = circuitsOk && measures.size >= 3;

  function pickFocus(f: Focus) {
    setFocus(f);
    setSeen((prev) => new Set(prev).add(f));
    // Isoler une circulation n'a de sens que sur le schéma : c'est lui qui
    // dessine les deux circuits. On y ramène l'élève plutôt que de laisser un
    // bouton sans effet visible.
    setVue('schema');
  }

  function recordMeasure() {
    setMeasures((prev) => new Set(prev).add(bpm));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, measures.size * 7); // mesures enregistrées
    if (seen.has('pulmonaire')) s += 5; // a isolé la petite circulation
    if (seen.has('generale')) s += 5; // a isolé la grande circulation
    if (hypo === 'augmente') s += 10; // hypothèse juste
    if (qVaisseau === 'arteres') s += 20;
    if (qPoumons === 'prend-o2') s += 20;
    if (qDebit === 'double') s += 20;
    return Math.max(0, Math.min(100, s));
  }, [measures, seen, hypo, qVaisseau, qPoumons, qDebit]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'circulation-sanguine-5eme',
        version: '2.0',
        steps: {
          circuitsObserves: Array.from(seen),
          mesures: Array.from(measures)
            .sort((a, b) => a - b)
            .map((f) => ({ bpm: f, debitLmin: Number(debitLmin(f).toFixed(2)) })),
          hypothesis: hypo,
          qcm: { qVaisseau, qPoumons, qDebit },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-red-700 shadow-soft ring-1 ring-red-100">
                <Heart className="h-5 w-5" />
              </span>
              Le cœur et la double circulation
            </CardTitle>
            <Badge tone="svt">SVT · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À la fin du match de <strong>navétanes</strong>, tu poses deux doigts sur ton poignet : ton cœur bat
              beaucoup plus vite. Ce muscle gros comme ton poing pousse le sang dans <strong>deux circuits fermés</strong>.
            </p>
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-900 ring-1 ring-red-100">
              <strong>Objectif :</strong> suivre le trajet du sang dans la <strong>petite circulation</strong> (cœur →
              poumons → cœur) et la <strong>grande circulation</strong> (cœur → organes → cœur), puis mesurer le{' '}
              <strong>débit cardiaque</strong>.
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
              <HelpCircle className="h-5 w-5 text-red-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="svt">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            À chaque battement, le cœur éjecte toujours à peu près la même quantité de sang (environ{' '}
            <strong>70 mL</strong>, un petit verre). Pendant le match, ton cœur passe de 70 à 160 battements par
            minute. Selon toi, la quantité de sang envoyée dans ton corps <strong>chaque minute</strong>…
          </p>
          <QcmStep
            label="Mon hypothèse : quand la fréquence cardiaque augmente, le sang envoyé par minute…"
            tone="action"
            options={[
              { key: 'augmente', label: 'Augmente' },
              { key: 'diminue', label: 'Diminue' },
              { key: 'constante', label: 'Ne change pas' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer le cœur <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-700" /> Étape 2 — Suis le sang
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Regarde les hématies circuler : <strong className="text-blue-700">anneaux bleus</strong> = sang pauvre en
            dioxygène, <strong className="text-red-700">disques rouges pleins</strong> = sang riche en dioxygène. À
            gauche de la scène, le <strong>guide du trajet</strong> te dit à chaque instant où tu en es dans le circuit,
            et le halo t&apos;indique la cavité ou l&apos;organe dont on parle. Isole chaque circulation, fais varier le
            rythme, puis enregistre au moins <strong>3 mesures</strong>. Tourne la scène avec ta souris / ton doigt.
          </p>
          {/* Schéma ↔ pièce réelle : le schéma explique, la pièce fait
              reconnaître. L'élève doit pouvoir passer de l'un à l'autre. */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {(['schema', 'reel'] as Vue[]).map((v) => (
              <Button
                key={v}
                variant={vue === v ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => setVue(v)}
              >
                {v === 'schema' ? 'Schéma animé' : 'Cœur réel'}
              </Button>
            ))}
            {vue === 'reel' && (
              <Button variant={coupeReel ? 'gradient' : 'outline'} size="sm" onClick={() => setCoupeReel((c) => !c)}>
                {coupeReel ? 'Refermer la coupe' : 'Couper le cœur'}
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-red-100">
            <div className="aspect-[4/3] w-full">
              {vue === 'schema' ? (
                <HeartScene bpm={bpm} focus={focus} />
              ) : (
                <CoeurReelScene coupe={coupeReel} />
              )}
            </div>
          </div>

          {vue === 'reel' && (
            <p className="mt-2 rounded-xl bg-red-50 p-3 text-xs text-red-900 ring-1 ring-red-100">
              Voici la pièce anatomique. Retrouve les quatre cavités du schéma :{' '}
              <strong>les mêmes noms sont posés aux mêmes endroits</strong>. Attention, sur un vrai
              cœur, le ventricule gauche est bien plus épais que le droit — c&apos;est lui qui doit
              pousser le sang jusqu&apos;aux pieds.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(['double', 'pulmonaire', 'generale'] as Focus[]).map((f) => (
              <Button key={f} variant={focus === f ? 'gradient' : 'outline'} size="sm" onClick={() => pickFocus(f)}>
                {FOCUS_LABEL[f]} {seen.has(f) && focus !== f ? '✓' : ''}
              </Button>
            ))}
            <Badge tone={circuitsOk ? 'action' : 'neutral'} size="sm">
              {circuitsOk ? '2/2 circulations isolées' : 'Isole les 2 circulations'}
            </Badge>
          </div>

          <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-900 ring-1 ring-red-100">
            Comme sur le schéma de ton manuel, le <strong>cœur droit</strong> est dessiné à gauche de l&apos;image. La{' '}
            <strong>cloison</strong> empêche les deux sangs de se mélanger. Quand le guide suit une circulation,{' '}
            <strong>l&apos;autre devient transparente</strong> : c&apos;est le meilleur moyen de ne plus les confondre.
          </p>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="bpm">Fréquence cardiaque</Label>
              <span className="font-mono text-sm font-semibold text-red-700">{bpm} bpm</span>
            </div>
            <input
              id="bpm"
              type="range"
              min={50}
              max={180}
              step={10}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="slider-lab w-full"
            />
            <div className="mt-1 flex justify-between text-[10px] text-ink/40">
              <span>Sommeil</span>
              <span>Repos</span>
              <span>Marche</span>
              <span>Match</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Fréquence" value={`${bpm} bpm`} />
            <Stat label="Éjecté / battement" value={`${VES_ML} mL`} />
            <Stat label="Débit cardiaque" value={`${debit.toFixed(1)} L/min`} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordMeasure}>
              <Droplets className="h-4 w-4" /> Enregistrer cette mesure ({measures.size}/3)
            </Button>
            <Button variant="gradient" disabled={!manipOk} onClick={() => setStep('mesures')}>
              {!circuitsOk
                ? "Regarde d'abord les 2 circulations"
                : measures.size < 3
                  ? `Encore ${3 - measures.size} mesure(s)`
                  : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes mesures</CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le <strong>débit cardiaque</strong> est le volume de sang envoyé chaque minute :{' '}
            <span className="font-mono">Q = 70 mL × fréquence</span>. Compare tes lignes.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-red-50 text-xs uppercase tracking-wider text-red-700">
                <tr>
                  <th className="px-4 py-2 text-left">Fréquence</th>
                  <th className="px-4 py-2 text-left">Débit cardiaque</th>
                  <th className="px-4 py-2 text-left">Situation</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(measures)
                  .sort((a, b) => a - b)
                  .map((f) => (
                    <tr key={f} className="border-t border-night-100">
                      <td className="px-4 py-2 font-mono">{f} bpm</td>
                      <td className="px-4 py-2 font-mono font-semibold text-red-700">
                        {debitLmin(f).toFixed(1)} L/min
                      </td>
                      <td className="px-4 py-2 text-ink/60">
                        {f <= 60 ? 'Sommeil' : f <= 90 ? 'Repos' : f <= 130 ? 'Marche rapide' : 'Effort intense'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            Quand la fréquence <strong>double</strong>, le débit <strong>double</strong> aussi : les muscles reçoivent
            deux fois plus de dioxygène.{' '}
            {hypo === 'augmente'
              ? 'Ton hypothèse de départ était juste !'
              : 'Ton hypothèse de départ était fausse : le débit augmente bien.'}
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
            <Badge tone="svt">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Comment appelle-t-on les vaisseaux qui PARTENT du cœur ?"
              tone="action"
              options={[
                { key: 'arteres', label: 'Les artères (aorte, artère pulmonaire)' },
                { key: 'veines', label: 'Les veines (veines caves, veines pulmonaires)' },
                { key: 'capillaires', label: 'Les capillaires' },
              ]}
              value={qVaisseau}
              onChange={setQVaisseau}
            />
            <QcmStep
              label="Dans la petite circulation (cœur → poumons → cœur), que se passe-t-il dans les poumons ?"
              tone="action"
              options={[
                { key: 'prend-o2', label: 'Le sang prend du dioxygène et rejette du dioxyde de carbone' },
                { key: 'prend-co2', label: 'Le sang prend du dioxyde de carbone et rejette du dioxygène' },
                { key: 'rien', label: 'Le sang ne change pas, il ne fait que passer' },
              ]}
              value={qPoumons}
              onChange={setQPoumons}
            />
            <QcmStep
              label="Ta fréquence passe de 70 à 140 bpm. Le débit cardiaque…"
              tone="action"
              options={[
                { key: 'double', label: 'Double aussi (de ~4,9 à ~9,8 L/min)' },
                { key: 'constant', label: 'Ne change pas' },
                { key: 'moitie', label: 'Est divisé par deux' },
              ]}
              value={qDebit}
              onChange={setQDebit}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qVaisseau || !qPoumons || !qDebit || busy} onClick={handleValidate}>
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
              Le cœur est une <strong>double pompe</strong>. Le <strong>cœur droit</strong> envoie le sang pauvre en
              dioxygène vers les poumons (<strong>petite circulation</strong>) ; le sang y devient rouge vif et revient
              au <strong>cœur gauche</strong>, qui l&apos;envoie dans tout le corps par l&apos;aorte (
              <strong>grande circulation</strong>).
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-red-100">
              <strong>À retenir :</strong> les <strong>artères</strong> partent du cœur, les <strong>veines</strong> y
              reviennent. Débit cardiaque <span className="font-mono">Q = 70 mL × fréquence</span> ≈ 4,9 L/min au repos,
              plus de 12 L/min à l&apos;effort.
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
    <div className="rounded-xl bg-red-50 p-2 ring-1 ring-red-100">
      <div className="text-[10px] uppercase tracking-wider text-red-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-red-800">{value}</div>
    </div>
  );
}
