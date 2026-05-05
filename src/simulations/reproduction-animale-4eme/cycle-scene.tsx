'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type CycleSceneProps = { stage: number };

export default function CycleScene({ stage }: CycleSceneProps) {
  const flyRef = useRef<Group>(null);
  useFrame((state) => {
    if (flyRef.current && stage >= 3) {
      flyRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
    }
  });

  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#FED7AA" minDistance={3} maxDistance={9}>
      {/* Sol */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 32]} />
        <meshStandardMaterial color="#A16207" roughness={0.9} />
      </mesh>

      {/* Œuf - stage 0 */}
      {stage === 0 && (
        <mesh position={[0, 0, 0]} scale={[0.7, 1, 0.7]}>
          <sphereGeometry args={[0.2, 14, 12]} />
          <meshStandardMaterial color="#FAF6E1" />
        </mesh>
      )}

      {/* Larve - stage 1 */}
      {stage === 1 && (
        <mesh position={[0, -0.3, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.5, 0.5, 0.5]}>
          <sphereGeometry args={[0.3, 12, 10]} />
          <meshStandardMaterial color="#FCD34D" />
        </mesh>
      )}

      {/* Pupe (cocon) - stage 2 */}
      {stage === 2 && (
        <mesh position={[0, -0.2, 0]} scale={[0.7, 1.4, 0.7]}>
          <sphereGeometry args={[0.25, 14, 12]} />
          <meshStandardMaterial color="#92400E" roughness={0.85} />
        </mesh>
      )}

      {/* Mouche adulte - stage 3 */}
      {stage === 3 && (
        <group ref={flyRef}>
          <mesh><sphereGeometry args={[0.2, 14, 12]} /><meshStandardMaterial color="#1F2937" /></mesh>
          <mesh position={[0.18, 0.1, 0]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#F8FAFC" opacity={0.7} transparent /></mesh>
          <mesh position={[-0.18, 0.1, 0]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#F8FAFC" opacity={0.7} transparent /></mesh>
        </group>
      )}

      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="font-display text-base font-bold text-amber-700">
            {stage === 0 ? '🥚 Œuf' : stage === 1 ? '🐛 Larve' : stage === 2 ? '🟫 Pupe' : '🪰 Adulte'}
          </div>
        </div>
      </Html>
    </LabScene>
  );
}
