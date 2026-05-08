'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type DerivSceneProps = { x0: number };

export default function DerivScene({ x0 }: DerivSceneProps) {
  // f(x) = x², f'(x) = 2x
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let x = -2.5; x <= 2.5; x += 0.1) arr.push([x, x * x - 2, 0]);
    return arr;
  }, []);
  const tangentSlope = 2 * x0;
  const y0 = x0 * x0 - 2;
  // Points de la tangente
  const tang: [number, number, number][] = [
    [x0 - 1.5, y0 - 1.5 * tangentSlope, 0],
    [x0 + 1.5, y0 + 1.5 * tangentSlope, 0],
  ];
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.04, 6, 6]} /><meshStandardMaterial color="#7C3AED" /></mesh>)}
      {/* Tangente */}
      <mesh position={[x0, y0, 0]} rotation={[0, 0, Math.atan(tangentSlope)]}>
        <boxGeometry args={[3, 0.04, 0.04]} />
        <meshStandardMaterial color="#10B981" />
      </mesh>
      <mesh position={[x0, y0, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#DC2626" /></mesh>
      <Html position={[0, 2.3, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs">f(x) = x² - 2 | f&apos;(x) = 2x</div>
          <div className="font-mono text-xs">x = {x0.toFixed(1)} → pente = <strong className="text-emerald-700">{tangentSlope.toFixed(1)}</strong></div>
        </div>
      </Html>
    </LabScene>
  );
}
