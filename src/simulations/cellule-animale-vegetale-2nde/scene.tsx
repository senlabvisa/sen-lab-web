'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type CellSceneProps = { kind: 'animale' | 'vegetale' };

export default function CellScene({ kind }: CellSceneProps) {
  const isVeg = kind === 'vegetale';
  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {/* Membrane (sphère ou cube selon type) */}
      {isVeg ? (
        <mesh><boxGeometry args={[2, 2, 2]} /><meshStandardMaterial color="#65A30D" wireframe /></mesh>
      ) : (
        <mesh><sphereGeometry args={[1.2, 24, 18]} /><meshStandardMaterial color="#EC4899" wireframe /></mesh>
      )}
      {/* Noyau */}
      <mesh position={[0, 0, 0]}><sphereGeometry args={[0.4, 16, 12]} /><meshStandardMaterial color="#7C3AED" /></mesh>
      {/* Mitochondries */}
      {[[-0.5, 0.3, 0.4], [0.5, -0.4, -0.3]].map((p, i) => (
        <mesh key={i} position={p as any} scale={[1, 0.5, 1]}><sphereGeometry args={[0.18, 12, 10]} /><meshStandardMaterial color="#DC2626" /></mesh>
      ))}
      {/* Chloroplastes (uniquement végétale) */}
      {isVeg && [[0.3, 0.5, 0.3], [-0.3, -0.3, 0.5]].map((p, i) => (
        <mesh key={i} position={p as any}><sphereGeometry args={[0.18, 12, 10]} /><meshStandardMaterial color="#16A34A" /></mesh>
      ))}
      {/* Vacuole (uniquement végétale) */}
      {isVeg && (
        <mesh position={[0.5, 0.5, -0.5]}><sphereGeometry args={[0.45, 16, 12]} /><meshStandardMaterial color="#3B82F6" opacity={0.5} transparent /></mesh>
      )}
      <Html position={[0, 1.8, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-display text-sm font-bold text-pink-700">{isVeg ? 'Cellule végétale' : 'Cellule animale'}</div>
          {isVeg && <div className="text-[10px] text-emerald-700">+ paroi + chloroplastes + vacuole</div>}
        </div>
      </Html>
    </LabScene>
  );
}
