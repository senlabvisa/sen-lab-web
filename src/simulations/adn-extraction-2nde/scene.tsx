'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type DnaSceneProps = { stage: number };
const STAGES = ['Banane écrasée', 'Mélange savon+sel', 'Filtration', 'Alcool : ADN visible'];

export default function DnaScene({ stage }: DnaSceneProps) {
  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      <mesh><cylinderGeometry args={[0.7, 0.7, 1.8, 24, 1, true]} /><meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={2} /></mesh>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.68, 0.68, 1, 24]} />
        <meshStandardMaterial color={stage === 0 ? '#FEF3C7' : stage === 1 ? '#F4F4F5' : stage === 2 ? '#BFDBFE' : '#A78BFA'} opacity={0.85} transparent />
      </mesh>
      {/* ADN qui apparaît au stade 3 */}
      {stage === 3 && [[0.2, 0.3, 0], [-0.1, 0.5, 0]].map((p, i) => (
        <mesh key={i} position={p as any} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.04, 0.04, 0.6, 8]} /><meshStandardMaterial color="#F8FAFC" emissive="#7C3AED" emissiveIntensity={0.4} /></mesh>
      ))}
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="text-[10px] uppercase text-ink/50">Étape {stage + 1}/4</div>
          <div className="font-display text-sm font-bold text-pink-700">{STAGES[stage]}</div>
        </div>
      </Html>
    </LabScene>
  );
}
