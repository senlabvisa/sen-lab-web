'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type FlowerSceneProps = { beePosition: number };

export default function FlowerScene({ beePosition }: FlowerSceneProps) {
  const beeRef = useRef<Group>(null);
  useFrame((state) => {
    if (beeRef.current) {
      const angle = (beePosition / 100) * Math.PI * 2;
      beeRef.current.position.x = Math.cos(angle) * 1.6;
      beeRef.current.position.z = Math.sin(angle) * 1.6;
      beeRef.current.position.y = 0.7 + Math.sin(state.clock.elapsedTime * 8) * 0.05;
      beeRef.current.rotation.y = -angle - Math.PI / 2;
    }
  });

  return (
    <LabScene cameraPosition={[2, 2, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {/* Tige */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1.5, 8]} />
        <meshStandardMaterial color="#15803D" />
      </mesh>
      {/* Centre fleur */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.3} />
      </mesh>
      {/* Pétales */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.45, 0.4, Math.sin(a) * 0.45]} scale={[0.5, 0.15, 0.5]}>
            <sphereGeometry args={[0.4, 12, 8]} />
            <meshStandardMaterial color="#EC4899" />
          </mesh>
        );
      })}
      {/* Feuilles */}
      <mesh position={[0.35, -0.2, 0]} scale={[0.6, 0.1, 0.3]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial color="#16A34A" />
      </mesh>
      {/* Abeille */}
      <group ref={beeRef}>
        <mesh><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#FCD34D" /></mesh>
        <mesh position={[0, 0, -0.12]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color="#1F2937" /></mesh>
        <mesh position={[0.08, 0.12, 0]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color="#F8FAFC" opacity={0.7} transparent /></mesh>
        <mesh position={[-0.08, 0.12, 0]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color="#F8FAFC" opacity={0.7} transparent /></mesh>
      </group>
      <Html position={[0, 1.6, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-display text-sm font-bold text-pink-700">🐝 Pollinisation</div>
        </div>
      </Html>
    </LabScene>
  );
}
