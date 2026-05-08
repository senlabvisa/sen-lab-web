'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type FnSceneProps = { kind: 'carre' | 'inverse' | 'racine' };
const COLORS = { carre: '#7C3AED', inverse: '#DC2626', racine: '#10B981' };
const NAMES = { carre: 'y = x²', inverse: 'y = 1/x', racine: 'y = √x' };

export default function FnScene({ kind }: FnSceneProps) {
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let x = -3; x <= 3; x += 0.1) {
      let y;
      if (kind === 'carre') y = x * x;
      else if (kind === 'inverse') { if (Math.abs(x) < 0.1) continue; y = 1 / x; }
      else { if (x < 0) continue; y = Math.sqrt(x); }
      if (y > -3 && y < 3) arr.push([x, y, 0]);
    }
    return arr;
  }, [kind]);
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      <mesh><boxGeometry args={[0.02, 6, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color={COLORS[kind]} /></mesh>
      ))}
      <Html position={[0, 2.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono font-bold" style={{ color: COLORS[kind] }}>{NAMES[kind]}</div>
        </div>
      </Html>
    </LabScene>
  );
}
