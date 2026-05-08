'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type StatsSceneProps = { values: number[] };

export default function StatsScene({ values }: StatsSceneProps) {
  const max = Math.max(...values, 1);
  return (
    <LabScene cameraPosition={[2, 3, 4]} background="#F5F3FF" minDistance={3} maxDistance={10}>
      {values.map((v, i) => {
        const h = (v / max) * 2.5;
        const x = -((values.length - 1) / 2) * 0.5 + i * 0.5;
        return (
          <mesh key={i} position={[x, h / 2, 0]}>
            <boxGeometry args={[0.4, Math.max(0.05, h), 0.4]} />
            <meshStandardMaterial color="#A78BFA" />
          </mesh>
        );
      })}
      <Html position={[0, 3, 0]} center distanceFactor={9}>
        <div className="rounded bg-white/95 px-2 py-0.5 text-xs font-bold text-violet-700">Médiane: {[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]}</div>
      </Html>
    </LabScene>
  );
}
