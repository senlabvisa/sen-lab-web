'use client';

import { useMemo, useRef } from 'react';
import { Mesh, type Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper } from '@/components/lab3d/environment';
import { Axes2D, FunctionCurve, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — fonction affine y = a·x + b (Maths, 3ème).
 *
 * Repère fléché gradué + papier millimétré dans un vrai plan 3D. La droite
 * est tracée en direct ; l'ordonnée à l'origine (0 ; b) est marquée, et un
 * triangle de pente (avance de 1 → monte de a) rend le coefficient directeur
 * visible. Un point parcourt la droite pour montrer que y dépend de x.
 * Construit sur le kit lab3d (FunctionCurve, pas de sphères empilées).
 */

export type AffineSceneProps = { a: number; b: number };

const SIZE = 3.3; // demi-étendue du repère (unités scène)
const CLAMP = 3.2; // au-delà, la droite sort du cadre

export default function AffineScene({ a, b }: AffineSceneProps) {
  const dot = useRef<Mesh>(null);
  const fn = useMemo(() => (x: number) => a * x + b, [a, b]);

  // étendue de x où la droite reste dans le cadre [-CLAMP, CLAMP]
  const xEdge = useMemo(() => {
    if (Math.abs(a) < 1e-6) return SIZE;
    const e = (CLAMP - Math.sign(a) * b) / Math.abs(a);
    return Math.max(0.4, Math.min(SIZE, e));
  }, [a, b]);

  // triangle de pente : (0 ; b) → (1 ; b) → (1 ; b+a)
  const triRun: Vector3Tuple[] = [
    [0, b, 0.03],
    [1, b, 0.03],
  ];
  const triRise: Vector3Tuple[] = [
    [1, b, 0.03],
    [1, b + a, 0.03],
  ];
  const slopeVisible = Math.abs(b) <= CLAMP && Math.abs(b + a) <= CLAMP;

  return (
    <LabScene cameraPosition={[0, 0.15, 6.2]} background="#F0F9FF" minDistance={4} maxDistance={10} groundY={null}>
      {/* Plan du repère */}
      <GraphPaper width={2 * SIZE} height={2 * SIZE} step={0.5} />
      <Axes2D size={SIZE} color="#334155" />

      {/* Droite y = a·x + b */}
      <FunctionCurve fn={fn} from={-SIZE} to={SIZE} samples={80} color="#0EA5E9" width={4} clampY={CLAMP} z={0.01} />

      {/* Ordonnée à l'origine (0 ; b) */}
      <Marker position={[0, b, 0.04]} color="#7C3AED" size={0.12} />
      <Tag3D position={[-0.55, b, 0.04]} label={`b = ${b}`} tone="chimie" />

      {/* Triangle de pente (rend « a » visible) */}
      {slopeVisible && (
        <>
          <PolyLine points={triRun} color="#16A34A" width={3} dashed />
          <PolyLine points={triRise} color="#F59E0B" width={3} dashed />
          <Tag3D position={[0.5, b - 0.28, 0.04]} label="+1" tone="svt" />
          <Tag3D position={[1.42, b + a / 2, 0.04]} label={`${a >= 0 ? '+' : ''}${a}`} tone="neutral" />
        </>
      )}

      {/* Point courant qui parcourt la droite */}
      <mesh ref={dot}>
        <sphereGeometry args={[0.11, 20, 16]} />
        <meshStandardMaterial color="#DC2626" emissive="#7F1D1D" emissiveIntensity={0.35} />
      </mesh>
      <Animate
        fn={(state) => {
          const x = Math.sin(state.clock.elapsedTime * 0.8) * xEdge;
          dot.current?.position.set(x, a * x + b, 0.05);
        }}
      />

      <SceneLabel position={[0, SIZE + 0.5, 0]} title={`y = ${a}·x ${b >= 0 ? '+ ' + b : '− ' + Math.abs(b)}`} subtitle="Fonction affine" tone="maths" />
      <Readout position={[-SIZE + 0.2, -SIZE - 0.15, 0]} value={a} caption="pente a" />
      <Readout position={[SIZE - 0.2, -SIZE - 0.15, 0]} value={b} caption="ordonnée b" />
    </LabScene>
  );
}
