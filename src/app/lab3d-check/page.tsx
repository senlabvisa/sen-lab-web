'use client';

/**
 * Vérification visuelle DEV des scènes Lab Premium (sans auth). À supprimer avant prod.
 *
 * Couvre les 35 scènes réécrites dans la vague courante. Paginé par `?batch=N`
 * (6 scènes par lot) pour ne pas dépasser la limite de contextes WebGL du
 * navigateur. Sert à détecter les crashs runtime que `tsc` ne voit pas
 * (ex : hook R3F hors Canvas, NaN de géométrie).
 */

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const loading = () => <div className="grid h-full place-items-center text-xs text-slate-400">3D…</div>;

// — Électricité —
const SCircuit = dynamic(() => import('@/simulations/circuits-simples-5eme/circuit-scene'), { ssr: false, loading });
const SMultimeter = dynamic(() => import('@/simulations/intensite-tension-4eme/multimeter-scene'), { ssr: false, loading });
const SMeter = dynamic(() => import('@/simulations/energie-electrique-3eme/meter-scene'), { ssr: false, loading });
const SRlc = dynamic(() => import('@/simulations/circuit-rlc-terminale/scene'), { ssr: false, loading });

// — Maths —
const SDeriv = dynamic(() => import('@/simulations/derivees-1ere/scene'), { ssr: false, loading });
const SComplex = dynamic(() => import('@/simulations/complexes-terminale/scene'), { ssr: false, loading });
const SParabola = dynamic(() => import('@/simulations/equations-second-degre-2nde/scene'), { ssr: false, loading });
const SExp = dynamic(() => import('@/simulations/exponentielle-log-terminale/scene'), { ssr: false, loading });
const SFn = dynamic(() => import('@/simulations/fonctions-reference-2nde/scene'), { ssr: false, loading });
const SScal = dynamic(() => import('@/simulations/produit-scalaire-1ere/scene'), { ssr: false, loading });
const SSquare = dynamic(() => import('@/simulations/racines-carrees-3eme/square-scene'), { ssr: false, loading });
const SSuite = dynamic(() => import('@/simulations/suites-arith-geo-1ere/scene'), { ssr: false, loading });
const SSystem = dynamic(() => import('@/simulations/systemes-equations-3eme/system-scene'), { ssr: false, loading });
const SThales = dynamic(() => import('@/simulations/theoreme-thales-4eme/thales-scene'), { ssr: false, loading });
const STrig = dynamic(() => import('@/simulations/trigonometrie-3eme/trig-scene'), { ssr: false, loading });
const SVector = dynamic(() => import('@/simulations/vecteurs-2nde/vector-scene'), { ssr: false, loading });
const SStats2 = dynamic(() => import('@/simulations/statistiques-2nde/scene'), { ssr: false, loading });
const SHisto = dynamic(() => import('@/simulations/statistiques-4eme/histo-scene'), { ssr: false, loading });
const SScaleAgr = dynamic(() => import('@/simulations/agrandissement-reduction-3eme/scale-scene'), { ssr: false, loading });

// — Physique —
const SProj = dynamic(() => import('@/simulations/mecanique-newton-terminale/scene'), { ssr: false, loading });
const SMobile = dynamic(() => import('@/simulations/mouvement-vitesse-2nde/scene'), { ssr: false, loading });
const SMotion = dynamic(() => import('@/simulations/cinematique-3eme/motion-scene'), { ssr: false, loading });
const SBalloon = dynamic(() => import('@/simulations/air-pression-4eme/balloon-scene'), { ssr: false, loading });
const SLens = dynamic(() => import('@/simulations/optique-lentilles-4eme/lens-scene'), { ssr: false, loading });
const SMirror = dynamic(() => import('@/simulations/optique-miroirs-1ere/scene'), { ssr: false, loading });
const SEclipse = dynamic(() => import('@/simulations/sources-lumiere-5eme/eclipse-scene'), { ssr: false, loading });
const SScalePoids = dynamic(() => import('@/simulations/poids-masse-3eme/scale-scene'), { ssr: false, loading });

// — Nouveaux (vague upgrade) —
const SAffine = dynamic(() => import('@/simulations/fonctions-affines-3eme/affine-scene'), { ssr: false, loading });
const SForce = dynamic(() => import('@/simulations/forces-equilibre-2nde/scene'), { ssr: false, loading });
const SCell = dynamic(() => import('@/simulations/cellule-animale-vegetale-2nde/scene'), { ssr: false, loading });
const SWater = dynamic(() => import('@/simulations/etats-matiere-6eme/water-states-scene'), { ssr: false, loading });
const SDna = dynamic(() => import('@/simulations/adn-extraction-2nde/scene'), { ssr: false, loading });
const STecto = dynamic(() => import('@/simulations/tectonique-plaques-1ere/scene'), { ssr: false, loading });
const SDecay = dynamic(() => import('@/simulations/desintegration-radioactive-terminale/scene'), { ssr: false, loading });
const SProb = dynamic(() => import('@/simulations/probabilites-1ere/scene'), { ssr: false, loading });

// — Chimie —
const SAlkane = dynamic(() => import('@/simulations/chimie-organique-1ere/scene'), { ssr: false, loading });
const SKinetic = dynamic(() => import('@/simulations/cinetique-chimique-terminale/scene'), { ssr: false, loading });
const SDosage = dynamic(() => import('@/simulations/dosage-acide-base-1ere/scene'), { ssr: false, loading });
const SBeaker = dynamic(() => import('@/simulations/melanges-solutions-5eme/beaker-scene'), { ssr: false, loading });
const SMole = dynamic(() => import('@/simulations/mole-concentration-2nde/scene'), { ssr: false, loading });
const SPh = dynamic(() => import('@/simulations/ph-solutions-3eme/ph-scene'), { ssr: false, loading });
const SAtom = dynamic(() => import('@/simulations/tableau-periodique-2nde/scene'), { ssr: false, loading });
const SMolecules = dynamic(() => import('@/simulations/atomes-molecules-4eme/molecules-scene'), { ssr: false, loading });

const PER = 6;

function tiles(): { title: string; node: React.ReactNode }[] {
  return [
    { title: 'circuits-simples-5eme', node: <SCircuit mode="serie" closed grilled={0} /> },
    { title: 'intensite-tension-4eme', node: <SMultimeter voltage={4.5} intensity={0.3} uBulb={3} /> },
    { title: 'energie-electrique-3eme', node: <SMeter u={6} i={0.5} heating={false} /> },
    { title: 'circuit-rlc-terminale', node: <SRlc r={50} /> },
    { title: 'derivees-1ere', node: <SDeriv x0={1} /> },
    { title: 'complexes-terminale', node: <SComplex real={2} imag={1.5} /> },
    { title: 'equations-second-degre-2nde', node: <SParabola a={1} b={-1} c={-2} /> },
    { title: 'exponentielle-log-terminale', node: <SExp show="both" /> },
    { title: 'fonctions-reference-2nde', node: <SFn kind="carre" /> },
    { title: 'produit-scalaire-1ere', node: <SScal angle={45} un={3} vn={2} /> },
    { title: 'racines-carrees-3eme', node: <SSquare area={16} /> },
    { title: 'suites-arith-geo-1ere', node: <SSuite kind="geo" u0={1} raison={2} /> },
    { title: 'systemes-equations-3eme', node: <SSystem a1={1} b1={2} a2={2} b2={-1} /> },
    { title: 'theoreme-thales-4eme', node: <SThales ratio={0.5} /> },
    { title: 'trigonometrie-3eme', node: <STrig angle={30} /> },
    { title: 'vecteurs-2nde', node: <SVector ux={2} uy={1} vx={1} vy={3} /> },
    { title: 'statistiques-2nde', node: <SStats2 values={[120, 150, 180, 200, 900]} mean={310} median={180} extremeIndex={4} /> },
    { title: 'statistiques-4eme', node: <SHisto data={[12, 19, 8, 15]} labels={['Jan', 'Fév', 'Mar', 'Avr']} mean={13.5} unit="mm" selected={null} onSelect={() => {}} /> },
    { title: 'agrandissement-reduction-3eme', node: <SScaleAgr ratio={1.5} /> },
    { title: 'mecanique-newton-terminale', node: <SProj v0={12} angle={45} g={9.78} /> },
    { title: 'mouvement-vitesse-2nde', node: <SMobile path="rectiligne" frame="sol" speed={50} /> },
    { title: 'cinematique-3eme', node: <SMotion speed={20} running /> },
    { title: 'air-pression-4eme', node: <SBalloon volume={0.6} pressure={1.67} /> },
    { title: 'optique-lentilles-4eme', node: <SLens focal={2} objectDist={5} /> },
    { title: 'optique-miroirs-1ere', node: <SMirror kind="concave" objDist={4} /> },
    { title: 'sources-lumiere-5eme', node: <SEclipse sourceX={-2} /> },
    { title: 'poids-masse-3eme', node: <SScalePoids mass={2} g={9.78} place="Dakar" /> },
    { title: 'chimie-organique-1ere', node: <SAlkane family="alcane" n={3} /> },
    { title: 'cinetique-chimique-terminale', node: <SKinetic rate={0.5} conc={0.8} /> },
    {
      title: 'dosage-acide-base-1ere',
      node: <SDosage vb={10} vbMax={25} vbEq={12} ph={7} curve={[[-3, -1.2, 0], [-1, -0.9, 0], [1, 0.4, 0], [3, 1.4, 0]] as [number, number, number][]} />,
    },
    { title: 'melanges-solutions-5eme', node: <SBeaker melange="sable" technique="filtration" running /> },
    { title: 'mole-concentration-2nde', node: <SMole moles={0.5} volume={250} concentration={2} diluting={false} /> },
    { title: 'ph-solutions-3eme', node: <SPh ph={3} /> },
    { title: 'tableau-periodique-2nde', node: <SAtom element="Na" /> },
    { title: 'atomes-molecules-4eme', node: <SMolecules molKey="H2O" /> },
    { title: '★ fonctions-affines-3eme', node: <SAffine a={0.5} b={1} /> },
    { title: '★ forces-equilibre-2nde', node: <SForce f1={6} f2={4} /> },
    { title: '★ cellule-vegetale-2nde', node: <SCell kind="vegetale" /> },
    { title: '★ etats-matiere-6eme (vapeur)', node: <SWater mode="gas" temperature={110} /> },
    { title: '★ adn-extraction-2nde', node: <SDna stage={3} /> },
    { title: '★ tectonique-plaques-1ere', node: <STecto tension={0.85} /> },
    { title: '★ desintegration-rad-tle', node: <SDecay time={11460} /> },
    { title: '★ probabilites-1ere', node: <SProb trials={500} /> },
  ];
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200">
      <div className="bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">{title}</div>
      <div className="aspect-[4/3] w-full">{children}</div>
    </div>
  );
}

export default function Lab3dCheckPage() {
  const [batch, setBatch] = useState(0);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('batch');
    const n = Number(raw);
    setBatch(Number.isInteger(n) && n >= 0 ? n : 0);
  }, []);

  const all = tiles();
  const total = Math.ceil(all.length / PER);
  const safe = Math.min(batch, total - 1);
  const shown = all.slice(safe * PER, safe * PER + PER);

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <h1 className="mb-1 font-bold text-slate-800">
        Vérification scènes Lab Premium — lot {safe + 1}/{total} ({all.length} scènes)
      </h1>
      <p className="mb-4 text-xs text-slate-500">
        Navigue avec <code>?batch=0</code> … <code>?batch={total - 1}</code>. 6 scènes par lot (limite WebGL).
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => (
          <Tile key={t.title} title={t.title}>
            {t.node}
          </Tile>
        ))}
      </div>
    </main>
  );
}
