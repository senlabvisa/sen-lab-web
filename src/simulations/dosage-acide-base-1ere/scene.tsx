'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type DosageSceneProps = { volumeAdded: number };

export default function DosageScene({ volumeAdded }: DosageSceneProps) {
  // Vinaigre = acide ; bicarbonate = base. À 10 mL = équivalence (pH=7)
  const ph = 3 + (volumeAdded / 10) * 8 + (volumeAdded > 10 ? (volumeAdded - 10) * 0.2 : 0);
  const phClamped = Math.min(13, Math.max(2, ph));
  const color = phClamped < 4 ? '#DC2626' : phClamped < 7 ? '#F59E0B' : phClamped < 8 ? '#65A30D' : '#3B82F6';
  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#FEF3C7" minDistance={3} maxDistance={9}>
      {/* Burette */}
      <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.12, 0.12, 1, 12]} /><meshStandardMaterial color="#3B82F6" opacity={0.4} transparent /></mesh>
      {/* Bécher */}
      <mesh position={[0, -0.5, 0]}><cylinderGeometry args={[0.7, 0.7, 1.2, 24, 1, true]} /><meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={2} /></mesh>
      <mesh position={[0, -0.7, 0]}><cylinderGeometry args={[0.68, 0.68, 0.8, 24]} /><meshStandardMaterial color={color} opacity={0.85} transparent /></mesh>
      <Html position={[0, 1.9, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="font-mono text-xs">V ajouté : {volumeAdded.toFixed(1)} mL</div>
          <div className="font-display text-lg font-bold" style={{ color }}>pH = {phClamped.toFixed(1)}</div>
          {Math.abs(volumeAdded - 10) < 0.5 && <div className="text-xs font-bold text-emerald-700">🎯 Équivalence</div>}
        </div>
      </Html>
    </LabScene>
  );
}
