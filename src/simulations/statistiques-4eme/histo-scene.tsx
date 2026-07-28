'use client';

import { useMemo } from 'react';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench, Segment } from '@/components/lab3d/environment';
import { Axes2D, Bar, PolyLine, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';

/**
 * Scène 3D — diagramme en barres d'une série statistique (Statistiques, 4ème).
 *
 * Une barre <Bar> par catégorie (mois / valeur), hauteur ∝ effectif.
 * La moyenne pondérée est tracée par une ligne <PolyLine> horizontale et
 * affichée dans un <Readout>. Repère <Axes2D>, ton « maths ». Kit lab3d.
 */

export type HistoSceneProps = {
  /** Effectif (ou valeur relevée) de chaque catégorie. */
  data: number[];
  /** Libellés courts des catégories (mois, valeurs…). */
  labels: string[];
  /** Moyenne (pondérée) de la série, dans la même unité que data. */
  mean: number;
  /** Légende de l'unité affichée (ex : « mm » ou « /20 »). */
  unit?: string;
  selected: number | null;
  onSelect: (i: number) => void;
};

const GROUND_Y = -1.5;
const SPACING = 0.92; // pas entre barres (unités scène)
const Y_SCALE_MAX = 3.4; // hauteur de la plus grande barre

export default function HistoScene({ data, labels, mean, unit = '', selected, onSelect }: HistoSceneProps) {
  const N = data.length;
  const max = Math.max(...data, 1);
  const x0 = -((N - 1) / 2) * SPACING;
  const k = Y_SCALE_MAX / max; // facteur valeur → hauteur scène

  // Sommets des barres → ligne de profil (PolyLine) qui relie les effectifs.
  const profile = useMemo<[number, number, number][]>(
    () => data.map((v, i) => [x0 + i * SPACING, GROUND_Y + v * k, 0]),
    [data, x0, k],
  );

  // Ligne de la moyenne, tracée d'un bord à l'autre du diagramme.
  const meanY = GROUND_Y + mean * k;
  const meanLine: [number, number, number][] = [
    [x0 - SPACING * 0.7, meanY, 0],
    [x0 + (N - 1) * SPACING + SPACING * 0.7, meanY, 0],
  ];

  return (
    <LabScene cameraPosition={[0.4, 1.4, 7.4]} background="#F5F3FF" minDistance={4} maxDistance={12} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7E1F2" size={26} />

      {/* Repère : axe vertical (effectifs) le long du diagramme */}
      <group position={[x0 - SPACING * 0.9, GROUND_Y, 0]}>
        <Axes2D size={3.2} color="#7C6FAE" ticks z={0} />
      </group>

      {/* Barres : une par catégorie, hauteur ∝ effectif */}
      {data.map((v, i) => {
        const x = x0 + i * SPACING;
        const h = Math.max(0.02, v * k);
        const active = selected === i;
        return (
          <group key={i}>
            {/* maille cliquable transparente qui couvre toute la colonne */}
            <mesh
              position={[x, GROUND_Y + Y_SCALE_MAX / 2, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(i);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
            >
              <boxGeometry args={[0.6, Y_SCALE_MAX, 0.6]} />
              <meshStandardMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <group position={[0, GROUND_Y, 0]}>
              <Bar x={x} height={h} width={0.52} depth={0.52} color={active ? '#7C3AED' : '#A78BFA'} />
            </group>
            <Tag3D position={[x, GROUND_Y - 0.32, 0.3]} label={labels[i]} tone="maths" />
            {active && <Tag3D position={[x, GROUND_Y + h + 0.32, 0]} label={`${v}${unit}`} tone="maths" />}
          </group>
        );
      })}

      {/* Ligne de profil reliant les sommets des barres */}
      <PolyLine points={profile} color="#6D28D9" width={2} />

      {/* Ligne de la moyenne (en pointillés) + marqueur */}
      <PolyLine points={meanLine} color="#0EA5E9" width={3} dashed />
      <Marker position={[x0 + (N - 1) * SPACING + SPACING * 0.7, meanY, 0]} color="#0EA5E9" size={0.09} />
      <Tag3D position={[x0 + (N - 1) * SPACING + SPACING * 1.1, meanY + 0.15, 0]} label="moyenne" tone="maths" />

      {/* Repères de hauteur (graduations légères) sur la base */}
      <Segment a={[x0 - SPACING * 0.7, GROUND_Y, 0]} b={[x0 + (N - 1) * SPACING + SPACING * 0.7, GROUND_Y, 0]} color="#B7AEDD" width={0.012} />

      <SceneLabel position={[0, 2.7, 0]} title="Diagramme en barres" subtitle={`${N} catégories · effectifs`} tone="maths" />
      <Readout position={[x0 + (N - 1) * SPACING + SPACING * 1.6, meanY + 0.8, 0]} value={mean.toFixed(1)} unit={unit} caption="moyenne" />
    </LabScene>
  );
}
