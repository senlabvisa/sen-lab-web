'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type TrainSceneProps = { speed: number };

export default function TrainScene({ speed }: TrainSceneProps) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.x += speed * delta * 0.05;
      if (ref.current.position.x > 4) ref.current.position.x = -4;
    }
  });
  return (
    <LabScene cameraPosition={[0, 1.5, 5]} background="#DBEAFE" minDistance={3} maxDistance={10}>
      {/* Voie */}
      <mesh position={[0, -0.05, 0]}><boxGeometry args={[10, 0.05, 0.6]} /><meshStandardMaterial color="#475569" /></mesh>
      {/* Train (3 wagons) */}
      <group ref={ref}>
        {[0, -0.7, -1.4].map((x, i) => (
          <mesh key={i} position={[x, 0.3, 0]}><boxGeometry args={[0.6, 0.5, 0.4]} /><meshStandardMaterial color={i === 0 ? '#DC2626' : '#3B82F6'} /></mesh>
        ))}
      </group>
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="text-[10px] uppercase text-ink/50">TER Dakar</div>
          <div className="font-display text-lg font-bold text-blue-700">{speed} km/h</div>
        </div>
      </Html>
    </LabScene>
  );
}
