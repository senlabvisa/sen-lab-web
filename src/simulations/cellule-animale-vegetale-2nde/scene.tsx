'use client';

import { useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — cellule animale vs végétale (SVT, 2nde).
 *
 * Cellule en volume, membrane translucide, organites colorés et étiquetés
 * (noyau, mitochondries, et pour la végétale : paroi, chloroplastes, grande
 * vacuole). Rotation lente pour la lire en 3D. Construit sur le kit lab3d
 * (annotations Tag3D nettes, pas de fil de fer). L'élève bascule animale ↔
 * végétale pour repérer ce que la végétale possède « en plus ».
 */

export type CellSceneProps = { kind: 'animale' | 'vegetale' };

function Organelles({ isVeg }: { isVeg: boolean }) {
  return (
    <>
      {/* Noyau + nucléole */}
      <mesh position={[0.35, 0.15, 0.2]} castShadow>
        <sphereGeometry args={[0.42, 28, 22]} />
        <meshStandardMaterial color="#7C3AED" roughness={0.45} emissive="#4C1D95" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0.45, 0.22, 0.32]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color="#4C1D95" roughness={0.5} />
      </mesh>
      <Tag3D position={[0.35, 0.75, 0.2]} label="Noyau" tone="svt" />

      {/* Mitochondries (communes aux deux) */}
      <mesh position={[-0.6, 0.5, 0.25]} scale={[1.5, 0.6, 0.6]} castShadow>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color="#DC2626" roughness={0.4} />
      </mesh>
      <mesh position={[0.55, -0.55, -0.35]} scale={[1.5, 0.6, 0.6]} castShadow>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color="#DC2626" roughness={0.4} />
      </mesh>
      <Tag3D position={[-0.6, 0.95, 0.25]} label="Mitochondrie" tone="physique" />

      {isVeg && (
        <>
          {/* Grande vacuole (caractéristique de la cellule végétale) */}
          <mesh position={[-0.35, -0.15, -0.2]}>
            <sphereGeometry args={[0.62, 28, 22]} />
            <meshStandardMaterial color="#38BDF8" transparent opacity={0.4} roughness={0.1} />
          </mesh>
          <Tag3D position={[-0.35, -0.95, -0.2]} label="Vacuole" tone="maths" />

          {/* Chloroplastes (photosynthèse) */}
          {([
            [0.45, 0.55, 0.45],
            [-0.5, 0.05, 0.6],
            [0.15, -0.45, 0.5],
          ] as [number, number, number][]).map((p, i) => (
            <mesh key={i} position={p} scale={[1.3, 0.7, 0.9]} castShadow>
              <sphereGeometry args={[0.18, 16, 12]} />
              <meshStandardMaterial color="#16A34A" roughness={0.4} emissive="#14532D" emissiveIntensity={0.2} />
            </mesh>
          ))}
          <Tag3D position={[0.95, 0.75, 0.45]} label="Chloroplaste" tone="svt" />
        </>
      )}
    </>
  );
}

export default function CellScene({ kind }: CellSceneProps) {
  const cell = useRef<Group>(null);
  const isVeg = kind === 'vegetale';

  return (
    <LabScene cameraPosition={[2.4, 1.2, 4.4]} background="#FCE7F3" minDistance={3} maxDistance={10} groundY={null}>
      <group ref={cell}>
        {isVeg ? (
          <>
            {/* Paroi rigide (cellulose) — coque externe */}
            <mesh>
              <boxGeometry args={[2.7, 2.3, 2.1]} />
              <meshStandardMaterial color="#4D7C0F" transparent opacity={0.14} roughness={0.6} />
            </mesh>
            {/* Membrane + cytoplasme */}
            <mesh>
              <boxGeometry args={[2.45, 2.05, 1.85]} />
              <meshStandardMaterial color="#A3E635" transparent opacity={0.22} roughness={0.3} />
            </mesh>
            <Tag3D position={[0, 1.45, 0]} label="Paroi" tone="svt" />
          </>
        ) : (
          /* Membrane souple + cytoplasme (cellule animale = sphérique) */
          <mesh>
            <sphereGeometry args={[1.3, 36, 28]} />
            <meshStandardMaterial color="#F9A8D4" transparent opacity={0.24} roughness={0.25} />
          </mesh>
        )}

        <Organelles isVeg={isVeg} />
      </group>

      {/* Rotation lente (tourne-disque) pour lire le volume */}
      <Animate fn={(_s, delta) => { if (cell.current) cell.current.rotation.y += delta * 0.18; }} />

      <SceneLabel
        position={[0, 2.0, 0]}
        title={isVeg ? 'Cellule végétale' : 'Cellule animale'}
        subtitle={isVeg ? 'feuille de baobab' : 'cellule de la joue'}
        tone="svt"
      />
    </LabScene>
  );
}
