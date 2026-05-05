'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type CubesSceneProps = { exponent: number };

export default function CubesScene({ exponent }: CubesSceneProps) {
  const value = Math.pow(10, exponent);
  const size = Math.max(0.3, Math.min(3, Math.cbrt(value) * 0.05));

  return (
    <LabScene cameraPosition={[3, 3, 4]} background="#F5F3FF" minDistance={2} maxDistance={12}>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color="#A78BFA" />
      </mesh>
      <mesh>
        <boxGeometry args={[size * 1.001, size * 1.001, size * 1.001]} />
        <meshStandardMaterial color="#7C3AED" wireframe />
      </mesh>
      <Html position={[0, size + 0.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="text-[10px] uppercase text-ink/50">Volume</div>
          <div className="font-mono text-base font-bold text-violet-700">10<sup>{exponent}</sup> = {value.toLocaleString()}</div>
        </div>
      </Html>
    </LabScene>
  );
}
