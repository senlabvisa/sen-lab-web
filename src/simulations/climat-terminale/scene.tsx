'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ClimatSceneProps = { co2: number };

export default function ClimatScene({ co2 }: ClimatSceneProps) {
  // Modèle simplifié : T = 14 + (CO2 - 280) / 100 × 0.7
  const T = 14 + ((co2 - 280) / 100) * 0.7;
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let c = 280; c <= 800; c += 5) {
      const t = 14 + ((c - 280) / 100) * 0.7;
      arr.push([(c - 540) / 100, (t - 14) - 0.5, 0]);
    }
    return arr;
  }, []);
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#0F172A" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color="#DC2626" /></mesh>)}
      {/* Point courant */}
      <mesh position={[(co2 - 540) / 100, (T - 14) - 0.5, 0]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.6} /></mesh>
      <Html position={[0, 2.3, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="font-mono text-xs">[CO₂] = {co2} ppm</div>
          <div className="font-display text-lg font-bold" style={{ color: T > 16 ? '#DC2626' : T > 14 ? '#F59E0B' : '#3B82F6' }}>T_moy = {T.toFixed(1)} °C</div>
        </div>
      </Html>
    </LabScene>
  );
}
