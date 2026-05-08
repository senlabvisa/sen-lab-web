'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ScalSceneProps = { angle: number };

export default function ScalScene({ angle }: ScalSceneProps) {
  const ar = (angle * Math.PI) / 180;
  const u: [number, number, number] = [1.5, 0, 0];
  const v: [number, number, number] = [Math.cos(ar) * 1.5, Math.sin(ar) * 1.5, 0];
  const dot = u[0] * v[0] + u[1] * v[1];
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      {/* u (bleu) */}
      <mesh position={[0.75, 0, 0]}><boxGeometry args={[1.5, 0.06, 0.06]} /><meshStandardMaterial color="#3B82F6" /></mesh>
      <mesh position={[1.5, 0, 0]} rotation={[0, 0, -Math.PI/2]}><coneGeometry args={[0.12, 0.25, 8]} /><meshStandardMaterial color="#3B82F6" /></mesh>
      {/* v (vert) */}
      <mesh position={[v[0]/2, v[1]/2, 0]} rotation={[0, 0, ar]}><boxGeometry args={[1.5, 0.06, 0.06]} /><meshStandardMaterial color="#10B981" /></mesh>
      <mesh position={v} rotation={[0, 0, ar - Math.PI/2]}><coneGeometry args={[0.12, 0.25, 8]} /><meshStandardMaterial color="#10B981" /></mesh>
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs">angle = {angle}°</div>
          <div className="font-mono text-xs">u·v = ‖u‖·‖v‖·cos(θ) = <strong className="text-violet-700">{dot.toFixed(2)}</strong></div>
          {dot === 0 && <div className="text-xs font-bold text-emerald-700">⊥ Orthogonaux !</div>}
        </div>
      </Html>
    </LabScene>
  );
}
