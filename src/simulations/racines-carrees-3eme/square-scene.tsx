'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type SquareSceneProps = { side: number };

export default function SquareScene({ side }: SquareSceneProps) {
  return (
    <LabScene cameraPosition={[2, 2, 4]} background="#F5F3FF" minDistance={3} maxDistance={10}>
      <mesh position={[0, side / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[side, side]} />
        <meshStandardMaterial color="#A78BFA" side={2} />
      </mesh>
      <mesh position={[0, side / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[side / 2 - 0.05, side / 2, 4]} />
        <meshStandardMaterial color="#7C3AED" side={2} />
      </mesh>
      <Html position={[0, side + 0.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="text-[10px] uppercase text-ink/50">Aire = côté²</div>
          <div className="font-mono text-base font-bold text-violet-700">{side.toFixed(1)}² = {(side*side).toFixed(2)}</div>
        </div>
      </Html>
    </LabScene>
  );
}
