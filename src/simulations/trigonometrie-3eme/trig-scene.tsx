'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — cercle trigonométrique (Maths, 3ème, BFEM).
 *
 * Le cercle de rayon 1 est tracé comme une vraie PolyLine (jamais des petites
 * sphères). Le point M(cos α, sin α) est posé sur le cercle ; ses projections
 * donnent cos α (côté adjacent, axe x) et sin α (côté opposé, vertical), et le
 * rayon OM est l'hypoténuse. On lit sin α, cos α, tan α dans des afficheurs.
 * Un point fantôme orbite en continu pour matérialiser le cercle complet.
 */

export type TrigSceneProps = { angle: number };

const R = 1.8; // rayon du cercle trigonométrique (unités scène)

export default function TrigScene({ angle }: TrigSceneProps) {
  const ghost = useRef<Mesh>(null);

  const ar = (angle * Math.PI) / 180;
  const cos = Math.cos(ar);
  const sin = Math.sin(ar);
  const tan = Math.tan(ar);
  const Mx = cos * R;
  const My = sin * R;

  // Cercle complet en PolyLine (boucle fermée), pas en sphères.
  const circle = useMemo<Vector3Tuple[]>(() => {
    const pts: Vector3Tuple[] = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * 2 * Math.PI;
      pts.push([Math.cos(t) * R, Math.sin(t) * R, 0]);
    }
    return pts;
  }, []);

  // Petit arc qui matérialise l'angle α à l'origine.
  const arc = useMemo<Vector3Tuple[]>(() => {
    const pts: Vector3Tuple[] = [];
    const ra = 0.5;
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * ar;
      pts.push([Math.cos(t) * ra, Math.sin(t) * ra, 0]);
    }
    return pts;
  }, [ar]);

  const tanLabel = angle >= 90 ? '∞' : tan.toFixed(2);

  return (
    <LabScene cameraPosition={[0, 0.2, 6]} background="#F1F5FF" minDistance={4} maxDistance={11} groundY={null}>
      {/* Repère gradué */}
      <Axes2D size={2.2} color="#64748B" />

      {/* Cercle trigonométrique (rayon 1) */}
      <PolyLine points={circle} color="#0EA5E9" width={2.5} />

      {/* Arc de l'angle α */}
      <PolyLine points={arc} color="#F59E0B" width={3} />
      <Tag3D position={[0.78, 0.28, 0]} label={`α = ${angle}°`} tone="maths" />

      {/* Côté adjacent = cos α (bleu, sur l'axe x) */}
      <PolyLine points={[[0, 0, 0], [Mx, 0, 0]]} color="#2563EB" width={5} />
      <Tag3D position={[Mx / 2, -0.26, 0]} label="adjacent = cos α" tone="physique" />

      {/* Côté opposé = sin α (vert, vertical) */}
      <PolyLine points={[[Mx, 0, 0], [Mx, My, 0]]} color="#16A34A" width={5} />
      <Tag3D position={[Mx + (cos >= 0 ? 0.55 : -0.55), My / 2, 0]} label="opposé = sin α" tone="svt" />

      {/* Hypoténuse = rayon OM */}
      <PolyLine points={[[0, 0, 0], [Mx, My, 0]]} color="#7C3AED" width={5} />
      <Tag3D position={[Mx * 0.5 - 0.3, My * 0.5 + 0.28, 0]} label="hypoténuse = 1" tone="maths" />

      {/* Projections en pointillés */}
      <PolyLine points={[[Mx, My, 0], [0, My, 0]]} color="#16A34A" width={1.5} dashed />
      <PolyLine points={[[Mx, My, 0], [Mx, 0, 0]]} color="#2563EB" width={1.5} dashed />

      {/* Point M(cos α, sin α) sur le cercle */}
      <Marker position={[Mx, My, 0]} color="#DC2626" size={0.12} />
      <Tag3D position={[Mx + (cos >= 0 ? 0.32 : -0.32), My + 0.3, 0]} label="M(cos α ; sin α)" tone="maths" />

      {/* Point fantôme qui orbite en continu : montre le cercle complet */}
      <mesh ref={ghost}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshStandardMaterial color="#A855F7" emissive="#A855F7" emissiveIntensity={0.6} transparent opacity={0.55} />
      </mesh>
      <Animate
        fn={(state) => {
          const t = state.clock.elapsedTime * 0.6;
          ghost.current?.position.set(Math.cos(t) * R, Math.sin(t) * R, 0);
        }}
      />

      {/* Afficheurs : sin, cos, tan */}
      <Readout position={[-1.7, 2.05, 0]} value={sin.toFixed(2)} caption="sin α" />
      <Readout position={[0, 2.05, 0]} value={cos.toFixed(2)} caption="cos α" />
      <Readout position={[1.7, 2.05, 0]} value={tanLabel} caption="tan α" />

      <SceneLabel position={[0, 2.75, 0]} title={`α = ${angle}°`} subtitle="Cercle trigonométrique · rayon 1" tone="maths" />
    </LabScene>
  );
}
