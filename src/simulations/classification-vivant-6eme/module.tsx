'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Layers, Microscope, Sparkles } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';
import type { SampleKey } from './scene';

/**
 * TP — Classification du vivant (6ème, SVT).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (loupe binoculaire :
 * 4 indices de terrain rapportés du Niokolo-Koba, grossissement réglable) →
 * mesures (clé de détermination à remplir) → QCM → bilan.
 *
 * Choix pédagogique : on n'observe pas des animaux entiers mais leurs
 * ATTRIBUTS (poil, plume, écaille cornée, rayon de nageoire). C'est ce que
 * l'être vivant POSSÈDE qui décide de son groupe — pas son milieu de vie.
 */

const ClassifScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-emerald-50 text-sm text-ink/50">
      Chargement de la loupe binoculaire 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type GroupKey = 'mammiferes' | 'oiseaux' | 'reptiles' | 'poissons';
type HypoRep = 'attributs' | 'habitat' | 'taille' | null;

const SAMPLES: SampleKey[] = ['poil', 'plume', 'ecaille', 'nageoire'];

const SAMPLE_INFO: Record<SampleKey, { boite: string; origine: string; attribut: string; emoji: string }> = {
  poil: { boite: 'Boîte 1', origine: 'touffe prélevée sur une piste de lion', attribut: 'des poils plantés dans la peau', emoji: '🟤' },
  plume: { boite: 'Boîte 2', origine: 'plume tombée d’un calao à bec rouge', attribut: 'des barbes accrochées à un rachis', emoji: '⚫' },
  ecaille: { boite: 'Boîte 3', origine: 'mue de peau de crocodile du Nil', attribut: 'des écailles cornées imbriquées', emoji: '🟢' },
  nageoire: { boite: 'Boîte 4', origine: 'nageoire d’un capitaine du fleuve Gambie', attribut: 'une membrane tendue sur des rayons', emoji: '🔵' },
};

const GROUP_LABELS: Record<GroupKey, string> = {
  mammiferes: 'Mammifères',
  oiseaux: 'Oiseaux',
  reptiles: 'Reptiles',
  poissons: 'Poissons',
};

const CORRECT_GROUP: Record<SampleKey, GroupKey> = {
  poil: 'mammiferes',
  plume: 'oiseaux',
  ecaille: 'reptiles',
  nageoire: 'poissons',
};

const INTRO =
  "Au Parc National du Niokolo-Koba, à Tambacounda, un garde forestier a ramassé quatre indices sur le terrain : " +
  "une touffe de poils, une plume, un morceau de peau et une nageoire. Il ne sait pas à quels groupes appartiennent ces animaux. " +
  "Au laboratoire, tu vas observer chaque indice à la loupe binoculaire. Attention : en science, on ne classe pas les animaux d'après " +
  "l'endroit où ils vivent, mais d'après ce qu'ils possèdent. Ce que l'on possède s'appelle un attribut.";

const CONCLUSION =
  "Bravo ! Tu as classé les êtres vivants d'après leurs attributs. Des poils et des mamelles : c'est un mammifère. " +
  "Des plumes et un bec : c'est un oiseau. Des écailles cornées sur la peau : c'est un reptile. " +
  "Des nageoires à rayons et des branchies : c'est un poisson. Et tous ces animaux possèdent aussi un squelette avec des vertèbres : " +
  "ils font tous partie du grand groupe des vertébrés. Un groupe peut donc en contenir d'autres.";

export function ClassificationVivant6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [sample, setSample] = useState<SampleKey>('poil');
  const [zoom, setZoom] = useState(10);
  const [observed, setObserved] = useState<Set<SampleKey>>(new Set(['poil']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [groups, setGroups] = useState<Partial<Record<SampleKey, GroupKey>>>({});

  const [qMammifere, setQMammifere] = useState<string | null>(null);
  const [qPoisson, setQPoisson] = useState<string | null>(null);
  const [qEmboite, setQEmboite] = useState<string | null>(null);

  function pick(x: SampleKey) {
    setSample(x);
    setObserved((prev) => new Set(prev).add(x));
  }

  const allClassified = SAMPLES.every((k) => groups[k] !== undefined);
  const correctCount = useMemo(
    () => SAMPLES.filter((k) => groups[k] === CORRECT_GROUP[k]).length,
    [groups],
  );

  const score = useMemo(() => {
    let s = 0;
    s += observed.size * 5; // exploration : 4 indices observés → 20
    if (hypo === 'attributs') s += 10;
    s += correctCount * 10; // clé de détermination → 40
    if (qMammifere === 'mammiferes') s += 10;
    if (qPoisson === 'nageoires') s += 10;
    if (qEmboite === 'vertebres') s += 10;
    return Math.max(0, Math.min(100, s));
  }, [observed, hypo, correctCount, qMammifere, qPoisson, qEmboite]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'classification-vivant-6eme',
        version: '2.0',
        steps: {
          observed: Array.from(observed),
          hypothesis: hypo,
          groups,
          correctCount,
          qcm: { qMammifere, qPoisson, qEmboite },
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
                <Microscope className="h-5 w-5" />
              </span>
              Les indices du Niokolo-Koba
            </CardTitle>
            <Badge tone="svt">SVT · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Un garde du <strong>Parc National du Niokolo-Koba</strong> (Tambacounda) a rapporté au laboratoire{' '}
              <strong>quatre indices</strong> trouvés sur le terrain : des poils, une plume, un morceau de peau et une nageoire.
            </p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <strong>Objectif :</strong> observer chaque indice à la loupe binoculaire, repérer l&apos;<strong>attribut</strong> (ce que
              l&apos;animal possède) et en déduire son <strong>groupe</strong>.
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
            Le lion, le crocodile et le calao vivent tous les trois au Niokolo-Koba. Pourtant on ne les range pas dans le même groupe.
            Selon toi, sur quoi les scientifiques s&apos;appuient-ils pour les classer ?
          </p>
          <QcmStep
            label="Mon hypothèse : pour classer un être vivant, on regarde…"
            tone="action"
            options={[
              { key: 'attributs', label: 'Ce qu’il possède : poils, plumes, écailles, nageoires…' },
              { key: 'habitat', label: 'L’endroit où il vit : la savane, le fleuve, les arbres' },
              { key: 'taille', label: 'Sa taille et son poids' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Aller à la loupe binoculaire <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-emerald-700" /> Étape 2 — Observe les quatre indices
            </CardTitle>
            <Badge tone="svt">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pose une boîte sur la platine, puis <strong>augmente le grossissement</strong> pour voir le détail. Tourne la scène avec ta
            souris ou ton doigt. <strong>Observe les 4 indices.</strong>
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
            <div className="aspect-[4/3] w-full">
              <ClassifScene sample={sample} zoom={zoom} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {SAMPLES.map((k) => (
              <Button key={k} variant={sample === k ? 'gradient' : 'outline'} size="sm" onClick={() => pick(k)}>
                {SAMPLE_INFO[k].emoji} {SAMPLE_INFO[k].boite} {observed.has(k) && sample !== k ? '✓' : ''}
              </Button>
            ))}
            <Badge tone={observed.size >= 4 ? 'action' : 'neutral'} size="sm">
              {observed.size}/4 observés
            </Badge>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="zoom">Grossissement de la loupe</Label>
              <span className="font-mono text-emerald-700">×{zoom}</span>
            </div>
            <input
              id="zoom"
              type="range"
              min={10}
              max={40}
              step={10}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>

          <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <strong>Ce que tu vois dans la {SAMPLE_INFO[sample].boite} :</strong> {SAMPLE_INFO[sample].attribut} — {SAMPLE_INFO[sample].origine}.
          </p>

          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={observed.size < 4} onClick={() => setStep('mesures')}>
              {observed.size < 4 ? `Observe ${4 - observed.size} indice(s) de plus` : 'Remplir ma clé de détermination'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-700" /> Étape 3 — Ta clé de détermination
            </CardTitle>
            <Badge tone="svt">3/4</Badge>
          </CardHeader>
          <p className="mb-4 text-sm text-ink/70">
            Pour chaque attribut observé, choisis le groupe de l&apos;animal.
          </p>
          <div className="space-y-3">
            {SAMPLES.map((k) => (
              <div key={k} className="rounded-xl border border-ink/10 bg-white p-3">
                <div className="mb-2 text-sm">
                  <span className="font-semibold text-ink">{SAMPLE_INFO[k].boite}</span>
                  <span className="text-ink/60"> — j&apos;ai observé {SAMPLE_INFO[k].attribut}.</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(GROUP_LABELS) as GroupKey[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGroups((prev) => ({ ...prev, [k]: g }))}
                      className={
                        'rounded-full px-3 py-1 text-xs font-semibold transition ' +
                        (groups[k] === g
                          ? 'bg-emerald-600 text-white shadow-soft'
                          : 'bg-ink/5 text-ink/70 hover:bg-emerald-50 hover:text-emerald-700')
                      }
                    >
                      {GROUP_LABELS[g]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Revoir les indices
            </Button>
            <Button variant="gradient" disabled={!allClassified} onClick={() => setStep('qcm')}>
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
              label="Un animal qui possède des poils et qui allaite ses petits appartient au groupe des…"
              tone="action"
              options={[
                { key: 'mammiferes', label: 'Mammifères' },
                { key: 'oiseaux', label: 'Oiseaux' },
                { key: 'reptiles', label: 'Reptiles' },
              ]}
              value={qMammifere}
              onChange={setQMammifere}
            />
            <QcmStep
              label="Le crocodile et le capitaine possèdent tous les deux des écailles. Qu'est-ce qui range le capitaine chez les poissons ?"
              tone="action"
              hint="Pense à ce que le poisson possède et que le crocodile n'a pas."
              options={[
                { key: 'nageoires', label: 'Il possède des nageoires à rayons et des branchies' },
                { key: 'ecailles', label: 'Il possède des écailles' },
                { key: 'eau', label: 'Il vit dans le fleuve Gambie' },
              ]}
              value={qPoisson}
              onChange={setQPoisson}
            />
            <QcmStep
              label="Le lion, le calao, le crocodile et le capitaine possèdent tous un squelette avec des vertèbres. Ils appartiennent donc tous au groupe des…"
              tone="action"
              options={[
                { key: 'vertebres', label: 'Vertébrés (un grand groupe qui contient les quatre autres)' },
                { key: 'mammiferes', label: 'Mammifères' },
                { key: 'insectes', label: 'Insectes' },
              ]}
              value={qEmboite}
              onChange={setQEmboite}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir ma clé
            </Button>
            <Button variant="success" disabled={!qMammifere || !qPoisson || !qEmboite || busy} onClick={handleValidate}>
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
              Tu as bien classé <strong>{correctCount}/4</strong> indices. On classe les êtres vivants d&apos;après ce qu&apos;ils{' '}
              <strong>possèdent</strong> (leurs attributs), pas d&apos;après l&apos;endroit où ils vivent.
            </p>
            <div className="overflow-hidden rounded-2xl ring-1 ring-emerald-100">
              <table className="w-full text-sm">
                <thead className="bg-emerald-50 text-xs uppercase tracking-wider text-emerald-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Attribut observé</th>
                    <th className="px-4 py-2 text-left">Groupe</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLES.map((k) => {
                    const ok = groups[k] === CORRECT_GROUP[k];
                    return (
                      <tr key={k} className={'border-t border-emerald-100 ' + (ok ? 'bg-emerald-50/60' : 'bg-amber-50/60')}>
                        <td className="px-4 py-2">{SAMPLE_INFO[k].attribut}</td>
                        <td className="px-4 py-2 font-semibold">
                          {GROUP_LABELS[CORRECT_GROUP[k]]} {ok ? '✓' : '(à revoir)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm">
              Ces quatre animaux possèdent tous un squelette avec des <strong>vertèbres</strong> : ils sont tous des{' '}
              <strong>vertébrés</strong>. Un groupe peut donc en contenir d&apos;autres : ce sont les <strong>groupes emboîtés</strong>.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}
