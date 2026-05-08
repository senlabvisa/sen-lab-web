'use client';

import { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ProbSceneProps = { trials: number };

export default function ProbScene({ trials }: ProbSceneProps) {
  const [results, setResults] = useState<('pile' | 'face')[]>([]);
  useEffect(() => {
    const arr: ('pile' | 'face')[] = [];
    for (let i = 0; i < trials; i++) arr.push(Math.random() < 0.5 ? 'pile' : 'face');
    setResults(arr);
  }, [trials]);
  const pile = results.filter(r => r === 'pile').length;
  const ratio = trials > 0 ? pile / trials : 0;
  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      {/* Pile : cylindre violet */}
      <mesh position={[-1, ratio - 1, 0]}>
        <cylinderGeometry args={[0.4, 0.4, Math.max(0.1, ratio * 2), 16]} />
        <meshStandardMaterial color="#7C3AED" />
      </mesh>
      {/* Face : cylindre orange */}
      <mesh position={[1, (1 - ratio) - 1, 0]}>
        <cylinderGeometry args={[0.4, 0.4, Math.max(0.1, (1 - ratio) * 2), 16]} />
        <meshStandardMaterial color="#FB923C" />
      </mesh>
      <Html position={[0, 1.8, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs">{trials} lancers</div>
          <div className="font-display text-base font-bold"><span className="text-violet-700">Pile {(ratio * 100).toFixed(0)}%</span> / <span className="text-orange-700">Face {((1-ratio) * 100).toFixed(0)}%</span></div>
        </div>
      </Html>
    </LabScene>
  );
}
