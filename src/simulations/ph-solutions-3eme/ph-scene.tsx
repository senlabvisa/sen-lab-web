'use client';

import { useMemo, useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Beaker } from '@/components/lab3d/glassware';
import { Bar, Marker } from '@/components/lab3d/plot';
import { SceneLabel, Readout, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — échelle de pH (Physique-Chimie, 3ème).
 *
 * Un bécher en verre dont le LIQUIDE prend la couleur du BBT / indicateur
 * universel selon le pH choisi : jaune/rouge en milieu acide, vert vers 7
 * (neutre), bleu/violet en milieu basique. À droite, une échelle de pH 0–14
 * faite de barres colorées sert de repère ; un curseur se cale sur le pH
 * courant. Construit sur le kit lab3d (verrerie, tone chimie).
 */

export type PhSceneProps = { ph: number };

/** Couleur de l'indicateur universel (continue) pour un pH de 0 à 14. */
function indicatorColor(ph: number): string {
  if (ph <= 2) return '#E11D48'; // rouge — très acide
  if (ph <= 4) return '#F97316'; // orangé — acide
  if (ph <= 6) return '#EAB308'; // jaune — faiblement acide
  if (ph < 8) return '#22C55E'; // vert — neutre
  if (ph <= 10) return '#0EA5E9'; // bleu — basique
  if (ph <= 12) return '#6366F1'; // indigo — basique fort
  return '#7C3AED'; // violet — très basique
}

function nature(ph: number): { label: string; sub: string } {
  if (ph < 7) return { label: 'Solution acide', sub: 'pH < 7' };
  if (ph > 7) return { label: 'Solution basique', sub: 'pH > 7' };
  return { label: 'Solution neutre', sub: 'pH = 7' };
}

// Échelle de pH : 15 barres (0 → 14) posées en X croissant à droite du bécher.
const SCALE_X = 2.1;
const SCALE_STEP = 0.26;
const SCALE_Y = -0.5;

export default function PhScene({ ph }: PhSceneProps) {
  const cursor = useRef<Group>(null);

  const color = indicatorColor(ph);
  const { label, sub } = nature(ph);
  // Niveau de remplissage légèrement variable pour un rendu vivant (constant en science).
  const fill = 0.55;

  const bars = useMemo(
    () => Array.from({ length: 15 }, (_, i) => ({ ph: i, color: indicatorColor(i) })),
    [],
  );

  // Position X cible du curseur sur l'échelle (suit le pH courant).
  const cursorTargetX = SCALE_X + ph * SCALE_STEP;

  return (
    <LabScene cameraPosition={[0.4, 1.1, 6.4]} background="#F3EEFF" minDistance={3.5} maxDistance={11} groundY={-1.5}>
      <LabBench y={-1.5} color="#E5DCE9" size={24} />

      {/* Bécher héros : le liquide prend la couleur de l'indicateur */}
      <Beaker position={[-1.4, -0.4, 0]} radius={1} height={2.1} fill={fill} liquidColor={color} graduations />
      <Tag3D position={[-1.4, -1.6, 0]} label="Solution + BBT" tone="chimie" />

      {/* Échelle de pH colorée (repère 0 → 14) */}
      {bars.map((b) => (
        <Bar key={b.ph} x={SCALE_X + b.ph * SCALE_STEP} height={0.7} width={SCALE_STEP * 0.82} depth={0.5} color={b.color} />
      ))}
      {/* graduations texte aux extrémités et au neutre */}
      <Tag3D position={[SCALE_X, SCALE_Y - 0.55, 0]} label="0" tone="chimie" />
      <Tag3D position={[SCALE_X + 7 * SCALE_STEP, SCALE_Y - 0.55, 0]} label="7" tone="svt" />
      <Tag3D position={[SCALE_X + 14 * SCALE_STEP, SCALE_Y - 0.55, 0]} label="14" tone="chimie" />
      <Tag3D position={[SCALE_X + 1.5 * SCALE_STEP, SCALE_Y + 0.9, 0]} label="acide" tone="chimie" />
      <Tag3D position={[SCALE_X + 7 * SCALE_STEP, SCALE_Y + 0.9, 0]} label="neutre" tone="svt" />
      <Tag3D position={[SCALE_X + 12.5 * SCALE_STEP, SCALE_Y + 0.9, 0]} label="basique" tone="chimie" />

      {/* Curseur qui pointe le pH courant sur l'échelle (animé en douceur) */}
      <group ref={cursor} position={[cursorTargetX, SCALE_Y + 0.55, 0.3]}>
        <Marker position={[0, 0, 0]} color={color} size={0.12} />
      </group>
      <Animate
        fn={() => {
          const g = cursor.current;
          if (!g) return;
          // lissage de la position du curseur vers le pH courant
          g.position.x += (cursorTargetX - g.position.x) * 0.18;
        }}
      />

      <SceneLabel position={[-1.4, 1.55, 0]} title={label} subtitle={sub} tone="chimie" />
      <Readout position={[-1.4, 0.75, 0.9]} value={ph} caption="pH (BBT)" />
    </LabScene>
  );
}
