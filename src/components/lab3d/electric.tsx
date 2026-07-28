'use client';

/**
 * lab3d/electric — composants de circuit réalistes.
 *
 * Pile, résistance à anneaux de couleur, ampoule qui s'allume vraiment
 * (émissive + halo), fil épais (tube le long d'une courbe), interrupteur,
 * et instrument à aiguille (ampèremètre/voltmètre analogiques).
 * Pour : loi d'Ohm, circuits série/dérivation, intensité-tension, RLC…
 */

import { useMemo } from 'react';
import { CatmullRomCurve3, Vector3, type Vector3Tuple } from 'three';
import { Metal, Plastic } from './materials';

// ──────────────────────────────────────────────────────────────────────
// Fil conducteur (tube le long d'une polyligne)
// ──────────────────────────────────────────────────────────────────────

export function Wire({ points, color = '#1E293B', radius = 0.045 }: { points: Vector3Tuple[]; color?: string; radius?: number }) {
  const geom = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'catmullrom', 0.1);
    return [curve, Math.max(8, points.length * 6)] as const;
  }, [points]);
  return (
    <mesh>
      <tubeGeometry args={[geom[0], geom[1], radius, 10, false]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
    </mesh>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Pile / générateur
// ──────────────────────────────────────────────────────────────────────

export function Battery({ position = [0, 0, 0], voltage, rotation = [0, 0, 0] }: { position?: Vector3Tuple; voltage?: number; rotation?: Vector3Tuple }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.32, 1.4, 24]} />
        <Plastic color="#1F2937" />
      </mesh>
      {/* bandeau */}
      <mesh>
        <cylinderGeometry args={[0.325, 0.325, 0.5, 24]} />
        <Plastic color="#F59E0B" />
      </mesh>
      {/* borne + */}
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.16, 16]} />
        <Metal color="#D4D4D8" />
      </mesh>
      {/* borne - (plat) */}
      <mesh position={[0, -0.72, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 24]} />
        <Metal color="#9CA3AF" />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Résistance (corps beige + anneaux de couleur)
// ──────────────────────────────────────────────────────────────────────

/** Code couleur des anneaux de résistance (chiffres 0-9 partiels, usage pédagogique). */
export const BAND_COLORS = ['#000000', '#8B5A2B', '#DC2626', '#F59E0B', '#FACC15', '#10B981', '#3B82F6', '#7C3AED', '#9CA3AF', '#F8FAFC'];

export function Resistor({
  position = [0, 0, 0],
  rotation = [0, 0, Math.PI / 2],
  bands = ['#8B5A2B', '#000000', '#DC2626'],
}: {
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  bands?: string[];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.9, 24]} />
        <meshStandardMaterial color="#E8D6A8" roughness={0.6} />
      </mesh>
      {/* renflements */}
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.19, 16, 12]} />
        <meshStandardMaterial color="#E8D6A8" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.32, 0]}>
        <sphereGeometry args={[0.19, 16, 12]} />
        <meshStandardMaterial color="#E8D6A8" roughness={0.6} />
      </mesh>
      {bands.map((c, i) => (
        <mesh key={i} position={[0, 0.18 - i * 0.18, 0]}>
          <cylinderGeometry args={[0.185, 0.185, 0.07, 24]} />
          <meshStandardMaterial color={c} roughness={0.5} />
        </mesh>
      ))}
      {/* pattes */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
        <Metal color="#C0C5CE" />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
        <Metal color="#C0C5CE" />
      </mesh>
    </group>
  );
}

/** Potentiomètre / rhéostat (résistance variable) — boîtier + curseur. */
export function Rheostat({ position = [0, 0, 0], cursor = 0.5 }: { position?: Vector3Tuple; cursor?: number }) {
  const x = (Math.max(0, Math.min(1, cursor)) - 0.5) * 1.4;
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.8, 0.3, 0.5]} />
        <Plastic color="#374151" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 12]} />
        <Metal color="#CBD5E1" />
      </mesh>
      <mesh position={[x, 0.34, 0]}>
        <boxGeometry args={[0.18, 0.36, 0.4]} />
        <Plastic color="#3B82F6" />
      </mesh>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Ampoule (lampe) — filament + verre + halo selon l'intensité
// ──────────────────────────────────────────────────────────────────────

export function Bulb({ position = [0, 0, 0], on = true, brightness = 1 }: { position?: Vector3Tuple; on?: boolean; brightness?: number }) {
  const b = on ? Math.max(0, Math.min(1, brightness)) : 0;
  return (
    <group position={position}>
      {/* verre */}
      <mesh castShadow>
        <sphereGeometry args={[0.4, 32, 24]} />
        <meshPhysicalMaterial
          color={b > 0.05 ? '#FFF7D6' : '#E5E7EB'}
          transmission={0.9}
          transparent
          opacity={0.5}
          roughness={0.08}
          ior={1.5}
          thickness={0.3}
          emissive="#FFE38A"
          emissiveIntensity={b * 1.6}
        />
      </mesh>
      {/* filament */}
      <mesh>
        <torusGeometry args={[0.12, 0.02, 8, 24]} />
        <meshStandardMaterial color="#FBBF24" emissive="#FF9500" emissiveIntensity={b * 3} />
      </mesh>
      {/* culot */}
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.28, 20]} />
        <Metal color="#A1A1AA" />
      </mesh>
      {b > 0.05 && <pointLight position={[0, 0, 0]} intensity={b * 2.2} distance={4} color="#FFE3A0" />}
    </group>
  );
}

/** Interrupteur (levier). `closed` ferme le circuit. */
export function Switch({ position = [0, 0, 0], closed = false }: { position?: Vector3Tuple; closed?: boolean }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.7, 0.1, 0.3]} />
        <Plastic color="#1F2937" />
      </mesh>
      <mesh position={[-0.25, 0.05, 0]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <Metal color="#D4D4D8" />
      </mesh>
      <mesh position={[0.25, 0.05, 0]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <Metal color="#D4D4D8" />
      </mesh>
      {/* levier */}
      <group position={[-0.25, 0.05, 0]} rotation={[0, 0, closed ? 0 : 0.6]}>
        <mesh position={[0.25, 0, 0]}>
          <boxGeometry args={[0.5, 0.05, 0.05]} />
          <Metal color={closed ? '#10B981' : '#9CA3AF'} />
        </mesh>
      </group>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Instrument à aiguille (ampèremètre / voltmètre)
// ──────────────────────────────────────────────────────────────────────

export function Meter({
  position = [0, 0, 0],
  kind = 'A',
  value = 0,
  max = 5,
  color = '#1E293B',
}: {
  position?: Vector3Tuple;
  kind?: 'A' | 'V';
  value?: number;
  max?: number;
  color?: string;
}) {
  // aiguille : -60°..+60°
  const ratio = Math.max(0, Math.min(1, value / max));
  const angle = (ratio - 0.5) * (Math.PI * 2) / 3;
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[1.3, 1.1, 0.4]} />
        <Plastic color={color} />
      </mesh>
      {/* cadran */}
      <mesh position={[0, 0.05, 0.21]}>
        <circleGeometry args={[0.46, 32, Math.PI, Math.PI]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.7} />
      </mesh>
      {/* aiguille */}
      <group position={[0, -0.15, 0.23]} rotation={[0, 0, -angle]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.02, 0.5, 0.02]} />
          <meshStandardMaterial color="#DC2626" />
        </mesh>
      </group>
      <mesh position={[0, -0.15, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
        <meshStandardMaterial color="#0F172A" />
      </mesh>
      {/* symbole */}
      <mesh position={[0, -0.42, 0.22]}>
        <circleGeometry args={[0.12, 24]} />
        <meshStandardMaterial color={kind === 'A' ? '#FBBF24' : '#3B82F6'} />
      </mesh>
    </group>
  );
}
