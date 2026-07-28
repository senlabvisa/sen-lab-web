'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { MeshStandardMaterial, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper } from '@/components/lab3d/environment';
import { PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — configuration de Thalès (Mathématiques, 4ème).
 *
 * Deux droites sécantes en A, coupées par deux parallèles (BC) (fixe) et
 * (MN) (mobile). L'élève déplace M sur (AB) via le slider (ratio = AM/AB) ;
 * (MN) suit en restant parallèle à (BC). On vérifie en direct
 * AM/AB = AN/AC = MN/BC. Les segments parallèles pulsent pour les mettre en
 * évidence. Construit sur le kit lab3d (segments = PolyLine, pas de sphères).
 */

export type ThalesSceneProps = { ratio: number };

// Configuration : A au sommet, (AB) et (AC) sécantes, (BC) base parallèle.
const A: Vector3Tuple = [0, 2.1, 0];
const B: Vector3Tuple = [-2.3, -1.7, 0];
const C: Vector3Tuple = [2.1, -1.7, 0];

const lerp = (p: Vector3Tuple, q: Vector3Tuple, t: number): Vector3Tuple => [
  p[0] + (q[0] - p[0]) * t,
  p[1] + (q[1] - p[1]) * t,
  0,
];

const dist = (p: Vector3Tuple, q: Vector3Tuple) => Math.hypot(q[0] - p[0], q[1] - p[1]);

export default function ThalesScene({ ratio }: ThalesSceneProps) {
  const mat = useRef<MeshStandardMaterial>(null);

  const { M, N, ratioMN, lenMN, lenBC } = useMemo(() => {
    const m = lerp(A, B, ratio);
    const n = lerp(A, C, ratio);
    const bc = dist(B, C);
    return { M: m, N: n, ratioMN: dist(m, n) / bc, lenMN: dist(m, n), lenBC: bc };
  }, [ratio]);

  return (
    <LabScene cameraPosition={[0, 0.2, 6.4]} background="#F5F3FF" minDistance={4} maxDistance={11} groundY={null}>
      {/* Papier millimétré : repère visuel du plan */}
      <GraphPaper width={9} height={8} step={0.5} />

      {/* Droites sécantes (AB) et (AC), prolongées au-delà de A */}
      <PolyLine points={[lerp(B, A, 1.18), A, B]} color="#334155" width={2.5} />
      <PolyLine points={[lerp(C, A, 1.18), A, C]} color="#334155" width={2.5} />

      {/* Base (BC) — première parallèle (fixe) */}
      <PolyLine points={[B, C]} color="#7C3AED" width={5} />

      {/* (MN) — seconde parallèle (mobile, mise en évidence par pulsation) */}
      <ThalesParallel from={M} to={N} matRef={mat} />

      {/* Points A, B, C, M, N */}
      <Marker position={A} color="#0F172A" size={0.1} />
      <Marker position={B} color="#7C3AED" size={0.1} />
      <Marker position={C} color="#7C3AED" size={0.1} />
      <Marker position={M} color="#10B981" size={0.12} />
      <Marker position={N} color="#10B981" size={0.12} />

      {/* Étiquettes des points */}
      <Tag3D position={[A[0], A[1] + 0.4, 0]} label="A" tone="maths" />
      <Tag3D position={[B[0] - 0.4, B[1] - 0.2, 0]} label="B" tone="maths" />
      <Tag3D position={[C[0] + 0.4, C[1] - 0.2, 0]} label="C" tone="maths" />
      <Tag3D position={[M[0] - 0.42, M[1], 0]} label="M" tone="svt" />
      <Tag3D position={[N[0] + 0.42, N[1], 0]} label="N" tone="svt" />

      {/* Lectures des rapports égaux (le cœur de Thalès) */}
      <Readout position={[-3.1, 1.5, 0]} value={ratio.toFixed(2)} caption="AM / AB" />
      <Readout position={[3.1, 1.5, 0]} value={ratio.toFixed(2)} caption="AN / AC" />
      <Readout position={[0, M[1] + 0.55, 0]} value={ratioMN.toFixed(2)} caption="MN / BC" />

      <SceneLabel
        position={[0, 2.9, 0]}
        title="(MN) // (BC)"
        subtitle={`MN = ${lenMN.toFixed(2)} · BC = ${lenBC.toFixed(2)}`}
        tone="maths"
      />

      {/* Pulsation d'évidence sur le segment (MN) */}
      <Animate
        fn={(state) => {
          if (mat.current) mat.current.emissiveIntensity = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3));
        }}
      />
    </LabScene>
  );
}

/** Segment (MN) épais et lumineux, dont le matériau pulse via la ref. */
function ThalesParallel({
  from,
  to,
  matRef,
}: {
  from: Vector3Tuple;
  to: Vector3Tuple;
  matRef: RefObject<MeshStandardMaterial>;
}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1e-6;
  const angle = Math.atan2(dy, dx);
  return (
    <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0.01]} rotation={[0, 0, angle]}>
      <boxGeometry args={[len, 0.07, 0.07]} />
      <meshStandardMaterial ref={matRef} color="#10B981" emissive="#10B981" emissiveIntensity={0.4} roughness={0.35} />
    </mesh>
  );
}
