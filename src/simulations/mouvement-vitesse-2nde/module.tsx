'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Compass, Eye, Gauge, MoveRight, Navigation, RotateCcw } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Mouvement et vitesse : relativité du mouvement et vecteur vitesse
 * (Physique-Chimie, Seconde).
 *
 * Flow Lab Premium : amorce → hypothèse → manipulation 3D → observation →
 * QCM → bilan. Science juste : un mouvement se décrit par rapport à un
 * référentiel ; le vecteur vitesse est tangent à la trajectoire ; en
 * circulaire uniforme sa direction change sans cesse. Contexte : un car
 * « Ndiaga Ndiaye » entre Dakar et Diamniadio, un passager assis à bord.
 */

const MobileScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-blue-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'observe' | 'qcm' | 'done';
type Path = 'rectiligne' | 'circulaire';
type Frame = 'sol' | 'passager';
type HypoRep = 'rien' | 'referentiel' | 'vitesse' | null;

const INTRO =
  "Tu montes dans un car Ndiaga Ndiaye entre Dakar et Diamniadio. Par la fenêtre, les baobabs défilent : pour toi, ils bougent. " +
  "Mais pour une personne assise au bord de la route, ce sont les baobabs qui sont immobiles et c'est le car qui avance. " +
  "Qui a raison ? Les deux ! Décrire un mouvement n'a de sens que si on précise par rapport à quoi : le référentiel. " +
  "Aujourd'hui tu vas piloter un mobile et observer son vecteur vitesse.";

const CONCLUSION =
  "Bravo ! Un mouvement se décrit toujours par rapport à un référentiel : c'est la relativité du mouvement. " +
  "Le vecteur vitesse est tangent à la trajectoire et pointe dans le sens du déplacement. " +
  "En mouvement rectiligne uniforme, sa direction ne change pas. En mouvement circulaire uniforme, " +
  "la valeur de la vitesse reste constante mais sa direction change sans cesse : le vecteur vitesse varie.";

export function MouvementVitesse2nde({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [path, setPath] = useState<Path>('rectiligne');
  const [frame, setFrame] = useState<Frame>('sol');
  const [speed, setSpeed] = useState(60);

  // Exploration : on veut que l'élève teste les deux trajectoires ET les deux référentiels.
  const [seenPaths, setSeenPaths] = useState<Set<Path>>(new Set(['rectiligne']));
  const [seenFrames, setSeenFrames] = useState<Set<Frame>>(new Set(['sol']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qChoix, setQChoix] = useState<string | null>(null); // référentiel
  const [qVecteur, setQVecteur] = useState<string | null>(null); // tangent
  const [qCirc, setQCirc] = useState<string | null>(null); // change en permanence

  function choosePath(p: Path) {
    setPath(p);
    setSeenPaths((prev) => new Set(prev).add(p));
  }
  function chooseFrame(f: Frame) {
    setFrame(f);
    setSeenFrames((prev) => new Set(prev).add(f));
  }

  const explored = seenPaths.size >= 2 && seenFrames.size >= 2;
  const relSpeed = frame === 'passager' ? 0 : speed;

  const score = useMemo(() => {
    let s = 0;
    s += seenPaths.size * 8; // 0..16
    s += seenFrames.size * 7; // 0..14
    if (hypo === 'referentiel') s += 10;
    if (qChoix === 'referentiel') s += 20;
    if (qVecteur === 'tangente') s += 20;
    if (qCirc === 'change') s += 20;
    return Math.min(100, s);
  }, [seenPaths, seenFrames, hypo, qChoix, qVecteur, qCirc]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'mouvement-vitesse-2nde',
        version: '2.0',
        steps: {
          pathsExplored: Array.from(seenPaths),
          framesExplored: Array.from(seenFrames),
          hypothesis: hypo,
          qcm: { qChoix, qVecteur, qCirc },
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
                <Navigation className="h-5 w-5" />
              </span>
              Le car, le baobab et le passager
            </CardTitle>
            <Badge tone="physique">Physique-Chimie · Seconde</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans un <strong>car Ndiaga Ndiaye</strong> entre Dakar et Diamniadio, les baobabs semblent défiler. Pour un
              passant au bord de la route, c&apos;est le car qui avance. Décrire un mouvement, c&apos;est d&apos;abord
              choisir <strong>par rapport à quoi</strong> on l&apos;observe : le <strong>référentiel</strong>.
            </p>
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-100">
              <strong>Objectif :</strong> piloter un mobile (piste droite ou ronde), suivre son <strong>vecteur vitesse</strong>
              {' '}et comprendre comment le mouvement dépend du référentiel.
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
              <Compass className="h-5 w-5 text-blue-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="physique">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Avant de manipuler : pour décrire correctement un mouvement, de quoi a-t-on besoin <strong>en premier</strong> ?
          </p>
          <QcmStep
            label="Pour décrire un mouvement, il faut d'abord choisir…"
            tone="science"
            options={[
              { key: 'rien', label: "Rien, le mouvement est le même pour tout le monde" },
              { key: 'referentiel', label: 'Un référentiel (le corps par rapport auquel on observe)' },
              { key: 'vitesse', label: 'La vitesse exacte du mobile' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Manipuler ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-700" /> Étape 2 — Pilote le mobile
            </CardTitle>
            <Badge tone="physique">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Change la <strong>trajectoire</strong> et le <strong>référentiel</strong>. Regarde le vecteur vitesse rouge
            (v⃗) : où pointe-t-il, et que devient sa direction ? Tourne la scène avec ta souris / ton doigt.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-blue-100">
            <div className="aspect-[4/3] w-full">
              <MobileScene path={path} frame={frame} speed={speed} />
            </div>
          </div>

          {/* Sélecteur de trajectoire */}
          <div className="mt-4">
            <Label>Trajectoire</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Button variant={path === 'rectiligne' ? 'gradient' : 'soft'} size="sm" onClick={() => choosePath('rectiligne')}>
                <MoveRight className="h-4 w-4" /> Rectiligne
              </Button>
              <Button variant={path === 'circulaire' ? 'gradient' : 'soft'} size="sm" onClick={() => choosePath('circulaire')}>
                <RotateCcw className="h-4 w-4" /> Circulaire
              </Button>
            </div>
          </div>

          {/* Sélecteur de référentiel */}
          <div className="mt-3">
            <Label>Référentiel d&apos;observation</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Button variant={frame === 'sol' ? 'gradient' : 'soft'} size="sm" onClick={() => chooseFrame('sol')}>
                <Eye className="h-4 w-4" /> Le sol (passant)
              </Button>
              <Button variant={frame === 'passager' ? 'gradient' : 'soft'} size="sm" onClick={() => chooseFrame('passager')}>
                <Eye className="h-4 w-4" /> Le passager
              </Button>
            </div>
          </div>

          {/* Vitesse */}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs">
              <Label htmlFor="s">Vitesse du car</Label>
              <span className="font-mono text-blue-700">{speed} km/h</span>
            </div>
            <input id="s" type="range" min={20} max={120} step={10} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="slider-lab w-full" />
          </div>

          <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-900 ring-1 ring-blue-100">
            {frame === 'passager'
              ? "Référentiel du passager : assis dans le car, tu ne bouges pas par rapport à lui → vitesse relative nulle (v⃗ = 0⃗)."
              : path === 'circulaire'
                ? "Référentiel sol, piste circulaire : la valeur de la vitesse reste " + relSpeed + " km/h, mais la direction de v⃗ tourne sans cesse."
                : "Référentiel sol, piste droite : v⃗ garde une direction fixe (mouvement rectiligne uniforme)."}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              {explored ? 'Exploration complète ✓' : 'Teste les 2 trajectoires ET les 2 référentiels'}
            </span>
            <Button variant="gradient" disabled={!explored} onClick={() => setStep('observe')}>
              {explored ? 'Observer' : 'Explore encore'} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'observe' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Étape 3 — Ce que tu as observé</CardTitle>
            <Badge tone="physique">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">Récapitule avant de conclure :</p>
          <div className="space-y-2 text-sm">
            <Obs ok title="Le référentiel change la description">
              Le même car est « en mouvement » pour le passant (réf. sol) mais « immobile » pour le passager : c&apos;est la
              relativité du mouvement.
            </Obs>
            <Obs ok title="Le vecteur vitesse est tangent">
              Quelle que soit la piste, v⃗ est toujours tangent à la trajectoire et pointe dans le sens du déplacement.
            </Obs>
            <Obs ok title="Rectiligne vs circulaire">
              Rectiligne uniforme : direction de v⃗ fixe. Circulaire uniforme : valeur constante mais direction qui change
              sans cesse → le vecteur vitesse varie.
            </Obs>
          </div>
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
              label="Décrire un mouvement nécessite de choisir d'abord :"
              tone="science"
              options={[
                { key: 'referentiel', label: 'Un référentiel' },
                { key: 'chrono', label: 'Un chronomètre' },
                { key: 'vitesse', label: 'Une vitesse' },
              ]}
              value={qChoix}
              onChange={setQChoix}
            />
            <QcmStep
              label="Le vecteur vitesse est toujours :"
              tone="science"
              options={[
                { key: 'tangente', label: 'Tangent à la trajectoire' },
                { key: 'verticale', label: 'Vertical (vers le haut)' },
                { key: 'centre', label: 'Dirigé vers le centre de la trajectoire' },
              ]}
              value={qVecteur}
              onChange={setQVecteur}
            />
            <QcmStep
              label="Dans un mouvement circulaire uniforme, la direction du vecteur vitesse :"
              tone="science"
              options={[
                { key: 'change', label: 'Change en permanence' },
                { key: 'fixe', label: 'Reste fixe' },
                { key: 'nulle', label: 'Est nulle' },
              ]}
              value={qCirc}
              onChange={setQCirc}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('observe')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qChoix || !qVecteur || !qCirc || busy} onClick={handleValidate}>
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
              Un mouvement se décrit toujours <strong>par rapport à un référentiel</strong> (relativité du mouvement). Le
              <strong> vecteur vitesse</strong> est <strong>tangent à la trajectoire</strong>, orienté dans le sens du
              déplacement. Rectiligne uniforme : direction constante. Circulaire uniforme : valeur constante mais
              <strong> direction qui change sans cesse</strong>.
            </p>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Obs({ title, children, ok }: { title: string; children: React.ReactNode; ok?: boolean }) {
  return (
    <div className="rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
      <div className="flex items-center gap-1.5 font-semibold text-blue-800">
        {ok && <CheckCircle2 className="h-4 w-4 text-emerald-600" />} {title}
      </div>
      <p className="mt-0.5 text-xs text-ink/70">{children}</p>
    </div>
  );
}
