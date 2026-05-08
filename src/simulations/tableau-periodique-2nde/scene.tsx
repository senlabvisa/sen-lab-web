'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type AtomSceneProps = { element: 'Na' | 'Cl' | 'H' | 'O' };

const DATA = {
  Na: { Z: 11, color: '#7C3AED', name: 'Sodium' },
  Cl: { Z: 17, color: '#65A30D', name: 'Chlore' },
  H: { Z: 1, color: '#F8FAFC', name: 'Hydrogène' },
  O: { Z: 8, color: '#DC2626', name: 'Oxygène' },
};

export default function AtomScene({ element }: AtomSceneProps) {
  const d = DATA[element];
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#DBEAFE" minDistance={3} maxDistance={9}>
      {/* Noyau */}
      <mesh><sphereGeometry args={[0.4, 24, 18]} /><meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={0.4} /></mesh>
      {/* Orbites simplifiées */}
      {[1, 1.5, 2].slice(0, Math.min(3, Math.ceil(d.Z / 8))).map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.3, 0, 0]}>
          <ringGeometry args={[r - 0.02, r + 0.02, 32]} />
          <meshStandardMaterial color="#7C3AED" side={2} />
        </mesh>
      ))}
      {/* Électrons (Z électrons sur orbites) */}
      {Array.from({ length: Math.min(d.Z, 8) }).map((_, i) => {
        const a = (i / Math.min(d.Z, 8)) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0]}><sphereGeometry args={[0.08, 12, 10]} /><meshStandardMaterial color="#1F2937" /></mesh>;
      })}
      <Html position={[0, 2.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="text-[10px] uppercase text-ink/50">{d.name}</div>
          <div className="font-display text-2xl font-bold" style={{ color: d.color }}>{element}</div>
          <div className="font-mono text-xs text-ink/70">Z = {d.Z}</div>
        </div>
      </Html>
    </LabScene>
  );
}
