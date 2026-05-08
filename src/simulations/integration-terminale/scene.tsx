'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type IntegSceneProps = { upper: number };

export default function IntegScene({ upper }: IntegSceneProps) {
  // f(x) = x², ∫₀^upper x² dx = upper³ / 3
  const integral = Math.pow(upper, 3) / 3;
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let x = 0; x <= upper; x += 0.1) arr.push([x, x * x / 4, 0]);
    return arr;
  }, [upper]);
  return (
    <LabScene cameraPosition={[1, 1, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <mesh position={[2, 0, 0]}><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {/* Aire sous la courbe (rectangles) */}
      {Array.from({ length: Math.floor(upper * 5) }).map((_, i) => {
        const x = i / 5;
        const h = (x * x) / 4;
        return <mesh key={i} position={[x, h / 2, 0]}><boxGeometry args={[0.18, h, 0.05]} /><meshStandardMaterial color="#A78BFA" opacity={0.6} transparent /></mesh>;
      })}
      {points.map((p, i) => <mesh key={i + '-c'} position={p}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color="#7C3AED" /></mesh>)}
      <Html position={[2, 2.3, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs">∫₀^{upper.toFixed(1)} x² dx</div>
          <div className="font-display text-base font-bold text-violet-700">= {integral.toFixed(2)}</div>
        </div>
      </Html>
    </LabScene>
  );
}
