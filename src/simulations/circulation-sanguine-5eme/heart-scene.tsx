'use client';

import { createRef, useEffect, useMemo, useRef, useState } from 'react';
import { CatmullRomCurve3, Group, Mesh, Vector3, type Vector3Tuple } from 'three';
import {
  AlongPath,
  Animate,
  AutoNarration,
  CompareCard,
  DimGroup,
  FocusHalo,
  LabScene,
  LegendCard,
  Readout,
  SceneLabel,
  Tag3D,
  Wire,
  easeInOut,
  easeOutBack,
  easeOutCubic,
  linear,
  oscillate,
} from '@/components/lab3d';

/**
 * Scène 3D — le cœur et la double circulation sanguine (SVT, 5ème).
 *
 * Le cœur est représenté en coupe schématique (comme dans le manuel) :
 * cœur DROIT à gauche de l'image, cœur GAUCHE à droite, séparés par la
 * cloison. Deux boucles fermées partent des ventricules :
 *   • petite circulation  : ventricule droit → poumons → oreillette gauche
 *   • grande circulation  : ventricule gauche → organes → oreillette droite
 *
 * Enrichissements pédagogiques (kit lab3d) :
 *   • <AlongPath>     — les hématies avancent à VITESSE CONSTANTE le long des
 *                       vaisseaux (reparamétrage par longueur d'arc : plus de
 *                       ralentissement dans les virages).
 *   • <AutoNarration> — le trajet du sang est déroulé étape par étape ; l'élève
 *                       sait toujours où il en est dans le circuit.
 *   • <DimGroup>      — quand on suit la petite circulation, la grande est
 *                       atténuée (et inversement) : les deux circuits deviennent
 *                       enfin distincts.
 *   • <FocusHalo>     — halo sur la cavité ou l'organe dont parle la consigne.
 *   • <LegendCard>    — sang riche / pauvre en dioxygène distingués par la FORME
 *                       (disque plein / anneau) autant que par la couleur.
 *   • <CompareCard>   — débit au repos comparé au débit à la fréquence choisie.
 *
 * Physiologie conservée : le battement suit réellement la fréquence choisie
 * (systole ventriculaire ≈ 35 % du cycle, contraction rapide puis relâchement
 * lent, systole auriculaire juste avant) et le débit cardiaque affiché vaut
 * Q = VES × Fc avec VES = 70 mL.
 */

export type Focus = 'double' | 'pulmonaire' | 'generale';
export type HeartSceneProps = { bpm: number; focus?: Focus };

const BLUE = '#2563EB'; // sang pauvre en dioxygène — hématies en ANNEAU
const RED = '#DC2626'; // sang riche en dioxygène — hématies en DISQUE PLEIN
const DIM = '#94A3B8'; // circuit mis en retrait (légende)
const N_CELLS = 6; // hématies par tronçon
const VES_ML = 70; // volume d'éjection systolique (mL)
const BPM_REPOS = 70; // fréquence de référence, au repos
const DEBIT_REPOS = (BPM_REPOS * VES_ML) / 1000; // 4,9 L/min
const SPEED = 0.9; // vitesse du sang à 70 bpm (unités de scène / s)

/** Ventricule droit → poumons (artère pulmonaire, sang pauvre en O₂). */
const P_PULM_OUT: Vector3Tuple[] = [
  [-0.48, 0.12, 0.12],
  [-0.72, 0.78, 0.06],
  [-0.9, 1.3, 0],
  [-1.02, 1.72, 0],
];
/** Poumons → oreillette gauche (veines pulmonaires, sang riche en O₂). */
const P_PULM_IN: Vector3Tuple[] = [
  [1.02, 1.72, 0],
  [0.9, 1.28, 0.04],
  [0.72, 0.92, 0.08],
  [0.55, 0.64, 0.12],
];
/** Ventricule gauche → organes (aorte + artères, sang riche en O₂). */
const P_SYS_OUT: Vector3Tuple[] = [
  [0.5, 0.18, 0.1],
  [0.82, 1.02, 0],
  [1.55, 1.24, 0],
  [2.16, 0.6, 0],
  [2.28, -1.0, 0],
  [1.72, -1.92, 0],
  [0.95, -2.24, 0],
];
/** Organes → oreillette droite (veines caves, sang pauvre en O₂). */
const P_SYS_IN: Vector3Tuple[] = [
  [-0.95, -2.24, 0],
  [-1.72, -1.92, 0],
  [-2.28, -1.0, 0],
  [-2.16, 0.2, 0],
  [-1.45, 0.66, 0],
  [-0.64, 0.56, 0.08],
];

type Circuit = 'petite' | 'grande';

/** Une étape du trajet du sang : ce que dit la narration + où regarder. */
type StepDef = {
  label: string;
  detail: string;
  hold: number;
  circuit: Circuit;
  halo: Vector3Tuple;
  radius: number;
};

/** Le trajet complet, dans l'ordre où le sang le parcourt. */
const STEPS: StepDef[] = [
  {
    label: 'Oreillette droite',
    detail: "Le sang pauvre en dioxygène revient des organes par les veines caves.",
    hold: 3.4,
    circuit: 'grande',
    halo: [-0.52, 0.5, 0.6],
    radius: 0.5,
  },
  {
    label: 'Ventricule droit',
    detail: "Il se contracte et pousse le sang dans l'artère pulmonaire, vers les poumons.",
    hold: 3.6,
    circuit: 'petite',
    halo: [-0.42, -0.42, 0.6],
    radius: 0.68,
  },
  {
    label: 'Poumons',
    detail: 'Le sang prend le dioxygène de l’air et rejette le dioxyde de carbone : il devient rouge vif.',
    hold: 4,
    circuit: 'petite',
    halo: [0, 2.1, 0.5],
    radius: 1.85,
  },
  {
    label: 'Oreillette gauche',
    detail: 'Le sang riche en dioxygène revient au cœur par les veines pulmonaires.',
    hold: 3.4,
    circuit: 'petite',
    halo: [0.5, 0.5, 0.6],
    radius: 0.48,
  },
  {
    label: 'Ventricule gauche',
    detail: "Sa paroi est épaisse : il envoie le sang dans tout le corps par l'aorte.",
    hold: 3.8,
    circuit: 'grande',
    halo: [0.42, -0.45, 0.6],
    radius: 0.72,
  },
  {
    label: 'Organes',
    detail: 'Muscles, reins, cerveau… consomment le dioxygène : le sang redevient pauvre.',
    hold: 4,
    circuit: 'grande',
    halo: [0, -2.55, 0.7],
    radius: 1.6,
  },
];

/** Longueur d'un tronçon, calculée comme <AlongPath> construit sa courbe. */
function pathLength(points: Vector3Tuple[]): number {
  return new CatmullRomCurve3(
    points.map((p) => new Vector3(...p)),
    false,
    'catmullrom',
    0.5,
  ).getLength();
}

/**
 * Paquet d'hématies qui remonte un vaisseau à vitesse constante.
 * Une <AlongPath> par hématie, décalée de i/n : le convoi reste régulier et la
 * courbe est parcourue à vitesse d'arc constante (pas de à-coup dans les virages).
 * La FORME distingue les deux sangs autant que la couleur (élèves daltoniens).
 */
function FlowCells({
  points,
  kind,
  duration,
  restartKey,
}: {
  points: Vector3Tuple[];
  kind: 'riche' | 'pauvre';
  duration: number;
  restartKey: number;
}) {
  const cells = useMemo(() => Array.from({ length: N_CELLS }, () => createRef<Mesh>()), []);
  const color = kind === 'riche' ? RED : BLUE;

  return (
    <group>
      {cells.map((cell, i) => (
        <mesh key={i} ref={cell} scale={kind === 'riche' ? [1, 1, 0.5] : [1, 1, 0.8]}>
          {kind === 'riche' ? (
            <sphereGeometry args={[0.075, 14, 10]} />
          ) : (
            <torusGeometry args={[0.058, 0.026, 8, 16]} />
          )}
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.35} />
        </mesh>
      ))}
      {cells.map((cell, i) => (
        <AlongPath
          key={`path-${i}`}
          objectRef={cell}
          points={points}
          duration={duration}
          easing={linear}
          loop
          offset={i / N_CELLS}
          restartKey={restartKey}
        />
      ))}
    </group>
  );
}

/**
 * Tout le contenu 3D. Composant interne : il est enfant de <LabScene>, donc il a
 * le droit d'utiliser les primitives animées (useFrame). Son état ne change qu'au
 * changement d'étape de narration (≈ toutes les 3,5 s), jamais par frame.
 */
function HeartRig({ bpm, focus }: { bpm: number; focus: Focus }) {
  const atria = useRef<Group>(null);
  const ventricles = useRef<Group>(null);
  const lungs = useRef<Group>(null);
  const [narrIdx, setNarrIdx] = useState(0);

  const showPulm = focus !== 'generale';
  const showSys = focus !== 'pulmonaire';
  const debit = (bpm * VES_ML) / 1000; // L/min

  // Quand l'élève isole un circuit, la narration ne raconte que ce circuit.
  const steps = useMemo(
    () =>
      focus === 'double'
        ? STEPS
        : STEPS.filter((s) => (focus === 'pulmonaire' ? s.circuit === 'petite' : s.circuit === 'grande')),
    [focus],
  );
  const narration = useMemo(
    () => steps.map((s) => ({ label: s.label, detail: s.detail, hold: s.hold })),
    [steps],
  );

  useEffect(() => setNarrIdx(0), [focus]);
  const current = steps[Math.min(narrIdx, steps.length - 1)] ?? STEPS[0];

  // On atténue ce dont la consigne ne parle pas : les deux circuits se séparent.
  const dimPetite = focus === 'generale' || (focus === 'double' && current.circuit === 'grande');
  const dimGrande = focus === 'pulmonaire' || (focus === 'double' && current.circuit === 'petite');

  // Vitesse d'arc identique partout : la durée d'un tronçon suit sa longueur.
  const lengths = useMemo(
    () => ({
      pulmOut: pathLength(P_PULM_OUT),
      pulmIn: pathLength(P_PULM_IN),
      sysOut: pathLength(P_SYS_OUT),
      sysIn: pathLength(P_SYS_IN),
    }),
    [],
  );
  const speed = SPEED * (bpm / BPM_REPOS); // le sang va plus vite quand le cœur accélère

  const ratio = debit / DEBIT_REPOS;
  const verdict =
    bpm > BPM_REPOS + 5
      ? `Ton cœur envoie ${ratio.toFixed(1).replace('.', ',')} fois plus de sang chaque minute : tes muscles reçoivent plus de dioxygène.`
      : bpm < BPM_REPOS - 5
        ? 'Le cœur ralentit (sommeil, calme) : le débit baisse dans les mêmes proportions.'
        : 'Fais glisser la fréquence : le débit change exactement comme elle.';

  return (
    <>
      {/* ═════════════ PETITE CIRCULATION — cœur → poumons → cœur ═════════════ */}
      <DimGroup dimmed={dimPetite} opacity={0.12}>
        {/* Trachée et bronches */}
        <mesh position={[0, 2.78, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.55, 14]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.6} />
        </mesh>
        {([-1.05, 1.05] as number[]).map((x) => (
          <mesh key={x} position={[x / 2, 2.48, 0]} rotation={[0, 0, x > 0 ? -0.9 : 0.9]}>
            <cylinderGeometry args={[0.06, 0.06, 0.6, 12]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.6} />
          </mesh>
        ))}
        {/* Les deux poumons : ils se gonflent et se dégonflent (≈ 15 respirations/min) */}
        <group ref={lungs}>
          {([-1.05, 1.05] as number[]).map((x) => (
            <mesh key={x} position={[x, 2.12, 0]} scale={[0.78, 1.12, 0.75]} castShadow>
              <sphereGeometry args={[0.62, 28, 22]} />
              <meshStandardMaterial color="#F9A8D4" roughness={0.65} transparent opacity={0.88} />
            </mesh>
          ))}
        </group>

        <Wire points={P_PULM_OUT} color={BLUE} radius={0.07} />
        <Wire points={P_PULM_IN} color={RED} radius={0.07} />
        {showPulm && (
          <>
            <FlowCells points={P_PULM_OUT} kind="pauvre" duration={lengths.pulmOut / speed} restartKey={bpm} />
            <FlowCells points={P_PULM_IN} kind="riche" duration={lengths.pulmIn / speed} restartKey={bpm} />
          </>
        )}
      </DimGroup>
      <Tag3D position={[0, 2.12, 0]} label="Poumons" tone="svt" />

      {/* ═════════════ GRANDE CIRCULATION — cœur → organes → cœur ═════════════ */}
      <DimGroup dimmed={dimGrande} opacity={0.12}>
        <group position={[0, -2.55, 0]}>
          <mesh scale={[1.95, 0.6, 0.85]} castShadow>
            <sphereGeometry args={[0.72, 30, 20]} />
            <meshStandardMaterial color="#C2703F" roughness={0.78} />
          </mesh>
          <mesh position={[-0.8, 0.3, 0.2]} scale={[0.85, 0.62, 0.7]} castShadow>
            <sphereGeometry args={[0.42, 20, 16]} />
            <meshStandardMaterial color="#A55A31" roughness={0.8} />
          </mesh>
          <mesh position={[0.8, 0.3, 0.2]} scale={[0.85, 0.62, 0.7]} castShadow>
            <sphereGeometry args={[0.42, 20, 16]} />
            <meshStandardMaterial color="#A55A31" roughness={0.8} />
          </mesh>
        </group>

        <Wire points={P_SYS_OUT} color={RED} radius={0.078} />
        <Wire points={P_SYS_IN} color={BLUE} radius={0.078} />
        {showSys && (
          <>
            <FlowCells points={P_SYS_OUT} kind="riche" duration={lengths.sysOut / speed} restartKey={bpm} />
            <FlowCells points={P_SYS_IN} kind="pauvre" duration={lengths.sysIn / speed} restartKey={bpm} />
          </>
        )}
      </DimGroup>
      <Tag3D position={[0, -3.25, 0]} label="Organes (muscles, reins, cerveau…)" tone="svt" />

      {/* ═════════════ Cœur en coupe (cœur droit à gauche de l'image) ═════════════ */}
      <group>
        {/* Oreillettes : elles se contractent JUSTE AVANT les ventricules */}
        <group ref={atria}>
          <mesh position={[-0.52, 0.5, 0]} scale={[1, 0.85, 0.9]} castShadow>
            <sphereGeometry args={[0.34, 24, 18]} />
            <meshStandardMaterial color="#7BA9E0" roughness={0.5} />
          </mesh>
          <mesh position={[0.5, 0.5, 0]} scale={[1, 0.85, 0.9]} castShadow>
            <sphereGeometry args={[0.32, 24, 18]} />
            <meshStandardMaterial color="#D95757" roughness={0.5} />
          </mesh>
        </group>
        {/* Ventricules : droit à paroi fine, gauche à paroi épaisse */}
        <group ref={ventricles}>
          <mesh position={[-0.42, -0.42, 0]} scale={[1, 1.25, 0.9]} castShadow>
            <sphereGeometry args={[0.46, 28, 22]} />
            <meshStandardMaterial color="#5A8FD6" roughness={0.5} />
          </mesh>
          <mesh position={[0.42, -0.45, 0]} scale={[1, 1.3, 0.95]} castShadow>
            <sphereGeometry args={[0.52, 28, 22]} />
            <meshStandardMaterial color="#C33B3B" roughness={0.5} />
          </mesh>
          {/* Pointe du cœur (apex) */}
          <mesh position={[0.06, -1.16, 0]} rotation={[Math.PI, 0, 0.14]} castShadow>
            <coneGeometry args={[0.48, 0.62, 24]} />
            <meshStandardMaterial color="#B93535" roughness={0.58} />
          </mesh>
        </group>
        {/* Cloison : les deux sangs ne se mélangent jamais */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.06, 1.45, 0.66]} />
          <meshStandardMaterial color="#8F2727" roughness={0.75} />
        </mesh>
      </group>

      {/* ═════════════ Battement réel + respiration ═════════════ */}
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime;
          const cycle = (t * (bpm / 60)) % 1; // 1 cycle = 1 battement, à la fréquence choisie

          // Systole ventriculaire ≈ 35 % du cycle : contraction RAPIDE (avec un
          // petit dépassement, comme un muscle qui se serre) puis relâchement LENT.
          const kV =
            cycle < 0.12
              ? easeOutBack(cycle / 0.12)
              : cycle < 0.35
                ? 1
                : 1 - easeInOut((cycle - 0.35) / 0.65);
          ventricles.current?.scale.setScalar(1 - 0.12 * kV);

          // Systole auriculaire : les oreillettes se vident juste avant les ventricules.
          const aRel = (cycle + 0.14) % 1; // 0 → début de la contraction des oreillettes
          const kA =
            aRel < 0.05 ? easeOutCubic(aRel / 0.05) : aRel < 0.14 ? 1 - easeInOut((aRel - 0.05) / 0.09) : 0;
          atria.current?.scale.setScalar(1 - 0.09 * kA);

          // Respiration : ≈ 15 mouvements par minute → une période de 4 s.
          const resp = oscillate(t, { amplitude: 0.06, period: 4, damping: 0, center: 1 }).value;
          const g = lungs.current;
          if (g) for (const poumon of g.children) poumon.scale.set(0.78 * resp, 1.12 * resp, 0.75 * resp);
        }}
      />

      {/* ═════════════ « Tu es ici » dans le circuit ═════════════ */}
      <FocusHalo position={current.halo} radius={current.radius} tone="svt" speed={0.5} />

      <AutoNarration
        position={[-4.75, 1.15, 0]}
        title="Le trajet du sang"
        tone="svt"
        steps={narration}
        resetKey={focus}
        onStepChange={setNarrIdx}
        width={218}
        distanceFactor={6.5}
      />

      {/* ═════════════ Étiquettes ═════════════ */}
      <Tag3D position={[-1.02, 1.0, 0.3]} label="Oreillette droite" tone="physique" />
      <Tag3D position={[1.02, 1.0, 0.3]} label="Oreillette gauche" tone="neutral" />
      <Tag3D position={[-1.35, -0.62, 0.3]} label="Ventricule droit" tone="physique" />
      <Tag3D position={[1.38, -0.62, 0.3]} label="Ventricule gauche" tone="neutral" />

      {showPulm && (
        <>
          <Tag3D position={[-1.75, 1.32, 0]} label="Artère pulmonaire" tone="physique" />
          <Tag3D position={[1.68, 1.72, 0]} label="Veines pulmonaires" tone="neutral" />
          <Tag3D position={[0, 1.52, 0.3]} label="Le sang prend l'O₂ et rejette le CO₂" tone="svt" />
        </>
      )}
      {showSys && (
        <>
          <Tag3D position={[2.12, 1.02, 0]} label="Aorte" tone="neutral" />
          <Tag3D position={[-2.95, -0.55, 0]} label="Veines caves" tone="physique" />
          <Tag3D position={[0, -1.72, 0.4]} label="Les organes consomment l'O₂" tone="svt" />
        </>
      )}

      <SceneLabel
        position={[0, 3.7, 0]}
        title={`${bpm} battements / minute`}
        subtitle={
          focus === 'pulmonaire'
            ? 'Petite circulation · cœur → poumons → cœur'
            : focus === 'generale'
              ? 'Grande circulation · cœur → organes → cœur'
              : 'Double circulation · le sang passe 2 fois par le cœur'
        }
        tone="svt"
      />

      <CompareCard
        position={[4.65, 1.95, 0]}
        title="Débit cardiaque"
        tone="svt"
        left={{ label: `Au repos (${BPM_REPOS} bpm)`, value: DEBIT_REPOS, unit: 'L/min' }}
        right={{ label: `Toi (${bpm} bpm)`, value: debit, unit: 'L/min' }}
        precision={1}
        deltaLabel="Écart"
        verdict={verdict}
        width={226}
        distanceFactor={6.5}
      />

      <Readout position={[4.65, 0.15, 0]} value={debit.toFixed(1)} unit="L/min" caption="débit cardiaque" />

      <LegendCard
        position={[4.65, -1.55, 0]}
        tone="svt"
        title="Comment lire la scène"
        items={[
          { label: 'Sang riche en dioxygène', color: RED, shape: 'dot', note: 'disque plein' },
          { label: 'Sang pauvre en dioxygène', color: BLUE, shape: 'ring', note: 'anneau' },
          { label: 'Circuit mis en retrait', color: DIM, shape: 'dashed', note: 'devient transparent' },
        ]}
        width={210}
        distanceFactor={6.5}
      />
    </>
  );
}

export default function HeartScene({ bpm, focus = 'double' }: HeartSceneProps) {
  // Aucun useFrame ici : ce composant retourne <LabScene>, il est HORS du Canvas.
  return (
    <LabScene cameraPosition={[0, 0.1, 11.5]} background="#FFE8EA" minDistance={6} maxDistance={20} groundY={null}>
      <HeartRig bpm={bpm} focus={focus} />
    </LabScene>
  );
}
