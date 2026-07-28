'use client';

import { useMemo, useRef } from 'react';
import { Mesh, Vector3 } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GlassThin } from '@/components/lab3d/materials';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — l'air est de la matière (PC, 4ème).
 *
 * Une seringue transparente (cylindre type GlassThin) contient des particules
 * de gaz (petites sphères) en mouvement permanent, qui rebondissent sur les
 * parois. Un piston descend quand on comprime le gaz : à volume plus petit, les
 * particules sont confinées dans un espace réduit, cognent plus souvent les
 * parois → la pression augmente (loi de Boyle-Mariotte, P·V = constante).
 *
 * Animation via <Animate> (enfant de LabScene) : aucun useFrame hors Canvas.
 */

export type BalloonSceneProps = {
  /** Volume du gaz [0,1] : 1 = piston en haut (détendu), petit = comprimé. */
  volume: number;
  /** Pression relative affichée (≈ 1/volume), calculée côté module. */
  pressure: number;
};

const R = 0.62; // rayon interne de la seringue (unités scène)
const TOP = 1.7; // hauteur max du gaz (piston relevé à fond)
const FLOOR = -1.5; // fond de la seringue
const N = 16; // nombre de particules

type Particle = { ref: React.RefObject<Mesh>; vel: Vector3 };

export default function BalloonScene({ volume, pressure }: BalloonSceneProps) {
  // Hauteur de la colonne de gaz : proportionnelle au volume.
  const colH = useMemo(() => 0.55 + volume * (TOP - FLOOR - 0.55), [volume]);
  const ceil = FLOOR + colH; // sommet du gaz = face inférieure du piston
  const pistonY = ceil + 0.12;

  // Vitesse des particules : à T fixe, l'énergie cinétique moyenne est
  // constante ; on garde donc une vitesse de base identique. Ce qui change,
  // c'est la fréquence des chocs (volume plus petit → plus de chocs).
  const speed = 1.15;

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: N }, (_, i) => {
        const ang = (i / N) * Math.PI * 2;
        return {
          ref: { current: null } as React.RefObject<Mesh>,
          vel: new Vector3(
            Math.cos(ang) * speed,
            (((i * 37) % 20) / 20 - 0.5) * 2 * speed,
            Math.sin(ang) * speed,
          ),
        };
      }),
    [],
  );

  return (
    <LabScene cameraPosition={[2.6, 0.9, 5.2]} background="#EAF2FF" minDistance={3.5} maxDistance={10} groundY={FLOOR}>
      {/* Corps transparent de la seringue */}
      <mesh position={[0, (FLOOR + TOP) / 2 + 0.1, 0]}>
        <cylinderGeometry args={[R + 0.06, R + 0.06, TOP - FLOOR + 0.6, 40, 1, true]} />
        <GlassThin tint="#CFE3FF" opacity={0.16} />
      </mesh>
      {/* Fond de la seringue (l'embout va vers la pompe / le pneu) */}
      <mesh position={[0, FLOOR, 0]}>
        <cylinderGeometry args={[R + 0.06, R + 0.06, 0.08, 40]} />
        <meshStandardMaterial color="#93B4E8" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, FLOOR - 0.28, 0]}>
        <cylinderGeometry args={[0.1, 0.07, 0.5, 16]} />
        <meshStandardMaterial color="#6E8FC4" roughness={0.5} />
      </mesh>

      {/* Piston (descend quand on comprime) */}
      <group position={[0, pistonY, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[R + 0.02, R + 0.02, 0.18, 40]} />
          <meshStandardMaterial color="#475569" roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 1.1, 18]} />
          <meshStandardMaterial color="#64748B" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.28, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.12, 24]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
      </group>

      {/* Particules de gaz (molécules) */}
      {particles.map((p, i) => (
        <mesh key={i} ref={p.ref} castShadow>
          <sphereGeometry args={[0.085, 14, 12]} />
          <meshStandardMaterial color="#2563EB" emissive="#1D4ED8" emissiveIntensity={0.35} roughness={0.3} />
        </mesh>
      ))}

      <Animate
        fn={(_state, delta) => {
          const dt = Math.min(delta, 0.05);
          const top = ceil - 0.1; // garde les billes sous le piston
          const bottom = FLOOR + 0.1;
          const rad = R - 0.1; // confinement radial
          for (const p of particles) {
            const m = p.ref.current;
            if (!m) continue;
            const pos = m.position;
            // initialise une position aléatoire dans la colonne au 1er frame
            if (pos.x === 0 && pos.y === 0 && pos.z === 0) {
              pos.set((Math.random() - 0.5) * rad, bottom + Math.random() * (top - bottom), (Math.random() - 0.5) * rad);
            }
            pos.addScaledVector(p.vel, dt);
            // rebond sur le piston / le fond (vertical)
            if (pos.y > top) {
              pos.y = top;
              p.vel.y = -Math.abs(p.vel.y);
            } else if (pos.y < bottom) {
              pos.y = bottom;
              p.vel.y = Math.abs(p.vel.y);
            }
            // rebond sur la paroi cylindrique (radial)
            const rr = Math.hypot(pos.x, pos.z);
            if (rr > rad) {
              const nx = pos.x / rr;
              const nz = pos.z / rr;
              pos.x = nx * rad;
              pos.z = nz * rad;
              const dot = p.vel.x * nx + p.vel.z * nz;
              p.vel.x -= 2 * dot * nx;
              p.vel.z -= 2 * dot * nz;
            }
          }
        }}
      />

      <SceneLabel
        position={[0, TOP + 0.95, 0]}
        title={`Gaz comprimé à ${Math.round(volume * 100)} % du volume`}
        subtitle="Air = particules en mouvement · T constante"
        tone="physique"
      />
      <Readout position={[2.5, 0.5, 0]} value={pressure.toFixed(2)} unit="bar" caption="pression du gaz" />
      <Tag3D position={[-R - 0.5, ceil, 0]} label="piston" tone="physique" />
    </LabScene>
  );
}
