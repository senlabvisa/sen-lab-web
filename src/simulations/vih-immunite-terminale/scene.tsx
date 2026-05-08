'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type VihSceneProps = { years: number };

export default function VihScene({ years }: VihSceneProps) {
  // CD4 décroît si pas de traitement, augmente avec ART
  const cd4 = Math.max(50, 1000 - years * 80);
  const points = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let y = 0; y <= 12; y += 0.5) {
      const c = Math.max(50, 1000 - y * 80);
      arr.push([(y / 12) * 4 - 2, (c / 250) - 0.5, 0]);
    }
    return arr;
  }, []);
  return (
    <LabScene cameraPosition={[0, 0.5, 5]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {points.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color={cd4 < 200 ? '#DC2626' : '#7C3AED'} /></mesh>)}
      <mesh position={[(years / 12) * 4 - 2, (cd4 / 250) - 0.5, 0]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#FBBF24" /></mesh>
      <Html position={[0, 2.3, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-mono text-xs">{years} ans après infection</div>
          <div className="font-display text-base font-bold" style={{ color: cd4 < 200 ? '#DC2626' : cd4 < 500 ? '#F59E0B' : '#10B981' }}>CD4 = {Math.round(cd4)} cellules/μL</div>
          {cd4 < 200 && <div className="text-xs text-red-700">⚠ SIDA déclaré</div>}
        </div>
      </Html>
    </LabScene>
  );
}
