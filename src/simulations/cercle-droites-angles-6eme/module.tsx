'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, Compass, PenLine, Ruler, Shapes, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Cercle, droites et angles (Maths, 6ème).
 *
 * Flow Lab Premium : amorce → hypothèse → planche à dessin 3D (3 ateliers)
 * → tableau de mesures → QCM → bilan.
 *
 * Atelier 1 « Tracés » : le lexique (droite / demi-droite / segment,
 * perpendiculaires, parallèles) sur le plan d'une concession.
 * Atelier 2 « Compas » : un compas articulé trace un cercle dont l'élève
 * règle l'écartement — rayon et diamètre = 2 × rayon affichés en direct.
 * Atelier 3 « Rapporteur » : un rapporteur gradué 0–180 (double graduation)
 * que l'élève incline pour poser sa ligne 0 sur [OA), puis un curseur de
 * lecture à amener sur [OB). Il lit la mesure et nomme l'angle.
 *
 * Maths exactes : diamètre = 2 × rayon, angle droit = 90°, angle plat = 180°,
 * aigu < 90° < obtus < 180°.
 */

const BoardScene = dynamic(() => import('./protractor-scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-gradient-to-br from-violet-50 via-white to-sky-50 text-sm text-ink/50">
      Chargement de la planche à dessin 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type Atelier = 'trace' | 'compas' | 'rapporteur';
type TraceFocus = 'droite' | 'demi-droite' | 'segment' | 'perpendiculaires' | 'paralleles';
type HypoRep = 'moitie' | 'double' | 'egal' | null;

const MESURES: Array<{ id: string; label: string; dirA: number; target: number }> = [
  { id: 'toit', label: 'Pente d’un pan de toit en tôle', dirA: 22, target: 35 },
  { id: 'mur', label: 'Coin du mur de la concession', dirA: 15, target: 90 },
  { id: 'arene', label: 'Ouverture des gradins de l’arène de lutte', dirA: 28, target: 130 },
];

const ATELIERS: Array<{ key: Atelier; label: string }> = [
  { key: 'trace', label: '1 · Tracés' },
  { key: 'compas', label: '2 · Compas' },
  { key: 'rapporteur', label: '3 · Rapporteur' },
];

const FOCUS_INFO: Record<TraceFocus, { label: string; text: string }> = {
  droite: {
    label: 'Droite (d)',
    text: "Une droite n’a ni début ni fin : elle continue des deux côtés, sans s’arrêter. On la note (d) ou (AB). On ne peut pas mesurer sa longueur.",
  },
  'demi-droite': {
    label: 'Demi-droite [Ax)',
    text: "Une demi-droite part d’une origine A et continue sans fin d’un seul côté. On la note [Ax). Le crochet est du côté de l’origine.",
  },
  segment: {
    label: 'Segment [BC]',
    text: "Un segment a deux extrémités B et C. C’est le seul des trois dont on peut mesurer la longueur, à la règle graduée.",
  },
  perpendiculaires: {
    label: 'Droites perpendiculaires',
    text: "Deux droites perpendiculaires se croisent en formant un angle droit (90°). On note (d₁) ⊥ (d₂). C’est le coin d’un mur de la concession : on le vérifie à l’équerre.",
  },
  paralleles: {
    label: 'Droites parallèles',
    text: "Deux droites parallèles gardent toujours le même écart : elles ne se croisent jamais. On note (d₃) // (d₄). Ce sont les deux longs murs d’une case rectangulaire.",
  },
};

const FOCUS_ORDER: TraceFocus[] = ['droite', 'demi-droite', 'segment', 'perpendiculaires', 'paralleles'];

const INTRO =
  "Dans la cour de la concession, le maçon trace au sol le plan d’une case, puis l’arène de lutte : un grand cercle parfait. " +
  "Pour cela il n’a que trois outils : une règle pour les droites, un compas pour les cercles, un rapporteur pour les angles. " +
  "Aujourd’hui tu prends sa place sur une planche à dessin. Tu vas nommer les tracés, régler le compas et mesurer de vrais angles.";

const CONCLUSION =
  "Bravo ! Tu retiens : une droite est illimitée des deux côtés, une demi-droite a une origine, un segment a deux extrémités. " +
  "Dans un cercle, le diamètre passe par le centre et vaut deux fois le rayon, tandis qu’une corde joint deux points du cercle sans passer par le centre. " +
  "Enfin, au rapporteur : un angle plus petit que quatre-vingt-dix degrés est aigu, un angle de quatre-vingt-dix degrés est droit, " +
  "au-delà il est obtus, et à cent quatre-vingts degrés il est plat : les deux côtés forment une droite.";

function natureOf(a: number): string {
  if (a <= 0) return 'nul';
  if (a < 90) return 'aigu';
  if (a === 90) return 'droit';
  if (a < 180) return 'obtus';
  return 'plat';
}

export function CercleDroitesAngles6eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [atelier, setAtelier] = useState<Atelier>('trace');

  // Atelier 1 — vocabulaire
  const [focus, setFocus] = useState<TraceFocus>('droite');
  const [focusSeen, setFocusSeen] = useState<Set<TraceFocus>>(new Set(['droite']));

  // Atelier 2 — compas
  const [rayon, setRayon] = useState(3);
  const [rayonsTried, setRayonsTried] = useState<Set<number>>(new Set([3]));

  // Atelier 3 — rapporteur
  const [base, setBase] = useState(0);
  const [cursor, setCursor] = useState(90);
  const [mesureIndex, setMesureIndex] = useState(0);
  const [readings, setReadings] = useState<Array<number | null>>([null, null, null]);
  const [naturesSeen, setNaturesSeen] = useState<Set<string>>(new Set(['droit']));

  const [ateliersSeen, setAteliersSeen] = useState<Set<Atelier>>(new Set(['trace']));

  const [hypo, setHypo] = useState<HypoRep>(null);
  const [qVocab, setQVocab] = useState<string | null>(null);
  const [qNature, setQNature] = useState<string | null>(null);
  const [qDiam, setQDiam] = useState<string | null>(null);

  const idx = Math.min(mesureIndex, MESURES.length - 1);
  const current = MESURES[idx];
  const okBase = Math.abs(base - current.dirA) <= 2;
  const okRay = Math.abs(base + cursor - (current.dirA + current.target)) <= 3;
  const doneCount = readings.filter((r) => r !== null).length;

  function pickAtelier(a: Atelier) {
    setAtelier(a);
    setAteliersSeen((prev) => new Set(prev).add(a));
  }
  function pickFocus(f: TraceFocus) {
    setFocus(f);
    setFocusSeen((prev) => new Set(prev).add(f));
  }
  function changeRayon(v: number) {
    setRayon(v);
    setRayonsTried((prev) => new Set(prev).add(v));
  }
  function changeCursor(v: number) {
    setCursor(v);
    setNaturesSeen((prev) => new Set(prev).add(natureOf(v)));
  }
  function noter() {
    setReadings((prev) => prev.map((r, i) => (i === idx ? cursor : r)));
    if (mesureIndex < MESURES.length - 1) {
      setMesureIndex(mesureIndex + 1);
      setBase(0);
      setCursor(90);
    }
  }
  function refaire() {
    setReadings([null, null, null]);
    setMesureIndex(0);
    setBase(0);
    setCursor(90);
  }

  const score = useMemo(() => {
    let s = 0;
    s += ateliersSeen.size * 4; // 12 — les 3 ateliers visités
    s += Math.min(10, focusSeen.size * 2); // 10 — vocabulaire exploré
    s += Math.min(8, rayonsTried.size * 2); // 8 — écartements de compas testés
    s += Math.min(8, naturesSeen.size * 2); // 8 — natures d'angle observées
    if (hypo === 'double') s += 8; // 8 — hypothèse juste
    s += readings.reduce<number>((acc, r, i) => acc + (r === MESURES[i].target ? 8 : 0), 0); // 24
    if (qVocab === 'demi-droite') s += 10;
    if (qNature === 'obtus') s += 10;
    if (qDiam === '6') s += 10; // 30 — QCM
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [ateliersSeen, focusSeen, rayonsTried, naturesSeen, hypo, readings, qVocab, qNature, qDiam]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'cercle-droites-angles-6eme',
        version: '2.0',
        steps: {
          hypothesis: hypo,
          ateliers: Array.from(ateliersSeen),
          vocabulaire: Array.from(focusSeen),
          rayonsTestes: Array.from(rayonsTried),
          rayonFinal: rayon,
          diametreFinal: 2 * rayon,
          naturesObservees: Array.from(naturesSeen),
          mesures: MESURES.map((m, i) => ({
            id: m.id,
            attendu: m.target,
            lu: readings[i],
            juste: readings[i] === m.target,
          })),
          qcm: { qVocab, qNature, qDiam },
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
                <Compass className="h-5 w-5" />
              </span>
              La planche du maçon
            </CardTitle>
            <Badge tone="maths">Maths · 6ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Dans la cour de la <strong>concession</strong>, le maçon trace le plan d&apos;une case, puis le grand
              cercle de l&apos;<strong>arène de lutte</strong>. Trois outils lui suffisent : la <strong>règle</strong>,
              le <strong>compas</strong> et le <strong>rapporteur</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Mission :</strong> nomme les tracés (droite, demi-droite, segment, ⊥, //), règle le compas pour
              obtenir un cercle donné, puis mesure trois angles au rapporteur et dis s&apos;ils sont aigus, droits ou
              obtus.
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
              <Target className="h-5 w-5 text-violet-700" /> Étape 1 — Ton hypothèse
            </CardTitle>
            <Badge tone="maths">1/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Le maçon plante son compas au centre O et trace le cercle de l&apos;arène. Le <strong>rayon</strong> est la
            distance du centre au bord ; le <strong>diamètre</strong> traverse le cercle en passant par le centre.
          </p>
          <QcmStep
            label="Mon hypothèse : par rapport au rayon, le diamètre est…"
            tone="violet"
            options={[
              { key: 'moitie', label: 'La moitié du rayon' },
              { key: 'double', label: 'Le double du rayon' },
              { key: 'egal', label: 'Égal au rayon' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
            hint="Tu vérifieras ta réponse avec le compas de l’atelier 2."
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Ouvrir la planche <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-violet-700" /> Étape 2 — La planche à dessin
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Passe dans les trois ateliers. Tu peux tourner la planche avec ta souris ou ton doigt.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {ATELIERS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => pickAtelier(a.key)}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition ' +
                  (atelier === a.key
                    ? 'bg-violet-600 text-white shadow-soft'
                    : 'bg-ink/5 text-ink/70 hover:bg-violet-50 hover:text-violet-700')
                }
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <BoardScene
                mode={atelier}
                focus={focus}
                rayon={rayon}
                base={base}
                cursor={cursor}
                dirA={current.dirA}
                target={current.target}
                caption={current.label}
              />
            </div>
          </div>

          {atelier === 'trace' && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {FOCUS_ORDER.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => pickFocus(f)}
                    className={
                      'rounded-full px-3 py-1 text-xs font-semibold transition ' +
                      (focus === f
                        ? 'bg-violet-600 text-white'
                        : 'bg-ink/5 text-ink/70 hover:bg-violet-50 hover:text-violet-700')
                    }
                  >
                    {FOCUS_INFO[f].label}
                  </button>
                ))}
              </div>
              <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
                {FOCUS_INFO[focus].text}
              </p>
              <p className="text-xs text-ink/50">Vocabulaire consulté : {focusSeen.size}/5</p>
            </div>
          )}

          {atelier === 'compas' && (
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="rayon">Écartement du compas (rayon)</Label>
                  <span className="font-mono text-violet-700">{rayon.toFixed(1).replace('.', ',')} cm</span>
                </div>
                <input
                  id="rayon"
                  type="range"
                  min={1}
                  max={6}
                  step={0.5}
                  value={rayon}
                  onChange={(e) => changeRayon(Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="Rayon r" value={`${rayon.toFixed(1).replace('.', ',')} cm`} />
                <Stat label="Diamètre 2r" value={`${(2 * rayon).toFixed(1).replace('.', ',')} cm`} />
                <Stat label="Écartements testés" value={`${rayonsTried.size}`} />
              </div>
              <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
                Le <strong>diamètre</strong> [CD] passe par le centre O : il vaut toujours <strong>2 × le rayon</strong>.
                La <strong>corde</strong> [EF] joint deux points du cercle mais ne passe pas par O : elle est plus
                courte que le diamètre.
              </p>
            </div>
          )}

          {atelier === 'rapporteur' && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
                <span className="text-sm font-semibold text-violet-900">
                  Mesure {Math.min(mesureIndex + 1, 3)}/3 — {current.label}
                </span>
                <Badge tone="maths">{doneCount}/3 notée(s)</Badge>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="base">1. Incline le rapporteur (ligne 0 sur [OA))</Label>
                  <span className={'font-mono ' + (okBase ? 'text-emerald-600' : 'text-violet-700')}>
                    {base}° {okBase ? '✓' : ''}
                  </span>
                </div>
                <input
                  id="base"
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={base}
                  onChange={(e) => setBase(Number(e.target.value))}
                  className="slider-lab w-full"
                />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <Label htmlFor="cursor">2. Amène le curseur de lecture sur [OB)</Label>
                  <span className={'font-mono ' + (okRay ? 'text-emerald-600' : 'text-violet-700')}>
                    {cursor}° {okRay ? '✓' : ''}
                  </span>
                </div>
                <input
                  id="cursor"
                  type="range"
                  min={0}
                  max={180}
                  step={5}
                  value={cursor}
                  onChange={(e) => changeCursor(Number(e.target.value))}
                  className="slider-lab w-full"
                />
                <div className="mt-1 flex justify-between text-[10px] text-ink/40">
                  <span>0° (nul)</span>
                  <span>90° (droit)</span>
                  <span>180° (plat)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <Stat label="Lecture" value={`${cursor}°`} />
                <Stat label="Nature" value={natureOf(cursor)} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="soft" size="sm" onClick={refaire}>
                  <Ruler className="h-4 w-4" /> Recommencer les mesures
                </Button>
                <Button variant="success" size="sm" disabled={!okBase || !okRay} onClick={noter}>
                  <CheckCircle2 className="h-4 w-4" />
                  {okBase && okRay ? 'Noter cette mesure' : 'Aligne d’abord le rapporteur'}
                </Button>
              </div>
              <p className="text-xs text-ink/50">
                Astuce : pose d&apos;abord le <strong>centre</strong> du rapporteur sur le sommet O et sa{' '}
                <strong>ligne 0</strong> sur le côté [OA). Ensuite seulement, lis la graduation atteinte par le côté
                [OB).
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              Ateliers visités : {ateliersSeen.size}/3 · mesures notées : {doneCount}/3
            </span>
            <Button
              variant="gradient"
              disabled={ateliersSeen.size < 3 || doneCount < 2}
              onClick={() => setStep('mesures')}
            >
              {ateliersSeen.size < 3
                ? 'Visite les 3 ateliers'
                : doneCount < 2
                  ? `Note ${2 - doneCount} mesure(s) de plus`
                  : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shapes className="h-5 w-5 text-violet-700" /> Étape 3 — Ton cahier de mesures
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Voici ce que tu as lu au rapporteur, et la nature de chaque angle.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-3 py-2 text-left">Angle mesuré</th>
                  <th className="px-3 py-2 text-left">Ma lecture</th>
                  <th className="px-3 py-2 text-left">Nature</th>
                  <th className="px-3 py-2 text-left">Valeur exacte</th>
                </tr>
              </thead>
              <tbody>
                {MESURES.map((m, i) => {
                  const r = readings[i];
                  const juste = r === m.target;
                  return (
                    <tr key={m.id} className={'border-t border-night-100 ' + (juste ? 'bg-emerald-50' : '')}>
                      <td className="px-3 py-2">{m.label}</td>
                      <td className="px-3 py-2 font-mono font-semibold">{r === null ? '—' : `${r}°`}</td>
                      <td className="px-3 py-2 capitalize">{r === null ? '—' : natureOf(r)}</td>
                      <td className="px-3 py-2 font-mono">
                        {m.target}° {r === null ? '' : juste ? '✓' : '✗'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3">
            <Stat label="Rayon réglé" value={`${rayon.toFixed(1).replace('.', ',')} cm`} />
            <Stat label="Diamètre obtenu" value={`${(2 * rayon).toFixed(1).replace('.', ',')} cm`} />
            <Stat label="Vocabulaire vu" value={`${focusSeen.size}/5`} />
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            Le compas confirme ton hypothèse : le <strong>diamètre vaut 2 × le rayon</strong>. Et au rapporteur :{' '}
            <strong>aigu &lt; 90° = droit &lt; obtus &lt; 180° = plat</strong>.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Retourner à la planche
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
              label="Une ligne droite qui a une origine mais pas de fin s’appelle…"
              tone="violet"
              options={[
                { key: 'segment', label: 'Un segment' },
                { key: 'demi-droite', label: 'Une demi-droite' },
                { key: 'droite', label: 'Une droite' },
              ]}
              value={qVocab}
              onChange={setQVocab}
            />
            <QcmStep
              label="Au rapporteur, tu lis 130°. Cet angle est…"
              tone="violet"
              options={[
                { key: 'aigu', label: 'Aigu (plus petit que 90°)' },
                { key: 'droit', label: 'Droit (égal à 90°)' },
                { key: 'obtus', label: 'Obtus (entre 90° et 180°)' },
              ]}
              value={qNature}
              onChange={setQNature}
            />
            <QcmStep
              label="Le maçon trace l’arène avec un compas ouvert de 3 cm. Le diamètre du cercle mesure…"
              tone="violet"
              hint="Le diamètre passe par le centre, d’un bord à l’autre."
              options={[
                { key: '1.5', label: '1,5 cm' },
                { key: '3', label: '3 cm' },
                { key: '6', label: '6 cm' },
              ]}
              value={qDiam}
              onChange={setQDiam}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qVocab || !qNature || !qDiam || busy} onClick={handleValidate}>
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
              <strong>Droite</strong> : illimitée des deux côtés · <strong>demi-droite</strong> : une origine ·{' '}
              <strong>segment</strong> : deux extrémités. Deux droites <strong>perpendiculaires</strong> forment un
              angle droit ; deux droites <strong>parallèles</strong> ne se croisent jamais.
            </p>
            <p>
              Dans un cercle de centre O : le <strong>rayon</strong> va du centre au bord, le{' '}
              <strong>diamètre</strong> = <strong>2 × rayon</strong> passe par O, et une <strong>corde</strong> joint
              deux points du cercle sans passer par O.
            </p>
            <p>
              Au rapporteur : <strong>aigu &lt; 90°</strong>, <strong>droit = 90°</strong>,{' '}
              <strong>90° &lt; obtus &lt; 180°</strong>, <strong>plat = 180°</strong>.
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
      <div className="font-mono text-sm font-bold capitalize text-violet-800">{value}</div>
    </div>
  );
}
