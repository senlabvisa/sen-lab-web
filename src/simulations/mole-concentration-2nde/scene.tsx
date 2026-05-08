'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type MoleSceneProps = { mass: number; volume: number };

export default function MoleScene({ mass, volume }: MoleSceneProps) {
  // M(NaCl) = 58.5 g/mol
  const moles = mass / 58.5;
  const concentration = moles / (volume / 1000); // mol/L
  // Couleur plus foncée selon concentration
  const intensity = Math.min(1, concentration / 2);
  const blue = `rgb(${255 - intensity * 100}, ${255 - intensity * 100}, ${255})`;

  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#DBEAFE" minDistance={3} maxDistance={9}>
      <mesh><cylinderGeometry args={[0.8, 0.8, 2, 24, 1, true]} /><meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={2} /></mesh>
      <mesh position={[0, -0.4, 0]}><cylinderGeometry args={[0.78, 0.78, 1.2, 24]} /><meshStandardMaterial color={blue} opacity={0.85} transparent /></mesh>
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="font-mono text-xs">m = {mass} g | V = {volume} mL</div>
          <div className="font-mono text-xs">n = {moles.toFixed(3)} mol</div>
          <div className="font-display text-lg font-bold text-blue-700">c = {concentration.toFixed(2)} mol/L</div>
        </div>
      </Html>
    </LabScene>
  );
}
