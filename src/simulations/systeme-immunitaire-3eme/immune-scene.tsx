'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type ImmuneSceneProps = { defending: boolean };

export default function ImmuneScene({ defending }: ImmuneSceneProps) {
  const wbcRef = useRef<Group>(null);
  useFrame((state) => {
    if (wbcRef.current && defending) {
      const t = state.clock.elapsedTime * 2;
      wbcRef.current.position.x = Math.cos(t) * 0.5;
      wbcRef.current.position.z = Math.sin(t) * 0.5;
    }
  });

  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {/* Parasite (paludisme) */}
      <mesh position={[0.5, 0, 0]}>
        <sphereGeometry args={[0.18, 12, 10]} />
        <meshStandardMaterial color="#DC2626" emissive={defending ? '#7F1D1D' : '#000'} emissiveIntensity={0.4} />
      </mesh>
      {/* Globule blanc (défense) */}
      <group ref={wbcRef} position={[-0.5, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshStandardMaterial color="#F8FAFC" emissive="#3B82F6" emissiveIntensity={defending ? 0.5 : 0.1} />
        </mesh>
        {/* Pseudopodes */}
        {Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3]}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshStandardMaterial color="#F8FAFC" />
            </mesh>
          );
        })}
      </group>
      {/* Globules rouges (décor) */}
      {[[-1.5, 0.4, 0.3], [1.5, -0.5, -0.4]].map((p, i) => (
        <mesh key={i} position={p as any} scale={[0.5, 0.2, 0.5]}>
          <sphereGeometry args={[0.2, 12, 10]} />
          <meshStandardMaterial color="#B91C1C" />
        </mesh>
      ))}
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-display text-sm font-bold text-pink-700">{defending ? '🛡 Défense en cours' : 'Au repos'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
