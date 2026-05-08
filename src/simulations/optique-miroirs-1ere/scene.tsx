'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type MirrorSceneProps = { kind: 'concave' | 'convexe' };

export default function MirrorScene({ kind }: MirrorSceneProps) {
  const isConcave = kind === 'concave';
  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#DBEAFE" minDistance={3} maxDistance={9}>
      {/* Miroir (arc) */}
      <mesh position={[0, 0, 0]} rotation={[0, isConcave ? 0 : Math.PI, 0]}>
        <sphereGeometry args={[1.2, 32, 16, 0, Math.PI / 2, Math.PI / 4, Math.PI / 2]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.1} side={2} />
      </mesh>
      {/* Axe optique */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {/* Foyer F */}
      <mesh position={[isConcave ? -0.6 : 0.6, 0, 0]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.6} /></mesh>
      {/* Objet */}
      <mesh position={[-2, 0.4, 0]}><boxGeometry args={[0.06, 0.8, 0.06]} /><meshStandardMaterial color="#DC2626" /></mesh>
      {/* Image (réelle si concave proche, virtuelle si convexe) */}
      {isConcave && (
        <mesh position={[1.5, -0.6, 0]}><boxGeometry args={[0.06, 0.6, 0.06]} /><meshStandardMaterial color="#10B981" /></mesh>
      )}
      <Html position={[0, 1.6, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="font-display text-sm font-bold text-blue-700">Miroir {kind} {isConcave ? '(convergent)' : '(divergent)'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
