'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type PhSceneProps = { ph: number };

export default function PhScene({ ph }: PhSceneProps) {
  // Couleur indicateur universel
  const color = ph < 4 ? '#DC2626' : ph < 6 ? '#F59E0B' : ph < 8 ? '#65A30D' : ph < 10 ? '#3B82F6' : '#7C3AED';
  const label = ph < 7 ? 'Acide' : ph > 7 ? 'Basique' : 'Neutre';

  return (
    <LabScene cameraPosition={[2, 1, 4]} background="#FEF3C7" minDistance={3} maxDistance={9}>
      <mesh>
        <cylinderGeometry args={[0.8, 0.8, 2, 24, 1, true]} />
        <meshStandardMaterial color="#BFDBFE" opacity={0.18} transparent side={2} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.78, 0.78, 1.2, 24]} />
        <meshStandardMaterial color={color} opacity={0.85} transparent />
      </mesh>
      <Html position={[0, 1.5, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200" style={{ borderTop: `4px solid ${color}` }}>
          <div className="text-[10px] uppercase text-ink/50">pH</div>
          <div className="font-display text-2xl font-bold" style={{ color }}>{ph}</div>
          <div className="text-xs font-bold" style={{ color }}>{label}</div>
        </div>
      </Html>
    </LabScene>
  );
}
