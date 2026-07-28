'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Eye, FlipHorizontal, Gauge, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Miroirs sphériques (Physique-Chimie, Première S, Bac).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → observation →
 * QCM → bilan. Optique réelle : miroir concave = convergent (foyer réel),
 * miroir convexe = divergent (foyer virtuel), f = R/2. Contexte sénégalais :
 * rétroviseur de car rapide, miroir de surveillance, antenne parabolique.
 */

const MirrorScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-blue-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

const R = 4; // rayon de courbure (mêmes unités que la scène) → f = R/2 = 2
type Kind = 'concave' | 'convexe';
type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'concave' | 'convexe' | 'pareil' | null;

const INTRO =
  "À l'avant d'un car rapide de Dakar, le rétroviseur bombé montre tout le boulevard en petit : c'est un miroir convexe. " +
  "Dans une boutique, le grand miroir de surveillance fait pareil pour voir toute l'allée. " +
  "Mais l'antenne parabolique qui capte la télé, elle, est creuse : elle concentre les ondes en un point, son foyer. " +
  "Aujourd'hui tu vas comprendre pourquoi un miroir creux concentre la lumière et un miroir bombé l'étale.";

const CONCLUSION =
  "Bravo ! Un miroir concave (creux) est convergent : il possède un foyer réel devant lui, à la distance f = R/2. " +
  "Avec un objet au-delà du foyer, il donne une image réelle et renversée. " +
  "Un miroir convexe (bombé) est divergent : son foyer est virtuel, derrière le miroir. " +
  "Il donne toujours une image virtuelle, droite et plus petite — d'où son usage dans les rétroviseurs et les miroirs de surveillance.";

function optics(kind: Kind, objDist: number) {
  const f = kind === 'concave' ? R / 2 : -R / 2;
  const di = (objDist * f) / (objDist - f);
  const gamma = -di / objDist;
  return { f, di, gamma, real: di > 0 };
}

export function OptiqueMiroirs1ere({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [k, setK] = useState<Kind>('concave');
  const [objDist, setObjDist] = useState(6); // OA (au-delà de C = R = 4)
  const [seen, setSeen] = useState<Set<Kind>>(new Set(['concave']));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qNature, setQNature] = useState<string | null>(null);
  const [qConvexe, setQConvexe] = useState<string | null>(null);
  const [qFocale, setQFocale] = useState<string | null>(null);

  const cur = useMemo(() => optics(k, objDist), [k, objDist]);

  function pick(x: Kind) {
    setK(x);
    setSeen((p) => new Set(p).add(x));
  }

  const score = useMemo(() => {
    let s = 0;
    s += seen.size * 10; // exploration : 2 miroirs vus → 20
    if (hypo === 'convexe') s += 10; // bonne intuition (le convexe élargit le champ)
    if (qNature === 'convergent') s += 24;
    if (qConvexe === 'vdp') s += 24;
    if (qFocale === 'r2') s += 22;
    return Math.min(100, s);
  }, [seen, hypo, qNature, qConvexe, qFocale]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'optique-miroirs-1ere',
        version: '2.0',
        steps: {
          mirrorsSeen: Array.from(seen),
          objDist,
          hypothesis: hypo,
          qcm: { qNature, qConvexe, qFocale },
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-700 shadow-soft ring-1 ring-blue-100">
                <Eye className="h-5 w-5" />
              </span>
              Le rétroviseur et l&apos;antenne parabolique
            </CardTitle>
            <Badge tone="physique">PC · Première S · Bac</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le rétroviseur bombé d&apos;un car rapide montre tout le boulevard en petit : c&apos;est un miroir{' '}
              <strong>convexe</strong>. L&apos;antenne parabolique, elle, est <strong>creuse</strong> et concentre
              les ondes en un point, son <strong>foyer</strong>.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> comprendre pourquoi un miroir <strong>concave</strong> est convergent et un
              miroir <strong>convexe</strong> divergent, et où se forme l&apos;image (foyer f = R/2).
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
              <Target className="h-5 w-5 text-blue-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : pour voir le plus large possible dans un rétroviseur, quel miroir choisit-on ?
          </p>
          <QcmStep
            label="Mon hypothèse : pour élargir le champ de vision, on utilise un miroir…"
            tone="science"
            options={[
              { key: 'concave', label: 'Concave (creux)' },
              { key: 'convexe', label: 'Convexe (bombé)' },
              { key: 'pareil', label: 'Cela ne change rien' },
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
              <Gauge className="h-5 w-5 text-blue-700" /> Étape 2 — Manipule les rayons
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Bascule entre les deux miroirs et déplace l&apos;objet. Observe les rayons réfléchis et l&apos;image
            formée. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <MirrorScene kind={k} objDist={objDist} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['concave', 'convexe'] as Kind[]).map((x) => (
              <Button key={x} variant={k === x ? 'gradient' : 'outline'} size="sm" onClick={() => pick(x)}>
                <FlipHorizontal className="h-4 w-4" />
                {x === 'concave' ? 'Concave' : 'Convexe'} {seen.has(x) && k !== x ? '✓' : ''}
              </Button>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="od">Distance objet OA</Label>
              <span className="font-mono text-blue-700">{objDist.toFixed(1)} (R = {R})</span>
            </div>
            <input
              id="od"
              type="range"
              min={4.5}
              max={9}
              step={0.5}
              value={objDist}
              onChange={(e) => setObjDist(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Foyer f" value={`${(cur.f >= 0 ? cur.f : -cur.f).toFixed(1)}`} />
            <Stat label="Grandissement γ" value={cur.gamma.toFixed(2)} />
            <Stat label="Image" value={cur.real ? 'réelle' : 'virtuelle'} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-ink/50">
              {k === 'concave'
                ? 'Concave : foyer réel devant le miroir.'
                : 'Convexe : foyer virtuel, derrière le miroir.'}
            </p>
            <Button variant="gradient" disabled={seen.size < 2} onClick={() => setStep('mesures')}>
              {seen.size < 2 ? 'Teste l’autre miroir' : 'Voir mes observations'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes observations</CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare ce que font les deux miroirs sur un même objet réel.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-4 py-2 text-left">Miroir</th>
                  <th className="px-4 py-2 text-left">Nature</th>
                  <th className="px-4 py-2 text-left">Image (objet au-delà de F)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2 font-semibold">Concave (creux)</td>
                  <td className="px-4 py-2">Convergent — foyer réel</td>
                  <td className="px-4 py-2">Réelle, renversée, plus petite</td>
                </tr>
                <tr className="border-t border-night-100 bg-blue-50/40">
                  <td className="px-4 py-2 font-semibold">Convexe (bombé)</td>
                  <td className="px-4 py-2">Divergent — foyer virtuel</td>
                  <td className="px-4 py-2">Virtuelle, droite, plus petite</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
            Dans les deux cas, la distance focale vaut <strong>f = R/2</strong> (la moitié du rayon de courbure).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Remanipuler
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
              label="Un miroir concave est :"
              tone="science"
              options={[
                { key: 'convergent', label: 'Convergent (il concentre la lumière en un foyer réel)' },
                { key: 'divergent', label: 'Divergent (il étale la lumière)' },
                { key: 'sans', label: 'Sans effet sur les rayons' },
              ]}
              value={qNature}
              onChange={setQNature}
            />
            <QcmStep
              label="Un miroir convexe donne d'un objet réel une image :"
              tone="science"
              options={[
                { key: 'vdp', label: 'Virtuelle, droite et plus petite' },
                { key: 'rrp', label: 'Réelle, renversée et plus grande' },
                { key: 'rdg', label: 'Réelle, droite et identique' },
              ]}
              value={qConvexe}
              onChange={setQConvexe}
            />
            <QcmStep
              label="La distance focale d'un miroir sphérique vaut :"
              tone="science"
              options={[
                { key: 'r2', label: 'R/2 (la moitié du rayon de courbure)' },
                { key: '2r', label: '2R (le double du rayon)' },
                { key: 'r', label: 'R (le rayon lui-même)' },
              ]}
              value={qFocale}
              onChange={setQFocale}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qNature || !qConvexe || !qFocale || busy}
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
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Le miroir <strong>concave</strong> est <strong>convergent</strong> (foyer réel devant) : objet au-delà
              du foyer → image réelle et renversée. Le miroir <strong>convexe</strong> est <strong>divergent</strong>{' '}
              (foyer virtuel derrière) : image toujours virtuelle, droite et réduite. Dans les deux cas{' '}
              <strong>f = R/2</strong>.
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
    <div className="rounded-xl bg-blue-50 p-2 ring-1 ring-blue-100">
      <div className="text-[10px] uppercase tracking-wider text-blue-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-blue-800">{value}</div>
    </div>
  );
}
