'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ScaleSceneProps = { ratio: number };

export default function ScaleScene({ ratio }: ScaleSceneProps) {
  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#F5F3FF" minDistance={3} maxDistance={10}>
      {/* Sénégal stylisé original (gauche) */}
      <mesh position={[-1.5, 0, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.05]} />
        <meshStandardMaterial color="#A78BFA" />
      </mesh>
      <Html position={[-1.5, -0.7, 0]} center distanceFactor={9}><span className="rounded bg-white/95 px-2 py-0.5 text-xs font-bold text-violet-700">Original</span></Html>
      {/* Carte à l'échelle (droite) */}
      <mesh position={[1.5, 0, 0]} scale={[ratio, ratio, 1]}>
        <boxGeometry args={[1.2, 0.8, 0.05]} />
        <meshStandardMaterial color="#7C3AED" />
      </mesh>
      <Html position={[1.5, -1.1, 0]} center distanceFactor={9}>
        <div className="rounded bg-white/95 px-2 py-0.5 text-xs">
          {ratio > 1 ? 'Agrandi' : ratio < 1 ? 'Réduit' : 'Identique'} (×{ratio.toFixed(1)})
        </div>
      </Html>
    </LabScene>
  );
}
