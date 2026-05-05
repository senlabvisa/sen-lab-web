'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type EclipseSceneProps = { moonPosition: number };

export default function EclipseScene({ moonPosition }: EclipseSceneProps) {
  const moonRef = useRef<Group>(null);
  useFrame(() => {
    if (moonRef.current) {
      const angle = (moonPosition / 100) * Math.PI - Math.PI / 2;
      moonRef.current.position.x = Math.cos(angle) * 2.2;
      moonRef.current.position.z = Math.sin(angle) * 0.5;
    }
  });

  // Si la lune est centrée (proche de 50%), on est en éclipse
  const eclipse = Math.abs(moonPosition - 50) < 8;

  return (
    <LabScene cameraPosition={[0, 1.5, 6]} background="#0F172A" minDistance={3} maxDistance={12}>
      {/* Soleil derrière */}
      <mesh position={[0, 0, -2]}>
        <sphereGeometry args={[1.2, 24, 18]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.8} />
      </mesh>
      {/* Halo */}
      <mesh position={[0, 0, -2.05]}>
        <sphereGeometry args={[1.5, 24, 18]} />
        <meshStandardMaterial color="#FCD34D" emissive="#FBBF24" emissiveIntensity={0.4} opacity={0.3} transparent />
      </mesh>

      {/* Lune (mobile) */}
      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[0.45, 18, 14]} />
          <meshStandardMaterial color="#A1A1AA" roughness={0.95} />
        </mesh>
      </group>

      {/* Terre (observateur) */}
      <mesh position={[0, -0.5, 2.5]}>
        <sphereGeometry args={[0.6, 18, 14]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>

      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className={'rounded-2xl px-3 py-1 text-center shadow-card ' + (eclipse ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-white/95 ring-1 ring-ink/10')}>
          <div className="text-[10px] uppercase text-ink/50">État</div>
          <div className={'font-display text-lg font-bold ' + (eclipse ? 'text-yellow-800' : 'text-ink/70')}>
            {eclipse ? '🌑 ÉCLIPSE !' : 'Position lune'}
          </div>
        </div>
      </Html>
    </LabScene>
  );
}
