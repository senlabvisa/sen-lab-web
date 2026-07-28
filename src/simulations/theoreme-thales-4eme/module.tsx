'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Move, Ruler, Sparkles, Sun, Triangle } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Théorème de Thalès (Mathématiques, 4ème).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → observation →
 * QCM → bilan. L'élève déplace M sur (AB) ; la parallèle (MN) suit et les
 * rapports AM/AB = AN/AC = MN/BC restent égaux. Contexte sénégalais : mesurer
 * la hauteur d'un arbre ou d'un poteau grâce aux ombres (mesure indirecte).
 */

const ThalesScene = dynamic(() => import('./thales-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'egaux' | 'mn-fixe' | 'aucun' | null;

const INTRO =
  "Dans la cour de l'école, comment mesurer la hauteur d'un grand fromager ou d'un poteau électrique sans y grimper ? " +
  "Quand le soleil de Dakar projette les ombres, l'arbre, son ombre et un bâton planté forment deux triangles de même forme. " +
  "Le théorème de Thalès relie alors les longueurs : c'est la mesure indirecte. Aujourd'hui tu vas découvrir cette égalité de rapports.";

const CONCLUSION =
  "Bravo ! Quand (MN) est parallèle à (BC), les rapports AM sur AB, AN sur AC et MN sur BC sont toujours égaux. " +
  "Grâce à cette égalité tu peux calculer une longueur que tu ne peux pas mesurer directement, comme la hauteur d'un arbre à partir de son ombre.";

export function TheoremeThales4eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [ratio, setRatio] = useState(0.5);
  const [positionsTried, setPositionsTried] = useState<Set<number>>(new Set([50]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qConfig, setQConfig] = useState<string | null>(null);
  const [qEgalite, setQEgalite] = useState<string | null>(null);
  const [qUsage, setQUsage] = useState<string | null>(null);

  // MN/BC = AM/AB par homothétie de centre A : le rapport vaut exactement ratio.
  const ratioMN = ratio;

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(25, positionsTried.size * 6); // exploration : positions de M testées
    if (hypo === 'egaux') s += 10;
    if (qConfig === 'parallele') s += 20;
    if (qEgalite === 'thales') s += 25;
    if (qUsage === 'longueur') s += 20;
    return Math.min(100, s);
  }, [positionsTried, hypo, qConfig, qEgalite, qUsage]);

  function onSlide(v: number) {
    setRatio(v);
    setPositionsTried((prev) => new Set(prev).add(Math.round(v * 100)));
  }

  async function handleValidate() {
    await onComplete(
      {
        shell: 'theoreme-thales-4eme',
        version: '2.0',
        steps: {
          positionsTried: Array.from(positionsTried),
          lastRatio: ratio,
          hypothesis: hypo,
          qcm: { qConfig, qEgalite, qUsage },
        },
      },
      score,
    );
    setStep('done');
  }

  return (
    <div className="space-y-4">
      {step === 'intro' && (
        <Card variant="hero-maths" padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-700 shadow-soft ring-1 ring-violet-100">
                <Triangle className="h-5 w-5" />
              </span>
              L&apos;arbre, l&apos;ombre et Thalès
            </CardTitle>
            <Badge tone="maths">Mathématiques · 4ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Comment connaître la hauteur d&apos;un grand <strong>fromager</strong> ou d&apos;un <strong>poteau</strong> sans
              y grimper ? Sous le soleil, l&apos;objet et son <strong>ombre</strong> dessinent des triangles « emboîtés »
              de même forme.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <Sun className="mr-1 inline h-4 w-4" />
              <strong>Objectif :</strong> comprendre que deux droites parallèles découpent des longueurs
              <strong> proportionnelles</strong> — la base du théorème de Thalès, l&apos;outil de la mesure indirecte.
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
              <Sparkles className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Deux droites se coupent en A. On les coupe par deux droites <strong>parallèles</strong> : (BC) et (MN).
            Si on glisse M le long de (AB), d&apos;après toi, que deviennent les rapports AM/AB, AN/AC et MN/BC ?
          </p>
          <QcmStep
            label="Mon hypothèse : en déplaçant M, ces trois rapports…"
            tone="violet"
            options={[
              { key: 'egaux', label: 'Restent toujours égaux entre eux.' },
              { key: 'mn-fixe', label: 'Changent, sauf MN/BC qui reste fixe.' },
              { key: 'aucun', label: "N'ont aucun lien entre eux." },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Vérifier ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Move className="h-5 w-5 text-violet-700" /> Étape 2 — Déplace le point M
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Fais glisser M sur (AB) : la parallèle (MN) suit. Observe les trois afficheurs verts — ils donnent
            AM/AB, AN/AC et MN/BC. Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <ThalesScene ratio={ratio} />
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="r">Position de M sur (AB) — c&apos;est AM/AB</Label>
              <span className="font-mono text-sm font-semibold text-violet-700">{(ratio * 100).toFixed(0)}%</span>
            </div>
            <input
              id="r"
              type="range"
              min={0.15}
              max={0.85}
              step={0.05}
              value={ratio}
              onChange={(e) => onSlide(Number(e.target.value))}
              className="slider-lab w-full"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="AM / AB" value={ratio.toFixed(2)} />
            <Stat label="AN / AC" value={ratio.toFixed(2)} />
            <Stat label="MN / BC" value={ratioMN.toFixed(2)} />
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <Ruler className="mr-1 inline h-4 w-4" />
            Les trois rapports restent <strong>identiques</strong> quelle que soit la position de M : c&apos;est l&apos;égalité de Thalès.
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="gradient" disabled={positionsTried.size < 3} onClick={() => setStep('mesures')}>
              {positionsTried.size < 3
                ? `Teste ${3 - positionsTried.size} position(s) de plus`
                : 'Voir mes relevés'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Tes relevés</CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Pour chaque position de M, les trois rapports sont égaux. Vérifie-le sur tes relevés.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">AM/AB</th>
                  <th className="px-4 py-2 text-left">AN/AC</th>
                  <th className="px-4 py-2 text-left">MN/BC</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(positionsTried)
                  .sort((a, b) => a - b)
                  .map((pct) => {
                    const r = pct / 100;
                    return (
                      <tr key={pct} className="border-t border-night-100">
                        <td className="px-4 py-2 font-mono">{r.toFixed(2)}</td>
                        <td className="px-4 py-2 font-mono">{r.toFixed(2)}</td>
                        <td className="px-4 py-2 font-mono font-semibold text-emerald-700">{r.toFixed(2)} ✓</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-ink/70">
            Conclusion : <strong>AM/AB = AN/AC = MN/BC</strong>. Cette égalité permet de trouver une longueur inconnue
            (par exemple BC, la hauteur réelle d&apos;un arbre) à partir des trois autres.
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
            <Badge tone="maths">4/4</Badge>
          </CardHeader>
          <div className="space-y-5">
            <QcmStep
              label="Le théorème de Thalès s'applique quand on a :"
              tone="violet"
              options={[
                { key: 'parallele', label: 'Deux droites parallèles coupant deux sécantes.' },
                { key: 'perpendiculaire', label: 'Deux droites perpendiculaires.' },
                { key: 'quelconque', label: 'Trois droites quelconques.' },
              ]}
              value={qConfig}
              onChange={setQConfig}
            />
            <QcmStep
              label="Il donne l'égalité :"
              tone="violet"
              options={[
                { key: 'thales', label: 'AM/AB = AN/AC = MN/BC' },
                { key: 'somme', label: 'AM + AB = AN + AC' },
                { key: 'pythagore', label: 'AM² + AN² = MN²' },
              ]}
              value={qEgalite}
              onChange={setQEgalite}
            />
            <QcmStep
              label="Thalès sert surtout à :"
              tone="violet"
              options={[
                { key: 'longueur', label: 'Calculer une longueur inconnue.' },
                { key: 'angle', label: 'Mesurer un angle.' },
                { key: 'aire', label: "Calculer l'aire d'un disque." },
              ]}
              value={qUsage}
              onChange={setQUsage}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button
              variant="success"
              disabled={!qConfig || !qEgalite || !qUsage || busy}
              onClick={handleValidate}
            >
              <CheckCircle2 className="h-4 w-4" /> {busy ? 'Envoi…' : 'Valider le TP'}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && (
        <Card variant="hero-maths">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-action-700" /> TP terminé — score {score}/100
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Si <strong>(MN) // (BC)</strong> avec M sur (AB) et N sur (AC), alors
              <strong> AM/AB = AN/AC = MN/BC</strong>. On s&apos;en sert pour calculer une longueur qu&apos;on ne peut pas
              mesurer directement : la hauteur d&apos;un arbre, d&apos;un poteau, d&apos;un bâtiment grâce à son ombre.
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
    <div className="rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100">
      <div className="text-[10px] uppercase tracking-wider text-violet-700/70">{label}</div>
      <div className="font-mono text-sm font-bold text-violet-800">{value}</div>
    </div>
  );
}
