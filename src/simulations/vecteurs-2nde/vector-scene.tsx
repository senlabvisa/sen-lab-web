'use client';

import { useMemo } from 'react';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, Arrow3D, PolyLine } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — somme de deux vecteurs (vecteurs · Seconde · Maths).
 *
 * Repère gradué (Axes2D). L'élève règle les coordonnées de u (bleu) et v
 * (vert) avec des sliders. La somme u + v (violet) est tracée depuis
 * l'origine selon la règle du parallélogramme : v est reporté en pointillé
 * à partir de l'extrémité de u (mise bout à bout). Coordonnées exactes :
 * u + v = (ux + vx ; uy + vy). Construit sur le kit lab3d.
 */

export type VectorSceneProps = { ux: number; uy: number; vx: number; vy: number };

const U_COLOR = '#2563EB'; // bleu
const V_COLOR = '#16A34A'; // vert
const SUM_COLOR = '#7C3AED'; // violet

export default function VectorScene({ ux, uy, vx, vy }: VectorSceneProps) {
  const sx = ux + vx;
  const sy = uy + vy;

  // Reports en pointillé (règle du parallélogramme) : v depuis l'extrémité de
  // u, et u depuis l'extrémité de v → ferment le parallélogramme sur u + v.
  const dashedVFromU = useMemo<[number, number, number][]>(
    () => [
      [ux, uy, 0],
      [sx, sy, 0],
    ],
    [ux, uy, sx, sy],
  );
  const dashedUFromV = useMemo<[number, number, number][]>(
    () => [
      [vx, vy, 0],
      [sx, sy, 0],
    ],
    [vx, vy, sx, sy],
  );

  return (
    <LabScene cameraPosition={[0, 0.2, 6]} background="#F5F3FF" minDistance={4} maxDistance={11} groundY={null}>
      {/* Repère gradué (tons maths) */}
      <Axes2D size={3} color="#64748B" ticks />

      {/* Vecteur u (bleu) depuis l'origine */}
      <Arrow3D from={[0, 0, 0]} to={[ux, uy, 0]} color={U_COLOR} radius={0.045} headLength={0.28} />
      <Tag3D position={[ux * 0.55 - 0.18, uy * 0.55 + 0.22, 0]} label="u⃗" tone="physique" />

      {/* Vecteur v (vert) depuis l'origine */}
      <Arrow3D from={[0, 0, 0]} to={[vx, vy, 0]} color={V_COLOR} radius={0.045} headLength={0.28} />
      <Tag3D position={[vx * 0.55 + 0.2, vy * 0.55 - 0.22, 0]} label="v⃗" tone="svt" />

      {/* Règle du parallélogramme : reports en pointillé */}
      <PolyLine points={dashedVFromU} color={V_COLOR} width={2} dashed />
      <PolyLine points={dashedUFromV} color={U_COLOR} width={2} dashed />

      {/* Résultante u + v (violet) depuis l'origine */}
      <Arrow3D from={[0, 0, 0]} to={[sx, sy, 0]} color={SUM_COLOR} radius={0.055} headLength={0.32} />
      <Tag3D position={[sx * 0.5 + 0.1, sy * 0.5 + 0.32, 0]} label="u⃗ + v⃗" tone="chimie" />

      <SceneLabel
        position={[0, 3.1, 0]}
        title="Somme de deux vecteurs"
        subtitle="Règle du parallélogramme · bout à bout"
        tone="chimie"
      />
      <Readout position={[2.5, -2.4, 0]} value={`(${sx.toFixed(1)} ; ${sy.toFixed(1)})`} caption="u + v = (ux+vx ; uy+vy)" />
    </LabScene>
  );
}
