'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, ClipboardList, Fish, Target, Trees, Waves } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — La mangrove du Delta du Saloum (SVT, 6ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (curseur de marée +
 * témoin « palétuviers coupés ») → relevés comparés → QCM → bilan.
 *
 * Science : marnage réel du Saloum ≈ 1,5 m. Le palétuvier rouge (Rhizophora)
 * se tient dans la vase molle grâce à des racines-échasses en arceaux ; le
 * palétuvier blanc/gris (Avicennia) respire par des pneumatophores verticaux
 * qui doivent sortir de l'eau à marée basse. La mangrove vit en eau saumâtre
 * (≈ 25 g/L de sel, entre l'océan à 35 et le fleuve à 0). Elle sert de
 * nurserie aux juvéniles de poissons et de crevettes, et son lacis de racines
 * freine le courant : la berge recule beaucoup moins vite qu'une berge nue.
 */

const MangroveScene = dynamic(() => import('./mangrove-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-sky-50 via-white to-emerald-50 text-sm text-ink/50">
      Chargement de la mangrove 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'respirer' | 'fleurs' | 'eau-douce' | null;
type RelKey = 'basse' | 'haute' | 'coupe';

/** Marnage du Delta du Saloum, en mètres. */
const MARNAGE = 1.5;
/** Hauteur des pneumatophores d'Avicennia au-dessus de la vase, en mètres. */
const H_PNEUMO = 0.3;
/** Hauteur des arceaux de racines-échasses de Rhizophora, en mètres. */
const H_ECHASSE = 1.2;

const INTRO =
  "À Toubacouta et à Foundiougne, dans le Delta du Saloum, pousse une forêt qui a les pieds dans l'eau salée : " +
  "la mangrove. Ses arbres sont les palétuviers. Deux fois par jour, la marée monte puis redescend d'environ un mètre et demi. " +
  "Les racines sont donc tantôt couvertes d'eau, tantôt à l'air libre. Aujourd'hui tu vas piloter la marée, " +
  "observer comment le palétuvier s'adapte, compter les jeunes poissons abrités entre ses racines, " +
  "et comparer une berge boisée avec une berge dont on a coupé les palétuviers.";

const CONCLUSION =
  "Bravo ! Tu as compris comment vit la mangrove du Saloum. Le palétuvier rouge tient debout dans la vase molle grâce à ses " +
  "racines-échasses en arceaux. Le palétuvier blanc respire par ses pneumatophores : ces pointes doivent sortir de l'eau à marée basse " +
  "pour prendre l'oxygène de l'air. À marée haute, les juvéniles de poissons et de crevettes entrent se cacher entre les racines : " +
  "la mangrove est leur nurserie. Et ce lacis de racines freine le courant : la berge boisée recule dix fois moins vite qu'une berge nue. " +
  "Couper les palétuviers, c'est perdre les poissons, les huîtres, et laisser la mer avancer vers le village.";

type Releve = {
  niveau: number;
  juveniles: number;
  immergees: number;
  pneumoSecs: boolean;
  recul: number;
};

/** Modèle du TP : tout se déduit du niveau de marée et de la présence des palétuviers. */
function mesurer(maree: number, mangrove: boolean): Releve {
  const niveau = (maree / 100) * MARNAGE;
  const immergees = Math.min(100, Math.round((niveau / H_ECHASSE) * 100));
  // Les juvéniles suivent la marée : ils entrent avec le flot et repartent au jusant.
  const juveniles = mangrove
    ? Math.round(4 + 44 * (niveau / MARNAGE))
    : Math.round(1 + 4 * (niveau / MARNAGE));
  return {
    niveau,
    juveniles,
    immergees,
    pneumoSecs: mangrove && niveau < H_PNEUMO,
    recul: mangrove ? 0.3 : 3.2,
  };
}

const REL_LABEL: Record<RelKey, string> = {
  basse: 'Marée basse · mangrove intacte',
  haute: 'Marée haute · mangrove intacte',
  coupe: 'Palétuviers coupés',
};

/** Quel relevé le réglage actuel permet-il d'enregistrer ? */
function relKey(maree: number, mangrove: boolean): RelKey | null {
  if (!mangrove) return 'coupe';
  if (maree <= 15) return 'basse';
  if (maree >= 85) return 'haute';
  return null;
}

export function MangroveSaloum6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [maree, setMaree] = useState(10);
  const [mangrove, setMangrove] = useState(true);
  const [releves, setReleves] = useState<Partial<Record<RelKey, Releve>>>({});

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qRacines, setQRacines] = useState<string | null>(null);
  const [qNurserie, setQNurserie] = useState<string | null>(null);
  const [qCoupe, setQCoupe] = useState<string | null>(null);

  const cur = useMemo(() => mesurer(maree, mangrove), [maree, mangrove]);
  const cible = relKey(maree, mangrove);
  const faits = Object.keys(releves).length;

  function noter() {
    if (!cible) return;
    setReleves((prev) => ({ ...prev, [cible]: cur }));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, faits * 10); // exploration : 3 relevés
    if (hypo === 'respirer') s += 10;
    if (qRacines === 'echasses') s += 20;
    if (qNurserie === 'juveniles') s += 20;
    if (qCoupe === 'recul-poissons') s += 20;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [faits, hypo, qRacines, qNurserie, qCoupe]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'mangrove-saloum-6eme',
        version: '2.0',
        steps: {
          hypothese: hypo,
          releves,
          qcm: { qRacines, qNurserie, qCoupe },
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
                <Trees className="h-5 w-5" />
              </span>
              La mangrove du Delta du Saloum
            </CardTitle>
            <Badge tone="svt">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              À <strong>Toubacouta</strong> et à <strong>Foundiougne</strong>, les bras de mer (les{' '}
              <strong>bolongs</strong>) sont bordés d&apos;une forêt qui a les pieds dans l&apos;eau salée : la{' '}
              <strong>mangrove</strong>. Ses arbres, les <strong>palétuviers</strong>, vivent dans une eau{' '}
              <strong>saumâtre</strong> (≈ 25 g de sel par litre) et dans une vase molle.
            </p>
            <p>
              Deux fois par jour, la <strong>marée</strong> monte puis redescend d&apos;environ{' '}
              <strong>1,5 m</strong> : les racines sont tantôt noyées, tantôt à l&apos;air libre.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> pilote la marée pour comprendre comment le palétuvier respire et se
              tient debout, compte les <strong>juvéniles</strong> abrités entre ses racines, puis mesure le{' '}
              <strong>recul de la berge</strong> avec et sans palétuviers.
            </p>
            <NarrationButton text={INTRO} label="Écouter l'introduction" />
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" onClick={() => setStep('hypo')}>
              Entrer dans la mangrove <ArrowRight className="h-4 w-4" />
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
            Autour du <strong>palétuvier blanc</strong> (Avicennia), des centaines de petites pointes sortent de la
            vase : ce sont les <strong>pneumatophores</strong>. À marée basse elles sont à l&apos;air, à marée haute
            elles sont sous l&apos;eau.
          </p>
          <QcmStep
            label="Mon hypothèse : ces pointes servent à…"
            tone="action"
            options={[
              { key: 'respirer', label: "Prendre l'oxygène de l'air quand la marée est basse (respirer)" },
              { key: 'fleurs', label: 'Porter les fleurs de l’arbre' },
              { key: 'eau-douce', label: 'Fabriquer de l’eau douce à partir de l’eau de mer' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
            hint="Rappelle-toi : la vase est noire, gorgée d’eau salée… il n’y a presque pas d’air dedans."
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier sur le terrain <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waves className="h-5 w-5 text-emerald-700" /> Étape 2 — Pilote la marée
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais monter et descendre la marée, puis coupe les palétuviers pour comparer. Tourne la scène avec ta
            souris ou ton doigt. Tu dois enregistrer <strong>3 relevés</strong>.
          </p>

          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <MangroveScene
                mangrove={mangrove}
                niveau={cur.niveau}
                juveniles={cur.juveniles}
                recul={cur.recul}
                title={mangrove ? 'Berge boisée de palétuviers' : 'Berge coupée pour le bois'}
                subtitle={`Bolong de Toubacouta · marée ${maree} %`}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="maree">Marée (0 = basse mer, 100 = pleine mer)</Label>
                <span className="font-mono text-emerald-700">{cur.niveau.toFixed(2)} m</span>
              </div>
              <input
                id="maree"
                type="range"
                min={0}
                max={100}
                step={5}
                value={maree}
                onChange={(e) => setMaree(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div className="flex items-end">
              <Button variant={mangrove ? 'outline' : 'danger'} size="sm" onClick={() => setMangrove((m) => !m)}>
                <Trees className="h-4 w-4" />
                {mangrove ? 'Couper les palétuviers' : 'Replanter les palétuviers'}
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label="Racines immergées" value={`${cur.immergees} %`} />
            <Stat label="Pneumatophores" value={cur.pneumoSecs ? 'à l’air : O₂' : mangrove ? 'noyés' : 'coupés'} />
            <Stat label="Juvéniles / m²" value={`${cur.juveniles}`} />
            <Stat label="Recul berge" value={`${cur.recul.toFixed(1)} m/an`} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {(['basse', 'haute', 'coupe'] as RelKey[]).map((k) => (
                <Badge key={k} tone={releves[k] ? 'action' : 'neutral'} size="sm">
                  {releves[k] ? '✓ ' : ''}
                  {REL_LABEL[k]}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="soft" size="sm" disabled={!cible} onClick={noter}>
                <ClipboardList className="h-4 w-4" /> Noter ce relevé
              </Button>
              <Button variant="gradient" disabled={faits < 3} onClick={() => setStep('mesures')}>
                {faits < 3 ? `Encore ${3 - faits} relevé(s)` : 'Voir mes relevés'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!cible && (
            <p className="mt-2 text-xs text-ink/50">
              Pour un relevé valable : descends la marée sous 15 %, ou monte-la au-dessus de 85 %, ou coupe les
              palétuviers.
            </p>
          )}
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fish className="h-5 w-5 text-emerald-700" /> Étape 3 — Tes relevés
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare les lignes : que se passe-t-il pour les <strong>juvéniles</strong> quand la marée monte ? Et
            pour la <strong>berge</strong> quand on coupe les palétuviers ?
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                <tr>
                  <th className="px-3 py-2 text-left">Relevé</th>
                  <th className="px-3 py-2 text-left">Eau</th>
                  <th className="px-3 py-2 text-left">Racines noyées</th>
                  <th className="px-3 py-2 text-left">Juvéniles / m²</th>
                  <th className="px-3 py-2 text-left">Recul berge</th>
                </tr>
              </thead>
              <tbody>
                {(['basse', 'haute', 'coupe'] as RelKey[]).map((k) => {
                  const r = releves[k];
                  if (!r) return null;
                  return (
                    <tr key={k} className={'border-t border-night-100 ' + (k === 'coupe' ? 'bg-rose-50' : '')}>
                      <td className="px-3 py-2 font-medium">{REL_LABEL[k]}</td>
                      <td className="px-3 py-2">{r.niveau.toFixed(2)} m</td>
                      <td className="px-3 py-2">{r.immergees} %</td>
                      <td className="px-3 py-2 font-mono font-semibold">{r.juveniles}</td>
                      <td className="px-3 py-2 font-mono">{r.recul.toFixed(1)} m/an</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            Une berge boisée recule d&apos;environ <strong>0,3 m par an</strong> ; la même berge sans palétuviers
            recule d&apos;environ <strong>3,2 m par an</strong>, soit <strong>10 fois plus vite</strong>. C&apos;est
            pourquoi les villages du Saloum <strong>reboisent</strong> la mangrove avec des propagules.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner sur le terrain
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
              label="Le palétuvier rouge (Rhizophora) tient debout dans la vase molle grâce à…"
              tone="action"
              options={[
                { key: 'echasses', label: 'Ses racines-échasses : des arceaux qui plongent dans la vase' },
                { key: 'tronc', label: 'Un tronc très large, comme celui du baobab' },
                { key: 'cailloux', label: 'Des cailloux qu’il accroche à ses branches' },
              ]}
              value={qRacines}
              onChange={setQRacines}
            />
            <QcmStep
              label="Pourquoi dit-on que la mangrove est une « nurserie » ?"
              tone="action"
              options={[
                {
                  key: 'juveniles',
                  label: 'Les juvéniles de poissons et de crevettes s’y cachent des prédateurs et y grandissent',
                },
                { key: 'oeufs', label: 'Les palétuviers pondent des œufs de poissons' },
                { key: 'eau-douce', label: 'Elle transforme l’eau salée en eau douce pour les poissons' },
              ]}
              value={qNurserie}
              onChange={setQNurserie}
            />
            <QcmStep
              label="Que se passe-t-il si on coupe les palétuviers d’une berge du bolong ?"
              tone="action"
              options={[
                {
                  key: 'recul-poissons',
                  label: 'La berge recule beaucoup plus vite (érosion) et il y a bien moins de poissons',
                },
                { key: 'rien', label: 'Rien ne change : la vase reste en place' },
                { key: 'plus', label: 'Il y a davantage de poissons car ils ont plus de place' },
              ]}
              value={qCoupe}
              onChange={setQCoupe}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir mes relevés
            </Button>
            <Button
              variant="success"
              disabled={!qRacines || !qNurserie || !qCoupe || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-svt" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
            <Badge tone="svt">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le <strong>palétuvier rouge</strong> se tient dans la vase grâce à ses{' '}
              <strong>racines-échasses</strong> ; le <strong>palétuvier blanc</strong> respire par ses{' '}
              <strong>pneumatophores</strong>, qui doivent sortir de l&apos;eau à marée basse.
            </p>
            <p>
              À marée haute, les <strong>juvéniles</strong> de poissons et de crevettes entrent se cacher entre les
              racines : la mangrove est leur <strong>nurserie</strong>. Ce lacis de racines freine aussi le courant
              et retient la vase : la berge recule <strong>10 fois moins vite</strong>.
            </p>
            <p>
              Les menaces sont réelles : coupe du bois, <strong>salinisation</strong> (sel de Fatick), barrages qui
              réduisent l&apos;eau douce. D&apos;où le <strong>reboisement communautaire</strong> et le Parc National
              du Delta du Saloum.
            </p>
            <div className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-emerald-100">
              <strong>Ton score :</strong> {Math.min(30, faits * 10)}/30 pour tes relevés ·{' '}
              {hypo === 'respirer' ? 10 : 0}/10 pour ton hypothèse ·{' '}
              {(qRacines === 'echasses' ? 20 : 0) +
                (qNurserie === 'juveniles' ? 20 : 0) +
                (qCoupe === 'recul-poissons' ? 20 : 0)}
              /60 pour le QCM.
            </div>
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
