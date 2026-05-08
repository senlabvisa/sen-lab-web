'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ExpSceneProps = { kind: 'exp' | 'log' };

export default function ExpScene({ kind }: ExpSceneProps) {
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    if (kind === 'exp') {
      for (let x = -2; x <= 1.5; x += 0.05) arr.push([x, Math.exp(x) - 1, 0]);
    } else {
      for (let x = 0.05; x <= 4; x += 0.05) arr.push([x - 2, Math.log(x), 0]);
    }
    return arr;
  }, [kind]);
  return (
    <LabScene cameraPosition={[0, 0.5, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      <mesh><boxGeometry args={[0.02, 6, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color={kind === 'exp' ? '#DC2626' : '#10B981'} /></mesh>)}
      <Html position={[0, 2.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-display text-base font-bold" style={{ color: kind === 'exp' ? '#DC2626' : '#10B981' }}>{kind === 'exp' ? 'y = eˣ' : 'y = ln(x)'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
