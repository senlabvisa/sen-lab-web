'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Arrow3D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — tir d'un projectile (mécanique de Newton, Terminale S, Bac).
 *
 * Trajectoire parabolique réelle calculée avec g = 9,78 m/s² (Dakar).
 * Le projectile suit la parabole en temps réel ; la portée est mesurée au
 * sol, la flèche (hauteur max) affichée. Construit sur le kit lab3d.
 */

export type ProjSceneProps = { v0: number; angle: number; g?: number };

const SCALE = 0.18; // m → unités scène
const X0 = -3; // origine du tir (gauche)
const GROUND_Y = -1.5;

export default function ProjScene({ v0, angle, g = 9.78 }: ProjSceneProps) {
  const ball = useRef<Mesh>(null);
  const t0 = useRef(0);

  const { traj, range, height, flight, ar } = useMemo(() => {
    const a = (angle * Math.PI) / 180;
    const T = (2 * v0 * Math.sin(a)) / g;
    const R = (v0 * v0 * Math.sin(2 * a)) / g;
    const H = (v0 * Math.sin(a)) ** 2 / (2 * g);
    const pts: [number, number, number][] = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * T;
      const x = v0 * Math.cos(a) * t;
      const y = v0 * Math.sin(a) * t - 0.5 * g * t * t;
      pts.push([X0 + x * SCALE, GROUND_Y + y * SCALE, 0]);
    }
    return { traj: pts, range: R, height: H, flight: T, ar: a };
  }, [v0, angle, g]);

  // sommet de la parabole (flèche vitesse horizontale ici)
  const apex = useMemo<[number, number, number]>(() => {
    const xH = (v0 * v0 * Math.sin(2 * ar)) / (2 * g);
    return [X0 + xH * SCALE, GROUND_Y + height * SCALE, 0];
  }, [v0, ar, g, height]);

  return (
    <LabScene cameraPosition={[0, 0.6, 7]} background="#FFF4E0" minDistance={4} maxDistance={12} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7D8B8" size={26} />

      {/* Baobab (point de lancement) */}
      <group position={[X0, GROUND_Y, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.26, 0.9, 14]} />
          <meshStandardMaterial color="#6B4A2B" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1, 0]} castShadow>
          <sphereGeometry args={[0.5, 20, 16]} />
          <meshStandardMaterial color="#3E8E41" roughness={0.7} />
        </mesh>
      </group>

      {/* Trajectoire parabolique */}
      <PolyLine points={traj} color="#EA580C" width={3} />

      {/* Portée au sol */}
      <Marker position={[X0 + range * SCALE, GROUND_Y, 0]} color="#DC2626" size={0.1} />
      <Tag3D position={[X0 + range * SCALE, GROUND_Y - 0.35, 0]} label={`Portée ${range.toFixed(1)} m`} tone="physique" />

      {/* Sommet + vecteur vitesse horizontal */}
      <Arrow3D from={apex} to={[apex[0] + 0.9, apex[1], 0]} color="#2563EB" radius={0.03} headLength={0.22} />
      <Tag3D position={[apex[0] + 0.5, apex[1] + 0.35, 0]} label="v⃗" tone="physique" />

      {/* Projectile animé */}
      <mesh ref={ball} castShadow>
        <sphereGeometry args={[0.13, 20, 16]} />
        <meshStandardMaterial color="#B91C1C" roughness={0.3} metalness={0.2} emissive="#7F1D1D" emissiveIntensity={0.2} />
      </mesh>
      <Animate
        fn={(state) => {
          if (t0.current === 0) t0.current = state.clock.elapsedTime;
          const cycle = flight + 0.8; // pause avant relance
          const tc = Math.min((state.clock.elapsedTime - t0.current) % cycle, flight);
          const x = v0 * Math.cos(ar) * tc;
          const y = Math.max(0, v0 * Math.sin(ar) * tc - 0.5 * g * tc * tc);
          ball.current?.position.set(X0 + x * SCALE, GROUND_Y + y * SCALE, 0);
        }}
      />

      <SceneLabel position={[0, 2.4, 0]} title={`v₀ = ${v0} m/s · α = ${angle}°`} subtitle="Tir parabolique · g = 9,78 (Dakar)" tone="physique" />
      <Readout position={[2.6, 1.4, 0]} value={height.toFixed(2)} unit="m" caption="flèche (h max)" />
    </LabScene>
  );
}
