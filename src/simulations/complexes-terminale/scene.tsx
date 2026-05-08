'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ComplexSceneProps = { real: number; imag: number };

export default function ComplexScene({ real, imag }: ComplexSceneProps) {
  const mod = Math.sqrt(real * real + imag * imag);
  const arg = Math.atan2(imag, real);
  return (
    <LabScene cameraPosition={[0, 0, 5]} background="#F5F3FF" minDistance={3} maxDistance={9}>
      <mesh><boxGeometry args={[6, 0.02, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      <mesh><boxGeometry args={[0.02, 6, 0.02]} /><meshStandardMaterial color="#94A3B8" /></mesh>
      {/* Vecteur OM */}
      <mesh position={[real / 2, imag / 2, 0]} rotation={[0, 0, arg]}>
        <boxGeometry args={[mod, 0.06, 0.06]} />
        <meshStandardMaterial color="#7C3AED" />
      </mesh>
      <mesh position={[real, imag, 0]}><sphereGeometry args={[0.15, 16, 12]} /><meshStandardMaterial color="#DC2626" /></mesh>
      <Html position={[0, 2.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-violet-200">
          <div className="font-mono text-xs">z = {real.toFixed(1)} + {imag.toFixed(1)}i</div>
          <div className="font-mono text-xs">|z| = {mod.toFixed(2)}</div>
        </div>
      </Html>
    </LabScene>
  );
}
