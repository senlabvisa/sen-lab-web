'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { CatmullRomCurve3, Group, Vector3, type Vector3Tuple } from 'three';
import { LabScene, Wire, SceneLabel, Tag3D, Readout, Animate } from '@/components/lab3d';

/**
 * Scène 3D — le cœur et la double circulation sanguine (SVT, 5ème).
 *
 * Le cœur est représenté en coupe schématique (comme dans le manuel) :
 * cœur DROIT à gauche de l'image, cœur GAUCHE à droite, séparés par la
 * cloison. Deux boucles fermées partent des ventricules :
 *   • petite circulation  : ventricule droit → poumons → oreillette gauche
 *   • grande circulation  : ventricule gauche → organes → oreillette droite
 * Les hématies animées le long des vaisseaux (<Wire> + <Animate>) changent
 * de couleur en traversant les poumons (bleu → rouge) et les organes
 * (rouge → bleu). Le battement suit réellement la fréquence choisie
 * (systole ≈ 35 % du cycle) et le débit cardiaque affiché vaut
 * Q = VES × Fc avec VES = 70 mL.
 */

export type Focus = 'double' | 'pulmonaire' | 'generale';
export type HeartSceneProps = { bpm: number; focus?: Focus };

const BLUE = '#2563EB'; // sang pauvre en dioxygène
const RED = '#DC2626'; // sang riche en dioxygène
const DIM = '#CBD5E1'; // vaisseau mis en retrait
const N_CELLS = 7; // hématies par tronçon
const VES_ML = 70; // volume d'éjection systolique (mL)

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

const _v = new Vector3();

/** Répartit les hématies d'un groupe le long de la courbe (boucle infinie). */
function flowAlong(g: Group | null, curve: CatmullRomCurve3, len: number, dist: number) {
  if (!g) return;
  const n = g.children.length;
  for (let i = 0; i < n; i++) {
    const u = (((dist / len + i / n) % 1) + 1) % 1;
    curve.getPoint(u, _v);
    g.children[i].position.copy(_v);
  }
}

/** Petit paquet d'hématies (disques aplatis) qui circulera le long d'un vaisseau. */
function Cells({ color, groupRef, visible }: { color: string; groupRef: RefObject<Group>; visible: boolean }) {
  return (
    <group ref={groupRef} visible={visible}>
      {Array.from({ length: N_CELLS }).map((_, i) => (
        <mesh key={i} scale={[1, 1, 0.55]}>
          <sphereGeometry args={[0.062, 12, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export default function HeartScene({ bpm, focus = 'double' }: HeartSceneProps) {
  const heart = useRef<Group>(null);
  const gPulmOut = useRef<Group>(null);
  const gPulmIn = useRef<Group>(null);
  const gSysOut = useRef<Group>(null);
  const gSysIn = useRef<Group>(null);
  const dist = useRef(0);

  const showPulm = focus !== 'generale';
  const showSys = focus !== 'pulmonaire';
  const debit = (bpm * VES_ML) / 1000; // L/min

  const paths = useMemo(() => {
    const mk = (pts: Vector3Tuple[]) => new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
    const a = mk(P_PULM_OUT);
    const b = mk(P_PULM_IN);
    const c = mk(P_SYS_OUT);
    const d = mk(P_SYS_IN);
    return { a, b, c, d, la: a.getLength(), lb: b.getLength(), lc: c.getLength(), ld: d.getLength() };
  }, []);

  return (
    <LabScene cameraPosition={[0, 0.1, 9.5]} background="#FFE8EA" minDistance={5} maxDistance={17} groundY={null}>
      {/* ───────────── Poumons (petite circulation) ───────────── */}
      <mesh position={[0, 2.78, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.55, 14]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.6} />
      </mesh>
      {([-1.05, 1.05] as number[]).map((x) => (
        <group key={x}>
          <mesh position={[x / 2, 2.48, 0]} rotation={[0, 0, x > 0 ? -0.9 : 0.9]}>
            <cylinderGeometry args={[0.06, 0.06, 0.6, 12]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.6} />
          </mesh>
          <mesh position={[x, 2.12, 0]} scale={[0.78, 1.12, 0.75]} castShadow>
            <sphereGeometry args={[0.62, 28, 22]} />
            <meshStandardMaterial color="#F9A8D4" roughness={0.65} transparent opacity={0.88} />
          </mesh>
        </group>
      ))}
      <Tag3D position={[0, 2.12, 0]} label="Poumons" tone="svt" />

      {/* ───────────── Organes du corps (grande circulation) ───────────── */}
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
      <Tag3D position={[0, -3.25, 0]} label="Organes (muscles, reins, cerveau…)" tone="svt" />

      {/* ───────────── Vaisseaux ───────────── */}
      <Wire points={P_PULM_OUT} color={showPulm ? BLUE : DIM} radius={0.07} />
      <Wire points={P_PULM_IN} color={showPulm ? RED : DIM} radius={0.07} />
      <Wire points={P_SYS_OUT} color={showSys ? RED : DIM} radius={0.078} />
      <Wire points={P_SYS_IN} color={showSys ? BLUE : DIM} radius={0.078} />

      {/* ───────────── Cœur en coupe (droit à gauche de l'image) ───────────── */}
      <group ref={heart}>
        {/* Oreillette droite / gauche */}
        <mesh position={[-0.52, 0.5, 0]} scale={[1, 0.85, 0.9]} castShadow>
          <sphereGeometry args={[0.34, 24, 18]} />
          <meshStandardMaterial color="#7BA9E0" roughness={0.5} />
        </mesh>
        <mesh position={[0.5, 0.5, 0]} scale={[1, 0.85, 0.9]} castShadow>
          <sphereGeometry args={[0.32, 24, 18]} />
          <meshStandardMaterial color="#D95757" roughness={0.5} />
        </mesh>
        {/* Ventricule droit (paroi fine) / gauche (paroi épaisse) */}
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
        {/* Cloison : les deux sangs ne se mélangent jamais */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.06, 1.45, 0.66]} />
          <meshStandardMaterial color="#8F2727" roughness={0.75} />
        </mesh>
      </group>

      {/* ───────────── Hématies animées ───────────── */}
      <Cells color={BLUE} groupRef={gPulmOut} visible={showPulm} />
      <Cells color={RED} groupRef={gPulmIn} visible={showPulm} />
      <Cells color={RED} groupRef={gSysOut} visible={showSys} />
      <Cells color={BLUE} groupRef={gSysIn} visible={showSys} />

      <Animate
        fn={(state, delta) => {
          // Battement : systole ≈ 35 % du cycle, à la fréquence réelle choisie.
          const phase = (state.clock.elapsedTime * (bpm / 60)) % 1;
          const k = phase < 0.35 ? Math.sin((phase / 0.35) * Math.PI) : 0;
          heart.current?.scale.setScalar(1 - 0.1 * k);
          // Le sang circule d'autant plus vite que le cœur bat vite.
          dist.current += delta * 0.9 * (bpm / 70);
          flowAlong(gPulmOut.current, paths.a, paths.la, dist.current);
          flowAlong(gPulmIn.current, paths.b, paths.lb, dist.current);
          flowAlong(gSysOut.current, paths.c, paths.lc, dist.current);
          flowAlong(gSysIn.current, paths.d, paths.ld, dist.current);
        }}
      />

      {/* ───────────── Étiquettes ───────────── */}
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
        position={[0, 3.6, 0]}
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
      <Readout position={[3.55, 0.15, 0]} value={debit.toFixed(1)} unit="L/min" caption="débit cardiaque" />
    </LabScene>
  );
}
