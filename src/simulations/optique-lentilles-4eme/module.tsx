'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Crosshair, Eye, Gauge, Lightbulb } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Optique : lentille convergente mince (Physique-Chimie, 4ème, BFEM).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D (banc d'optique) →
 * observation → QCM → bilan. Science juste : relation de conjugaison
 * 1/OA' − 1/OA = 1/f', tracé des 3 rayons particuliers, image réelle
 * renversée. Contexte : la loupe, les lunettes et l'appareil photo.
 */

const LensScene = dynamic(() => import('./lens-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-blue-50 text-sm text-ink/50">
      Chargement du banc d&apos;optique 3D…
    </div>
  ),
});

const FOCAL = 1.0; // distance focale f' (fixe, en unités banc)
type Step = 'intro' | 'hypo' | 'manip' | 'observe' | 'qcm' | 'done';
type HypoRep = 'droite' | 'renversee' | 'pareil' | null;

const INTRO =
  "Quand ta grand-mère lit le Coran avec une loupe, ou quand tu prends une photo avec ton téléphone, " +
  "une lentille convergente travaille pour toi. Elle fait converger les rayons de lumière en un point. " +
  "Avec un objet placé loin devant elle, elle forme une vraie image, mais renversée : c'est exactement ce qui se passe au fond de ton œil. " +
  "Aujourd'hui tu déplaces l'objet sur le banc d'optique et tu observes comment l'image change.";

const CONCLUSION =
  "Bravo ! Une lentille convergente fait d'un objet réel éloigné une image réelle et renversée. " +
  "Le rayon qui arrive parallèle à l'axe ressort en passant par le foyer image F'. Le rayon qui passe par le centre optique n'est pas dévié. " +
  "Quand l'objet est au-delà de deux fois la distance focale, l'image est plus petite ; entre F' et 2F', elle est plus grande. C'est le principe de l'appareil photo et de ton œil.";

/** Conjugaison : objet à distance p (>0) à gauche, foyer f'. */
function lens(p: number, f: number) {
  // 1/p' + 1/p = 1/f'  ⇒  p' = (p·f') / (p − f')
  const pPrime = (p * f) / (p - f);
  const gamma = -pPrime / p; // grandissement (<0 ⇒ renversée)
  const real = pPrime > 0; // image réelle (de l'autre côté)
  return { pPrime, gamma, real };
}

export function OptiqueLentilles4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [objDist, setObjDist] = useState(3.0); // OA en unités banc (>2f')
  const [posTried, setPosTried] = useState<Set<number>>(new Set([3.0]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qNature, setQNature] = useState<string | null>(null);
  const [qCentre, setQCentre] = useState<string | null>(null);
  const [qFoyer, setQFoyer] = useState<string | null>(null);

  const cur = useMemo(() => lens(objDist, FOCAL), [objDist]);
  const zone = objDist > 2 * FOCAL ? 'plus petite' : 'plus grande';

  function recordPos() {
    setPosTried((prev) => new Set(prev).add(Number(objDist.toFixed(1))));
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(30, posTried.size * 6); // exploration
    if (hypo === 'renversee') s += 10;
    if (qNature === 'reelle-renversee') s += 20;
    if (qCentre === 'non-devie') s += 20;
    if (qFoyer === 'foyer-image') s += 20;
    return Math.min(100, s);
  }, [posTried, hypo, qNature, qCentre, qFoyer]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'optique-lentilles-4eme',
        version: '2.0',
        steps: {
          focal: FOCAL,
          positionsTried: Array.from(posTried),
          hypothesis: hypo,
          qcm: { qNature, qCentre, qFoyer },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-700 shadow-soft ring-1 ring-blue-100">
                <Eye className="h-5 w-5" />
              </span>
              La loupe, l&apos;œil et l&apos;appareil photo
            </CardTitle>
            <Badge tone="science">Physique-Chimie · 4ème · BFEM</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Une <strong>lentille convergente</strong> (loupe, verre de lunettes, objectif d&apos;un téléphone) fait
              converger les rayons de lumière. D&apos;un objet réel éloigné, elle forme une vraie image sur un écran,
              mais <strong>renversée</strong> — comme au fond de ton œil.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> déplacer l&apos;objet sur le banc d&apos;optique et observer comment la taille
              et le sens de l&apos;image changent. Tu traceras les <strong>rayons particuliers</strong>.
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
              <Lightbulb className="h-5 w-5 text-blue-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="science">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : un objet est placé bien <strong>devant</strong> une lentille convergente. Selon toi,
            comment sera l&apos;image obtenue sur un écran de l&apos;autre côté ?
          </p>
          <QcmStep
            label="Mon hypothèse : l'image sera…"
            tone="science"
            options={[
              { key: 'droite', label: 'Droite (dans le même sens que l’objet)' },
              { key: 'renversee', label: 'Renversée (à l’envers, haut/bas inversés)' },
              { key: 'pareil', label: 'Identique, sans aucun changement' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Observer ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-700" /> Étape 2 — Déplace l&apos;objet
            </CardTitle>
            <Badge tone="science">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Éloigne ou rapproche l&apos;objet (la bougie) de la lentille. Suis les rayons particuliers jusqu&apos;à
            l&apos;image. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <LensScene focal={FOCAL} objectDist={objDist} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="o">Distance objet–lentille (OA)</Label>
              <span className="font-mono text-blue-700">{objDist.toFixed(1)} · f&apos; = {FOCAL.toFixed(1)}</span>
            </div>
            <input
              id="o"
              type="range"
              min={1.3}
              max={4.5}
              step={0.1}
              value={objDist}
              onChange={(e) => setObjDist(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Nature" value={cur.real ? 'Réelle' : 'Virtuelle'} />
            <Stat label="Sens" value={cur.gamma < 0 ? 'Renversée' : 'Droite'} />
            <Stat label="Taille" value={zone} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="soft" size="sm" onClick={recordPos}>
              <Crosshair className="h-4 w-4" /> Noter cette position
            </Button>
            <Button variant="gradient" disabled={posTried.size < 3} onClick={() => setStep('observe')}>
              {posTried.size < 3 ? `Teste ${3 - posTried.size} position(s) de plus` : 'Ce que j’observe'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ce que tu observes</CardTitle>
            <Badge tone="science">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour chaque position de l&apos;objet, l&apos;image change. Compare avec la distance focale f&apos; = {FOCAL.toFixed(1)}.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 text-xs uppercase tracking-wider text-blue-700">
                <tr>
                  <th className="px-4 py-2 text-left">Objet (OA)</th>
                  <th className="px-4 py-2 text-left">Nature</th>
                  <th className="px-4 py-2 text-left">Taille de l&apos;image</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(posTried)
                  .sort((a, b) => a - b)
                  .map((p) => {
                    const r = lens(p, FOCAL);
                    const taille = p > 2 * FOCAL ? 'plus petite' : 'plus grande';
                    return (
                      <tr key={p} className="border-t border-night-100">
                        <td className="px-4 py-2">{p.toFixed(1)}</td>
                        <td className="px-4 py-2">{r.real ? 'Réelle, renversée' : 'Virtuelle'}</td>
                        <td className="px-4 py-2">{r.real ? taille : '—'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 ring-1 ring-blue-100">
            Relation de conjugaison : <strong>1/OA&apos; − 1/OA = 1/f&apos;</strong>. Au-delà de 2f&apos;, l&apos;image
            réelle est plus petite ; entre F&apos; et 2f&apos;, elle est plus grande.
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
              label="Une lentille convergente fait d'un objet réel éloigné une image :"
              tone="science"
              options={[
                { key: 'reelle-renversee', label: 'Réelle et renversée' },
                { key: 'droite-agrandie', label: 'Droite et agrandie' },
                { key: 'virtuelle', label: 'Toujours virtuelle' },
              ]}
              value={qNature}
              onChange={setQNature}
            />
            <QcmStep
              label="Le rayon qui passe par le centre optique de la lentille est :"
              tone="science"
              options={[
                { key: 'non-devie', label: 'Non dévié (il continue tout droit)' },
                { key: 'vers-foyer', label: 'Dévié vers le foyer image F’' },
                { key: 'reflechi', label: 'Réfléchi vers l’objet' },
              ]}
              value={qCentre}
              onChange={setQCentre}
            />
            <QcmStep
              label="Le point où convergent les rayons arrivant parallèles à l'axe optique est :"
              tone="science"
              options={[
                { key: 'foyer-image', label: 'Le foyer image F’' },
                { key: 'centre', label: 'Le centre optique O' },
                { key: 'foyer-objet', label: 'Le foyer objet F' },
              ]}
              value={qFoyer}
              onChange={setQFoyer}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qNature || !qCentre || !qFoyer || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Une lentille convergente forme d&apos;un objet réel éloigné une image <strong>réelle et renversée</strong>.
              Rayon parallèle ⇒ passe par <strong>F&apos;</strong> ; rayon par le centre optique ⇒ <strong>non dévié</strong>.
              C&apos;est le principe de l&apos;œil et de l&apos;appareil photo.
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
      <div className="font-mono text-sm font-bold capitalize text-blue-800">{value}</div>
    </div>
  );
}
