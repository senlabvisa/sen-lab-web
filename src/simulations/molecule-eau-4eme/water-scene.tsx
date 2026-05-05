'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Group, Quaternion, Vector3 } from 'three';

/**
 * Scène 3D — molécule d'eau H₂O.
 *
 * Atome O au centre (rouge, code couleur CPK), deux atomes H (blancs)
 * placés à 104,5° (angle réel de la molécule). Liaisons figurées par
 * des cylindres. L'élève peut orbiter, zoomer, panner.
 *
 * Note : ce fichier importe `three`, `@react-three/fiber`, `@react-three/drei`.
 * Il doit être chargé via `next/dynamic({ ssr: false })` depuis le module
 * pédagogique pour que Three.js ne tombe pas dans le bundle des autres TPs.
 */

const ANGLE_DEG = 104.5;
const BOND_LEN = 1.6;
const HALF_RAD = ((ANGLE_DEG / 2) * Math.PI) / 180;

const O_POS = new Vector3(0, 0.4, 0);
const H1_POS = new Vector3(
  Math.sin(HALF_RAD) * BOND_LEN,
  0.4 - Math.cos(HALF_RAD) * BOND_LEN,
  0,
);
const H2_POS = new Vector3(
  -Math.sin(HALF_RAD) * BOND_LEN,
  0.4 - Math.cos(HALF_RAD) * BOND_LEN,
  0,
);

const Y_UP = new Vector3(0, 1, 0);

function Bond({ from, to }: { from: Vector3; to: Vector3 }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new Vector3().subVectors(to, from);
    const len = dir.length();
    const mid = new Vector3().addVectors(from, to).multiplyScalar(0.5);
    const q = new Quaternion().setFromUnitVectors(Y_UP, dir.clone().normalize());
    return { position: mid, quaternion: q, length: len };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.12, 0.12, length, 16]} />
      <meshStandardMaterial color="#9CA3AF" roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

function Atom({
  position,
  radius,
  color,
  label,
  labelColor,
}: {
  position: Vector3;
  radius: number;
  color: string;
  label: string;
  labelColor: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
      </mesh>
      <Html
        distanceFactor={8}
        position={[0, radius + 0.25, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <span
          className="select-none rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold shadow-soft ring-1 ring-ink/10"
          style={{ color: labelColor }}
        >
          {label}
        </span>
      </Html>
    </group>
  );
}

function MoleculeGroup({ spinning }: { spinning: boolean }) {
  const groupRef = useRef<Group>(null);
  useFrame((_state, delta) => {
    if (spinning && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      <Atom position={O_POS} radius={0.65} color="#DC2626" label="O" labelColor="#991B1B" />
      <Atom position={H1_POS} radius={0.38} color="#F4F4F5" label="H" labelColor="#3F3F46" />
      <Atom position={H2_POS} radius={0.38} color="#F4F4F5" label="H" labelColor="#3F3F46" />
      <Bond from={O_POS} to={H1_POS} />
      <Bond from={O_POS} to={H2_POS} />
    </group>
  );
}

export type WaterSceneProps = {
  spinning?: boolean;
  onInteract?: () => void;
};

export default function WaterScene({ spinning = false, onInteract }: WaterSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 5.5], fov: 45 }}
      dpr={[1, 2]}
      onPointerDown={onInteract}
      onWheel={onInteract}
    >
      <color attach="background" args={['#F5F3FF']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={0.85} castShadow={false} />
      <directionalLight position={[-3, -2, -4]} intensity={0.25} />
      <MoleculeGroup spinning={spinning} />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={10}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
