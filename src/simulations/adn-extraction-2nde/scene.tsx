'use client';

import { useRef } from 'react';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';
import { LabBench } from '@/components/lab3d/environment';
import { Beaker } from '@/components/lab3d/glassware';
import { DNAHelix } from '@/components/lab3d/molecule';
import { SceneLabel, Tag3D } from '@/components/lab3d/annotations';
import { Animate } from '@/components/lab3d/anim';

/**
 * Scène 3D — extraction de l'ADN d'une banane (SVT, 2nde).
 *
 * Quatre étapes du protocole dans un bécher réaliste (verrerie du kit). Au
 * stade final (alcool), une vraie double hélice d'ADN (DNAHelix du kit)
 * précipite et remonte au-dessus du mélange, en rotation lente. Construit sur
 * le kit lab3d — fini les deux cylindres bricolés.
 */

export type DnaSceneProps = { stage: number };

const GROUND_Y = -1.5;
const STAGES = [
  { name: 'Banane écrasée', color: '#FCD34D', fill: 0.5 },
  { name: 'Savon + sel', color: '#D6D3D1', fill: 0.56 },
  { name: 'Filtration', color: '#BFDBFE', fill: 0.5 },
  { name: 'Alcool : ADN visible', color: '#C7D2FE', fill: 0.44 },
];

export default function DnaScene({ stage }: DnaSceneProps) {
  const s = Math.max(0, Math.min(3, Math.round(stage)));
  const cfg = STAGES[s];
  const dna = useRef<Group>(null);

  return (
    <LabScene cameraPosition={[2.2, 1.0, 4.8]} background="#FCE7F3" minDistance={3} maxDistance={10} groundY={GROUND_Y}>
      <LabBench y={GROUND_Y} color="#E7D8B8" size={24} />

      <Beaker position={[0, GROUND_Y + 1.05, 0]} radius={0.92} height={2.0} fill={cfg.fill} liquidColor={cfg.color} />

      {/* Double hélice qui précipite à l'étape finale */}
      {s === 3 && (
        <>
          <group ref={dna} position={[0, GROUND_Y + 2.0, 0]}>
            <DNAHelix turns={2} height={1.3} radius={0.2} />
          </group>
          <Tag3D position={[0.7, GROUND_Y + 2.3, 0]} label="ADN" tone="svt" />
        </>
      )}
      <Animate
        fn={(_s, delta) => {
          if (dna.current) dna.current.rotation.y += delta * 0.7;
        }}
      />

      <SceneLabel position={[0, GROUND_Y + 3.1, 0]} title={cfg.name} subtitle={`Étape ${s + 1}/4 · extraction d'ADN`} tone="svt" />
    </LabScene>
  );
}
