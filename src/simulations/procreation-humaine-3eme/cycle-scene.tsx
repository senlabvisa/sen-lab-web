'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type CycleSceneProps = { day: number };

export default function CycleScene({ day }: CycleSceneProps) {
  // 28 jours, ovulation au jour 14
  const isOvulation = day >= 13 && day <= 15;
  const angle = (day / 28) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * 1.4;
  const y = Math.sin(angle) * 1.4;

  return (
    <LabScene cameraPosition={[0, 0.5, 4]} background="#FCE7F3" minDistance={3} maxDistance={9}>
      {/* Cercle des 28 jours */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.35, 1.45, 64]} />
        <meshStandardMaterial color="#EC4899" side={2} />
      </mesh>
      {/* Indicateur du jour */}
      <mesh position={[x, y, 0]}>
        <sphereGeometry args={[0.18, 14, 12]} />
        <meshStandardMaterial color={isOvulation ? '#FBBF24' : '#7C3AED'} emissive={isOvulation ? '#F59E0B' : '#5B21B6'} emissiveIntensity={0.6} />
      </mesh>
      {/* Marqueur ovulation */}
      <mesh position={[Math.cos((14/28)*Math.PI*2 - Math.PI/2)*1.4, Math.sin((14/28)*Math.PI*2 - Math.PI/2)*1.4, 0]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#FBBF24" />
      </mesh>
      <Html position={[0, 0, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-pink-200">
          <div className="text-[10px] uppercase text-ink/50">Jour</div>
          <div className="font-display text-2xl font-bold text-pink-700">{day}/28</div>
          {isOvulation && <div className="text-xs font-bold text-amber-700">🥚 Ovulation</div>}
        </div>
      </Html>
    </LabScene>
  );
}
