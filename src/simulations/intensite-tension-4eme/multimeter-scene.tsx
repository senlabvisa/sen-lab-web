'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type MultimeterSceneProps = { voltage: number; resistance: number };

export default function MultimeterScene({ voltage, resistance }: MultimeterSceneProps) {
  const intensity = voltage / resistance; // I = U/R en A
  return (
    <LabScene cameraPosition={[2, 1.5, 4]} background="#FEF3C7" minDistance={3} maxDistance={9}>
      {/* Pile */}
      <mesh position={[-1.5, 0, 0]}>
        <boxGeometry args={[0.6, 1, 0.6]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      {/* Résistance (rectangle plat) */}
      <mesh position={[1, 0, 0]}>
        <boxGeometry args={[0.6, 0.3, 0.3]} />
        <meshStandardMaterial color="#DC2626" />
      </mesh>
      {/* Fils */}
      <mesh position={[-0.25, 0.5, 0]}><boxGeometry args={[2.5, 0.05, 0.05]} /><meshStandardMaterial color="#DC2626" /></mesh>
      <mesh position={[-0.25, -0.5, 0]}><boxGeometry args={[2.5, 0.05, 0.05]} /><meshStandardMaterial color="#1F2937" /></mesh>
      <mesh position={[-1.5, 0, 0.35]}><boxGeometry args={[0.05, 1, 0.05]} /><meshStandardMaterial color="#1F2937" /></mesh>
      <mesh position={[1, 0, 0.2]}><boxGeometry args={[0.05, 1, 0.05]} /><meshStandardMaterial color="#1F2937" /></mesh>

      {/* Voltmètre (V) sur résistance */}
      <Html position={[1, 1, 0]} center distanceFactor={9}>
        <div className="rounded-xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-blue-200">
          <div className="text-[9px] uppercase text-ink/50">Voltmètre</div>
          <div className="font-mono text-base font-bold text-blue-700">{voltage.toFixed(1)} V</div>
        </div>
      </Html>
      {/* Ampèremètre */}
      <Html position={[-0.25, 1.1, 0]} center distanceFactor={9}>
        <div className="rounded-xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="text-[9px] uppercase text-ink/50">Ampèremètre</div>
          <div className="font-mono text-base font-bold text-amber-700">{intensity.toFixed(2)} A</div>
        </div>
      </Html>
    </LabScene>
  );
}
