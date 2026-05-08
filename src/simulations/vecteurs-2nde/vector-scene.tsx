'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type VectorSceneProps = { ux: number; uy: number; vx: number; vy: number };

function Arrow({ x, y, c }: { x: number; y: number; c: string }) {
  const len = Math.sqrt(x * x + y * y);
  const angle = Math.atan2(y, x);
  return (
    <group rotation={[0, 0, angle]}>
      <mesh position={[len / 2, 0, 0]}><boxGeometry args={[len, 0.06, 0.06]} /><meshStandardMaterial color={c} /></mesh>
      <mesh position={[len, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.12, 0.25, 8]} /><meshStandardMaterial color={c} /></mesh>
    </group>
  );
}

export default function VectorScene({ ux, uy, vx, vy }: VectorSceneProps) {
  const sx = ux + vx, sy = uy + vy;
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      <mesh><boxGeometry args={[0.02, 6, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      <Arrow x={ux} y={uy} c="#3B82F6" />
      <group position={[ux, uy, 0]}><Arrow x={vx} y={vy} c="#10B981" /></group>
      <Arrow x={sx} y={sy} c="#7C3AED" />
      <Html position={[2, 2.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs"><span className="text-blue-700">u</span>+<span className="text-emerald-700">v</span>=<span className="text-violet-700 font-bold">({sx.toFixed(1)}, {sy.toFixed(1)})</span></div>
        </div>
      </Html>
    </LabScene>
  );
}
