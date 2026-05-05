'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type DigestiveSceneProps = { progress: number };

export default function DigestiveScene({ progress }: DigestiveSceneProps) {
  const bolusRef = useRef<Mesh>(null);
  const stages = [
    { y: 1.8, label: 'Bouche' },
    { y: 1.0, label: 'Œsophage' },
    { y: 0.2, label: 'Estomac' },
    { y: -0.6, label: 'Intestin grêle' },
    { y: -1.4, label: 'Côlon' },
  ];
  const idx = Math.min(stages.length - 1, Math.floor(progress / 25));
  const current = stages[idx];

  useFrame(() => {
    if (bolusRef.current) {
      const targetY = stages[idx].y;
      bolusRef.current.position.y += (targetY - bolusRef.current.position.y) * 0.05;
    }
  });

  return (
    <LabScene cameraPosition={[2, 0.5, 4]} background="#FED7AA" minDistance={3} maxDistance={8}>
      {/* Tube digestif simplifié (cylindre vertical avec renflements) */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.8, 12]} />
        <meshStandardMaterial color="#FCA5A5" />
      </mesh>
      {/* Estomac (sphère) */}
      <mesh position={[0, 0.2, 0]} scale={[1, 0.7, 0.7]}>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshStandardMaterial color="#F87171" />
      </mesh>
      {/* Intestin grêle (zigzag) */}
      <mesh position={[0, -0.6, 0]} scale={[1.2, 0.4, 1]}>
        <torusGeometry args={[0.4, 0.15, 8, 24]} />
        <meshStandardMaterial color="#FBBF24" />
      </mesh>
      {/* Côlon */}
      <mesh position={[0, -1.4, 0]} scale={[1.2, 0.5, 1]}>
        <torusGeometry args={[0.5, 0.18, 8, 24]} />
        <meshStandardMaterial color="#A16207" />
      </mesh>

      {/* Bol alimentaire (pile de mil) */}
      <mesh ref={bolusRef} position={[0, 1.8, 0.3]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#92400E" emissive="#7C2D12" emissiveIntensity={0.4} />
      </mesh>

      <Html position={[0, 2.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="text-[10px] uppercase text-ink/50">Bol alimentaire</div>
          <div className="font-display text-lg font-bold text-amber-700">{current.label}</div>
        </div>
      </Html>
    </LabScene>
  );
}
