'use client';

import { useMemo, useRef } from 'react';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { GraphPaper, Segment } from '@/components/lab3d/environment';
import { Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — racine carrée (Maths, 3ème).
 *
 * Une plaque carrée (boîte fine) posée sur un repère quadrillé. L'AIRE a est
 * réglée par un slider ; le CÔTÉ de la plaque mesure exactement c = √a, ce qui
 * illustre que (√a)² = a. La grille (1 case = 1 unité) permet de compter l'aire.
 * Construit sur le kit lab3d. Aucune dépendance réseau (offline-safe).
 */

export type SquareSceneProps = { area: number };

const GRID = 7; // demi-côté du quadrillage (cases visibles)

export default function SquareScene({ area }: SquareSceneProps) {
  const plate = useRef<Mesh>(null);
  const side = Math.sqrt(area); // c = √a

  // Carré ancré en bas-gauche du repère (origine du quadrillage).
  const x0 = -GRID / 2;
  const y0 = -GRID / 2;
  const corner = useMemo<[number, number, number]>(() => [x0 + side, y0 + side, 0], [side, x0, y0]);

  return (
    <LabScene cameraPosition={[0.4, 1.4, 7.5]} background="#F5F3FF" minDistance={4} maxDistance={13} groundY={null}>
      {/* Repère quadrillé : 1 case = 1 unité de longueur (aire = nb de cases) */}
      <GraphPaper width={GRID} height={GRID} step={1} color="#DDD6FE" />
      {/* Axes épais (bord gauche + bas) pour ancrer le carré */}
      <Segment a={[x0, y0, 0.01]} b={[x0 + GRID, y0, 0.01]} color="#7C3AED" width={0.02} />
      <Segment a={[x0, y0, 0.01]} b={[x0, y0 + GRID, 0.01]} color="#7C3AED" width={0.02} />

      {/* Carré 3D : plaque fine d'aire a, de côté √a, ancrée en bas-gauche */}
      <mesh ref={plate} position={[x0 + side / 2, y0 + side / 2, 0.06]} castShadow>
        <boxGeometry args={[side, side, 0.12]} />
        <meshStandardMaterial color="#A78BFA" roughness={0.45} metalness={0.1} emissive="#7C3AED" emissiveIntensity={0.12} />
      </mesh>
      <Animate
        fn={(state) => {
          // Respiration douce de la plaque (la plaque « vit » sans déformer l'aire).
          const s = 1 + 0.02 * Math.sin(state.clock.elapsedTime * 1.6);
          plate.current?.scale.set(s, s, 1);
        }}
      />

      {/* Côté c = √a : segment marqué sur le bord bas */}
      <Segment a={[x0, y0 - 0.18, 0.06]} b={[x0 + side, y0 - 0.18, 0.06]} color="#0EA5E9" width={0.03} />
      <Tag3D position={[x0 + side / 2, y0 - 0.6, 0]} label={`côté c = √a = ${side.toFixed(2)}`} tone="maths" />

      {/* Coin du carré + lecture du côté */}
      <Marker position={corner} color="#0EA5E9" size={0.1} />
      <Readout position={[corner[0] + 1.1, corner[1] + 0.2, 0]} value={side.toFixed(2)} unit="u" caption="côté = √a" />

      {/* Aire affichée au centre de la plaque */}
      <Tag3D position={[x0 + side / 2, y0 + side / 2, 0.2]} label={`aire a = ${area}`} tone="maths" />

      <SceneLabel
        position={[0, GRID / 2 + 0.7, 0]}
        title={`(√a)² = a   →   ${side.toFixed(2)}² = ${area}`}
        subtitle="aire d'un carré = côté²"
        tone="maths"
      />
    </LabScene>
  );
}
