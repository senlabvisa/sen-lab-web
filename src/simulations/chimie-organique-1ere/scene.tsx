'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type AlkaneSceneProps = { n: number };

export default function AlkaneScene({ n }: AlkaneSceneProps) {
  // Méthane (n=1), éthane (n=2), propane (n=3), butane (n=4)
  const names = ['Méthane', 'Éthane', 'Propane', 'Butane', 'Pentane'];
  return (
    <LabScene cameraPosition={[0, 1, 5]} background="#DBEAFE" minDistance={3} maxDistance={10}>
      {Array.from({ length: n }).map((_, i) => (
        <group key={i} position={[i * 0.6 - (n - 1) * 0.3, 0, 0]}>
          {/* Carbone */}
          <mesh><sphereGeometry args={[0.25, 16, 12]} /><meshStandardMaterial color="#1F2937" /></mesh>
          {/* Liaisons hydrogène (4 par C, sauf intercarbones) */}
          {Array.from({ length: i === 0 || i === n - 1 ? 3 : 2 }).map((_, j) => {
            const a = (j / 4) * Math.PI * 2;
            return <mesh key={j} position={[Math.cos(a) * 0.4, Math.sin(a) * 0.4 + 0.2, 0]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial color="#F8FAFC" /></mesh>;
          })}
        </group>
      ))}
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="font-display text-sm font-bold text-blue-700">{names[n - 1]} : C{n}H{2*n+2}</div>
        </div>
      </Html>
    </LabScene>
  );
}
