'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type CellSceneProps = { kind: 'mitose' | 'meiose' };

export default function CellScene({ kind }: CellSceneProps) {
  const cells = kind === 'mitose' ? 2 : 4;
  const chromosomesPerCell = kind === 'mitose' ? 4 : 2;
  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {Array.from({ length: cells }).map((_, i) => {
        const x = -((cells - 1) / 2) * 1.2 + i * 1.2;
        return (
          <group key={i} position={[x, 0, 0]}>
            <mesh><sphereGeometry args={[0.45, 18, 14]} /><meshStandardMaterial color="#EC4899" wireframe /></mesh>
            {/* Chromosomes */}
            {Array.from({ length: chromosomesPerCell }).map((_, j) => {
              const a = (j / chromosomesPerCell) * Math.PI * 2;
              return <mesh key={j} position={[Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0]}><cylinderGeometry args={[0.04, 0.04, 0.2, 8]} /><meshStandardMaterial color="#7C3AED" /></mesh>;
            })}
          </group>
        );
      })}
      <Html position={[0, 1.8, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-display text-base font-bold text-pink-700">{kind === 'mitose' ? 'Mitose : 2 cellules identiques' : 'Méiose : 4 cellules à n chromosomes'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
