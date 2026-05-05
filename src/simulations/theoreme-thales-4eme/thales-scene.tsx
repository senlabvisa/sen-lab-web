'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ThalesSceneProps = { ratio: number };

export default function ThalesScene({ ratio }: ThalesSceneProps) {
  // Triangle ABC + droite DE parallèle à BC
  const A: [number, number, number] = [0, 1.5, 0];
  const B: [number, number, number] = [-1.5, -1, 0];
  const C: [number, number, number] = [1.5, -1, 0];
  const D: [number, number, number] = [A[0] + (B[0] - A[0]) * ratio, A[1] + (B[1] - A[1]) * ratio, 0];
  const E: [number, number, number] = [A[0] + (C[0] - A[0]) * ratio, A[1] + (C[1] - A[1]) * ratio, 0];

  function Line({ from, to, color, w = 0.05 }: { from: [number, number, number]; to: [number, number, number]; color: string; w?: number }) {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    return (
      <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0]} rotation={[0, 0, angle]}>
        <boxGeometry args={[len, w, w]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <Line from={A} to={B} color="#1F2937" />
      <Line from={A} to={C} color="#1F2937" />
      <Line from={B} to={C} color="#7C3AED" w={0.07} />
      <Line from={D} to={E} color="#10B981" w={0.07} />
      {[A, B, C, D, E].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
      ))}
      {[['A', A], ['B', B], ['C', C], ['D', D], ['E', E]].map(([n, p]) => (
        <Html key={n as string} position={p as any} center distanceFactor={9}>
          <span className="font-mono text-xs font-bold text-violet-700">{n as string}</span>
        </Html>
      ))}
      <Html position={[0, -1.6, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="text-[10px] uppercase text-ink/50">Ratio AD/AB</div>
          <div className="font-display text-lg font-bold text-violet-700">{ratio.toFixed(2)}</div>
        </div>
      </Html>
    </LabScene>
  );
}
