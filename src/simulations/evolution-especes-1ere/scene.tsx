'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type EvolSceneProps = { generation: number };

export default function EvolScene({ generation }: EvolSceneProps) {
  const survivors = Math.max(2, 10 - generation * 1.5);
  const adapted = Math.min(8, generation);
  return (
    <LabScene cameraPosition={[2, 2, 4]} background="#FED7AA" minDistance={3} maxDistance={9}>
      {/* Sol désertique */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3, 32]} /><meshStandardMaterial color="#D4B26A" /></mesh>
      {/* Animaux non adaptés (rouge) */}
      {Array.from({ length: Math.round(survivors) }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5]}><sphereGeometry args={[0.15, 10, 8]} /><meshStandardMaterial color="#DC2626" /></mesh>;
      })}
      {/* Animaux adaptés (vert) */}
      {Array.from({ length: Math.round(adapted) }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return <mesh key={i} position={[Math.cos(a) * 1, 0, Math.sin(a) * 1]}><sphereGeometry args={[0.18, 10, 8]} /><meshStandardMaterial color="#10B981" /></mesh>;
      })}
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="font-mono text-xs">Génération {generation}</div>
          <div className="text-xs"><span className="text-red-700">Non adaptés: {Math.round(survivors)}</span> | <span className="text-emerald-700">Adaptés: {Math.round(adapted)}</span></div>
        </div>
      </Html>
    </LabScene>
  );
}
