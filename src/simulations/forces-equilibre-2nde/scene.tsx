'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ForceSceneProps = { f1: number; f2: number };

export default function ForceScene({ f1, f2 }: ForceSceneProps) {
  const tilt = (f2 - f1) * 0.05;
  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#DBEAFE" minDistance={3} maxDistance={9}>
      {/* Pile/poutre */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, tilt]}>
        <boxGeometry args={[3, 0.15, 0.4]} />
        <meshStandardMaterial color="#7C3AED" />
      </mesh>
      {/* Pivot */}
      <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.3, 0.5, 4]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {/* Forces (flèches) */}
      <mesh position={[-1.5, -1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.15, f1 * 0.2, 6]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      <mesh position={[1.5, -1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.15, f2 * 0.2, 6]} />
        <meshStandardMaterial color="#10B981" />
      </mesh>
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="font-mono text-xs">F₁ = {f1} N | F₂ = {f2} N</div>
          <div className={'text-xs font-bold ' + (f1 === f2 ? 'text-emerald-700' : 'text-amber-700')}>{f1 === f2 ? '⚖ Équilibre' : 'Déséquilibre'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
