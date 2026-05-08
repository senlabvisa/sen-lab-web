'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type IncSceneProps = { mass: number; height: number };

export default function IncScene({ mass, height }: IncSceneProps) {
  const ballRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (ballRef.current) {
      const t = (state.clock.elapsedTime % 4) / 4;
      ballRef.current.position.x = -2 + t * 4;
      ballRef.current.position.y = height * (1 - t);
    }
  });
  const Ep = mass * 9.81 * height;
  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#DBEAFE" minDistance={3} maxDistance={9}>
      {/* Plan incliné */}
      <mesh position={[0, height / 2 - 0.3, 0]} rotation={[0, 0, -Math.atan(height / 4)]}>
        <boxGeometry args={[4.5, 0.08, 0.6]} />
        <meshStandardMaterial color="#7C3AED" />
      </mesh>
      {/* Balle */}
      <mesh ref={ballRef}><sphereGeometry args={[0.18, 16, 12]} /><meshStandardMaterial color="#DC2626" /></mesh>
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="font-mono text-xs">m = {mass} kg | h = {height.toFixed(1)} m</div>
          <div className="font-display text-base font-bold text-blue-700">Eₚ = m·g·h = {Ep.toFixed(1)} J</div>
        </div>
      </Html>
    </LabScene>
  );
}
