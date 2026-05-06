'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type MeterSceneProps = { kwh: number };

export default function MeterScene({ kwh }: MeterSceneProps) {
  // Tarif Senelec simplifié : 100 F / kWh
  const tarif = 100;
  const cout = kwh * tarif;

  return (
    <LabScene cameraPosition={[0, 1, 4]} background="#FEF3C7" minDistance={3} maxDistance={9}>
      {/* Compteur Woyofal */}
      <mesh>
        <boxGeometry args={[1.6, 1.4, 0.4]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {/* Écran */}
      <mesh position={[0, 0.2, 0.21]}>
        <boxGeometry args={[1, 0.5, 0.05]} />
        <meshStandardMaterial color="#10B981" emissive="#059669" emissiveIntensity={0.7} />
      </mesh>
      <Html position={[0, 0.2, 0.25]} center distanceFactor={8}>
        <div className="rounded bg-emerald-900/80 px-2 py-1 text-center text-emerald-100">
          <div className="font-mono text-xs">{kwh.toFixed(1)} kWh</div>
        </div>
      </Html>
      <Html position={[0, -1.2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="text-[10px] uppercase text-ink/50">Coût ({tarif} F/kWh)</div>
          <div className="font-display text-lg font-bold text-amber-700">{cout.toFixed(0)} F CFA</div>
        </div>
      </Html>
    </LabScene>
  );
}
