'use client';

import { useMemo } from 'react';
import type { Vector3Tuple } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Glass } from '@/components/lab3d/materials';
import { Arrow3D, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Tag3D, Readout } from '@/components/lab3d/annotations';

/**
 * Scène 3D — banc d'optique vu de côté (lentille convergente mince, 4ème).
 *
 * Axe optique = PolyLine horizontale ; lentille biconvexe translucide au
 * centre ; foyers F (objet) et F' (image) en Marker. Trois rayons
 * particuliers tracés en PolyLine : parallèle→F', centre optique→non dévié,
 * passant par F→ressort parallèle. Ils se croisent et forment l'image
 * réelle renversée à droite. Science : 1/OA' − 1/OA = 1/f'.
 */

export type LensSceneProps = { focal: number; objectDist: number };

const Y = -0.4; // hauteur de l'axe optique (posé sur le banc)
const H_OBJ = 1.1; // hauteur de l'objet (flèche)
const SCALE = 0.95; // distances banc → unités scène
const GROUND_Y = -1.5;

export default function LensScene({ focal, objectDist }: LensSceneProps) {
  const f = focal;
  const p = objectDist;

  const geo = useMemo(() => {
    // Conjugaison : objet à gauche en x = −p·SCALE ; image réelle à droite.
    const pPrime = (p * f) / (p - f); // distance image (>0 ⇒ réelle, à droite)
    const gamma = -pPrime / p; // grandissement (<0 ⇒ renversée)

    const xObj = -p * SCALE; // pied de l'objet
    const xImg = pPrime * SCALE; // pied de l'image
    const xF = -f * SCALE; // foyer objet F (gauche)
    const xFp = f * SCALE; // foyer image F' (droite)

    const objTip: Vector3Tuple = [xObj, Y + H_OBJ, 0];
    const yImg = Y + gamma * H_OBJ; // sommet image (gamma<0 ⇒ sous l'axe)
    const imgTip: Vector3Tuple = [xImg, yImg, 0];

    // Rayon 1 — parallèle à l'axe → réfracté par F' → image
    const ray1: Vector3Tuple[] = [objTip, [0, Y + H_OBJ, 0], imgTip];
    // Rayon 2 — par le centre optique O → non dévié
    const ray2: Vector3Tuple[] = [objTip, [0, Y, 0], imgTip];
    // Rayon 3 — passe par le foyer objet F → ressort parallèle à l'axe.
    //   Hauteur d'impact sur la lentille (x=0) le long de la droite objet→F.
    const slope = (Y - objTip[1]) / (xF - objTip[0]); // pente objet→F
    const yImpact = objTip[1] + slope * (0 - objTip[0]);
    const ray3: Vector3Tuple[] = [objTip, [0, yImpact, 0], imgTip];

    return { pPrime, gamma, xObj, xImg, xF, xFp, objTip, imgTip, ray1, ray2, ray3 };
  }, [f, p]);

  return (
    <LabScene cameraPosition={[0, 0.7, 6.5]} background="#EAF2FF" minDistance={4} maxDistance={12} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#D8E2EE" size={26} />

      {/* Axe optique (PolyLine horizontale) */}
      <PolyLine points={[[-5, Y, 0], [5, Y, 0]]} color="#64748B" width={2} dashed />

      {/* Lentille convergente mince : disque biconvexe translucide */}
      <group>
        <mesh scale={[0.16, 1, 1]}>
          <sphereGeometry args={[1.05, 40, 28]} />
          <Glass tint="#CFE3FF" roughness={0.04} thickness={0.5} opacity={0.55} />
        </mesh>
        {/* monture fine */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.05, 0.03, 12, 40]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
      <Tag3D position={[0, Y - 1.35, 0]} label="O (centre optique)" tone="physique" />

      {/* Foyers F (objet) et F' (image) */}
      <Marker position={[geo.xF, Y, 0]} color="#F59E0B" size={0.08} />
      <Tag3D position={[geo.xF, Y - 0.3, 0]} label="F" tone="physique" />
      <Marker position={[geo.xFp, Y, 0]} color="#F59E0B" size={0.08} />
      <Tag3D position={[geo.xFp, Y - 0.3, 0]} label="F′" tone="physique" />

      {/* Objet (bougie / flèche verticale, vers le haut) */}
      <Arrow3D from={[geo.xObj, Y, 0]} to={geo.objTip} color="#DC2626" radius={0.035} headLength={0.22} />
      <mesh position={[geo.xObj, GROUND_Y + 0.05, 0]} castShadow>
        <boxGeometry args={[0.22, 0.1, 0.22]} />
        <meshStandardMaterial color="#7C2D12" roughness={0.8} />
      </mesh>
      <Tag3D position={[geo.xObj, Y + H_OBJ + 0.3, 0]} label="Objet" tone="physique" />

      {/* Image (flèche renversée, vers le bas) */}
      <Arrow3D from={[geo.xImg, Y, 0]} to={geo.imgTip} color="#16A34A" radius={0.035} headLength={0.2} />
      <mesh position={[geo.xImg, GROUND_Y + 0.05, 0]}>
        <boxGeometry args={[0.04, 0.1, 0.6]} />
        <meshStandardMaterial color="#94A3B8" roughness={0.7} />
      </mesh>
      <Tag3D position={[geo.xImg, geo.imgTip[1] - 0.3, 0]} label="Image" tone="svt" />

      {/* Trois rayons particuliers (PolyLine) */}
      <PolyLine points={geo.ray1} color="#2563EB" width={2.5} />
      <PolyLine points={geo.ray2} color="#7C3AED" width={2.5} />
      <PolyLine points={geo.ray3} color="#0EA5E9" width={2.5} />

      <SceneLabel
        position={[0, Y + H_OBJ + 1.05, 0]}
        title="Image réelle · renversée"
        subtitle={`OA = ${p.toFixed(1)} · f′ = ${f.toFixed(1)} · γ = ${geo.gamma.toFixed(2)}`}
        tone="physique"
      />
      <Readout position={[geo.xImg + 0.1, Y + 1.2, 0]} value={geo.pPrime.toFixed(2)} unit="" caption="OA′ (image)" />
    </LabScene>
  );
}
