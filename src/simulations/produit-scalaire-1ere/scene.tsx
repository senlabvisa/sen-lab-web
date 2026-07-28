'use client';

import { useMemo } from 'react';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { Axes2D, Arrow3D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — produit scalaire de deux vecteurs (Première S, Maths).
 *
 * Repère fléché (Axes2D). u est posé le long de l'axe des x ; v fait un
 * angle θ avec u. On affiche l'arc de l'angle, la PROJECTION de v sur u
 * (pointillé + pied de projection) et la lecture u·v = |u||v|cos(θ).
 * Géométrie juste : pas d'approximation. u·v = 0 ⟺ θ = 90° (orthogonaux).
 */

export type ScalSceneProps = { angle: number; un: number; vn: number };

const ORTH_EPS = 0.05; // tolérance d'affichage « orthogonaux »

export default function ScalScene({ angle, un, vn }: ScalSceneProps) {
  const ar = (angle * Math.PI) / 180;

  const { uEnd, vEnd, projFoot, arc, dot, isOrtho, dotColor } = useMemo(() => {
    const uX = un; // u le long de +x
    const vX = Math.cos(ar) * vn;
    const vY = Math.sin(ar) * vn;
    const d = uX * vX + 0 * vY; // u·v = ux·vx + uy·vy (uy = 0)
    // projection scalaire de v sur u : (u·v)/|u|, portée sur l'axe de u
    const projLen = un > 1e-6 ? d / un : 0;

    // arc de l'angle entre u et v (rayon constant)
    const R = 0.7;
    const pts: Vector3Tuple[] = [];
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * ar;
      pts.push([Math.cos(a) * R, Math.sin(a) * R, 0]);
    }

    const aigu = angle < 90 - 0.5;
    const obtus = angle > 90 + 0.5;
    const color = obtus ? '#DC2626' : aigu ? '#16A34A' : '#0EA5E9';

    return {
      uEnd: [uX, 0, 0] as Vector3Tuple,
      vEnd: [vX, vY, 0] as Vector3Tuple,
      projFoot: [projLen, 0, 0] as Vector3Tuple,
      arc: pts,
      dot: d,
      isOrtho: Math.abs(d) < ORTH_EPS,
      dotColor: color,
    };
  }, [ar, un, vn, angle]);

  return (
    <LabScene cameraPosition={[0.4, 0.3, 6]} background="#F5F3FF" minDistance={3.5} maxDistance={11}>
      <Axes2D size={3} color="#94A3B8" ticks z={-0.02} />

      {/* arc de l'angle θ */}
      <PolyLine points={arc} color={isOrtho ? '#0EA5E9' : '#7C3AED'} width={3} />
      <Tag3D position={[Math.cos(ar / 2) * 1, Math.sin(ar / 2) * 1, 0]} label={isOrtho ? 'θ = 90°' : `θ = ${angle}°`} tone="maths" />

      {/* projection de v sur u : segment pointillé du bout de v au pied, + axe en pointillé */}
      <PolyLine points={[vEnd, projFoot]} color="#A855F7" width={2.5} dashed />
      <PolyLine points={[[0, 0, 0], projFoot]} color="#F59E0B" width={5} />
      <Marker position={projFoot} color="#F59E0B" size={0.09} />
      <Tag3D position={[projFoot[0], -0.32, 0]} label="proj. de v sur u" tone="neutral" />

      {/* vecteur u (bleu) */}
      <Arrow3D from={[0, 0, 0]} to={uEnd} color="#2563EB" radius={0.045} headLength={0.3} />
      <Tag3D position={[uEnd[0] + 0.15, -0.25, 0]} label="u⃗" tone="physique" />

      {/* vecteur v (vert) */}
      <Arrow3D from={[0, 0, 0]} to={vEnd} color="#16A34A" radius={0.045} headLength={0.3} />
      <Tag3D position={[vEnd[0] * 1.12 + 0.05, vEnd[1] * 1.12 + 0.12, 0]} label="v⃗" tone="svt" />

      <SceneLabel
        position={[0, 2.5, 0]}
        title={isOrtho ? 'u·v = 0 — vecteurs orthogonaux' : `u·v = ${dot.toFixed(2)}`}
        subtitle="u·v = |u|·|v|·cos(θ)"
        tone="maths"
      />
      <Readout position={[2.5, 1.85, 0]} value={dot.toFixed(2)} caption={dot > 0.05 ? 'positif (θ aigu)' : dot < -0.05 ? 'négatif (θ obtus)' : 'nul (θ = 90°)'} />
      {isOrtho && <Tag3D position={[0.55, 0.55, 0]} label="u ⊥ v" tone="maths" />}

      {/* repère de la couleur de signe sur le pied de projection */}
      <Marker position={[vEnd[0], vEnd[1], 0]} color={dotColor} size={0.06} />
    </LabScene>
  );
}
