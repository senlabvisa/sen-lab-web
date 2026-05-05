'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type HeartSceneProps = { bpm: number };

export default function HeartScene({ bpm }: HeartSceneProps) {
  const heartRef = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * (bpm / 30);
    if (heartRef.current) {
      const beat = 1 + Math.max(0, Math.sin(t * 2)) * 0.18;
      heartRef.current.scale.set(beat, beat, beat);
    }
  });

  return (
    <LabScene cameraPosition={[0, 0.5, 4]} background="#FECACA" minDistance={2.5} maxDistance={8}>
      <mesh ref={heartRef}>
        <sphereGeometry args={[0.7, 18, 14]} />
        <meshStandardMaterial color="#DC2626" emissive="#7F1D1D" emissiveIntensity={0.5} />
      </mesh>
      {/* Aortes */}
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.5, 12]} />
        <meshStandardMaterial color="#B91C1C" />
      </mesh>
      <mesh position={[-0.4, 0.7, 0]} rotation={[0, 0, Math.PI / 5]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#B91C1C" />
      </mesh>
      <mesh position={[0.4, 0.7, 0]} rotation={[0, 0, -Math.PI / 5]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#B91C1C" />
      </mesh>

      <Html position={[0, 1.6, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-red-200">
          <div className="text-[10px] uppercase text-ink/50">Battements</div>
          <div className="font-display text-lg font-bold text-red-700">❤️ {bpm} bpm</div>
        </div>
      </Html>
    </LabScene>
  );
}
