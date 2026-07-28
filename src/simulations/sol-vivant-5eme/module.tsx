'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Droplets, Layers, Sprout, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Le sol est vivant (SVT, 5ème).
 *
 * Flow Lab Premium : amorce → hypothèse → coupe de sol 3D (les 4 horizons,
 * décomposition animée de la litière) → test de perméabilité / rétention
 * d'eau sur trois sols du bassin arachidier → QCM → bilan.
 *
 * Contexte : les sols « dior » (sableux) et « deck » (argileux) du Sine-Saloum,
 * la cuirasse de latérite, et l'effet de la jachère / du fumier sur la réserve
 * en eau. Valeurs du test : 100 mL versés sur une colonne de sol, on mesure
 * l'eau recueillie après écoulement complet (rétention = 100 − recueillie) et
 * la durée d'écoulement (indice de perméabilité).
 */

const SoilScene = dynamic(() => import('./soil-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Horizon = 'litiere' | 'humus' | 'mineral' | 'roche';
type SoilKey = 'dior' | 'deck' | 'jachere';
type HypoRep = 'sable' | 'organique' | 'labour' | null;

const HORIZONS: { key: Horizon; icon: string; label: string; text: string }[] = [
  {
    key: 'litiere',
    icon: '🍂',
    label: 'Litière',
    text: "En surface, les feuilles mortes, les tiges de mil et les coques d'arachide s'entassent. Elles ne sont pas encore transformées : on reconnaît encore leur forme.",
  },
  {
    key: 'humus',
    icon: '🪱',
    label: 'Humus',
    text: "Juste en dessous, une couche brun-noir : l'humus. Les vers de terre, les champignons et les bactéries — les décomposeurs — ont transformé la litière en matière organique. C'est la couche la plus fertile.",
  },
  {
    key: 'mineral',
    icon: '⛏️',
    label: 'Horizon minéral',
    text: "Ici, presque plus de matière organique : du sable et de l'argile venus de la roche mère. Sur un sol dior il est très sableux, sur un sol deck il est plus argileux.",
  },
  {
    key: 'roche',
    icon: '🪨',
    label: 'Roche mère',
    text: "Tout en bas, la roche qui, en se cassant en morceaux de plus en plus fins, a donné le sol. Au Sénégal c'est souvent une cuirasse de latérite, rouge à cause du fer.",
  },
];

const SOILS: Record<SoilKey, { name: string; sub: string; percole: number; duree: number; verdict: string }> = {
  dior: {
    name: 'Sol dior',
    sub: 'sableux · plateau de Nioro du Rip',
    percole: 78,
    duree: 20,
    verdict: "L'eau traverse très vite et le sol n'en garde presque pas : les cultures ont soif dès que la pluie s'arrête.",
  },
  deck: {
    name: 'Sol deck',
    sub: 'argileux · bas-fond du Sine-Saloum',
    percole: 52,
    duree: 170,
    verdict: "L'argile garde beaucoup d'eau mais laisse mal passer : en hivernage, l'eau stagne et les racines étouffent.",
  },
  jachere: {
    name: 'Dior + matière organique',
    sub: 'jachère & fumier · région de Kaolack',
    percole: 60,
    duree: 45,
    verdict: "Le meilleur compromis : l'humus fait éponge, le sol garde presque deux fois plus d'eau que le dior nu tout en restant aéré.",
  },
};

const SOIL_KEYS: SoilKey[] = ['dior', 'deck', 'jachere'];

const INTRO =
  "Dans le bassin arachidier, autour de Kaolack et de Nioro du Rip, les paysans distinguent deux terres : le sol dior, sableux et léger, et le sol deck, argileux et lourd des bas-fonds du Sine-Saloum. " +
  "Sous la surface, le sol n'est pas mort : des vers de terre, des champignons et des bactéries transforment sans arrêt les feuilles mortes en humus. " +
  "Aujourd'hui tu vas ouvrir une coupe de sol, reconnaître ses horizons, puis mesurer combien d'eau chaque sol garde après la pluie.";

const CONCLUSION =
  "Bravo ! Un sol se lit en horizons : la litière de feuilles mortes en surface, l'humus sombre juste en dessous, l'horizon minéral fait de sable et d'argile, puis la roche mère, souvent la latérite au Sénégal. " +
  "Ce sont les décomposeurs — vers de terre, champignons et bactéries — qui transforment la litière en humus. " +
  "Et plus un sol contient de matière organique, plus il retient l'eau : c'est pour cela que la jachère et le fumier redonnent de la force aux sols dior du bassin arachidier.";

export function SolVivant5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');

  const [horizon, setHorizon] = useState<Horizon>('litiere');
  const [seen, setSeen] = useState<Set<Horizon>>(new Set<Horizon>(['litiere']));

  const [soil, setSoil] = useState<SoilKey>('dior');
  const [tested, setTested] = useState<Set<SoilKey>>(new Set<SoilKey>());

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qDecomp, setQDecomp] = useState<string | null>(null);
  const [qRetention, setQRetention] = useState<string | null>(null);
  const [qJachere, setQJachere] = useState<string | null>(null);

  const curHorizon = useMemo(() => HORIZONS.find((h) => h.key === horizon) ?? HORIZONS[0], [horizon]);
  const curSoil = SOILS[soil];

  function pickHorizon(h: Horizon) {
    setHorizon(h);
    setSeen((prev) => new Set(prev).add(h));
  }

  function pickSoil(s: SoilKey) {
    setSoil(s);
  }

  function recordMeasure() {
    setTested((prev) => new Set(prev).add(soil));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, seen.size * 5); // exploration des 4 horizons
    s += Math.min(20, tested.size * 7); // mesures enregistrées
    if (hypo === 'organique') s += 10;
    if (qDecomp === 'decomposeurs') s += 20;
    if (qRetention === 'deck') s += 15;
    if (qJachere === 'organique') s += 15;
    return Math.max(0, Math.min(100, s));
  }, [seen, tested, hypo, qDecomp, qRetention, qJachere]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'sol-vivant-5eme',
        version: '2.0',
        steps: {
          horizonsVus: Array.from(seen),
          hypothesis: hypo,
          mesures: Array.from(tested).map((k) => ({
            sol: k,
            eauRecueillieML: SOILS[k].percole,
            eauRetenueML: 100 - SOILS[k].percole,
            dureeEcoulementS: SOILS[k].duree,
          })),
          qcm: { qDecomp, qRetention, qJachere },
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
                <Sprout className="h-5 w-5" />
              </span>
              Le sol est vivant !
            </CardTitle>
            <Badge tone="svt">SVT · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans le <strong>bassin arachidier</strong>, on parle du sol <strong>dior</strong> (sableux) et du sol{' '}
              <strong>deck</strong> (argileux, dans les bas-fonds du Sine-Saloum). Sous tes pieds, ce n&apos;est pas de la
              terre morte : des vers, des champignons et des bactéries y travaillent jour et nuit.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> reconnaître les <strong>4 horizons</strong> d&apos;une coupe de sol, comprendre
              comment la litière devient de l&apos;<strong>humus</strong>, et mesurer combien d&apos;eau chaque sol{' '}
              <strong>retient</strong> après la pluie.
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
            Un paysan de Kaolack cultive un sol <strong>dior</strong> très sableux : l&apos;eau de pluie s&apos;enfonce
            aussitôt et l&apos;arachide souffre. Selon toi, que doit-il faire pour que son sol{' '}
            <strong>garde mieux l&apos;eau</strong> ?
          </p>
          <QcmStep
            label="Pour augmenter la réserve en eau d'un sol dior, il faut…"
            tone="action"
            hint="Pense à ce que la jachère et le fumier apportent au sol."
            options={[
              { key: 'sable', label: 'Ajouter encore du sable' },
              { key: 'organique', label: 'Ajouter de la matière organique (fumier, jachère)' },
              { key: 'labour', label: 'Labourer plus profond, sans rien ajouter' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Ouvrir la coupe de sol <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-700" /> Étape 2 — Lis les horizons du sol
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici une coupe de sol sous une jachère. Tourne-la avec ta souris / ton doigt. Regarde les feuilles mortes :
            elles <strong>descendent, rétrécissent et noircissent</strong> — elles deviennent de l&apos;humus.{' '}
            <strong>Clique sur les 4 horizons</strong> pour les identifier.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <SoilScene
                mode="coupe"
                soil="jachere"
                horizon={horizon}
                title="Coupe de sol"
                subtitle="jachère · bassin arachidier"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {HORIZONS.map((h) => (
              <Button key={h.key} variant={horizon === h.key ? 'gradient' : 'outline'} size="sm" onClick={() => pickHorizon(h.key)}>
                {h.icon} {h.label} {seen.has(h.key) && horizon !== h.key ? '✓' : ''}
              </Button>
            ))}
            <Badge tone={seen.size >= 4 ? 'action' : 'neutral'} size="sm">
              {seen.size}/4 horizons
            </Badge>
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>
              {curHorizon.icon} {curHorizon.label}
            </strong>{' '}
            — {curHorizon.text}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={seen.size < 4} onClick={() => setStep('mesures')}>
              {seen.size < 4 ? `Identifie encore ${4 - seen.size} horizon(s)` : "Passer au test de l'eau"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-emerald-700" /> Étape 3 — Test de rétention d&apos;eau
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Tu verses <strong>100 mL d&apos;eau</strong> sur chaque colonne de sol. L&apos;eau qui traverse est recueillie
            dans l&apos;éprouvette graduée. <strong>Eau retenue = 100 mL − eau recueillie.</strong> Teste au moins deux
            sols et enregistre tes mesures.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <SoilScene
                mode="eau"
                soil={soil}
                title={curSoil.name}
                subtitle={curSoil.sub}
                percole={curSoil.percole}
                duree={curSoil.duree}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SOIL_KEYS.map((k) => (
              <Button key={k} variant={soil === k ? 'gradient' : 'outline'} size="sm" onClick={() => pickSoil(k)}>
                {k === 'dior' ? '🏜️' : k === 'deck' ? '🧱' : '🌿'} {SOILS[k].name} {tested.has(k) && soil !== k ? '✓' : ''}
              </Button>
            ))}
            <Button variant="soft" size="sm" onClick={recordMeasure}>
              Enregistrer la mesure
            </Button>
          </div>
          <div className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-100">
            <strong>{curSoil.name}</strong> — {curSoil.verdict}
          </div>

          {tested.size > 0 && (
            <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-night-100">
              <table className="w-full text-sm">
                <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Sol</th>
                    <th className="px-3 py-2 text-left">Eau recueillie</th>
                    <th className="px-3 py-2 text-left">Eau retenue</th>
                    <th className="px-3 py-2 text-left">Écoulement</th>
                  </tr>
                </thead>
                <tbody>
                  {SOIL_KEYS.filter((k) => tested.has(k)).map((k) => (
                    <tr key={k} className="border-t border-night-100">
                      <td className="px-3 py-2">{SOILS[k].name}</td>
                      <td className="px-3 py-2 font-mono">{SOILS[k].percole} mL</td>
                      <td className="px-3 py-2 font-mono font-semibold text-emerald-700">{100 - SOILS[k].percole} mL</td>
                      <td className="px-3 py-2 font-mono">{SOILS[k].duree} s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep('manip')}>
              Revoir la coupe
            </Button>
            <Button variant="gradient" disabled={tested.size < 2} onClick={() => setStep('qcm')}>
              {tested.size < 2 ? `Enregistre ${2 - tested.size} mesure(s) de plus` : 'Conclure'}
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
              label="Qui transforme les feuilles mortes de la litière en humus ?"
              tone="action"
              options={[
                { key: 'decomposeurs', label: 'Les décomposeurs : vers de terre, champignons et bactéries' },
                { key: 'soleil', label: 'Le soleil, qui sèche les feuilles' },
                { key: 'vent', label: 'Le vent, qui les broie en poussière' },
              ]}
              value={qDecomp}
              onChange={setQDecomp}
            />
            <QcmStep
              label="D'après tes mesures, quel sol retient le plus d'eau (sur 100 mL versés) ?"
              tone="action"
              options={[
                { key: 'dior', label: 'Le sol dior sableux (22 mL retenus)' },
                { key: 'deck', label: 'Le sol deck argileux (48 mL retenus)' },
                { key: 'aucun', label: 'Aucun : les trois retiennent la même quantité' },
              ]}
              value={qRetention}
              onChange={setQRetention}
            />
            <QcmStep
              label="Pourquoi la jachère et le fumier améliorent-ils un sol dior ?"
              tone="action"
              options={[
                { key: 'organique', label: "Ils apportent de la matière organique, qui fait éponge et nourrit le sol" },
                { key: 'sable', label: "Ils ajoutent du sable, qui laisse mieux passer l'eau" },
                { key: 'roche', label: 'Ils remontent la roche mère vers la surface' },
              ]}
              value={qJachere}
              onChange={setQJachere}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes mesures
            </Button>
            <Button variant="success" disabled={!qDecomp || !qRetention || !qJachere || busy} onClick={handleValidate}>
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
              De haut en bas : <strong>litière</strong> → <strong>humus</strong> → <strong>horizon minéral</strong> →{' '}
              <strong>roche mère</strong> (souvent la latérite). Les <strong>décomposeurs</strong> font passer la litière
              à l&apos;humus : le sol est bien un <strong>milieu vivant</strong>.
            </p>
            <p className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              Test de l&apos;eau (100 mL versés) : dior <strong>22 mL</strong> retenus · deck <strong>48 mL</strong> ·
              dior + matière organique <strong>40 mL</strong> tout en restant perméable. C&apos;est l&apos;humus qui donne
              au sol sa réserve en eau et sa fertilité — d&apos;où la jachère et la fumure dans le bassin arachidier.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
