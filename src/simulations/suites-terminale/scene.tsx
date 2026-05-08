'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ConvSceneProps = { kind: 'convergente' | 'divergente'; q: number };

export default function ConvScene({ kind, q }: ConvSceneProps) {
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let n = 0; n < 15; n++) {
      const v = kind === 'convergente' ? Math.pow(q, n) : (q + 1) * n / 5;
      if (v < 4 && v > -4) arr.push([n * 0.3 - 2, v, 0]);
    }
    return arr;
  }, [kind, q]);
  return (
    <LabScene cameraPosition={[0, 0.5, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color="#7C3AED" /></mesh>)}
      <Html position={[0, 2.3, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-display text-sm font-bold text-violet-700">Suite {kind}</div>
          <div className="font-mono text-xs">{kind === 'convergente' ? `lim u_n = 0` : `lim u_n = +∞`}</div>
        </div>
      </Html>
    </LabScene>
  );
}
