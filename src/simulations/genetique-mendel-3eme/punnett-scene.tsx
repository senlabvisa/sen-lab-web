'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type PunnettSceneProps = { parent1: 'AA' | 'Aa' | 'aa'; parent2: 'AA' | 'Aa' | 'aa' };

function offspring(p1: string, p2: string): string[] {
  const r: string[] = [];
  for (const a of p1) for (const b of p2) r.push([a, b].sort().reverse().join(''));
  return r;
}

export default function PunnettScene({ parent1, parent2 }: PunnettSceneProps) {
  const kids = offspring(parent1, parent2);
  const colors: Record<string, string> = { AA: '#7C3AED', Aa: '#A78BFA', aa: '#DDD6FE' };

  return (
    <LabScene cameraPosition={[0, 0.5, 5]} background="#F5F3FF" minDistance={3} maxDistance={10}>
      {/* Parents */}
      <mesh position={[-2, 1.5, 0]}>
        <sphereGeometry args={[0.4, 16, 12]} />
        <meshStandardMaterial color={colors[parent1]} />
      </mesh>
      <mesh position={[2, 1.5, 0]}>
        <sphereGeometry args={[0.4, 16, 12]} />
        <meshStandardMaterial color={colors[parent2]} />
      </mesh>
      <Html position={[-2, 2.2, 0]} center distanceFactor={9}><span className="rounded bg-white/95 px-2 py-0.5 text-xs font-bold text-violet-700">P1: {parent1}</span></Html>
      <Html position={[2, 2.2, 0]} center distanceFactor={9}><span className="rounded bg-white/95 px-2 py-0.5 text-xs font-bold text-violet-700">P2: {parent2}</span></Html>

      {/* 4 enfants */}
      {kids.map((k, i) => {
        const x = -1.5 + i * 1;
        return (
          <group key={i} position={[x, -0.7, 0]}>
            <mesh>
              <sphereGeometry args={[0.25, 14, 10]} />
              <meshStandardMaterial color={colors[k]} />
            </mesh>
            <Html position={[0, 0.4, 0]} center distanceFactor={10}>
              <span className="rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-ink">{k}</span>
            </Html>
          </group>
        );
      })}
    </LabScene>
  );
}
