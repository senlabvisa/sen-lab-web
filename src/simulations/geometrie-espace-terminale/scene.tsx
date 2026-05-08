'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type SpaceSceneProps = { kind: 'cube' | 'sphere' | 'tetra' };

export default function SpaceScene({ kind }: SpaceSceneProps) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => { if (ref.current) { ref.current.rotation.x += delta * 0.2; ref.current.rotation.y += delta * 0.3; } });
  const NAMES = { cube: 'Cube', sphere: 'Sphère', tetra: 'Tétraèdre' };
  const VOLS = { cube: 'V = a³', sphere: 'V = 4/3 π r³', tetra: 'V = a³√2 / 12' };
  return (
    <LabScene cameraPosition={[3, 3, 4]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <group ref={ref}>
        {kind === 'cube' && <mesh><boxGeometry args={[1.5, 1.5, 1.5]} /><meshStandardMaterial color="#7C3AED" wireframe /></mesh>}
        {kind === 'sphere' && <mesh><sphereGeometry args={[1, 24, 18]} /><meshStandardMaterial color="#7C3AED" wireframe /></mesh>}
        {kind === 'tetra' && <mesh><tetrahedronGeometry args={[1.2]} /><meshStandardMaterial color="#7C3AED" wireframe /></mesh>}
      </group>
      <Html position={[0, 2.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-display text-base font-bold text-violet-700">{NAMES[kind]}</div>
          <div className="font-mono text-xs">{VOLS[kind]}</div>
        </div>
      </Html>
    </LabScene>
  );
}
