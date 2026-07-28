'use client';

/**
 * lab3d/plot — tracé de fonctions et vecteurs en 3D.
 *
 * Remplace le hack « courbe = 50 petites sphères » par de vraies lignes
 * lisses (drei <Line>), des axes fléchés gradués et des vecteurs avec
 * pointe conique. Pour : fonctions, dérivées, suites, complexes, vecteurs,
 * caractéristiques U/I, trajectoires.
 */

import { useMemo, type ReactNode } from 'react';
import { Line } from '@react-three/drei';
import { Quaternion, Vector3, type Vector3Tuple } from 'three';

const UP = new Vector3(0, 1, 0);

// ──────────────────────────────────────────────────────────────────────
// Flèche orientée (vecteur, axe)
// ──────────────────────────────────────────────────────────────────────

export function Arrow3D({
  from = [0, 0, 0],
  to,
  color = '#7C3AED',
  radius = 0.035,
  headLength = 0.28,
}: {
  from?: Vector3Tuple;
  to: Vector3Tuple;
  color?: string;
  radius?: number;
  headLength?: number;
}) {
  const { mid, len, quat } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length() || 1e-6;
    const q = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    return { mid: a.clone().add(b).multiplyScalar(0.5), len: length, quat: q };
  }, [from, to]);
  const shaftLen = Math.max(0.001, len - headLength);
  return (
    <group position={[mid.x, mid.y, mid.z]} quaternion={quat}>
      {/* hampe (centrée sur le milieu du vecteur) */}
      <mesh position={[0, -headLength / 2, 0]}>
        <cylinderGeometry args={[radius, radius, shaftLen, 14]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* pointe */}
      <mesh position={[0, len / 2 - headLength / 2, 0]}>
        <coneGeometry args={[radius * 2.4, headLength, 18]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Repère (axes X/Y, option Z) gradués et fléchés
// ──────────────────────────────────────────────────────────────────────

export function Axes2D({
  size = 3,
  color = '#475569',
  ticks = true,
  z = 0,
}: {
  size?: number;
  color?: string;
  ticks?: boolean;
  z?: number;
}) {
  const tickPos = useMemo(() => {
    const arr: number[] = [];
    for (let i = -Math.floor(size); i <= Math.floor(size); i++) if (i !== 0) arr.push(i);
    return arr;
  }, [size]);
  return (
    <group position={[0, 0, z]}>
      <Arrow3D from={[-size - 0.2, 0, 0]} to={[size + 0.3, 0, 0]} color={color} radius={0.018} headLength={0.18} />
      <Arrow3D from={[0, -size - 0.2, 0]} to={[0, size + 0.3, 0]} color={color} radius={0.018} headLength={0.18} />
      {ticks &&
        tickPos.map((t) => (
          <group key={`x${t}`}>
            <mesh position={[t, 0, 0]}>
              <boxGeometry args={[0.015, 0.12, 0.015]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, t, 0]}>
              <boxGeometry args={[0.12, 0.015, 0.015]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Courbe de fonction (échantillonnée, lissée)
// ──────────────────────────────────────────────────────────────────────

export function FunctionCurve({
  fn,
  from = -3,
  to = 3,
  samples = 120,
  color = '#7C3AED',
  width = 3,
  z = 0,
  clampY = 6,
}: {
  fn: (x: number) => number;
  from?: number;
  to?: number;
  samples?: number;
  color?: string;
  width?: number;
  z?: number;
  /** Coupe la courbe si |y| dépasse (évite les asymptotes infinies). */
  clampY?: number;
}) {
  const points = useMemo(() => {
    const pts: Vector3Tuple[] = [];
    const dx = (to - from) / samples;
    for (let i = 0; i <= samples; i++) {
      const x = from + i * dx;
      const y = fn(x);
      if (!Number.isFinite(y) || Math.abs(y) > clampY) {
        continue;
      }
      pts.push([x, y, z]);
    }
    return pts;
  }, [fn, from, to, samples, z, clampY]);
  if (points.length < 2) return null;
  return <Line points={points} color={color} lineWidth={width} />;
}

/** Polyligne quelconque (suite de points 3D). */
export function PolyLine({ points, color = '#0EA5E9', width = 3, dashed = false }: { points: Vector3Tuple[]; color?: string; width?: number; dashed?: boolean }) {
  if (points.length < 2) return null;
  return <Line points={points} color={color} lineWidth={width} dashed={dashed} dashScale={6} />;
}

/** Nuage de points / mesures (petites sphères). */
export function DataPoints({ points, color = '#F43F5E', size = 0.09 }: { points: Vector3Tuple[]; color?: string; size?: number }) {
  return (
    <>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[size, 16, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
        </mesh>
      ))}
    </>
  );
}

/** Marqueur ponctuel (point courant animable). */
export function Marker({ position, color = '#DC2626', size = 0.13, children }: { position: Vector3Tuple; color?: string; size?: number; children?: ReactNode }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 20, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      {children}
    </mesh>
  );
}

/** Barre verticale (histogramme, diagramme). */
export function Bar({ x, height, width = 0.5, color = '#0EA5E9', depth = 0.5 }: { x: number; height: number; width?: number; color?: string; depth?: number }) {
  return (
    <mesh position={[x, height / 2, 0]} castShadow>
      <boxGeometry args={[width, Math.max(0.001, height), depth]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}
