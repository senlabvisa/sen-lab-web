'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type MotionSceneProps = { speed: number; running: boolean };

export default function MotionScene({ speed, running }: MotionSceneProps) {
  const carRef = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (carRef.current && running) {
      carRef.current.position.x += speed * delta * 0.5;
      if (carRef.current.position.x > 3) carRef.current.position.x = -3;
    }
  });

  return (
    <LabScene cameraPosition={[0, 1.5, 4]} background="#FED7AA" minDistance={3} maxDistance={9}>
      {/* Route */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 1]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {/* Voiture (cube + roues) */}
      <mesh ref={carRef} position={[-3, 0.2, 0]}>
        <boxGeometry args={[0.6, 0.3, 0.4]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      <Html position={[0, 1.4, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="text-[10px] uppercase text-ink/50">Vitesse</div>
          <div className="font-display text-lg font-bold text-amber-700">{speed.toFixed(1)} m/s</div>
        </div>
      </Html>
    </LabScene>
  );
}
