'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type MitoSceneProps = { active: boolean };

export default function MitoScene({ active }: MitoSceneProps) {
  return (
    <LabScene cameraPosition={[0, 0.5, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {/* Mitochondrie (forme allongée) */}
      <mesh scale={[1.5, 0.7, 0.7]}>
        <sphereGeometry args={[0.7, 24, 18]} />
        <meshStandardMaterial color="#DC2626" emissive={active ? '#7F1D1D' : '#000'} emissiveIntensity={active ? 0.6 : 0} />
      </mesh>
      {/* Crêtes intérieures */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} scale={[0.6, 0.5, 0.5]}>
          <sphereGeometry args={[0.3, 12, 8]} />
          <meshStandardMaterial color="#7F1D1D" wireframe />
        </mesh>
      ))}
      {/* Glucose entrant */}
      {active && (
        <mesh position={[-1.5, 0, 0]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#FCD34D" emissive="#F59E0B" emissiveIntensity={0.5} /></mesh>
      )}
      {/* ATP sortant */}
      {active && (
        <mesh position={[1.5, 0, 0]}><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#10B981" emissive="#059669" emissiveIntensity={0.5} /></mesh>
      )}
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="font-display text-sm font-bold text-pink-700">Mitochondrie</div>
          {active && <div className="text-xs"><span className="text-amber-700">Glucose + O₂</span> → <span className="text-emerald-700">ATP + CO₂</span></div>}
        </div>
      </Html>
    </LabScene>
  );
}
