'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, FlipHorizontal2, Ruler, Sparkles, Target } from 'lucide-react';
import type { SimulationModuleProps } from '@senlabvisa/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NarrationButton } from '@/components/lab/narration-button';
import { QcmStep } from '@/components/lab/qcm-step';

/**
 * TP — Symétrie axiale (5ème, Maths).
 *
 * Flow Lab Premium : amorce (motifs wax / bogolan) → hypothèse sur la position
 * de l'axe → manipulation 3D (inclinaison de l'axe, choix du point suivi, mode
 * pliage) → mesures (longueurs, aire, distances à l'axe) → QCM → bilan.
 *
 * Maths justes : l'axe (d) est la MÉDIATRICE de [MM′] (perpendiculaire à
 * [MM′] ET passant par son milieu). La symétrie axiale conserve longueurs,
 * angles et aires mais INVERSE le sens de parcours. Tout point de (d) est son
 * propre symétrique.
 */

const SymetrieScene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center bg-violet-50 text-sm text-ink/50">
      Chargement de la scène 3D…
    </div>
  ),
});

type Step = 'intro' | 'hypo' | 'manip' | 'mesures' | 'qcm' | 'done';
type HypoRep = 'mediatrice' | 'parallele' | 'milieu' | null;

const NAMES = ['A', 'B', 'C'] as const;
type Pt = { x: number; y: number };
/** Motif triangulaire ABC — mêmes sommets que dans scene.tsx (repère du quadrillage). */
const FIGURE: Pt[] = [
  { x: 1.5, y: -1 },
  { x: 3, y: 0 },
  { x: 2, y: 1.5 },
];

const INTRO =
  "Regarde un pagne wax du marché HLM de Dakar, ou une bande de bogolan : le motif de gauche et le motif de droite " +
  "sont les mêmes, mais retournés, comme dans un miroir. On dit qu'ils sont symétriques par rapport à un axe. " +
  "Le décor géométrique des mosquées et le tressage des nattes utilisent la même idée. " +
  "Aujourd'hui tu vas construire toi-même le symétrique d'un point, puis d'une figure entière : " +
  "tu traces la perpendiculaire à l'axe, puis tu reportes la même distance de l'autre côté.";

const CONCLUSION =
  "Bravo ! Pour construire le symétrique M prime du point M par rapport à la droite d, tu traces la perpendiculaire " +
  "à d passant par M, puis tu reportes la même distance de l'autre côté de l'axe. La droite d est donc la médiatrice " +
  "du segment M M prime : elle lui est perpendiculaire et elle passe par son milieu. " +
  "La symétrie axiale conserve les longueurs, les angles et les aires, mais elle inverse le sens de parcours de la figure. " +
  "Et tout point situé sur l'axe est son propre symétrique.";

function axisDir(angleDeg: number): Pt {
  const a = (angleDeg * Math.PI) / 180;
  return { x: -Math.sin(a), y: Math.cos(a) };
}
function reflect(p: Pt, u: Pt): Pt {
  const d = p.x * u.x + p.y * u.y;
  return { x: 2 * d * u.x - p.x, y: 2 * d * u.y - p.y };
}
function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
/** Distance d'un point à la droite passant par O et de vecteur directeur unitaire u. */
function distToAxis(p: Pt, u: Pt) {
  return Math.abs(u.x * p.y - u.y * p.x);
}
/** Aire algébrique (signe = sens de parcours). */
function signedArea(t: Pt[]) {
  return (
    (t[0].x * (t[1].y - t[2].y) + t[1].x * (t[2].y - t[0].y) + t[2].x * (t[0].y - t[1].y)) / 2
  );
}

export function SymetrieAxiale5eme({ onComplete, busy }: SimulationModuleProps) {
  const [step, setStep] = useState<Step>('intro');
  const [angle, setAngle] = useState(0);
  const [mIndex, setMIndex] = useState(0);
  const [fold, setFold] = useState(false);
  const [foldUsed, setFoldUsed] = useState(false);
  const [anglesTried, setAnglesTried] = useState<Set<number>>(new Set([0]));
  const [hypo, setHypo] = useState<HypoRep>(null);

  const [qConstruit, setQConstruit] = useState<string | null>(null);
  const [qConserve, setQConserve] = useState<string | null>(null);
  const [qAxe, setQAxe] = useState<string | null>(null);

  const geo = useMemo(() => {
    const u = axisDir(angle);
    const img = FIGURE.map((p) => reflect(p, u));
    const M = FIGURE[mIndex];
    const Mp = img[mIndex];
    return {
      u,
      img,
      M,
      Mp,
      dM: distToAxis(M, u),
      dMp: distToAxis(Mp, u),
      sides: [
        { nom: 'AB', o: dist(FIGURE[0], FIGURE[1]), i: dist(img[0], img[1]) },
        { nom: 'BC', o: dist(FIGURE[1], FIGURE[2]), i: dist(img[1], img[2]) },
        { nom: 'CA', o: dist(FIGURE[2], FIGURE[0]), i: dist(img[2], img[0]) },
      ],
      aireO: signedArea(FIGURE),
      aireI: signedArea(img),
    };
  }, [angle, mIndex]);

  function changeAngle(n: number) {
    setAngle(n);
    setAnglesTried((prev) => new Set(prev).add(n));
  }
  function toggleFold() {
    setFold((f) => {
      if (!f) setFoldUsed(true);
      return !f;
    });
  }

  const score = useMemo(() => {
    let s = 0;
    s += Math.min(20, anglesTried.size * 5); // exploration : inclinaisons testées
    if (foldUsed) s += 10; // vérification par pliage
    if (hypo === 'mediatrice') s += 10;
    if (qConstruit === 'perp') s += 20;
    if (qConserve === 'tout') s += 20;
    if (qAxe === 'luimeme') s += 20;
    return Math.min(100, Math.round(s));
  }, [anglesTried, foldUsed, hypo, qConstruit, qConserve, qAxe]);

  async function handleValidate() {
    await onComplete(
      {
        shell: 'symetrie-axiale-5eme',
        version: '2.0',
        steps: {
          anglesTried: Array.from(anglesTried).sort((a, b) => a - b),
          angleFinal: angle,
          pointSuivi: NAMES[mIndex],
          pliageUtilise: foldUsed,
          M: geo.M,
          Mprime: { x: Number(geo.Mp.x.toFixed(3)), y: Number(geo.Mp.y.toFixed(3)) },
          distances: { dM: Number(geo.dM.toFixed(3)), dMprime: Number(geo.dMp.toFixed(3)) },
          aire: { origine: geo.aireO, image: geo.aireI },
          hypothesis: hypo,
          qcm: { qConstruit, qConserve, qAxe },
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
                <Sparkles className="h-5 w-5" />
              </span>
              Le motif wax et son miroir
            </CardTitle>
            <Badge tone="maths">Maths · 5ème</Badge>
          </CardHeader>
          <div className="space-y-3 text-ink/80">
            <p>
              Sur un <strong>pagne wax</strong> ou une bande de <strong>bogolan</strong>, le motif se répète en
              miroir de part et d&apos;autre d&apos;une ligne. On retrouve la même idée dans le décor géométrique des
              mosquées et dans le <strong>tressage des nattes</strong>.
            </p>
            <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
              <strong>Objectif :</strong> construire le symétrique d&apos;un point M par rapport à une droite (d) —
              on trace la <strong>perpendiculaire à (d) passant par M</strong>, puis on <strong>reporte la même
              distance</strong> de l&apos;autre côté. Tu vérifieras ensuite en <strong>pliant</strong> la figure sur
              son image.
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
            M′ est le symétrique de M par rapport à la droite (d). Avant de manipuler : selon toi, comment la droite
            (d) est-elle placée par rapport au segment [MM′] ?
          </p>
          <QcmStep
            label="Mon hypothèse : par rapport au segment [MM′], la droite (d) est…"
            tone="violet"
            options={[
              { key: 'mediatrice', label: 'Sa médiatrice : elle est perpendiculaire à [MM′] et passe par son milieu.' },
              { key: 'parallele', label: 'Parallèle à [MM′].' },
              { key: 'milieu', label: 'Elle passe par le milieu de [MM′], mais dans n’importe quelle direction.' },
            ]}
            value={hypo}
            onChange={(v) => setHypo(v as HypoRep)}
          />
          <div className="mt-5 flex justify-end">
            <Button variant="gradient" disabled={!hypo} onClick={() => setStep('manip')}>
              Construire ! <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'manip' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlipHorizontal2 className="h-5 w-5 text-violet-700" /> Étape 2 — Construis le symétrique
            </CardTitle>
            <Badge tone="maths">2/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Incline l&apos;axe <span className="font-semibold text-red-600">(d)</span> : le motif{' '}
            <span className="font-semibold text-violet-700">ABC</span> et son image{' '}
            <span className="font-semibold text-emerald-700">A′B′C′</span> se déplacent. Suis les traits de
            construction en pointillé : perpendiculaire à (d), pied H, et les deux marques d&apos;<strong>égale
            distance</strong> MH = HM′.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-violet-100">
            <div className="aspect-[4/3] w-full">
              <SymetrieScene angle={angle} mIndex={mIndex} fold={fold} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <Label htmlFor="ang">Inclinaison de l&apos;axe (d)</Label>
                <span className="font-mono text-violet-700">{angle}°</span>
              </div>
              <input
                id="ang"
                type="range"
                min={-30}
                max={30}
                step={5}
                value={angle}
                onChange={(e) => changeAngle(Number(e.target.value))}
                className="slider-lab w-full"
              />
            </div>
            <div>
              <div className="mb-1 text-xs">
                <Label htmlFor="mpt">Point suivi M</Label>
              </div>
              <div id="mpt" className="flex gap-2">
                {NAMES.map((n, i) => (
                  <Button key={n} size="sm" variant={mIndex === i ? 'gradient' : 'outline'} onClick={() => setMIndex(i)}>
                    {n}
                  </Button>
                ))}
                <Button size="sm" variant={fold ? 'success' : 'soft'} onClick={toggleFold}>
                  <FlipHorizontal2 className="h-4 w-4" /> {fold ? 'Déplier' : 'Plier'}
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
            <Stat label={`M = ${NAMES[mIndex]}`} value={`(${geo.M.x.toFixed(1)} ; ${geo.M.y.toFixed(1)})`} />
            <Stat label={`M′ = ${NAMES[mIndex]}′`} value={`(${geo.Mp.x.toFixed(2)} ; ${geo.Mp.y.toFixed(2)})`} highlight />
            <Stat label="distance M→(d)" value={`${geo.dM.toFixed(2)}`} />
            <Stat label="distance M′→(d)" value={`${geo.dMp.toFixed(2)}`} />
          </div>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
            <strong>Plie</strong> la figure le long de (d) : elle vient se poser <strong>exactement</strong> sur son
            image. C&apos;est la preuve que la construction est juste.
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-ink/50">
              <Ruler className="mr-1 inline h-3.5 w-3.5" />
              Inclinaisons testées : {anglesTried.size} · pliage {foldUsed ? 'fait' : 'à faire'}
            </span>
            <Button variant="gradient" disabled={anglesTried.size < 3} onClick={() => setStep('mesures')}>
              {anglesTried.size < 3 ? `Teste ${3 - anglesTried.size} inclinaison(s) de plus` : 'Voir mes mesures'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mesures' && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-violet-700" /> Étape 3 — Ce que la symétrie conserve
            </CardTitle>
            <Badge tone="maths">3/4</Badge>
          </CardHeader>
          <p className="mb-3 text-sm text-ink/70">
            Compare le motif ABC et son image A′B′C′ pour l&apos;axe incliné de {angle}°.
          </p>
          <div className="overflow-hidden rounded-2xl ring-1 ring-night-100">
            <table className="w-full text-sm">
              <thead className="bg-violet-50 text-xs uppercase tracking-wider text-violet-700">
                <tr>
                  <th className="px-4 py-2 text-left">Grandeur</th>
                  <th className="px-4 py-2 text-center">Figure ABC</th>
                  <th className="px-4 py-2 text-center">Image A′B′C′</th>
                </tr>
              </thead>
              <tbody>
                {geo.sides.map((s) => (
                  <tr key={s.nom} className="border-t border-night-100">
                    <td className="px-4 py-2">Longueur [{s.nom}]</td>
                    <td className="px-4 py-2 text-center font-mono">{s.o.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center font-mono">{s.i.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="border-t border-night-100 bg-emerald-50/60">
                  <td className="px-4 py-2 font-semibold">Aire du motif</td>
                  <td className="px-4 py-2 text-center font-mono">{Math.abs(geo.aireO).toFixed(3)}</td>
                  <td className="px-4 py-2 text-center font-mono">{Math.abs(geo.aireI).toFixed(3)}</td>
                </tr>
                <tr className="border-t border-night-100">
                  <td className="px-4 py-2">Distance à l&apos;axe (point {NAMES[mIndex]})</td>
                  <td className="px-4 py-2 text-center font-mono">{geo.dM.toFixed(3)}</td>
                  <td className="px-4 py-2 text-center font-mono">{geo.dMp.toFixed(3)}</td>
                </tr>
                <tr className="border-t border-night-100 bg-amber-50/70">
                  <td className="px-4 py-2 font-semibold">Sens de parcours A→B→C</td>
                  <td className="px-4 py-2 text-center font-mono">
                    {geo.aireO > 0 ? 'anti-horaire' : 'horaire'}
                  </td>
                  <td className="px-4 py-2 text-center font-mono">
                    {geo.aireI > 0 ? 'anti-horaire' : 'horaire'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900 ring-1 ring-violet-100">
            Les <strong>longueurs</strong>, les <strong>angles</strong> et l&apos;<strong>aire</strong> sont
            identiques : la figure image est <strong>superposable</strong> à la figure de départ (tu l&apos;as vu en
            pliant). Mais le <strong>sens de parcours est inversé</strong> — c&apos;est la grande différence avec la
            symétrie centrale, qui, elle, conserve le sens.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('manip')}>
              Reprendre l&apos;axe
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
              label="Pour construire le symétrique M′ de M par rapport à la droite (d), on trace…"
              tone="violet"
              hint="Repense aux traits en pointillé et aux deux marques d’égale distance."
              options={[
                { key: 'perp', label: 'La perpendiculaire à (d) passant par M, puis on reporte la même distance de l’autre côté.' },
                { key: 'para', label: 'La parallèle à (d) passant par M, puis on reporte la même distance.' },
                { key: 'origine', label: 'La droite (OM), puis on reporte la distance depuis l’origine O.' },
              ]}
              value={qConstruit}
              onChange={setQConstruit}
            />
            <QcmStep
              label="La symétrie axiale…"
              tone="violet"
              options={[
                { key: 'tout', label: 'Conserve les longueurs, les angles et les aires, mais inverse le sens de parcours.' },
                { key: 'sens', label: 'Conserve le sens de parcours, mais change les longueurs.' },
                { key: 'reduit', label: 'Réduit la figure : l’image est plus petite que la figure de départ.' },
              ]}
              value={qConserve}
              onChange={setQConserve}
            />
            <QcmStep
              label="Le point I est situé SUR l'axe (d). Son symétrique I′ est…"
              tone="violet"
              options={[
                { key: 'luimeme', label: 'Le point I lui-même : I′ = I.' },
                { key: 'oppose', label: 'Un point de l’autre côté de l’axe, à la même distance.' },
                { key: 'origine', label: 'L’origine O du repère.' },
              ]}
              value={qAxe}
              onChange={setQAxe}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mesures')}>
              Revoir
            </Button>
            <Button variant="success" disabled={!qConstruit || !qConserve || !qAxe || busy} onClick={handleValidate}>
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
              Le symétrique M′ de M s&apos;obtient en traçant la <strong>perpendiculaire à (d) passant par M</strong>,
              puis en reportant la même distance de l&apos;autre côté : la droite (d) est donc la{' '}
              <strong>médiatrice de [MM′]</strong>. La symétrie axiale <strong>conserve</strong> longueurs, angles et
              aires, mais <strong>inverse le sens</strong> de la figure. Tout point de l&apos;axe est son propre
              symétrique. C&apos;est exactement ce qui fait la beauté des motifs wax et du bogolan.
            </p>
            <ul className="rounded-xl bg-white/70 p-3 text-sm ring-1 ring-violet-100">
              <li>Exploration (inclinaisons testées) : {Math.min(20, anglesTried.size * 5)}/20</li>
              <li>Vérification par pliage : {foldUsed ? 10 : 0}/10</li>
              <li>Hypothèse de départ : {hypo === 'mediatrice' ? 10 : 0}/10</li>
              <li>
                QCM : {(qConstruit === 'perp' ? 20 : 0) + (qConserve === 'tout' ? 20 : 0) + (qAxe === 'luimeme' ? 20 : 0)}/60
              </li>
            </ul>
            <NarrationButton text={CONCLUSION} label="Écouter le résumé" />
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={'rounded-xl p-2 ring-1 ' + (highlight ? 'bg-violet-50 ring-violet-200' : 'bg-night-50 ring-night-100')}>
      <div className={'text-[10px] uppercase tracking-wider ' + (highlight ? 'text-violet-700/70' : 'text-ink/45')}>{label}</div>
      <div className={'font-mono text-sm font-bold ' + (highlight ? 'text-violet-800' : 'text-ink/80')}>{value}</div>
    </div>
  );
}
