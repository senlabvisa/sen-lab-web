'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type DecaySceneProps = { time: number };

export default function DecayScene({ time }: DecaySceneProps) {
  // Carbone 14 : T1/2 = 5730 ans. On affiche en multiples de T1/2
  const N = Math.pow(0.5, time / 5730);
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let t = 0; t <= 30000; t += 100) {
      const n = Math.pow(0.5, t / 5730);
      arr.push([(t / 30000) * 4 - 2, n * 2 - 0.5, 0]);
    }
    return arr;
  }, []);
  return (
    <LabScene cameraPosition={[0, 0.5, 5]} background="#FEF3C7" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color="#7C3AED" /></mesh>)}
      {/* Point courant */}
      <mesh position={[(time / 30000) * 4 - 2, N * 2 - 0.5, 0]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#DC2626" /></mesh>
      <Html position={[0, 2.3, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="font-mono text-xs">t = {time} ans → N(t)/N₀ = {(N * 100).toFixed(1)}%</div>
        </div>
      </Html>
    </LabScene>
  );
}
