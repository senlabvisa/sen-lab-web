'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

/**
 * Scène 3D — papillon symétrique.
 *
 * Aile droite contrôlée librement (couleur, position), aile gauche
 * miroir automatique. Axe de symétrie matérialisé par une ligne.
 */

export type ButterflySceneProps = {
  spread: number; // 0..1 — ouverture des ailes
  symmetric: boolean; // si false, casse la symétrie pour montrer la différence
};

function Wing({ x, z, color, spread, flip }: { x: number; z: number; color: string; spread: number; flip: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      ref.current.rotation.y = (flip ? -1 : 1) * (Math.sin(t * 1.5) * 0.1 + (1 - spread) * 0.5);
    }
  });
  return (
    <mesh ref={ref} position={[x, 0, z]} rotation={[0, flip ? Math.PI : 0, 0]}>
      <coneGeometry args={[0.55, 1.2, 4]} />
      <meshStandardMaterial color={color} roughness={0.5} side={2} />
    </mesh>
  );
}

export default function ButterflyScene({ spread, symmetric }: ButterflySceneProps) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.15;
    }
  });

  return (
    <LabScene cameraPosition={[0, 1, 4.5]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {/* Sol pétales */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#F9A8D4" roughness={0.9} opacity={0.5} transparent />
      </mesh>

      <group ref={groupRef}>
        {/* Corps */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.05, 1.4, 8]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>
        {/* Antennes */}
        <mesh position={[0.05, 0.7, 0.1]} rotation={[0, 0, -Math.PI / 6]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>
        <mesh position={[-0.05, 0.7, 0.1]} rotation={[0, 0, Math.PI / 6]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
          <meshStandardMaterial color="#1F2937" />
        </mesh>

        {/* Aile droite */}
        <Wing x={0.5} z={0} color="#7C3AED" spread={spread} flip={false} />
        {/* Aile gauche - miroir si symetric, sinon décalée */}
        <Wing x={symmetric ? -0.5 : -0.3} z={0} color={symmetric ? '#7C3AED' : '#FB923C'} spread={spread} flip />
      </group>

      {/* Axe de symétrie (vertical) */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 3.5, 4]} />
        <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={0.4} opacity={symmetric ? 0.5 : 0.2} transparent />
      </mesh>
    </LabScene>
  );
}
