'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type DnaSceneProps = { stage: 'adn' | 'arn' | 'proteine' };

export default function DnaScene({ stage }: DnaSceneProps) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.5; });
  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      <group ref={ref}>
        {/* ADN double hélice */}
        {stage === 'adn' && Array.from({ length: 20 }).map((_, i) => {
          const t = (i / 20) * Math.PI * 4;
          return (
            <group key={i}>
              <mesh position={[Math.cos(t) * 0.4, i * 0.15 - 1.5, Math.sin(t) * 0.4]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color="#3B82F6" /></mesh>
              <mesh position={[-Math.cos(t) * 0.4, i * 0.15 - 1.5, -Math.sin(t) * 0.4]}><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color="#DC2626" /></mesh>
            </group>
          );
        })}
        {/* ARNm */}
        {stage === 'arn' && Array.from({ length: 25 }).map((_, i) => {
          const t = (i / 25) * Math.PI * 3;
          return <mesh key={i} position={[Math.cos(t) * 0.3, i * 0.12 - 1.5, Math.sin(t) * 0.3]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color="#10B981" /></mesh>;
        })}
        {/* Protéine */}
        {stage === 'proteine' && Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <mesh key={i} position={[Math.cos(a) * 0.7, Math.sin(a * 2) * 0.3, Math.sin(a) * 0.7]}><sphereGeometry args={[0.18, 12, 10]} /><meshStandardMaterial color="#7C3AED" /></mesh>;
        })}
      </group>
      <Html position={[0, 2.2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-display text-base font-bold text-pink-700">{stage === 'adn' ? '🧬 ADN' : stage === 'arn' ? '📜 ARNm (transcription)' : '⚙ Protéine (traduction)'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
