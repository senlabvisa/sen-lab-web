'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Mesh } from 'three';
import { LabScene } from '@/components/lab/lab-scene';

export type CircuitSceneProps = { closed: boolean };

export default function CircuitScene({ closed }: CircuitSceneProps) {
  const lampRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (lampRef.current && closed) {
      const t = state.clock.elapsedTime * 4;
      const intensity = 1 + Math.sin(t) * 0.1;
      (lampRef.current.material as any).emissiveIntensity = intensity;
    }
  });

  return (
    <LabScene cameraPosition={[0, 1.5, 5]} background="#FEF3C7" minDistance={3} maxDistance={9}>
      {/* Sol/plateau */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 4]} />
        <meshStandardMaterial color="#FCD34D" roughness={0.95} />
      </mesh>

      {/* Pile (Woyofal) */}
      <mesh position={[-1.5, 0, 0]}>
        <boxGeometry args={[0.6, 1, 0.6]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[-1.5, 0.6, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.2, 8]} />
        <meshStandardMaterial color="#FBBF24" />
      </mesh>

      {/* Ampoule */}
      <mesh ref={lampRef} position={[1.5, 0.4, 0]}>
        <sphereGeometry args={[0.35, 16, 12]} />
        <meshStandardMaterial color={closed ? '#FEF3C7' : '#9CA3AF'} emissive={closed ? '#FCD34D' : '#000'} emissiveIntensity={closed ? 1 : 0} />
      </mesh>
      <mesh position={[1.5, -0.05, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.3, 8]} />
        <meshStandardMaterial color="#52525B" />
      </mesh>

      {/* Fils (cylindres) */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[3, 0.05, 0.05]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      <mesh position={[-1.5, 0.35, 0]}>
        <boxGeometry args={[0.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      <mesh position={[1.5, 0.55, 0]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>

      {/* Fil bas avec interrupteur */}
      <mesh position={[-0.7, -0.5, 0]}>
        <boxGeometry args={[1.6, 0.05, 0.05]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[0.7, -0.5, 0]}>
        <boxGeometry args={[1.6, 0.05, 0.05]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[-1.5, -0.25, 0]}>
        <boxGeometry args={[0.05, 0.5, 0.05]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      <mesh position={[1.5, -0.25, 0]}>
        <boxGeometry args={[0.05, 0.5, 0.05]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>

      {/* Interrupteur */}
      <mesh position={[0, -0.5, 0]} rotation={[0, 0, closed ? 0 : Math.PI / 4]}>
        <boxGeometry args={[0.5, 0.05, 0.05]} />
        <meshStandardMaterial color={closed ? '#10B981' : '#DC2626'} emissive={closed ? '#059669' : '#7F1D1D'} emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0, -0.85, 0]} center distanceFactor={9}>
        <div className={'rounded-full px-3 py-1 text-xs font-bold ' + (closed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
          Interrupteur {closed ? 'FERMÉ' : 'OUVERT'}
        </div>
      </Html>
    </LabScene>
  );
}
