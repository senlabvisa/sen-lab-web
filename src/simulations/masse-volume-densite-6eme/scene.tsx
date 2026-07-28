'use client';

import { useRef } from 'react';
import { Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Beaker, GraduatedCylinder } from '@/components/lab3d/glassware';
import { Metal, Plastic } from '@/components/lab3d/materials';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — mesurer une masse volumique (6ème).
 *
 * Paillasse réelle : une balance électronique à gauche, une éprouvette
 * graduée remplie d'eau à droite, un bécher de réserve.
 *  1. On pose l'échantillon sur la balance → on lit la masse m (g).
 *  2. On le plonge dans l'éprouvette → le niveau monte de V₁ à V₂.
 *     Le volume de l'objet vaut V = V₂ − V₁ (1 mL = 1 cm³).
 *  3. La masse volumique se calcule : ρ = m / V (g/cm³).
 *
 * Un échantillon moins dense que l'eau (ρ < 1) remonte : on l'enfonce avec
 * une aiguille (tige métallique) — c'est le geste réel du laboratoire.
 *
 * À charger via next/dynamic({ ssr: false }).
 */

export type SampleShape = 'cube' | 'sphere' | 'cyl';

export type DensitySceneProps = {
  /** Nom de l'échantillon (affiché sous la balance). */
  label: string;
  color: string;
  /** true = rendu métallique (aluminium, fer). */
  metal?: boolean;
  shape: SampleShape;
  /** Masse de l'échantillon en g. */
  mass: number;
  /** Volume réel de l'échantillon en cm³. */
  volume: number;
  /** Volume d'eau au départ dans l'éprouvette (mL). */
  v0: number;
  /** Capacité de l'éprouvette (mL). */
  vMax: number;
  /** L'élève a posé l'échantillon sur la balance. */
  weighed: boolean;
  /** L'élève a plongé l'échantillon dans l'éprouvette. */
  immersed: boolean;
};

const BENCH_Y = -1.9;
const BAL_X = -2.1; // balance
const CYL_X = 0.9; // éprouvette graduée
const CYL_H = 3.2;
const CYL_R = 0.62;
const CYL_Y = BENCH_Y + CYL_H / 2 + 0.11; // socle posé sur la paillasse
const CYL_INNER_BOTTOM = CYL_Y - CYL_H / 2 + 0.06;
const PLATE_Y = BENCH_Y + 0.42; // plateau de la balance
const TRAVEL_Y = 1.7; // altitude de transfert (au-dessus de tout)
const START: Vector3Tuple = [BAL_X, TRAVEL_Y, 0];

export default function DensityScene({
  label,
  color,
  metal = false,
  shape,
  mass,
  volume,
  v0,
  vMax,
  weighed,
  immersed,
}: DensitySceneProps) {
  const sample = useRef<Mesh>(null);

  // taille visuelle ∝ racine cubique du volume (un objet 8× plus volumineux est 2× plus large)
  const s = 0.13 * Math.cbrt(volume);
  const rho = mass / volume;
  const floats = rho < 1;

  const vRead = v0 + (immersed ? volume : 0); // niveau lu sur l'éprouvette
  const fill = Math.min(1, vRead / vMax);

  const target: Vector3Tuple = immersed
    ? [CYL_X, CYL_INNER_BOTTOM + s / 2, 0]
    : [BAL_X, PLATE_Y + 0.04 + s / 2, 0];

  return (
    <LabScene cameraPosition={[0.2, 1.2, 7.4]} background="#EFF6FF" minDistance={4} maxDistance={13} groundY={BENCH_Y}>
      <LabBench y={BENCH_Y} color="#E6E1D4" size={24} />

      {/* ── Balance électronique ─────────────────────────────── */}
      <group position={[BAL_X, 0, 0]}>
        <mesh position={[0, BENCH_Y + 0.17, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.34, 1.1]} />
          <Plastic color="#334155" roughness={0.55} />
        </mesh>
        {/* écran de la balance */}
        <mesh position={[0, BENCH_Y + 0.2, 0.56]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.8, 0.26, 0.03]} />
          <Plastic color="#0F172A" roughness={0.3} />
        </mesh>
        {/* plateau inox */}
        <mesh position={[0, PLATE_Y, 0]} castShadow>
          <cylinderGeometry args={[0.58, 0.58, 0.06, 40]} />
          <Metal color="#D6DCE4" roughness={0.28} metalness={0.85} />
        </mesh>
      </group>
      <Readout position={[BAL_X, BENCH_Y + 1.15, 0]} value={weighed ? mass.toFixed(1) : '—'} unit="g" caption="balance" />
      <Tag3D position={[BAL_X, BENCH_Y - 0.25, 0]} label="balance électronique" tone="physique" />

      {/* ── Éprouvette graduée + eau ─────────────────────────── */}
      <GraduatedCylinder position={[CYL_X, CYL_Y, 0]} fill={fill} liquidColor="#7CC4FF" radius={CYL_R} height={CYL_H} />
      <Readout position={[CYL_X + 1.05, CYL_Y + 0.35, 0]} value={vRead.toFixed(0)} unit="mL" caption={immersed ? 'V₂ (lu)' : 'V₁ (départ)'} />
      <Tag3D position={[CYL_X, BENCH_Y - 0.25, 0]} label="éprouvette graduée (eau)" tone="physique" />

      {/* Aiguille : on enfonce l'échantillon qui remonterait tout seul */}
      {immersed && floats && (
        <>
          <mesh position={[CYL_X, CYL_INNER_BOTTOM + s + 0.75, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 1.5, 12]} />
            <Metal color="#B9C2CC" roughness={0.3} metalness={0.9} />
          </mesh>
          <Tag3D position={[CYL_X + 0.75, CYL_INNER_BOTTOM + s + 1.35, 0]} label="on l'enfonce (il flotterait)" tone="physique" />
        </>
      )}

      {/* ── Bécher de réserve d'eau ──────────────────────────── */}
      <Beaker position={[2.9, BENCH_Y + 0.62, -0.3]} radius={0.62} fill={0.45} liquidColor="#7CC4FF" height={1.24} />
      <Tag3D position={[2.9, BENCH_Y - 0.25, -0.3]} label="réserve d'eau" tone="physique" />

      {/* ── Échantillon (se déplace balance ↔ éprouvette) ────── */}
      <mesh ref={sample} position={START} castShadow>
        {shape === 'cube' && <boxGeometry args={[s, s, s]} />}
        {shape === 'sphere' && <sphereGeometry args={[s / 2, 24, 18]} />}
        {shape === 'cyl' && <cylinderGeometry args={[s / 2.2, s / 2.2, s * 1.3, 24]} />}
        <meshStandardMaterial
          color={color}
          roughness={metal ? 0.3 : 0.8}
          metalness={metal ? 0.85 : 0.05}
        />
      </mesh>
      <Animate
        fn={(_, delta) => {
          const o = sample.current;
          if (!o) return;
          const k = Math.min(1, delta * 4.5);
          // trajet en cloche : on monte d'abord, on descend une fois au-dessus de la cible
          const wantY = Math.abs(target[0] - o.position.x) > 0.28 ? TRAVEL_Y : target[1];
          o.position.x += (target[0] - o.position.x) * k;
          o.position.z += (target[2] - o.position.z) * k;
          o.position.y += (wantY - o.position.y) * k;
          o.rotation.y += delta * 0.35;
        }}
      />

      <SceneLabel
        position={[-0.5, 2.6, 0]}
        title={weighed && immersed ? `ρ = ${rho.toFixed(2)} g/cm³` : weighed ? 'Plonge-le dans l’eau' : 'Pose-le sur la balance'}
        subtitle={`${label} · ρ = m / V`}
        tone="physique"
      />
      {weighed && immersed && (
        <Readout position={[-0.5, 1.85, 0]} value={volume.toFixed(0)} unit="cm³" caption="V = V₂ − V₁" />
      )}
    </LabScene>
  );
}
