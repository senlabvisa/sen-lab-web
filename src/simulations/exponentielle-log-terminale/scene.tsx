'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, FunctionCurve, PolyLine, Marker, DataPoints } from '@/components/lab3d/plot';
import { Animate } from '@/components/lab3d/anim';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';

/**
 * Scène 3D — exponentielle exp(x) et logarithme népérien ln(x) (Terminale, Bac).
 *
 * Deux fonctions réciproques tracées dans un même repère : exp en orange,
 * ln en émeraude, et la droite y = x en pointillé pour rendre VISIBLE la
 * symétrie (l'une est l'image de l'autre par cette droite). clampY coupe les
 * branches infinies (exp explose, ln → −∞ en 0⁺). Construit sur le kit lab3d.
 */

export type ExpSceneProps = { show: 'exp' | 'log' | 'both' };

const E = Math.E; // ≈ 2,718
const CLAMP = 3.4; // demi-fenêtre verticale (= taille des axes)

export default function ExpScene({ show }: ExpSceneProps) {
  const seeExp = show === 'exp' || show === 'both';
  const seeLog = show === 'log' || show === 'both';

  // Point courant qui glisse le long de la courbe affichée (sens pédagogique :
  // « pour ce x, voilà l'image »). Reste sur exp si les deux sont visibles.
  const dot = useRef<Mesh>(null);

  // Points clés annotés.
  const expDots = useMemo<Vector3Tuple[]>(
    () => [
      [0, 1, 0], // exp(0) = 1
      [1, E, 0], // exp(1) = e ≈ 2,718
    ],
    [],
  );
  const logDots = useMemo<Vector3Tuple[]>(
    () => [
      [1, 0, 0], // ln(1) = 0
      [E, 1, 0], // ln(e) = 1
    ],
    [],
  );

  const title = seeExp && seeLog ? 'exp et ln · symétrie / y = x' : seeExp ? 'y = exp(x)' : 'y = ln(x)';
  const subtitle = seeExp && seeLog ? 'fonctions réciproques' : seeExp ? 'définie sur ℝ · toujours > 0' : 'définie sur ]0 ; +∞[';

  return (
    <LabScene cameraPosition={[0.4, 0.3, 7]} background="#F5F3FF" minDistance={4} maxDistance={11} groundY={null}>
      {/* Repère gradué fléché */}
      <Axes2D size={3} color="#64748B" />

      {/* Droite de symétrie y = x (pointillé) — toujours visible en mode "both" */}
      {seeExp && seeLog && (
        <>
          <PolyLine points={[[-3.2, -3.2, 0], [3.2, 3.2, 0]]} color="#94A3B8" width={2} dashed />
          <Tag3D position={[2.5, 3.05, 0]} label="y = x" tone="neutral" />
        </>
      )}

      {/* Courbe exponentielle — clampY coupe l'explosion verticale */}
      {seeExp && (
        <>
          <FunctionCurve fn={(x) => Math.exp(x)} from={-3.2} to={3.2} samples={160} color="#EA580C" width={3.5} clampY={CLAMP} />
          <DataPoints points={expDots} color="#C2410C" size={0.085} />
          <Tag3D position={[0, 1.55, 0]} label="exp(0) = 1" tone="maths" />
          <Tag3D position={[1.05, E + 0.45, 0]} label="e ≈ 2,718" tone="maths" />
        </>
      )}

      {/* Courbe logarithme — clampY coupe la chute vers −∞ en 0⁺ */}
      {seeLog && (
        <>
          <FunctionCurve fn={(x) => Math.log(x)} from={0.02} to={3.3} samples={160} color="#059669" width={3.5} clampY={CLAMP} />
          <DataPoints points={logDots} color="#047857" size={0.085} />
          <Tag3D position={[1.15, -0.5, 0]} label="ln(1) = 0" tone="svt" />
          <Tag3D position={[E + 0.15, 1.4, 0]} label="ln(e) = 1" tone="svt" />
        </>
      )}

      {/* Origine repérée + point courant animé glissant sur la courbe active */}
      <Marker position={[0, 0, 0]} color="#475569" size={0.06} />
      <mesh ref={dot}>
        <sphereGeometry args={[0.11, 20, 16]} />
        <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={0.35} />
      </mesh>

      <SceneLabel position={[0, 3.3, 0]} title={title} subtitle={subtitle} tone="maths" />
      <Readout position={[2.7, -1.4, 0]} value={seeExp && seeLog ? 'ln∘exp = id' : seeExp ? '> 0' : 'x > 0'} caption={seeExp && seeLog ? 'réciproques' : seeExp ? 'exp(x) toujours' : 'domaine de ln'} />

      <Animate fn={(state) => {
        const m = dot.current;
        if (!m) return;
        const t = (Math.sin(state.clock.elapsedTime * 0.7) + 1) / 2; // 0→1
        if (seeExp) {
          const x = -3 + t * 4.2; // balaye une plage où exp reste lisible
          m.position.set(x, Math.min(CLAMP, Math.exp(x)), 0.01);
        } else {
          const x = 0.06 + t * 3.2;
          m.position.set(x, Math.log(x), 0.01);
        }
        m.visible = true;
      }} />
    </LabScene>
  );
}
