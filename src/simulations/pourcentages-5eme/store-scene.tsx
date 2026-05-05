'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type StoreSceneProps = { originalPrice: number; reduction: number };

export default function StoreScene({ originalPrice, reduction }: StoreSceneProps) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });

  const finalPrice = Math.round(originalPrice * (1 - reduction / 100));
  const saved = originalPrice - finalPrice;

  return (
    <LabScene cameraPosition={[2.5, 1.5, 4]} background="#FEF3C7" minDistance={3} maxDistance={8}>
      {/* Panneau magasin */}
      <mesh position={[0, 1.8, -1]}>
        <boxGeometry args={[2.6, 0.6, 0.06]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      <Html position={[0, 1.8, -0.96]} center distanceFactor={9}>
        <span className="font-display text-lg font-bold text-white">SOLDES AUCHAN</span>
      </Html>

      <group ref={groupRef}>
        {/* Boîte produit */}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.4, 1, 0.7]} />
          <meshStandardMaterial color="#3B82F6" />
        </mesh>
        {/* Étiquette prix barré */}
        <Html position={[0, 0.85, 0.4]} center distanceFactor={8}>
          <div className="rounded-xl bg-white/95 px-3 py-1 text-center shadow-soft ring-1 ring-ink/10">
            <div className="text-[10px] uppercase text-ink/50">Prix</div>
            <div className="font-mono text-sm">
              <span className="line-through text-ink/40">{originalPrice} F</span>
            </div>
            <div className="font-display text-xl font-bold text-red-600">{finalPrice} F</div>
            {reduction > 0 && (
              <div className="mt-0.5 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                −{reduction}% ({saved} F économisés)
              </div>
            )}
          </div>
        </Html>
      </group>

      {/* Sol */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#FCD34D" roughness={0.95} />
      </mesh>
    </LabScene>
  );
}
