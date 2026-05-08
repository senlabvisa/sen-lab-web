'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type StairsSceneProps = { kind: 'arith' | 'geo'; q: number };

export default function StairsScene({ kind, q }: StairsSceneProps) {
  const u0 = 1;
  const terms = [];
  for (let i = 0; i < 8; i++) {
    const v = kind === 'arith' ? u0 + i * q : u0 * Math.pow(q, i);
    terms.push(v);
  }
  return (
    <LabScene cameraPosition={[3, 4, 5]} background="#F5F3FF" minDistance={3} maxDistance={12}>
      {terms.map((v, i) => (
        <mesh key={i} position={[i * 0.5 - 1.75, v / 4, 0]}>
          <boxGeometry args={[0.4, Math.max(0.05, Math.abs(v) / 2), 0.4]} />
          <meshStandardMaterial color={kind === 'arith' ? '#7C3AED' : '#10B981'} />
        </mesh>
      ))}
      <Html position={[0, 3, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs">{kind === 'arith' ? `u_n = u_0 + n × ${q}` : `u_n = u_0 × ${q}^n`}</div>
          <div className="font-mono text-xs">u_7 = {terms[7].toFixed(2)}</div>
        </div>
      </Html>
    </LabScene>
  );
}
