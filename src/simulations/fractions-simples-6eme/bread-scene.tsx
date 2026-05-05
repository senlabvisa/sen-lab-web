'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

/**
 * Scène 3D — pain de mil rond 3D divisé en parts.
 *
 * Disque (cylindre aplati) découpé en N parts angulaires. Les parts
 * "mangées" (eaten) deviennent transparentes ou disparaissent. Tournée
 * lentement pour bien voir les coupes.
 */

export type BreadSceneProps = {
  parts: number; // dénominateur (2-12)
  eaten: number; // numérateur (0..parts)
};

const RADIUS = 1.6;
const HEIGHT = 0.45;

function BreadSlice({
  index,
  total,
  eaten,
}: {
  index: number;
  total: number;
  eaten: boolean;
}) {
  const startAngle = (index / total) * Math.PI * 2;
  const endAngle = ((index + 1) / total) * Math.PI * 2;
  const sliceAngle = endAngle - startAngle;

  // Position centre de la part
  const midAngle = (startAngle + endAngle) / 2;
  const offset = eaten ? 0.7 : 0;
  const x = Math.cos(midAngle) * offset;
  const z = -Math.sin(midAngle) * offset;
  const y = eaten ? 0.4 : 0;

  return (
    <group position={[x, y, z]} rotation={[0, -startAngle, 0]}>
      <mesh>
        <cylinderGeometry
          args={[RADIUS, RADIUS * 0.95, HEIGHT, 32, 1, false, 0, sliceAngle]}
        />
        <meshStandardMaterial
          color={eaten ? '#9CA3AF' : '#F4A153'}
          opacity={eaten ? 0.25 : 1}
          transparent={eaten}
          roughness={0.85}
        />
      </mesh>
      {/* Croûte plus foncée sur le dessus */}
      <mesh position={[0, HEIGHT / 2 + 0.005, 0]}>
        <cylinderGeometry
          args={[RADIUS * 0.99, RADIUS * 0.99, 0.04, 32, 1, false, 0, sliceAngle]}
        />
        <meshStandardMaterial
          color={eaten ? '#6B7280' : '#92400E'}
          opacity={eaten ? 0.25 : 1}
          transparent={eaten}
        />
      </mesh>
    </group>
  );
}

export default function BreadScene({ parts, eaten }: BreadSceneProps) {
  const groupRef = useRef<Group>(null);
  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const remaining = parts - eaten;
  const fractionStr = `${remaining} / ${parts}`;

  return (
    <LabScene
      cameraPosition={[0, 3, 4.5]}
      background="#FEF3C7"
      minDistance={3}
      maxDistance={9}
    >
      {/* Plateau */}
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial color="#78350F" roughness={0.9} />
      </mesh>

      {/* Pain découpé */}
      <group ref={groupRef}>
        {Array.from({ length: parts }).map((_, i) => (
          <BreadSlice key={i} index={i} total={parts} eaten={i < eaten} />
        ))}
      </group>

      {/* Affichage flottant : fraction restante */}
      <Html position={[0, 2.5, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div className="select-none rounded-2xl bg-white/95 px-4 py-2 text-center shadow-card ring-1 ring-amber-200">
          <div className="text-[10px] uppercase tracking-wider text-ink/50">Reste</div>
          <div className="font-display text-3xl font-bold text-amber-700">{fractionStr}</div>
          <div className="text-[10px] text-ink/50">
            ({remaining} part{remaining > 1 ? 's' : ''} sur {parts})
          </div>
        </div>
      </Html>
    </LabScene>
  );
}
