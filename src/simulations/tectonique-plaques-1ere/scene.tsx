'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type TectoSceneProps = { tension: number };

export default function TectoScene({ tension }: TectoSceneProps) {
  const earthRef = useRef<Mesh>(null);
  useFrame((_, delta) => { if (earthRef.current) earthRef.current.rotation.y += delta * 0.2; });
  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#0F172A" minDistance={3} maxDistance={9}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.5, 32, 24]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      {/* Faille */}
      <mesh position={[1.3 + tension * 0.3, 0, 0]}>
        <boxGeometry args={[0.05 + tension * 0.1, 1.5, 0.05]} />
        <meshStandardMaterial color="#DC2626" emissive="#DC2626" emissiveIntensity={tension} />
      </mesh>
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="font-display text-sm font-bold text-blue-700">Tension tectonique : {(tension * 100).toFixed(0)}%</div>
          {tension > 0.7 && <div className="text-xs font-bold text-red-700">⚠ Risque de séisme</div>}
        </div>
      </Html>
    </LabScene>
  );
}
