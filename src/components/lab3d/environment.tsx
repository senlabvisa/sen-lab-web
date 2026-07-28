'use client';

/**
 * lab3d/environment — décor de paillasse partagé.
 *
 * Donne du « poids » physique aux scènes : une vraie paillasse posée, un
 * repère millimétré pour les graphes, un statif pour la chimie/optique.
 * À placer dans un <Canvas> (via LabScene).
 */

import { useMemo } from 'react';
import { DoubleSide, type Vector3Tuple } from 'three';
import { Metal } from './materials';

/** Paillasse de labo (plateau + léger biseau). Pose les objets dessus. */
export function LabBench({ y = -1.5, color = '#E8E2D6', size = 22 }: { y?: number; color?: string; size?: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} side={DoubleSide} />
      </mesh>
      {/* fine plinthe pour donner de l'épaisseur au plateau */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[size, 0.12, size]} />
        <meshStandardMaterial color="#C9C1B0" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Repère millimétré (plan vertical) pour les graphes — papier blanc + grille. */
export function GraphPaper({
  width = 6,
  height = 4.5,
  step = 0.5,
  z = -0.05,
  color = '#CBD5E1',
}: {
  width?: number;
  height?: number;
  step?: number;
  z?: number;
  color?: string;
}) {
  const lines = useMemo(() => {
    const segs: Vector3Tuple[][] = [];
    const x0 = -width / 2;
    const x1 = width / 2;
    const y0 = -height / 2;
    const y1 = height / 2;
    for (let x = x0; x <= x1 + 1e-6; x += step) segs.push([[x, y0, z], [x, y1, z]]);
    for (let y = y0; y <= y1 + 1e-6; y += step) segs.push([[x0, y, z], [x1, y, z]]);
    return segs;
  }, [width, height, step, z]);

  return (
    <group>
      <mesh position={[0, 0, z - 0.02]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
      </mesh>
      {lines.map((s, i) => (
        <Segment key={i} a={s[0]} b={s[1]} color={color} width={0.006} />
      ))}
    </group>
  );
}

/** Segment fin (réutilisé pour grilles, repères). Cylindre = compatible bas de gamme. */
export function Segment({ a, b, color = '#94A3B8', width = 0.01 }: { a: Vector3Tuple; b: Vector3Tuple; color?: string; width?: number }) {
  const { pos, len, rot } = useMemo(() => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const mid: Vector3Tuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    // orienter un cylindre (axe Y) le long de AB
    const theta = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    const phi = Math.atan2(dx, dz);
    return { pos: mid, len: length, rot: [Math.PI / 2 - theta, phi, 0] as Vector3Tuple };
  }, [a, b]);
  return (
    <mesh position={pos} rotation={rot}>
      <cylinderGeometry args={[width, width, len, 6]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

/** Statif de labo : pied + tige verticale + noix + pince (support universel). */
export function Stand({ position = [0, 0, 0], height = 3.2 }: { position?: Vector3Tuple; height?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, -height / 2 + 0.05, 0]} castShadow>
        <boxGeometry args={[1.6, 0.12, 1]} />
        <Metal color="#6B7280" roughness={0.45} />
      </mesh>
      <mesh position={[-0.55, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, height, 16]} />
        <Metal color="#AEB6C2" roughness={0.3} />
      </mesh>
      <mesh position={[-0.2, height / 2 - 0.4, 0]} castShadow>
        <boxGeometry args={[0.8, 0.16, 0.16]} />
        <Metal color="#9AA3AF" />
      </mesh>
    </group>
  );
}
