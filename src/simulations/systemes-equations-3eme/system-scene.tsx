'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, FunctionCurve, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — résolution graphique d'un système de deux équations à deux
 * inconnues (Mathématiques, 3ème).
 *
 * Chaque équation est une droite y = a·x + b tracée par <FunctionCurve>.
 * Le point d'INTERSECTION des deux droites = la solution (x ; y) du système.
 * - Droites sécantes  → une solution unique (marquée par un Marker pulsant).
 * - Parallèles distinctes (a1 = a2, b1 ≠ b2) → aucune intersection, pas de solution.
 * - Confondues (a1 = a2, b1 = b2) → une infinité de solutions.
 */

export type SystemSceneProps = { a1: number; b1: number; a2: number; b2: number };

const SIZE = 4; // demi-étendue du repère (unités scène = unités maths)
const C1 = '#0EA5E9'; // droite 1 (tarif A)
const C2 = '#F97316'; // droite 2 (tarif B)

type Solution = { kind: 'unique'; x: number; y: number } | { kind: 'none' } | { kind: 'infinite' };

function solve(a1: number, b1: number, a2: number, b2: number): Solution {
  if (a1 === a2) return b1 === b2 ? { kind: 'infinite' } : { kind: 'none' };
  const x = (b2 - b1) / (a1 - a2);
  const y = a1 * x + b1;
  return { kind: 'unique', x, y };
}

export default function SystemScene({ a1, b1, a2, b2 }: SystemSceneProps) {
  const dot = useRef<Mesh>(null);
  const sol = useMemo(() => solve(a1, b1, a2, b2), [a1, b1, a2, b2]);

  const onScreen = sol.kind === 'unique' && Math.abs(sol.x) <= SIZE && Math.abs(sol.y) <= SIZE;

  const label =
    sol.kind === 'unique'
      ? 'Solution unique'
      : sol.kind === 'none'
        ? 'Parallèles · aucune solution'
        : 'Confondues · infinité de solutions';

  return (
    <LabScene cameraPosition={[0, 0, 9]} background="#F0F9FF" minDistance={5} maxDistance={14}>
      {/* Repère orthonormé fléché et gradué */}
      <Axes2D size={SIZE} color="#475569" />
      <Tag3D position={[SIZE + 0.35, -0.35, 0]} label="x" tone="maths" />
      <Tag3D position={[-0.4, SIZE + 0.35, 0]} label="y" tone="maths" />

      {/* Droite 1 : y = a1·x + b1 (tarif A) */}
      <FunctionCurve fn={(x) => a1 * x + b1} from={-SIZE} to={SIZE} color={C1} width={3.5} clampY={SIZE + 0.5} />
      <Tag3D position={[SIZE - 0.7, a1 * (SIZE - 0.7) + b1, 0]} label="tarif A" tone="maths" />

      {/* Droite 2 : y = a2·x + b2 (tarif B) */}
      <FunctionCurve fn={(x) => a2 * x + b2} from={-SIZE} to={SIZE} color={C2} width={3.5} clampY={SIZE + 0.5} />
      <Tag3D position={[-SIZE + 0.7, a2 * (-SIZE + 0.7) + b2, 0]} label="tarif B" tone="neutral" />

      {/* Point d'intersection = solution du système */}
      {onScreen && sol.kind === 'unique' && (
        <>
          <Marker position={[sol.x, sol.y, 0]} color="#16A34A" size={0.16} />
          {/* halo pulsant pour attirer l'œil sur la solution */}
          <mesh ref={dot} position={[sol.x, sol.y, -0.02]}>
            <ringGeometry args={[0.24, 0.3, 28]} />
            <meshBasicMaterial color="#16A34A" transparent opacity={0.5} />
          </mesh>
          <Animate
            fn={(state) => {
              const s = 1 + 0.45 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3));
              dot.current?.scale.setScalar(s);
            }}
          />
          <Readout position={[sol.x + 1.2, sol.y + 0.9, 0]} value={`(${sol.x.toFixed(1)} ; ${sol.y.toFixed(1)})`} caption="point d'intersection" />
        </>
      )}

      <SceneLabel position={[0, SIZE + 0.9, 0]} title={label} subtitle="Résolution graphique d'un système 2×2" tone="maths" />
    </LabScene>
  );
}
