'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type BalloonSceneProps = { pressure: number };

export default function BalloonScene({ pressure }: BalloonSceneProps) {
  const ballonRef = useRef<Mesh>(null);
  const targetScale = 0.5 + pressure / 200;
  useFrame(() => {
    if (ballonRef.current) {
      const c = ballonRef.current.scale.x;
      const next = c + (targetScale - c) * 0.1;
      ballonRef.current.scale.set(next, next, next);
    }
  });

  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#DBEAFE" minDistance={3} maxDistance={9}>
      <mesh ref={ballonRef}>
        <sphereGeometry args={[0.7, 24, 18]} />
        <meshStandardMaterial color="#DC2626" roughness={0.3} />
      </mesh>
      {/* Nouage */}
      <mesh position={[0, -0.7, 0]}>
        <coneGeometry args={[0.1, 0.2, 8]} />
        <meshStandardMaterial color="#7F1D1D" />
      </mesh>
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="text-[10px] uppercase text-ink/50">Pression</div>
          <div className="font-display text-lg font-bold text-blue-700">{pressure} hPa</div>
        </div>
      </Html>
    </LabScene>
  );
}
