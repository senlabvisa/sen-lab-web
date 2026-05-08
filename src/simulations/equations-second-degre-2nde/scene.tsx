'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ParabolaSceneProps = { a: number; b: number; c: number };

export default function ParabolaScene({ a, b, c }: ParabolaSceneProps) {
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let x = -3; x <= 3; x += 0.2) {
      const y = a * x * x + b * x + c;
      if (y > -3 && y < 3) arr.push([x, y, 0]);
    }
    return arr;
  }, [a, b, c]);
  const delta = b * b - 4 * a * c;
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      <mesh><boxGeometry args={[0.02, 6, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color="#7C3AED" /></mesh>
      ))}
      <Html position={[0, 2.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs">y = {a}x² + {b}x + {c}</div>
          <div className="font-mono text-xs">Δ = {delta.toFixed(1)} → {delta > 0 ? '2 racines' : delta === 0 ? '1 racine double' : '0 racine réelle'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
