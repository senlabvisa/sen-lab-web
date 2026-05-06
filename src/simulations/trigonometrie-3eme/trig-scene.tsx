'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type TrigSceneProps = { angle: number };

export default function TrigScene({ angle }: TrigSceneProps) {
  const r = 1.6;
  const ar = (angle * Math.PI) / 180;
  const x = Math.cos(ar) * r;
  const y = Math.sin(ar) * r;

  function L({ from, to, c, w = 0.05 }: any) {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.sqrt(dx*dx + dy*dy);
    return (
      <mesh position={[(from[0]+to[0])/2, (from[1]+to[1])/2, 0]} rotation={[0, 0, Math.atan2(dy, dx)]}>
        <boxGeometry args={[len, w, w]} /><meshStandardMaterial color={c} />
      </mesh>
    );
  }

  return (
    <LabScene cameraPosition={[0, 0.5, 4.5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      {/* Cercle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.02, r + 0.02, 64]} />
        <meshStandardMaterial color="#7C3AED" side={2} />
      </mesh>
      {/* Triangle rectangle dans le cercle */}
      <L from={[0, 0]} to={[x, 0]} c="#3B82F6" />
      <L from={[x, 0]} to={[x, y]} c="#10B981" />
      <L from={[0, 0]} to={[x, y]} c="#7C3AED" w={0.07} />
      <mesh position={[0, 0, 0]}><sphereGeometry args={[0.08, 12, 10]} /><meshStandardMaterial color="#0F172A" /></mesh>

      <Html position={[0, -1.9, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="text-[10px] uppercase text-ink/50">Angle</div>
          <div className="font-display text-lg font-bold text-violet-700">{angle}° → cos = {Math.cos(ar).toFixed(2)}, sin = {Math.sin(ar).toFixed(2)}</div>
        </div>
      </Html>
    </LabScene>
  );
}
