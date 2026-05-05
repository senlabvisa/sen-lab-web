'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Mesh } from 'three';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type BeakerSceneProps = { liquid: 'bissap' | 'cafe' | 'eau' | 'lait'; mixed: boolean };

const COLORS = {
  bissap: '#B91C1C',
  cafe: '#451A03',
  eau: '#3B82F6',
  lait: '#FAFAFA',
};

const NAMES = { bissap: 'Bissap', cafe: 'Café Touba', eau: 'Eau pure', lait: 'Lait' };

export default function BeakerScene({ liquid, mixed }: BeakerSceneProps) {
  const liquidRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (liquidRef.current && mixed) {
      liquidRef.current.position.y = -0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.04;
    }
  });

  return (
    <LabScene cameraPosition={[2.5, 1, 4]} background="#FED7AA" minDistance={3} maxDistance={9}>
      {/* Bécher tube */}
      <mesh>
        <cylinderGeometry args={[1, 1, 2.5, 32, 1, true]} />
        <meshStandardMaterial color="#BFDBFE" opacity={0.2} transparent side={DoubleSide} />
      </mesh>
      {/* Fond */}
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color="#94A3B8" />
      </mesh>
      {/* Liquide */}
      <mesh ref={liquidRef} position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.97, 0.97, 1.5, 32]} />
        <meshStandardMaterial color={COLORS[liquid]} opacity={0.85} transparent />
      </mesh>
      <Html position={[0, 1.6, 0]} center distanceFactor={9} style={{ pointerEvents: 'none' }}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="text-[10px] uppercase text-ink/50">Liquide</div>
          <div className="font-display text-lg font-bold text-amber-700">{NAMES[liquid]}</div>
        </div>
      </Html>
    </LabScene>
  );
}
