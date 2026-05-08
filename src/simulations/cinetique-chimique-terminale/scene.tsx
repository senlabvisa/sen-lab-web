'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type KineticSceneProps = { temperature: number };

export default function KineticScene({ temperature }: KineticSceneProps) {
  // Plus la T° est élevée, plus la réaction est rapide
  const k = Math.exp(-2000 / (temperature + 273));
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let t = 0; t < 30; t += 0.5) {
      const c = 1 - Math.exp(-k * t * 100);
      arr.push([t / 6 - 2, c * 2 - 0.5, 0]);
    }
    return arr;
  }, [k]);
  return (
    <LabScene cameraPosition={[0, 0.5, 5]} background="#FEF3C7" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color="#7C3AED" /></mesh>)}
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="font-mono text-xs">T = {temperature} °C → k = {k.toFixed(3)}</div>
          <div className="font-display text-sm font-bold text-amber-700">{temperature > 50 ? 'Réaction rapide' : 'Réaction lente'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
