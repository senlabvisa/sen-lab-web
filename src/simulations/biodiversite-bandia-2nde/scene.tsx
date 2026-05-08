'use client';

import { Html } from '@react-three/drei';
import { LabScene } from '@/components/lab/lab-scene';

export type ParkSceneProps = { selected: string | null };
const ANIMALS = [
  { key: 'rhino', label: '🦏 Rhinocéros', pos: [-1.5, 0, 0.5] },
  { key: 'girafe', label: '🦒 Girafe', pos: [1.5, 0, -0.5] },
  { key: 'gazelle', label: '🦌 Gazelle', pos: [0, 0, 1.5] },
  { key: 'singe', label: '🐒 Singe', pos: [-1, 0, -1.5] },
];

export default function ParkScene({ selected }: ParkSceneProps) {
  return (
    <LabScene cameraPosition={[3, 3, 4]} background="#FED7AA" minDistance={3} maxDistance={10}>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[4, 32]} /><meshStandardMaterial color="#D4B26A" /></mesh>
      {ANIMALS.map(a => (
        <mesh key={a.key} position={a.pos as any}>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshStandardMaterial color={selected === a.key ? '#FB923C' : '#A16207'} emissive={selected === a.key ? '#EA580C' : '#000'} emissiveIntensity={0.3} />
        </mesh>
      ))}
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <div className="rounded-2xl bg-white/95 px-3 py-1 text-center shadow-card ring-1 ring-amber-200">
          <div className="font-display text-sm font-bold text-amber-700">{selected ? ANIMALS.find(a => a.key === selected)?.label : 'Réserve de Bandia'}</div>
        </div>
      </Html>
    </LabScene>
  );
}
export { ANIMALS };
