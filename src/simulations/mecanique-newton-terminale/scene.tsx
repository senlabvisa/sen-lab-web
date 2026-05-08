'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type ProjSceneProps = { v0: number; angle: number };

export default function ProjScene({ v0, angle }: ProjSceneProps) {
  const ballRef = useRef<Mesh>(null);
  const t0 = useRef(0);
  useEffect(() => { t0.current = performance.now() / 1000; }, [v0, angle]);
  useFrame(() => {
    if (ballRef.current) {
      const t = (performance.now() / 1000 - t0.current) % 3;
      const ar = (angle * Math.PI) / 180;
      const x = -2 + v0 * Math.cos(ar) * t * 0.4;
      const y = v0 * Math.sin(ar) * t * 0.4 - 4.9 * t * t * 0.4 - 1;
      ballRef.current.position.x = x;
      ballRef.current.position.y = y;
    }
  });
  return (
    <LabScene cameraPosition={[0, 0.5, 5]} background="#FED7AA" minDistance={3} maxDistance={9}>
      {/* Sol */}
      <mesh position={[0, -1.5, 0]}><boxGeometry args={[8, 0.05, 0.5]} /><meshStandardMaterial color="#78350F" /></mesh>
      {/* Baobab (canon) */}
      <mesh position={[-2, -0.5, 0]}><cylinderGeometry args={[0.2, 0.3, 1, 12]} /><meshStandardMaterial color="#5D3A1A" /></mesh>
      <mesh position={[-2, 0.3, 0]}><sphereGeometry args={[0.5, 16, 12]} /><meshStandardMaterial color="#16A34A" /></mesh>
      {/* Projectile */}
      <mesh ref={ballRef}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#DC2626" /></mesh>
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="font-mono text-xs">v₀ = {v0} m/s | α = {angle}°</div>
          <div className="font-display text-sm font-bold text-amber-700">Trajectoire parabolique</div>
        </div>
      </Html>
    </LabScene>
  );
}
