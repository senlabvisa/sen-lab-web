'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, FunctionCurve, PolyLine, Marker } from '@/components/lab3d/plot';
import { Animate } from '@/components/lab3d/anim';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — nombre dérivé = pente de la tangente (Première S).
 *
 * Courbe f(x) = x² − 2 tracée avec FunctionCurve (ligne lisse). Au point
 * d'abscisse x0 : un Marker rouge et la TANGENTE en PolyLine, de pente
 * f'(x0) = 2·x0 (équation y = f(x0) + f'(x0)(x − x0)). Une sécante animée
 * (point glissant x0 + h, h → 0) montre que la sécante tend vers la tangente.
 * Maths juste, aucune petite sphère pour la courbe, aucune prop `rotation`.
 */

export type DerivSceneProps = { x0: number };

const f = (x: number) => x * x - 2; // f(x) = x² − 2
const df = (x: number) => 2 * x; // f'(x) = 2x
const HALF = 1.6; // demi-longueur de la tangente tracée

export default function DerivScene({ x0 }: DerivSceneProps) {
  const sec = useRef<Mesh>(null);

  const y0 = f(x0);
  const slope = df(x0);

  // Tangente : y = f(x0) + f'(x0)(x − x0), tracée en ligne droite (PolyLine).
  const tangent = useMemo<[number, number, number][]>(
    () => [
      [x0 - HALF, y0 - HALF * slope, 0],
      [x0 + HALF, y0 + HALF * slope, 0],
    ],
    [x0, y0, slope],
  );

  // Sécante animée : second point M' = (x0 + h, f(x0 + h)), h oscille → 0.
  const secant = useMemo<[number, number, number][]>(() => {
    const h0 = 1.3;
    const xh = x0 + h0;
    return [
      [x0, y0, 0.02],
      [xh, f(xh), 0.02],
    ];
  }, [x0, y0]);

  return (
    <LabScene cameraPosition={[0, 0.3, 6.2]} background="#F0F9FF" minDistance={3.5} maxDistance={11} groundY={null}>
      {/* Repère gradué (tone maths = sky) */}
      <Axes2D size={3} color="#64748B" />

      {/* Courbe f(x) = x² − 2 — ligne lisse, pas de sphères */}
      <FunctionCurve fn={f} from={-3} to={3} samples={140} color="#0EA5E9" width={4} clampY={4.2} />

      {/* Sécante (pointillés) : point mobile M' qui se rapproche de M */}
      <PolyLine points={secant} color="#94A3B8" width={2} dashed />
      <mesh ref={sec}>
        <sphereGeometry args={[0.085, 18, 14]} />
        <meshStandardMaterial color="#F59E0B" emissive="#B45309" emissiveIntensity={0.3} />
      </mesh>

      {/* Tangente en x0 (droite de pente f'(x0)) */}
      <PolyLine points={tangent} color="#16A34A" width={4} />

      {/* Point d'étude M(x0 ; f(x0)) */}
      <Marker position={[x0, y0, 0.03]} color="#DC2626" size={0.12} />
      <Tag3D position={[x0, y0 + 0.45, 0]} label={`x₀ = ${x0.toFixed(1)}`} tone="maths" />

      <SceneLabel
        position={[0, 2.55, 0]}
        title={`f'(x₀) = ${slope.toFixed(1)}`}
        subtitle="f(x) = x² − 2 · pente de la tangente"
        tone="maths"
      />
      <Readout position={[2.35, -1.5, 0]} value={slope.toFixed(1)} caption="nombre dérivé f'(x₀)" />

      <Animate fn={(state) => {
        // h respire entre ~1.3 et ~0.05 : la sécante pivote vers la tangente.
        const h = 0.05 + 0.62 * (1 + Math.sin(state.clock.elapsedTime * 0.9));
        const xh = x0 + h;
        sec.current?.position.set(xh, f(xh), 0.02);
      }} />
    </LabScene>
  );
}
