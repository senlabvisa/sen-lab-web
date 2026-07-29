'use client';

/**
 * Vérification visuelle DEV des scènes Lab Premium (sans auth). À supprimer avant prod.
 *
 * Couvre les 87 scènes 3D du projet (toutes les simulations migrées au kit
 * `@/components/lab3d`). Paginé par `?batch=N`
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

// — Vague « migration kit lab3d » (44 scènes restantes) —
const SChain = dynamic(() => import('@/simulations/alimentation-animale-6eme/chain-scene'), { ssr: false, loading });
const SBandia = dynamic(() => import('@/simulations/biodiversite-bandia-2nde/scene'), { ssr: false, loading });
const SAires = dynamic(() => import('@/simulations/calcul-litteral-4eme/aires-scene'), { ssr: false, loading });
const SProtractor = dynamic(() => import('@/simulations/cercle-droites-angles-6eme/protractor-scene'), { ssr: false, loading });
const SHeating = dynamic(() => import('@/simulations/changements-etat-6eme/heating-scene'), { ssr: false, loading });
const SHeart = dynamic(() => import('@/simulations/circulation-sanguine-5eme/heart-scene'), { ssr: false, loading });
const SClassif = dynamic(() => import('@/simulations/classification-vivant-6eme/scene'), { ssr: false, loading });
const SClimat = dynamic(() => import('@/simulations/climat-terminale/scene'), { ssr: false, loading });
const SIncub = dynamic(() => import('@/simulations/cycle-vie-6eme/lifecycle-scene'), { ssr: false, loading });
const SDigest = dynamic(() => import('@/simulations/digestion-5eme/digestive-scene'), { ssr: false, loading });
const SEnergie = dynamic(() => import('@/simulations/energie-mecanique-1ere/scene'), { ssr: false, loading });
const SEvol = dynamic(() => import('@/simulations/evolution-especes-1ere/scene'), { ssr: false, loading });
const SDecimal = dynamic(() => import('@/simulations/fractions-decimaux-5eme/decimal-scene'), { ssr: false, loading });
const SFraction = dynamic(() => import('@/simulations/fractions-simples-6eme/fraction-scene'), { ssr: false, loading });
const SPunnett = dynamic(() => import('@/simulations/genetique-mendel-3eme/punnett-scene'), { ssr: false, loading });
const SGene = dynamic(() => import('@/simulations/genetique-moleculaire-terminale/scene'), { ssr: false, loading });
const SSpace = dynamic(() => import('@/simulations/geometrie-espace-terminale/scene'), { ssr: false, loading });
const SMeteo = dynamic(() => import('@/simulations/graphiques-meteo-6eme/meteo-scene'), { ssr: false, loading });
const SGlyc = dynamic(() => import('@/simulations/hormones-1ere/scene'), { ssr: false, loading });
const SInteg = dynamic(() => import('@/simulations/integration-terminale/scene'), { ssr: false, loading });
const SOhm = dynamic(() => import('@/simulations/loi-dohm-3eme/ohm-scene'), { ssr: false, loading });
const SMangrove = dynamic(() => import('@/simulations/mangrove-saloum-6eme/mangrove-scene'), { ssr: false, loading });
const SDensity = dynamic(() => import('@/simulations/masse-volume-densite-6eme/scene'), { ssr: false, loading });
const SDivision = dynamic(() => import('@/simulations/meiose-mitose-terminale/scene'), { ssr: false, loading });
const SWaterMol = dynamic(() => import('@/simulations/molecule-eau-4eme/water-scene'), { ssr: false, loading });
const SAbaque = dynamic(() => import('@/simulations/numeration-6eme/abaque-scene'), { ssr: false, loading });
const SField = dynamic(() => import('@/simulations/perimetres-aires-6eme/field-scene'), { ssr: false, loading });
const SPhoto = dynamic(() => import('@/simulations/photosynthese-4eme/scene'), { ssr: false, loading });
const SStore = dynamic(() => import('@/simulations/pourcentages-5eme/store-scene'), { ssr: false, loading });
const SCycleProc = dynamic(() => import('@/simulations/procreation-humaine-3eme/cycle-scene'), { ssr: false, loading });
const SCubes = dynamic(() => import('@/simulations/puissances-4eme/cubes-scene'), { ssr: false, loading });
const SFecond = dynamic(() => import('@/simulations/reproduction-animale-4eme/fecondation-scene'), { ssr: false, loading });
const SFlower = dynamic(() => import('@/simulations/reproduction-plantes-4eme/flower-scene'), { ssr: false, loading });
const SLungs = dynamic(() => import('@/simulations/respiration-5eme/lungs-scene'), { ssr: false, loading });
const SMito = dynamic(() => import('@/simulations/respiration-cellulaire-1ere/scene'), { ssr: false, loading });
const SSoil = dynamic(() => import('@/simulations/sol-vivant-5eme/soil-scene'), { ssr: false, loading });
const SCobweb = dynamic(() => import('@/simulations/suites-terminale/scene'), { ssr: false, loading });
const SSym = dynamic(() => import('@/simulations/symetrie-axiale-5eme/scene'), { ssr: false, loading });
const SImmune = dynamic(() => import('@/simulations/systeme-immunitaire-3eme/immune-scene'), { ssr: false, loading });
const SNeurone = dynamic(() => import('@/simulations/systeme-nerveux-3eme/neurone-scene'), { ssr: false, loading });
const SPytha = dynamic(() => import('@/simulations/theoreme-pythagore-4eme/pythagore-scene'), { ssr: false, loading });
const SThermo = dynamic(() => import('@/simulations/thermometre-tropical-6eme/thermometer-scene'), { ssr: false, loading });
const STriangle = dynamic(() => import('@/simulations/triangles-5eme/triangle-scene'), { ssr: false, loading });
const SVih = dynamic(() => import('@/simulations/vih-immunite-terminale/scene'), { ssr: false, loading });

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
    {
      title: '★★ alimentation-animale-6eme',
      node: (
        <SChain
          clicked={['mil', 'criquet']}
          next="margouillat"
          onPick={() => {}}
          showImpact
          counts={{ mil: 120, criquet: 60, margouillat: 24, rapace: 6 }}
          survie={0.6}
        />
      ),
    },
    {
      title: '★★ biodiversite-bandia-2nde',
      node: (
        <SBandia
          zoneName="Savane arborée"
          zoneSub="Réserve de Bandia"
          background="#DCC9A0"
          patch="#8FAE6B"
          draws={[[0, 1, 2], [1, 3], [0, 2, 3]]}
          counts={[4, 3, 2, 2]}
          accumulation={[3, 4, 4]}
          colors={['#16A34A', '#F59E0B', '#2563EB', '#DC2626']}
          names={['Acacia', 'Baobab', 'Palmier', 'Euphorbe']}
          richness={4}
          shannon={1.32}
          total={11}
        />
      ),
    },
    { title: '★★ calcul-litteral-4eme', node: <SAires a={3} b={2} c={4} d={1} spread mode="developper" /> },
    {
      title: '★★ cercle-droites-angles-6eme',
      node: <SProtractor mode="rapporteur" focus="segment" rayon={4} base={0} cursor={50} dirA={0} target={50} caption="Angle AÔB" />,
    },
    { title: '★★ changements-etat-6eme', node: <SHeating time={150} marks={[[0, -10], [60, 0], [120, 0], [180, 45]]} /> },
    { title: '★★ circulation-sanguine-5eme', node: <SHeart bpm={78} focus="double" /> },
    { title: '★★ classification-vivant-6eme', node: <SClassif sample="plume" zoom={2} /> },
    { title: '★★ climat-terminale', node: <SClimat co2={520} albedo={0.3} /> },
    { title: '★★ cycle-vie-6eme', node: <SIncub day={14} sizeMm={38} stage="Formation des plumes" /> },
    { title: '★★ digestion-5eme', node: <SDigest view="tube" organ={2} minutes={20} iodine /> },
    { title: '★★ energie-mecanique-1ere', node: <SEnergie h0={1.2} mass={0.05} mu={0.08} g={9.78} hMax={1.5} xMax={2.5} runId={1} /> },
    { title: '★★ evolution-especes-1ere', node: <SEvol view="frequences" pR={[0.1, 0.22, 0.4, 0.6, 0.78, 0.9]} generation={3} pression={0.6} /> },
    { title: '★★ fractions-decimaux-5eme', node: <SDecimal u={3} d={4} c={7} zoom={1} /> },
    { title: '★★ fractions-simples-6eme', node: <SFraction num={3} den={8} refNum={1} refDen={2} /> },
    {
      title: '★★ genetique-mendel-3eme',
      node: (
        <SPunnett
          view="echiquier"
          label="Nn × Nn"
          sublabel="Croisement de deux hybrides"
          p1="Nn"
          p2="Nn"
          gam1={['N', 'n']}
          gam2={['N', 'n']}
          cells={['NN', 'Nn', 'Nn', 'nn']}
          revealed={4}
          expected={{ NN: 0.25, Nn: 0.5, nn: 0.25 }}
          observed={{ NN: 24, Nn: 51, nn: 25 }}
          total={100}
        />
      ),
    },
    {
      title: '★★ genetique-moleculaire-tle',
      node: (
        <SGene
          phase="traduction"
          nt={21}
          codonIndex={4}
          template="TACGGCTTAAGCCATGACATT"
          mrna="AUGCCGAAUUCGGUACUGUAA"
          aminos={['Met', 'Pro', 'Asn', 'Ser', 'Val', 'Leu', 'STOP']}
          mutIndex={7}
        />
      ),
    },
    { title: '★★ geometrie-espace-terminale', node: <SSpace a={1} b={1} c={1} d={-1.5} /> },
    {
      title: '★★ graphiques-meteo-6eme',
      node: (
        <SMeteo
          cityName="Ziguinchor"
          rain={[0, 0, 0, 0, 1, 15, 89, 241, 163, 42, 2, 0]}
          temp={[21, 21, 22, 22, 24, 27, 28, 28, 28, 28, 26, 22]}
          month={7}
          placed={[0, 1, 2, 3, 4, 5, 6, 7]}
        />
      ),
    },
    {
      title: '★★ hormones-1ere',
      node: (
        <SGlyc
          glycemie={1.6}
          insuline={0.8}
          glucagon={0.1}
          glycogene={0.55}
          historique={[0.9, 1.1, 1.5, 1.8, 1.6, 1.3]}
          diabete={false}
          etat="Après le repas"
        />
      ),
    },
    { title: '★★ integration-terminale', node: <SInteg fnKey="canal" b={3} n={8} mode="riemann" /> },
    {
      title: '★★ loi-dohm-3eme',
      node: <SOhm e={9} rh={20} i={0.18} u={3.6} slope={20} points={[{ i: 0.05, u: 1 }, { i: 0.1, u: 2 }, { i: 0.18, u: 3.6 }]} />,
    },
    {
      title: '★★ mangrove-saloum-6eme',
      node: <SMangrove mangrove niveau={0.8} juveniles={34} recul={0.4} title="Bolong de Toubacouta" subtitle="Quadrat de 1 m² dans les racines" />,
    },
    {
      title: '★★ masse-volume-densite-6eme',
      node: <SDensity label="Cube d'aluminium" color="#94A3B8" metal shape="cube" mass={54} volume={20} v0={50} vMax={100} weighed immersed />,
    },
    { title: '★★ meiose-mitose-terminale', node: <SDivision mode="meiose" phase={2} /> },
    { title: '★★ molecule-eau-4eme', node: <SWaterMol mode="polarite" angle={104.5} /> },
    { title: '★★ numeration-6eme', node: <SAbaque digits={{ m: 2, c: 4, d: 0, u: 7 }} value={2407} grouping={null} groupKey={0} /> },
    { title: '★★ perimetres-aires-6eme', node: <SField longueur={12} largeur={8} compare refLongueur={16} refLargeur={4} /> },
    {
      title: '★★ photosynthese-4eme',
      node: (
        <SPhoto
          light={60}
          rate={28}
          maxRate={40}
          curve={[[0, 0], [20, 14], [40, 23], [60, 28], [80, 31], [100, 32]]}
          points={[[20, 13], [60, 29]]}
        />
      ),
    },
    { title: '★★ pourcentages-5eme', node: <SStore price={12000} rate={25} mode="remise" /> },
    { title: '★★ procreation-humaine-3eme', node: <SCycleProc view="cycle" day={14} devDay={3} phaseLabel="Ovulation" stageLabel="Morula" /> },
    {
      title: '★★ puissances-4eme',
      node: (
        <SCubes
          view="echelle"
          exponent={2}
          marks={[{ label: 'Grain de mil', exp: -3, ok: true }, { label: 'Baobab', exp: 1, ok: true }]}
          notation="1,5 × 10³ m"
        />
      ),
    },
    { title: '★★ reproduction-animale-4eme', node: <SFecond species="tilapia" stage={2} label="Fécondation externe" /> },
    { title: '★★ reproduction-plantes-4eme', node: <SFlower layer={2} vector="insecte" stage="Étamines dégagées" /> },
    { title: '★★ respiration-5eme', node: <SLungs view="thorax" freq={16} /> },
    { title: '★★ respiration-cellulaire-1ere', node: <SMito view="mitochondrie" glucose={1} aerobie /> },
    {
      title: '★★ sol-vivant-5eme',
      node: <SSoil mode="coupe" soil="deck" title="Sol deck" subtitle="Bassin arachidier" horizon="humus" percole={62} duree={45} />,
    },
    { title: '★★ suites-terminale', node: <SCobweb u0={2} a={0.6} b={4} unit="milliers" dec={1} limit={10} verdict="Suite convergente vers 10" /> },
    { title: '★★ symetrie-axiale-5eme', node: <SSym angle={20} mIndex={1} fold={false} /> },
    { title: '★★ systeme-immunitaire-3eme', node: <SImmune view="memoire" peauIntacte={false} rappel jour={14} taux={820} /> },
    { title: '★★ systeme-nerveux-3eme', node: <SNeurone view="arc" myelin speed={60} reflexMs={45} /> },
    { title: '★★ theoreme-pythagore-4eme', node: <SPytha a={3} b={4} mode="aires" cTest={5} transfer /> },
    { title: '★★ thermometre-tropical-6eme', node: <SThermo temperature={34} milieuLabel="Sable au soleil" milieuKind="sable" /> },
    { title: '★★ triangles-5eme', node: <STriangle a={6} b={5} c={4} nature="Triangle quelconque" droites="medianes" showReport /> },
    { title: '★★ vih-immunite-terminale', node: <SVih view="courbes" mois={72} traitement debutTraitement={60} /> },
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
