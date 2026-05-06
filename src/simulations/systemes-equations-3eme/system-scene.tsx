'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type SystemSceneProps = { x: number; y: number };

export default function SystemScene({ x, y }: SystemSceneProps) {
  // Système : x + y = 5, 2x - y = 1 ⇒ x=2, y=3
  const eq1 = x + y;
  const eq2 = 2 * x - y;

  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      {/* Repère */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      <mesh position={[0, 0, 0]}><boxGeometry args={[0.02, 6, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {/* Point de solution */}
      <mesh position={[x - 2.5, y - 2.5, 0]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color={eq1 === 5 && eq2 === 1 ? '#10B981' : '#7C3AED'} emissive={eq1 === 5 && eq2 === 1 ? '#059669' : '#5B21B6'} emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0, 2.8, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs">x + y = <strong>{eq1}</strong> (cible 5)</div>
          <div className="font-mono text-xs">2x - y = <strong>{eq2}</strong> (cible 1)</div>
          {eq1 === 5 && eq2 === 1 && <div className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ Solution</div>}
        </div>
      </Html>
    </LabScene>
  );
}
