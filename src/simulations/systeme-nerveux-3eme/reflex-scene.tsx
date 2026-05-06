'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type ReflexSceneProps = { triggered: boolean };

export default function ReflexScene({ triggered }: ReflexSceneProps) {
  const legRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (legRef.current) {
      const target = triggered ? -0.6 : 0;
      legRef.current.rotation.x += (target - legRef.current.rotation.x) * 0.15;
    }
  });

  return (
    <LabScene cameraPosition={[2, 0.5, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {/* Cuisse */}
      <mesh position={[0, 0.4, 0]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.18, 0.8, 12]} />
        <meshStandardMaterial color="#FB7185" />
      </mesh>
      {/* Genou */}
      <mesh position={[0, 0, 0.15]}>
        <sphereGeometry args={[0.18, 14, 12]} />
        <meshStandardMaterial color="#F87171" emissive={triggered ? '#DC2626' : '#000'} emissiveIntensity={triggered ? 0.5 : 0} />
      </mesh>
      {/* Tibia (animé) */}
      <mesh ref={legRef} position={[0, -0.4, 0.15]}>
        <cylinderGeometry args={[0.13, 0.1, 0.8, 12]} />
        <meshStandardMaterial color="#FB7185" />
      </mesh>
      {/* Marteau réflexe */}
      <mesh position={[0.6, 0.5, 0]} rotation={[0, 0, -Math.PI / 5]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
        <meshStandardMaterial color="#92400E" />
      </mesh>
      <mesh position={[0.7, 0.7, 0]}>
        <boxGeometry args={[0.2, 0.1, 0.1]} />
        <meshStandardMaterial color="#A16207" />
      </mesh>
      <Html position={[0, 1.2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-display text-sm font-bold text-pink-700">{triggered ? '⚡ Réflexe ! Jambe levée' : 'Au repos'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
