'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type RlcSceneProps = { damping: number };

export default function RlcScene({ damping }: RlcSceneProps) {
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let t = 0; t < 8; t += 0.05) {
      const v = Math.exp(-damping * t) * Math.cos(t * 4);
      arr.push([t / 2 - 2, v * 1.5, 0]);
    }
    return arr;
  }, [damping]);
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#FEF3C7" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color={damping < 0.2 ? '#DC2626' : damping < 0.6 ? '#F59E0B' : '#10B981'} /></mesh>)}
      <Html position={[0, 2.3, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="font-mono text-xs">Amortissement = {damping.toFixed(2)}</div>
          <div className="font-display text-sm font-bold text-amber-700">{damping < 0.2 ? 'Pseudo-périodique' : damping < 0.7 ? 'Apériodique' : 'Critique'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
