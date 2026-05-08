'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type HormoneSceneProps = { age: number };

export default function HormoneScene({ age }: HormoneSceneProps) {
  const stage = age < 11 ? 'enfant' : age < 14 ? 'puberté' : 'adulte';
  const colors = { enfant: '#3B82F6', puberté: '#FB923C', adulte: '#7C3AED' };
  return (
    <LabScene cameraPosition={[0, 1, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {/* Silhouette qui grandit */}
      <mesh position={[0, age / 30, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 0.5 + age / 20, 12]} />
        <meshStandardMaterial color={colors[stage as keyof typeof colors]} />
      </mesh>
      <mesh position={[0, age / 30 + 0.6 + age / 40, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color={colors[stage as keyof typeof colors]} />
      </mesh>
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-mono text-xs">Âge: {age} ans</div>
          <div className="font-display text-base font-bold text-pink-700">{stage.charAt(0).toUpperCase() + stage.slice(1)}</div>
        </div>
      </Html>
    </LabScene>
  );
}
