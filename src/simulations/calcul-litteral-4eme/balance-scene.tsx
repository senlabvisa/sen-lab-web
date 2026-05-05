'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type BalanceSceneProps = { left: number; right: number };

export default function BalanceScene({ left, right }: BalanceSceneProps) {
  const beamRef = useRef<Group>(null);
  const targetRot = (right - left) * 0.05;
  useFrame(() => {
    if (beamRef.current) {
      beamRef.current.rotation.z += (targetRot - beamRef.current.rotation.z) * 0.08;
    }
  });

  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      {/* Pied */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.2, 8]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.4, 8]} />
        <meshStandardMaterial color="#64748B" />
      </mesh>
      {/* Bras */}
      <group ref={beamRef} position={[0, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[3, 0.08, 0.12]} />
          <meshStandardMaterial color="#7C3AED" />
        </mesh>
        {/* Plateaux */}
        <mesh position={[-1.5, -0.3, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
          <meshStandardMaterial color="#A78BFA" />
        </mesh>
        <mesh position={[1.5, -0.3, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.05, 16]} />
          <meshStandardMaterial color="#A78BFA" />
        </mesh>
        {/* Poids gauche/droite */}
        <Html position={[-1.5, 0.05, 0]} center distanceFactor={9}><span className="rounded bg-white/95 px-2 py-0.5 text-xs font-bold text-violet-700">{left}</span></Html>
        <Html position={[1.5, 0.05, 0]} center distanceFactor={9}><span className="rounded bg-white/95 px-2 py-0.5 text-xs font-bold text-violet-700">{right}</span></Html>
      </group>
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className={'rounded-full px-3 py-1 text-xs font-bold ' + (left === right ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
          {left === right ? '⚖ Équilibre' : left < right ? '← Gauche plus léger' : 'Droite plus léger →'}
        </div>
      </Html>
    </LabScene>
  );
}
