'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type LungsSceneProps = { breathRate: number };

export default function LungsScene({ breathRate }: LungsSceneProps) {
  const lungLRef = useRef<Group>(null);
  const lungRRef = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * breathRate;
    const scale = 0.85 + Math.abs(Math.sin(t)) * 0.3;
    if (lungLRef.current) {
      lungLRef.current.scale.set(scale, scale, scale);
    }
    if (lungRRef.current) {
      lungRRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <LabScene cameraPosition={[0, 0.5, 4]} background="#FCE7F3" minDistance={2.5} maxDistance={8}>
      {/* Trachée */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 1.2, 12]} />
        <meshStandardMaterial color="#F9A8D4" roughness={0.6} />
      </mesh>

      {/* Poumon gauche */}
      <group ref={lungLRef} position={[-0.7, 0.3, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 14, 12]} />
          <meshStandardMaterial color="#EC4899" roughness={0.65} />
        </mesh>
        {/* Lobes */}
        <mesh position={[-0.15, -0.2, 0]} scale={[0.7, 0.6, 0.7]}>
          <sphereGeometry args={[0.45, 12, 10]} />
          <meshStandardMaterial color="#DB2777" roughness={0.65} />
        </mesh>
      </group>

      {/* Poumon droit */}
      <group ref={lungRRef} position={[0.7, 0.3, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 14, 12]} />
          <meshStandardMaterial color="#EC4899" roughness={0.65} />
        </mesh>
        <mesh position={[0.15, -0.2, 0]} scale={[0.7, 0.6, 0.7]}>
          <sphereGeometry args={[0.45, 12, 10]} />
          <meshStandardMaterial color="#DB2777" roughness={0.65} />
        </mesh>
      </group>

      {/* Cœur (entre les 2) */}
      <mesh position={[-0.15, 0.3, 0.4]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#DC2626" emissive="#7F1D1D" emissiveIntensity={0.5} />
      </mesh>

      {/* Diaphragme */}
      <mesh position={[0, -0.6, 0]} scale={[2, 0.15, 1.2]}>
        <sphereGeometry args={[0.6, 14, 8]} />
        <meshStandardMaterial color="#9F1239" roughness={0.7} />
      </mesh>

      <Html position={[0, 1.9, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="text-[10px] uppercase text-ink/50">Rythme</div>
          <div className="font-display text-lg font-bold text-pink-700">{Math.round(breathRate * 10)} resp/min</div>
        </div>
      </Html>
    </LabScene>
  );
}
