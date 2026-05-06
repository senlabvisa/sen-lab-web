'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ScaleSceneProps = { mass: number; planet: 'terre' | 'lune' };

export default function ScaleScene({ mass, planet }: ScaleSceneProps) {
  const g = planet === 'terre' ? 9.81 : 1.62;
  const weight = mass * g;
  const planetColor = planet === 'terre' ? '#3B82F6' : '#A1A1AA';

  return (
    <LabScene cameraPosition={[0, 1, 4]} background="#0F172A" minDistance={3} maxDistance={9}>
      {/* Planète */}
      <mesh position={[0, -1.5, 0]}>
        <sphereGeometry args={[1.2, 24, 18]} />
        <meshStandardMaterial color={planetColor} />
      </mesh>
      {/* Astronaute simplifié */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.25, 14, 12]} />
        <meshStandardMaterial color="#F8FAFC" />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.5, 12]} />
        <meshStandardMaterial color="#F8FAFC" />
      </mesh>
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="text-[10px] uppercase text-ink/50">Sur {planet === 'terre' ? '🌍 la Terre' : '🌙 la Lune'}</div>
          <div className="font-mono text-xs">m = {mass} kg | g = {g}</div>
          <div className="font-display text-lg font-bold text-blue-700">P = {weight.toFixed(1)} N</div>
        </div>
      </Html>
    </LabScene>
  );
}
